-- ============================================
-- VisionBrave — MuAPI migration: pending_generations
-- Migration: 20260515
-- ============================================
-- Cria tabela `pending_generations` que rastreia tarefas async desde
-- o submit até o webhook chegar (substitui localStorage `pending-tasks`
-- da fase anterior).
--
-- Quando o webhook completa, atualizamos status="completed" e disparamos
-- INSERT em `generations` (galeria do user).
--
-- Em Fase C (limpeza KIE), `kie_monthly_usage` vira `provider_monthly_usage`
-- com coluna `provider`. Por enquanto convive com a estrutura antiga.
-- ============================================

CREATE TABLE IF NOT EXISTS public.pending_generations (
  task_id TEXT PRIMARY KEY,                            -- request_id da MuAPI
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'muapi',              -- 'muapi' | 'kie' (legado)
  model TEXT NOT NULL,                                  -- ex: "Flux Kontext Pro"
  endpoint TEXT NOT NULL,                               -- ex: "flux-kontext-pro-i2i"
  kind TEXT NOT NULL CHECK (kind IN ('image','video','audio','3d','vfx')),
  prompt TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  cost_credits INTEGER NOT NULL DEFAULT 0,
  estimated_cost_brl NUMERIC(10,4),
  actual_cost_usd NUMERIC(10,6),                        -- preenchido quando webhook chega
  result_urls TEXT[],                                   -- URLs do output (imagem/vídeo/áudio)
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.pending_generations IS 'Rastreia tarefas async do submit ao webhook. Substitui localStorage client-side.';
COMMENT ON COLUMN public.pending_generations.task_id IS 'request_id (MuAPI) ou taskId (KIE legacy)';
COMMENT ON COLUMN public.pending_generations.actual_cost_usd IS 'Custo real reportado pelo provider no webhook/poll';

CREATE INDEX IF NOT EXISTS idx_pending_generations_user_status
  ON public.pending_generations(user_id, status)
  WHERE status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS idx_pending_generations_created_at
  ON public.pending_generations(created_at DESC);

ALTER TABLE public.pending_generations ENABLE ROW LEVEL SECURITY;

-- Policy: usuário lê apenas suas próprias tasks
CREATE POLICY "pending_generations_select_own" ON public.pending_generations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypassa via configuração — sem policy de insert/update/delete pra user
-- (apenas backend via service_role insere/atualiza)
