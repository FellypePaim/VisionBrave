-- ============================================
-- VisionBrave — Painel Admin (Fase 1: Fundação)
-- Migration: 20260513
-- ============================================
-- Cria as 3 tabelas base do painel admin:
--   1. admin_users          → quem é admin (roles + permissions)
--   2. admin_audit_logs     → trilha imutável de ações sensíveis
--   3. system_settings      → kill switches e modo manutenção
--
-- Decisão arquitetural: NÃO criar novos valores no enum credit_tx_type
-- (ALTER TYPE ADD VALUE não roda em transação no Postgres, e migrations
-- Supabase são transacionais). Ajustes admin usam types existentes
-- ('bonus' | 'spend' | 'refund') com metadata.source='admin'.
--
-- Decisão arquitetural: bloqueio de usuário via supabase.auth.admin.updateUserById
-- (ban_duration), não tabela paralela.
--
-- RLS: todas as tabelas têm RLS habilitado SEM policies — acesso só via
-- service role no backend (helper createAdminClient + requireAdmin).
-- ============================================

-- ────────────────────────────────────────────────────────────────
-- 1. Admin users (roles + permissions)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('owner','admin','support','finance','viewer')),
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS 'Lista de usuários com acesso ao painel /admin. RLS deny-all — acesso só via service role.';
COMMENT ON COLUMN public.admin_users.role IS 'owner libera todas as permissions automaticamente';
COMMENT ON COLUMN public.admin_users.permissions IS 'Map permission_key → boolean (ex: {"credits.adjust": true})';

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só via service role no backend

-- ────────────────────────────────────────────────────────────────
-- 2. Audit logs (trilha de ações sensíveis)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before JSONB,
  after JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_audit_logs IS 'Trilha imutável de ações admin. Retenção: indefinida (financeiro).';
COMMENT ON COLUMN public.admin_audit_logs.action IS 'Ex: credits.add, credits.remove, credits.refund, user.block, subscription.update, kie.cap_update, settings.update';
COMMENT ON COLUMN public.admin_audit_logs.entity_type IS 'Ex: credits, user, subscription, kie_cap, system_setting';

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Sem policies: leitura/escrita só via service role

-- ────────────────────────────────────────────────────────────────
-- 3. System settings (kill switches + manutenção)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS 'Configurações operacionais globais (manutenção, kill switches por tipo de geração).';

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só via service role

-- Seeds iniciais (idempotente)
INSERT INTO public.system_settings (key, value) VALUES
  ('maintenance_mode',           'false'::jsonb),
  ('maintenance_message',        '"Estamos em manutenção temporária. Voltamos em breve."'::jsonb),
  ('image_generation_enabled',   'true'::jsonb),
  ('video_generation_enabled',   'true'::jsonb),
  ('audio_generation_enabled',   'true'::jsonb),
  ('new_signups_enabled',        'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 4. Índices auxiliares pra queries do painel
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type_created
  ON public.credit_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status
  ON public.subscriptions(plan, status);

-- ============================================
-- PASSO MANUAL APÓS APLICAR:
-- ============================================
-- 1. Regenerar types:
--    npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
--
-- 2. Popular o primeiro owner (substituir <SEU_UUID> pelo seu auth.users.id):
--    INSERT INTO public.admin_users (user_id, role, is_active)
--    VALUES ('<SEU_UUID>', 'owner', true);
-- ============================================
