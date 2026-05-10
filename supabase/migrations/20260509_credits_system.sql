-- ============================================
-- VisionBrave — Sistema de Créditos
-- Migration: 20260509
-- ============================================
-- Cria tabelas para gerenciar saldo de créditos por usuário, histórico
-- de transações (débito/crédito), e assinaturas (Free/Pro/Enterprise).
--
-- Aplicar via:
--   npx supabase db push                    (CLI local)
--   ou via Supabase Studio → SQL Editor    (manual)
-- ============================================

-- 1. Tabela de saldo de créditos por usuário
CREATE TABLE IF NOT EXISTS public.credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 50 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 50,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credits IS 'Saldo de créditos por usuário. Free users começam com 50.';
COMMENT ON COLUMN public.credits.balance IS 'Saldo atual disponível para gerar';
COMMENT ON COLUMN public.credits.total_earned IS 'Total acumulado já recebido (compras, bonus)';
COMMENT ON COLUMN public.credits.total_spent IS 'Total acumulado já gasto em gerações';

-- RLS: usuário só lê seu próprio saldo
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits_select_own" ON public.credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Tabela de transações (histórico)
CREATE TYPE public.credit_tx_type AS ENUM ('purchase', 'bonus', 'spend', 'refund', 'subscription');

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,           -- positivo = crédito, negativo = débito
  type public.credit_tx_type NOT NULL,
  ref_id TEXT,                        -- ex: id da geração, id do pagamento, id da subscription
  description TEXT,                   -- ex: "Geração de imagem (Nano Banana)"
  metadata JSONB,                     -- ex: { model, prompt, taskId }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_transactions IS 'Histórico imutável de movimentação de créditos';

CREATE INDEX idx_credit_tx_user_created ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_tx_select_own" ON public.credit_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Tabela de assinaturas
CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  monthly_credits INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS 'Assinatura ativa do usuário (Free é default)';

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Função: criar saldo + subscription default ao novo signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, total_earned)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, monthly_credits)
  VALUES (NEW.id, 'free', 50)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50, 'bonus', 'Créditos de boas-vindas');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- 5. Função RPC: debitar créditos atomicamente (com check de saldo)
-- Chamada de dentro das APIs antes de criar a task no KIE.
-- Retorna o novo saldo, ou erro se insuficiente.
CREATE OR REPLACE FUNCTION public.debit_credits(
  p_amount INTEGER,
  p_description TEXT,
  p_ref_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock-and-update atômico
  UPDATE public.credits
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, type, ref_id, description, metadata)
  VALUES (v_user_id, -p_amount, 'spend', p_ref_id, p_description, p_metadata);

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_credits TO authenticated;

-- 6. Função RPC: creditar (compras, bonus, refunds)
CREATE OR REPLACE FUNCTION public.credit_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type public.credit_tx_type,
  p_description TEXT,
  p_ref_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Garante linha em credits
  INSERT INTO public.credits (user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.credits
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.credit_transactions (user_id, amount, type, ref_id, description, metadata)
  VALUES (p_user_id, p_amount, p_type, p_ref_id, p_description, p_metadata);

  RETURN v_balance;
END;
$$;

-- credit_credits NÃO é exposta ao authenticated — só service role chama (webhooks Stripe)

-- ============================================
-- Backfill: cria saldos iniciais para usuários já existentes
-- ============================================
INSERT INTO public.credits (user_id, balance, total_earned)
SELECT id, 50, 50 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.subscriptions (user_id, plan, monthly_credits)
SELECT id, 'free', 50 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
