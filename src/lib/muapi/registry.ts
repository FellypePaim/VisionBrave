/**
 * Registry de modelos MuAPI suportados pelo VisionBrave.
 *
 * Cada entrada mapeia o nome amigável (exibido na UI) para:
 *   - `endpoint`: path relativo na API MuAPI (sem o `/api/v1/` prefix)
 *   - `kind`: tipo de geração ("image" | "video" | "audio" | "3d" | "vfx")
 *   - `costUSD`: custo de referência (em USD por geração base) — usado pra
 *     calcular crédito mínimo a debitar ANTES do request. O custo REAL final
 *     vem da MuAPI no campo `cost.amount_usd` da response.
 *   - `bodyShape`: hints de quais params específicos esse modelo aceita
 *   - `multipliers`: lógica de custo extra (4K, duration, count > 1, etc.)
 *
 * IMPORTANTE: a fonte de verdade do custo é o response `cost.amount_usd` da
 * MuAPI. Esta tabela serve apenas pra check de saldo antecipado (gate 4 do
 * fluxo de créditos). Diferenças serão reconciliadas via metadata.
 */

export type GenerationKind = "image" | "video" | "audio" | "3d" | "vfx";

export interface ModelMultipliers {
  /** Multiplier por imagem adicional (count > 1). Default 1. */
  count?: number;
  /** Multiplier por segundo extra de vídeo além do baseline. */
  perSecondOver?: { baselineSec: number; multiplierPerSec: number };
  /** Multiplier por resolução. Default sem multiplier. */
  resolution?: Record<string, number>; // ex: { "4K": 2, "1080p": 1.5 }
}

export interface MuapiModelConfig {
  /** Nome exibido na UI (chave do CREDIT_COSTS no credits.ts) */
  displayName: string;
  /** Path relativo na API: ex "flux-schnell-image" */
  endpoint: string;
  /** Tipo de geração */
  kind: GenerationKind;
  /** Custo de referência em USD pra geração base (mais barata variante) */
  costUSD: number;
  /** Provider real por trás (Google, OpenAI, BFL, ByteDance, Kling, ...) */
  provider: string;
  /** Resoluções suportadas (pra UI de seleção). Default ["1K","2K","4K"]. */
  resolutions?: Array<"1K" | "2K" | "4K">;
  /** Aceita image input? */
  acceptsImageInput?: boolean;
  /** Max ref images suportadas (Nano Banana = 14, Flux Kontext = 1) */
  maxRefImages?: number;
  /** Lógica de custo extra */
  multipliers?: ModelMultipliers;
  /** Plano mínimo necessário (free/premium/premiumplus/pro) */
  minPlan?: "free" | "premium" | "premiumplus" | "pro";
}

/**
 * Modelos MuAPI usados no VisionBrave.
 * Preços coletados de muapi.ai/playground em 2026-05-12.
 */
