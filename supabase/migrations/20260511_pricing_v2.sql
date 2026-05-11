-- ============================================
-- VisionBrave — Pricing V2 + Cap KIE Global
-- Migration: 20260511
-- ============================================
-- Alinha o sistema com o modelo "Magnific-look" mas conservador:
--   - Free 200 créditos (era 50)
--   - Planos: free / premium / premiumplus / pro
--   - Cap mensal de gasto KIE em R$ (proteção catastrófica)
--   - Tracking de gasto KIE por mês (1 linha por mês)
--
-- Aplicar via:
--   npx supabase db push  OU  Supabase Studio → SQL Editor
-- ============================================

-- ─────────────────────────────────────────────
-- 1. Atualizar enum subscription_plan
-- ─────────────────────────────────────────────
-- "starter" sai (tinha sido placeholder), entram "premium" e "premiumplus"
DO $$ BEGIN
  ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'premium';
  ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'premiumplus';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- 2. Atualizar trigger de boas-vindas: 50 → 200 créditos no Free
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, total_earned)
  VALUES (NEW.id, 200, 200)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, monthly_credits)
  VALUES (NEW.id, 'free', 200)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 200, 'bonus', 'Créditos de boas-vindas');

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 3. Tabela de gasto KIE mensal (1 linha por mês — atômica)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kie_monthly_usage (
  month_key TEXT PRIMARY KEY,                -- formato 'YYYY-MM'
  total_brl NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  cap_brl NUMERIC(10,2),                     -- override por mês (NULL = usa env KIE_MONTHLY_CAP_BRL)
  notified_at_75pct TIMESTAMPTZ,             -- preenchido quando alerta 75% disparou
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.kie_monthly_usage IS 'Tracking de gasto KIE.AI por mês para enforçar cap global e evitar prejuízo catastrófico';
COMMENT ON COLUMN public.kie_monthly_usage.month_key IS 'Mês no formato YYYY-MM (ex: 2026-05)';
COMMENT ON COLUMN public.kie_monthly_usage.cap_brl IS 'Override de cap mensal. NULL = usa env KIE_MONTHLY_CAP_BRL (default R$200)';

-- RLS deny all — apenas service role acessa
ALTER TABLE public.kie_monthly_usage ENABLE ROW LEVEL SECURITY;
-- Sem policies = ninguém via RLS pode ler/escrever (só service role bypassa)

-- ─────────────────────────────────────────────
-- 4. Função RPC: registrar gasto KIE (atômica)
-- ─────────────────────────────────────────────
-- Chamada APÓS a request KIE retornar sucesso, com o custo real em R$.
-- Retorna o total acumulado do mês (pra usar em check de cap futuro).
CREATE OR REPLACE FUNCTION public.add_kie_usage(p_brl NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  v_total NUMERIC;
BEGIN
  IF p_brl < 0 THEN
    RAISE EXCEPTION 'kie usage cannot be negative';
  END IF;

  INSERT INTO public.kie_monthly_usage (month_key, total_brl, total_requests)
  VALUES (v_month, p_brl, 1)
  ON CONFLICT (month_key) DO UPDATE SET
    total_brl = kie_monthly_usage.total_brl + EXCLUDED.total_brl,
    total_requests = kie_monthly_usage.total_requests + 1,
    updated_at = NOW()
  RETURNING total_brl INTO v_total;

  RETURN v_total;
END;
$$;

-- Não exposto a authenticated — apenas service role chama via API routes
REVOKE ALL ON FUNCTION public.add_kie_usage FROM PUBLIC;

-- ─────────────────────────────────────────────
-- 5. Função RPC: ler gasto + cap do mês corrente
-- ─────────────────────────────────────────────
-- Retorna JSON { total_brl, total_requests, cap_brl, allowed_brl_remaining }
-- Se a row do mês não existe, retorna zerada.
CREATE OR REPLACE FUNCTION public.get_kie_monthly_status(p_default_cap NUMERIC DEFAULT 200)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  v_row public.kie_monthly_usage%ROWTYPE;
  v_cap NUMERIC;
BEGIN
  SELECT * INTO v_row FROM public.kie_monthly_usage WHERE month_key = v_month;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object(
      'month_key', v_month,
      'total_brl', 0,
      'total_requests', 0,
      'cap_brl', p_default_cap,
      'remaining_brl', p_default_cap,
      'over_cap', false
    );
  END IF;

  v_cap := COALESCE(v_row.cap_brl, p_default_cap);

  RETURN jsonb_build_object(
    'month_key', v_row.month_key,
    'total_brl', v_row.total_brl,
    'total_requests', v_row.total_requests,
    'cap_brl', v_cap,
    'remaining_brl', GREATEST(v_cap - v_row.total_brl, 0),
    'over_cap', v_row.total_brl >= v_cap
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_kie_monthly_status FROM PUBLIC;

-- ─────────────────────────────────────────────
-- 6. Marcar trigger de alerta 75% (idempotente)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_kie_alert_75pct()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  v_already BOOLEAN;
BEGIN
  UPDATE public.kie_monthly_usage
  SET notified_at_75pct = NOW()
  WHERE month_key = v_month
    AND notified_at_75pct IS NULL
  RETURNING TRUE INTO v_already;

  RETURN COALESCE(v_already, FALSE);  -- TRUE se acabou de marcar (deve enviar email), FALSE se já estava
END;
$$;

REVOKE ALL ON FUNCTION public.mark_kie_alert_75pct FROM PUBLIC;

-- ─────────────────────────────────────────────
-- 7. Cap diário Free — view auxiliar
-- ─────────────────────────────────────────────
-- Conta gerações do dia atual por usuário (a partir de credit_transactions com type='spend').
-- Usado por API routes pra enforçar limite Free (3 imagens/dia, 0 vídeo).
CREATE OR REPLACE FUNCTION public.get_daily_generations(p_user_id UUID, p_kind TEXT DEFAULT 'image')
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.credit_transactions
  WHERE user_id = p_user_id
    AND type = 'spend'
    AND created_at >= (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
    AND (metadata->>'kind' = p_kind OR metadata->>'model' IS NOT NULL);
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_generations TO authenticated;

-- ─────────────────────────────────────────────
-- 8. Backfill de subscriptions: ninguém ainda assinou pago, mas deixar default 200
-- ─────────────────────────────────────────────
UPDATE public.subscriptions SET monthly_credits = 200 WHERE plan = 'free' AND monthly_credits = 50;
UPDATE public.credits SET balance = balance + 150 WHERE total_earned <= 50;
-- ↑ todo user que tinha o bônus antigo de 50 ganha mais 150 (ajuste retroativo p/ não punir early adopters)

-- Loga isso como bonus
INSERT INTO public.credit_transactions (user_id, amount, type, description)
SELECT user_id, 150, 'bonus', 'Ajuste retroativo: bônus Free atualizado para 200 créditos'
FROM public.credits WHERE total_earned <= 50;
