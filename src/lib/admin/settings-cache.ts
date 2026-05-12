/**
 * Cache em memória pro system_settings — TTL 30s.
 *
 * Usado pelas rotas /api/generate/* pra ler o estado de
 * maintenance_mode + kill switches sem hitar o banco em cada request.
 *
 * Limitação: cache é por instância Vercel. Em deploys multi-region,
 * uma mudança via /api/admin/settings invalida apenas a instância que
 * recebeu o PATCH — outras esperam o TTL. 30s é tolerável pro uso atual.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface CacheEntry {
  values: Record<string, unknown>;
  expiresAt: number;
}

const TTL_MS = 30_000;
let cache: CacheEntry | null = null;

async function fetchSettings(): Promise<Record<string, unknown>> {
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("system_settings")
      .select("key, value");
    if (error) {
      console.error("[settings-cache] fetch failed:", error.message);
      return {};
    }
    const map: Record<string, unknown> = {};
    for (const s of data ?? []) {
      map[s.key] = s.value;
    }
    return map;
  } catch (e) {
    console.error("[settings-cache] unexpected error:", e);
    return {};
  }
}

export async function getSystemSettings(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.values;
  const values = await fetchSettings();
  cache = { values, expiresAt: now + TTL_MS };
  return values;
}

/** Limpa o cache imediatamente. Chamar após PATCH /api/admin/settings. */
export function bustSettingsCache(): void {
  cache = null;
}

export type GenerationKind = "image" | "video" | "audio";

const KEY_MAP: Record<GenerationKind, string> = {
  image: "image_generation_enabled",
  video: "video_generation_enabled",
  audio: "audio_generation_enabled",
};

const KIND_LABEL: Record<GenerationKind, string> = {
  image: "imagens",
  video: "vídeos",
  audio: "áudio",
};

interface CheckResult {
  allowed: boolean;
  reason?: string;
  /** Código de erro pro frontend distinguir manutenção de kill switch */
  code?: "maintenance_mode" | "kind_disabled";
}

/**
 * Gate 0 (executa antes dos gates de plano/limit/KIE):
 *   1. Modo manutenção global → bloqueia tudo
 *   2. Kill switch do tipo de geração → bloqueia esse tipo
 *
 * Retorna { allowed: true } se passou. Caller deve responder 503 com `reason`.
 */
export async function checkGenerationAllowed(kind: GenerationKind): Promise<CheckResult> {
  const settings = await getSystemSettings();

  // 1. Modo manutenção global
  if (settings.maintenance_mode === true) {
    const msg = typeof settings.maintenance_message === "string"
      ? settings.maintenance_message
      : "Estamos em manutenção temporária. Voltamos em breve.";
    return { allowed: false, reason: msg, code: "maintenance_mode" };
  }

  // 2. Kill switch do tipo
  const key = KEY_MAP[kind];
  if (settings[key] === false) {
    return {
      allowed: false,
      reason: `Geração de ${KIND_LABEL[kind]} temporariamente desabilitada. Tente novamente em breve.`,
      code: "kind_disabled",
    };
  }

  return { allowed: true };
}