export const MUAPI_MODELS: Record<string, MuapiModelConfig> = {
  // ─── IMAGEM ────────────────────────────────────────────────────────

  "Flux Schnell": {
    displayName: "Flux Schnell",
    endpoint: "flux-schnell-image",
    kind: "image",
    costUSD: 0.003,
    provider: "Black Forest Labs",
    resolutions: ["1K"],
    minPlan: "free",
  },

  "Flux Dev": {
    displayName: "Flux Dev",
    endpoint: "flux-dev-image",
    kind: "image",
    costUSD: 0.015,
    provider: "Black Forest Labs",
    resolutions: ["1K"],
    minPlan: "free",
  },

  "Flux Pro": {
    displayName: "Flux Pro",
    endpoint: "flux-2-pro",
    kind: "image",
    costUSD: 0.032,
    provider: "Black Forest Labs",
    resolutions: ["1K", "2K"],
    minPlan: "premium",
    multipliers: { resolution: { "2K": 1.4 } },
  },

  "Flux Kontext Pro": {
    displayName: "Flux Kontext Pro",
    endpoint: "flux-kontext-pro-i2i",
    kind: "image",
    costUSD: 0.030,
    provider: "Black Forest Labs",
    resolutions: ["1K"],
    acceptsImageInput: true,
    maxRefImages: 1,
    minPlan: "free",
  },

  "Flux Kontext Max": {
    displayName: "Flux Kontext Max",
    endpoint: "flux-kontext-max-i2i",
    kind: "image",
    costUSD: 0.060,
    provider: "Black Forest Labs",
    resolutions: ["1K", "2K"],
    acceptsImageInput: true,
    maxRefImages: 1,
    minPlan: "premium",
  },

  "Nano Banana": {
    displayName: "Nano Banana",
    endpoint: "nano-banana",
    kind: "image",
    costUSD: 0.030,
    provider: "Google",
    resolutions: ["1K", "2K", "4K"],
    acceptsImageInput: true,
    maxRefImages: 8,
    minPlan: "free",
    multipliers: { resolution: { "2K": 1.5, "4K": 2 } },
  },

  "Nano Banana Pro": {
    displayName: "Nano Banana Pro",
    endpoint: "nano-banana-pro",
    kind: "image",
    costUSD: 0.120,
    provider: "Google",
    resolutions: ["1K", "2K", "4K"],
    acceptsImageInput: true,
    maxRefImages: 8,
    minPlan: "premium",
  },

  "GPT Image 2": {
    displayName: "GPT Image 2",
    endpoint: "gpt-image-2-text-to-image",
    kind: "image",
    costUSD: 0.090,
    provider: "OpenAI",
    resolutions: ["1K", "2K", "4K"],
    acceptsImageInput: false,
    minPlan: "premium",
  },

  "Seedream 5.0": {
    displayName: "Seedream 5.0",
    endpoint: "bytedance-seedream-v5.0",
    kind: "image",
    costUSD: 0.033,
    provider: "ByteDance",
    resolutions: ["1K", "2K"],
    minPlan: "free",
  },

  "Midjourney v8": {
    displayName: "Midjourney v8",
    endpoint: "midjourney-v8",
    kind: "image",
    costUSD: 0.100,
    provider: "Midjourney",
    resolutions: ["1K"],
    minPlan: "premiumplus",
  },

  // ─── VÍDEO ─────────────────────────────────────────────────────────

  "Kling 2.1 Pro": {
    displayName: "Kling 2.1 Pro",
    endpoint: "kling-v2.1-pro-i2v",
    kind: "video",
    costUSD: 0.400,
    provider: "Kling",
    acceptsImageInput: true,
    maxRefImages: 1,
    minPlan: "premium",
  },

  "Kling 2.1 Standard": {
    displayName: "Kling 2.1 Standard",
    endpoint: "kling-v2.1-standard-i2v",
    kind: "video",
    costUSD: 0.225,
    provider: "Kling",
    acceptsImageInput: true,
    maxRefImages: 1,
    minPlan: "free",
  },

  "Kling 3.0 Pro": {
    displayName: "Kling 3.0 Pro",
    endpoint: "kling-v3.0-pro-image-to-video",
    kind: "video",
    costUSD: 0.720,
    provider: "Kling",
    acceptsImageInput: true,
    minPlan: "premiumplus",
  },

  "Veo 3.1 Fast": {
    displayName: "Veo 3.1 Fast",
    endpoint: "veo3.1-fast-image-to-video",
    kind: "video",
    costUSD: 0.600,
    provider: "Google",
    acceptsImageInput: true,
    minPlan: "premium",
  },

  "Veo 3.1": {
    displayName: "Veo 3.1",
    endpoint: "veo3.1-image-to-video",
    kind: "video",
    costUSD: 2.500,
    provider: "Google",
    acceptsImageInput: true,
    minPlan: "pro",
  },

  "Seedance 2": {
    displayName: "Seedance 2",
    endpoint: "sd-2-image-to-video",
    kind: "video",
    costUSD: 1.250,
    provider: "ByteDance",
    acceptsImageInput: true,
    minPlan: "premiumplus",
  },

  "Seedance 2 Fast": {
    displayName: "Seedance 2 Fast",
    endpoint: "sd-2-image-to-video-fast",
    kind: "video",
    costUSD: 0.750,
    provider: "ByteDance",
    acceptsImageInput: true,
    minPlan: "premium",
  },

  "Hailuo 02 Pro": {
    displayName: "Hailuo 02 Pro",
    endpoint: "minimax-hailuo-02-pro-i2v",
    kind: "video",
    costUSD: 0.600,
    provider: "MiniMax",
    acceptsImageInput: true,
    minPlan: "premium",
  },

  "Sora 2": {
    displayName: "Sora 2",
    endpoint: "openai-sora-2-text-to-video",
    kind: "video",
    costUSD: 0.800,
    provider: "OpenAI",
    minPlan: "pro",
  },

  "Sora 2 Pro": {
    displayName: "Sora 2 Pro",
    endpoint: "openai-sora-2-pro-text-to-video",
    kind: "video",
    costUSD: 2.400,
    provider: "OpenAI",
    minPlan: "pro",
  },

  // ─── ÁUDIO (Suno) ──────────────────────────────────────────────────

  "Suno Create Music": {
    displayName: "Suno Create Music",
    endpoint: "suno-create-music",
    kind: "audio",
    costUSD: 0.090,
    provider: "Suno",
    minPlan: "free",
  },

  "Suno Extend Music": {
    displayName: "Suno Extend Music",
    endpoint: "suno-extend-music",
    kind: "audio",
    costUSD: 0.090,
    provider: "Suno",
    minPlan: "premium",
  },

  "Suno Generate Sounds": {
    displayName: "Suno Generate Sounds",
    endpoint: "suno-generate-sounds",
    kind: "audio",
    costUSD: 0.020,
    provider: "Suno",
    minPlan: "free",
  },

  "Suno Remix Music": {
    displayName: "Suno Remix Music",
    endpoint: "suno-remix-music",
    kind: "audio",
    costUSD: 0.090,
    provider: "Suno",
    minPlan: "premium",
  },
};

/** Lookup helpers */
export function getModelConfig(name: string): MuapiModelConfig | undefined {
  return MUAPI_MODELS[name];
}

export function listModelsByKind(kind: GenerationKind): MuapiModelConfig[] {
  return Object.values(MUAPI_MODELS).filter((m) => m.kind === kind);
}

/**
 * Calcula custo USD esperado pra geração (pré-check). O custo real vem
 * da MuAPI no response. Diferenças vão pra metadata.
 */
export function estimateMuapiCostUSD(
  modelName: string,
  options?: { count?: number; resolution?: string; durationSeconds?: number },
): number {
  const cfg = MUAPI_MODELS[modelName];
  if (!cfg) return 0.05; // fallback conservador
  let total = cfg.costUSD;
  const m = cfg.multipliers;
  if (options?.count && options.count > 1) total *= options.count;
  if (options?.resolution && m?.resolution?.[options.resolution]) {
    total *= m.resolution[options.resolution];
  }
  if (options?.durationSeconds && m?.perSecondOver) {
    const extra = Math.max(0, options.durationSeconds - m.perSecondOver.baselineSec);
    if (extra > 0) total *= 1 + extra * m.perSecondOver.multiplierPerSec;
  }
  return Math.round(total * 10000) / 10000; // 4 casas decimais
}
