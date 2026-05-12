-- ============================================
-- VisionBrave — Painel Admin v2 (Gerações + Errors)
-- Migration: 20260514
-- ============================================
-- 1. Adiciona soft delete em generations
-- 2. Cria app_error_logs (instrumentação de erros)
-- 3. Adiciona índices para queries do painel
-- ============================================

-- ────────────────────────────────────────────────────────────────
-- 1. Soft delete em generations
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

COMMENT ON COLUMN public.generations.deleted_at IS 'Soft delete via admin. NULL = ativa, valor = oculta da gallery do usuário';
COMMENT ON COLUMN public.generations.deleted_by IS 'Admin que executou o soft delete';
COMMENT ON COLUMN public.generations.delete_reason IS 'Motivo do soft delete (>= 10 chars)';

CREATE INDEX IF NOT EXISTS idx_generations_user_created
  ON public.generations(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_generations_deleted_at
  ON public.generations(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_created_at
  ON public.generations(created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 2. App error logs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT,
  action TEXT,
  provider TEXT,
  model TEXT,
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.app_error_logs IS 'Erros instrumentados das rotas críticas (generate/*, refund, KIE). Retenção sugerida: 90 dias.';
COMMENT ON COLUMN public.app_error_logs.route IS 'Ex: /api/generate/image';
COMMENT ON COLUMN public.app_error_logs.action IS 'Ex: kie_create_task, refund_credits, gallery_save';
COMMENT ON COLUMN public.app_error_logs.provider IS 'Ex: KIE, Supabase';
COMMENT ON COLUMN public.app_error_logs.error_code IS 'Ex: rate_limited, kie_cap_exceeded, insufficient_credits';

CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at
  ON public.app_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_user_id
  ON public.app_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_route
  ON public.app_error_logs(route);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_model
  ON public.app_error_logs(model);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_provider
  ON public.app_error_logs(provider);

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
-- Sem policies: acesso só via service role no backend
-- Retenção pode ser aplicada futuramente via pg_cron:
--   DELETE FROM public.app_error_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================
-- PASSO MANUAL APÓS APLICAR:
-- ============================================
--   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
-- (ou ajustar manualmente o database.types.ts adicionando os campos novos)
-- ============================================
