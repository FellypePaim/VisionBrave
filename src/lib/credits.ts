/**
 * Sistema de créditos VisionBrave.
 *
 * Migração 2026-05-12: KIE → MuAPI como provider único.
 *
 * Convenção atual (preço de CUSTO, sem markup — calibração inicial):
 *   1 crédito ≈ $0.01 USD ≈ R$0.054 (com USD_TO_BRL = 5.4)
 *
 * Custos em créditos = ceil(custoMuapiUSD * 100), mínimo 1 crédito.
 *
 * Planos (créditos mensais incluídos):
 *   Free        — 200 créd/mês ≈ $2.00 em custo MuAPI
 *   Premium     — 8.000 créd/mês ≈ $80
 *   Premium+    — 25.000 créd/mês ≈ $250
 *   Pro         — 100.000 créd/mês ≈ $1.000
 *
 * IMPORTANTE: precificação dos planos (R$49, R$129, R$449) NÃO foi
 * recalibrada. Hoje os planos podem dar prejuízo se user gastar muito.
 * Recalibração ficou pra depois (decisão do user: ver dados reais primeiro).
 *
 * Ver `arquitetura-visionbrave.md` no vault PAIM para detalhes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ═════════════════════════════════════════════════════════════════════
// 1. Tabela de custos (créditos cobrados do user)
// ═════════════════════════════════════════════════════════════════════

/**
 * Custos em créditos por modelo (sem markup — preço de custo MuAPI puro).
 * Fórmula: ceil(custoMuapiUSD * 100), mínimo 1.
 *
 * Calibração 2026-05-12 baseada em muapi.ai/playground.
 */
export const CREDIT_COSTS = {
  // ── Imagem ─────────────────────────────────────────────
  "Flux Schnell":     1,    // $0.003 → 1 (mínimo)
  "Flux Dev":         2,    // $0.015
  "Flux Pro":         4,    // $0.032
  "Flux Kontext Pro": 3,    // $0.030 (renomeado de "Flux Kontext")
  "Flux Kontext Max": 6,    // $0.060
  "Nano Banana":      3,    // $0.030 (era 50 com markup; agora preço puro)
  "Nano Banana Pro":  12,   // $0.120
  "GPT Image 2":      9,    // $0.090
  "Seedream 5.0":     4,    // $0.033
  "Midjourney v8":    10,   // $0.100

  // ── Vídeo ──────────────────────────────────────────────
  "Kling 2.1 Standard":  23,   // $0.225
  "Kling 2.1 Pro":       40,   // $0.400
  "Kling 3.0 Pro":       72,   // $0.720
  "Veo 3.1 Fast":        60,   // $0.600
  "Veo 3.1":             250,  // $2.500
  "Seedance 2 Fast":     75,   // $0.750
  "Seedance 2":          125,  // $1.250
  "Hailuo 02 Pro":       60,   // $0.600
  "Sora 2":              80,   // $0.800
  "Sora 2 Pro":          240,  // $2.400

  // ── Áudio Suno ─────────────────────────────────────────
  "Suno Create Music":     9,  // $0.090
  "Suno Extend Music":     9,  // $0.090
  "Suno Generate Sounds":  2,  // $0.020
  "Suno Remix Music":      9,  // $0.090
} as const;

/**
 * ALIASES de compatibilidade — mapeia nomes legados (KIE) → nomes MuAPI.
 * Durante a migração, código antigo pode passar "Flux Kontext" e funcionar.
 * Remover na Fase C.
 */
export const MODEL_ALIASES: Record<string, keyof typeof CREDIT_COSTS> = {
  "Flux Kontext": "Flux Kontext Pro",
  "Veo 3 Fast":   "Veo 3.1 Fast",
  "Veo 3":        "Veo 3.1",
  "Kling 2.1":    "Kling 2.1 Pro",
  "Kling 3.0":    "Kling 3.0 Pro",
  "V4":           "Suno Create Music",
  "V4_5":         "Suno Create Music",
  "V4_5PLUS":     "Suno Create Music",
  "V4_5ALL":      "Suno Create Music",
  "V5":           "Suno Create Music",
  "V5_5":         "Suno Create Music",
};

/** Normaliza nome possivelmente legado para o atual */
export function normalizeModelName(name: string): string {
  return MODEL_ALIASES[name] ?? name;
}

// ═════════════════════════════════════════════════════════════════════
// 2. Tabela de custo MuAPI em USD (para tracking de cap mensal)
//    Usado por checkMuapiCap — NUNCA exibido ao user.
//    Custos reais finais vêm da MuAPI no response (cost.amount_usd).
// ═════════════════════════════════════════════════════════════════════

const USD_TO_BRL = 5.4;  // taxa fixa pra evitar volatilidade

const MUAPI_COST_USD: Record<string, number> = {
  // Imagem
  "Flux Schnell":     0.003,
  "Flux Dev":         0.015,
  "Flux Pro":         0.032,
  "Flux Kontext Pro": 0.030,
  "Flux Kontext Max": 0.060,
  "Nano Banana":      0.030,
  "Nano Banana Pro":  0.120,
  "GPT Image 2":      0.090,
  "Seedream 5.0":     0.033,
  "Midjourney v8":    0.100,
  // Vídeo (preço base — multipliers via opção `durationSeconds`)
  "Kling 2.1 Standard": 0.225,
  "Kling 2.1 Pro":      0.400,
  "Kling 3.0 Pro":      0.720,
  "Veo 3.1 Fast":       0.600,
  "Veo 3.1":            2.500,
  "Seedance 2 Fast":    0.750,
  "Seedance 2":         1.250,
  "Hailuo 02 Pro":      0.600,
  "Sora 2":             0.800,
  "Sora 2 Pro":         2.400,
  // Áudio
  "Suno Create Music":     0.090,
  "Suno Extend Music":     0.090,
  "Suno Generate Sounds":  0.020,
  "Suno Remix Music":      0.090,
};

/**
 * Calcula custo MuAPI estimado em R$ (para tracking de cap mensal).
 * Mesmo multiplier do calculateCost — assim o cap acompanha proporcionalmente.
 */
export function estimateMuapiCostBRL(
  model: string,
  options?: { count?: number; durationSeconds?: number; resolution?: string },
): number {
  const normalized = normalizeModelName(model);
  const baseUSD = MUAPI_COST_USD[normalized] ?? 0.05;
  let multiplier = 1;
  if (options?.count && options.count > 1) multiplier *= options.count;
  if (options?.durationSeconds && options.durationSeconds > 5) multiplier *= options.durationSeconds / 5;
  if (options?.resolution === "4K" || options?.resolution === "4k") multiplier *= 2;
  else if (options?.resolution === "1080p" || options?.resolution === "2K") multiplier *= 1.5;
  return Math.round(baseUSD * multiplier * USD_TO_BRL * 100) / 100;
}

/** @deprecated use `estimateMuapiCostBRL` — alias temporário pra não quebrar callers */
export const estimateKieCostBRL = estimateMuapiCostBRL;

// ═════════════════════════════════════════════════════════════════════
// 3. Acesso por plano
// ═════════════════════════════════════════════════════════════════════

export type PlanKey = "free" | "premium" | "premiumplus" | "pro" | "enterprise";

export const PLAN_MODEL_ACCESS: Record<PlanKey, string[]> = {
  free: [
    // Imagem básica + Flux Schnell ultra-barato + Suno básico
    "Flux Schnell", "Flux Dev", "Flux Kontext Pro",
    "Nano Banana", "Seedream 5.0",
    "Suno Create Music", "Suno Generate Sounds",
  ],
  premium: [
    // + Imagem premium + vídeos rápidos + áudio premium
    "Flux Schnell", "Flux Dev", "Flux Pro", "Flux Kontext Pro", "Flux Kontext Max",
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Seedream 5.0",
    "Kling 2.1 Standard", "Kling 2.1 Pro", "Veo 3.1 Fast", "Hailuo 02 Pro", "Seedance 2 Fast",
    "Suno Create Music", "Suno Extend Music", "Suno Generate Sounds", "Suno Remix Music",
  ],
  premiumplus: [
    // + Midjourney + vídeos médios
    "Flux Schnell", "Flux Dev", "Flux Pro", "Flux Kontext Pro", "Flux Kontext Max",
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Seedream 5.0", "Midjourney v8",
    "Kling 2.1 Standard", "Kling 2.1 Pro", "Kling 3.0 Pro",
    "Veo 3.1 Fast", "Hailuo 02 Pro", "Seedance 2 Fast", "Seedance 2",
    "Suno Create Music", "Suno Extend Music", "Suno Generate Sounds", "Suno Remix Music",
  ],
  pro: [
    // Tudo, incluindo Sora 2 e Veo 3.1 full quality
    "Flux Schnell", "Flux Dev", "Flux Pro", "Flux Kontext Pro", "Flux Kontext Max",
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Seedream 5.0", "Midjourney v8",
    "Kling 2.1 Standard", "Kling 2.1 Pro", "Kling 3.0 Pro",
    "Veo 3.1 Fast", "Veo 3.1", "Hailuo 02 Pro", "Seedance 2 Fast", "Seedance 2",
    "Sora 2", "Sora 2 Pro",
    "Suno Create Music", "Suno Extend Music", "Suno Generate Sounds", "Suno Remix Music",
  ],
  enterprise: [
    // alias de Pro (até existir tier corporativo)
    "Flux Schnell", "Flux Dev", "Flux Pro", "Flux Kontext Pro", "Flux Kontext Max",
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Seedream 5.0", "Midjourney v8",
    "Kling 2.1 Standard", "Kling 2.1 Pro", "Kling 3.0 Pro",
    "Veo 3.1 Fast", "Veo 3.1", "Hailuo 02 Pro", "Seedance 2 Fast", "Seedance 2",
    "Sora 2", "Sora 2 Pro",
    "Suno Create Music", "Suno Extend Music", "Suno Generate Sounds", "Suno Remix Music",
  ],
};

export function isModelAllowedForPlan(plan: string, model: string): boolean {
  const list = PLAN_MODEL_ACCESS[(plan as PlanKey)] ?? PLAN_MODEL_ACCESS.free;
  // Suporta nome legado via alias
  return list.includes(normalizeModelName(model));
}

// ═════════════════════════════════════════════════════════════════════
// 4. Cap diário Free (anti-spam)
// ═════════════════════════════════════════════════════════════════════

export const FREE_DAILY_LIMITS = {
  image: 3,    // máx 3 imagens/dia no Free
  video: 0,    // vídeo proibido no Free
  audio: 1,    // máx 1 música/dia no Free
} as const;

// ═════════════════════════════════════════════════════════════════════
// 5. Calculadora de custo (créditos cobrados do user)
// ═════════════════════════════════════════════════════════════════════

export type ModelKey = keyof typeof CREDIT_COSTS;

/**
 * Calcula créditos a debitar para uma geração.
 * - count: multiplica para imagens (gerar 4 imagens = 4×).
 * - durationSeconds: vídeo >5s multiplica por (s/5).
 * - resolution: "4K" ×2, "1080p" ×1.5, demais sem multiplier.
 */
export function calculateCost(
  model: string,
  options?: { count?: number; durationSeconds?: number; resolution?: string },
): number {
  const normalized = normalizeModelName(model);
  const baseCost = (CREDIT_COSTS as Record<string, number>)[normalized] ?? 100;
  let multiplier = 1;
  if (options?.count && options.count > 1) multiplier *= options.count;
  if (options?.durationSeconds && options.durationSeconds > 5) multiplier *= options.durationSeconds / 5;
  if (options?.resolution === "4K" || options?.resolution === "4k") multiplier *= 2;
  else if (options?.resolution === "1080p" || options?.resolution === "2K") multiplier *= 1.5;
  return Math.max(1, Math.ceil(baseCost * multiplier));
}

// ═════════════════════════════════════════════════════════════════════
// 6. RPCs: débito, refund, leitura de saldo
// ═════════════════════════════════════════════════════════════════════

/**
 * Debita créditos atomicamente via RPC. Lança erro se saldo insuficiente.
 *
 * @returns novo saldo após o débito
 * @throws Error com message="insufficient_credits" se saldo < amount
 */
export async function debitCredits(
  supabase: SupabaseClient,
  amount: number,
  description: string,
  refId?: string,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const { data, error } = await supabase.rpc("debit_credits", {
    p_amount: amount,
    p_description: description,
    p_ref_id: refId ?? null,
    p_metadata: metadata ?? null,
  });

  if (error) {
    if (error.message?.includes("insufficient_credits")) {
      throw new Error("insufficient_credits");
    }
    throw error;
  }

  return data as number;
}

/**
 * Lê saldo atual sem modificar.
 */
export async function getBalance(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();
  return (data?.balance as number) ?? 0;
}

/**
 * Estorna créditos a um usuário em caso de falha de geração.
 *
 * Usa service role pq `credit_credits` RPC não é exposto a `authenticated`
 * (proteção contra auto-crédito). Falha silenciosa em log.
 *
 * Pré-requisito: env var `SUPABASE_SERVICE_ROLE_KEY` configurada.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (amount <= 0) return;
  const sb = serviceClient();
  if (!sb) {
    console.error("[refund] SUPABASE_SERVICE_ROLE_KEY ausente — refund de", amount, "créd para", userId, "NÃO foi processado");
    return;
  }
  try {
    const { error } = await sb.rpc("credit_credits", {
      p_user_id: userId,
      p_amount: amount,
      p_type: "refund",
      p_description: description,
      p_ref_id: null,
      p_metadata: metadata ?? null,
    });
    if (error) console.error("[refund] RPC falhou:", error.message, "amount:", amount, "user:", userId);
  } catch (e) {
    console.error("[refund] erro inesperado:", e);
  }
}

// ═════════════════════════════════════════════════════════════════════
// 7. Cap mensal de gasto com provider — proteção catastrófica
// ═════════════════════════════════════════════════════════════════════

/**
 * Verifica se a chamada cabe no cap mensal de gasto com provider (MuAPI).
 * Se exceder, bloqueia. Se passar de 75% pela primeira vez, dispara alerta.
 *
 * @returns { allowed: true, remaining_brl } se ok
 * @returns { allowed: false, reason } se cap atingido (HTTP 503 no caller)
 */
export interface ProviderCapCheckResult {
  allowed: boolean;
  estimated_brl: number;
  current_total_brl: number;
  cap_brl: number;
  remaining_brl: number;
  reason?: string;
}

/** @deprecated use ProviderCapCheckResult */
export type KieCapCheckResult = ProviderCapCheckResult;

export async function checkProviderCap(estimatedBRL: number): Promise<ProviderCapCheckResult> {
  // Aceita tanto MUAPI_MONTHLY_CAP_BRL (novo) quanto KIE_MONTHLY_CAP_BRL (legado)
  const defaultCap = Number(
    process.env.MUAPI_MONTHLY_CAP_BRL ?? process.env.KIE_MONTHLY_CAP_BRL ?? 200
  );
  const sb = serviceClient();

  // Sem service role: degrada gracefully (permite mas loga). Melhor liberar do que travar tudo por config errada.
  if (!sb) {
    console.error("[kieCap] SUPABASE_SERVICE_ROLE_KEY ausente — cap NÃO aplicado");
    return { allowed: true, estimated_brl: estimatedBRL, current_total_brl: 0, cap_brl: defaultCap, remaining_brl: defaultCap };
  }

  const { data, error } = await sb.rpc("get_kie_monthly_status", { p_default_cap: defaultCap });
  if (error || !data) {
    console.error("[kieCap] get_kie_monthly_status falhou — cap não aplicado", error);
    return { allowed: true, estimated_brl: estimatedBRL, current_total_brl: 0, cap_brl: defaultCap, remaining_brl: defaultCap };
  }

  const status = data as { total_brl: number; cap_brl: number; remaining_brl: number; over_cap: boolean };
  const wouldExceed = status.total_brl + estimatedBRL > status.cap_brl;

  if (status.over_cap || wouldExceed) {
    return {
      allowed: false,
      estimated_brl: estimatedBRL,
      current_total_brl: status.total_brl,
      cap_brl: status.cap_brl,
      remaining_brl: status.remaining_brl,
      reason: `Limite mensal do serviço atingido (R$ ${status.total_brl.toFixed(2)} / R$ ${status.cap_brl.toFixed(2)}). Tente novamente no próximo mês ou contate o suporte.`,
    };
  }

  return {
    allowed: true,
    estimated_brl: estimatedBRL,
    current_total_brl: status.total_brl,
    cap_brl: status.cap_brl,
    remaining_brl: status.remaining_brl,
  };
}

/**
 * Registra gasto real do provider após sucesso da chamada.
 * Dispara alerta 75% se for o primeiro request a cruzar esse threshold.
 */
export async function logProviderUsage(actualBRL: number): Promise<void> {
  if (actualBRL <= 0) return;
  const sb = serviceClient();
  if (!sb) return;

  try {
    const { data: newTotal } = await sb.rpc("add_kie_usage", { p_brl: actualBRL });
    const cap = Number(
      process.env.MUAPI_MONTHLY_CAP_BRL ?? process.env.KIE_MONTHLY_CAP_BRL ?? 200
    );
    if (typeof newTotal === "number" && newTotal >= cap * 0.75) {
      const { data: justMarked } = await sb.rpc("mark_kie_alert_75pct");
      if (justMarked === true) {
        // TODO: enviar email para o admin (Resend / nodemailer)
        console.warn("[providerCap] 🚨 ALERTA 75%: gasto chegou em R$", newTotal, "/ R$", cap);
      }
    }
  } catch (e) {
    console.error("[providerUsage] log falhou:", e);
  }
}

/** @deprecated use `checkProviderCap` — alias temporário */
export const checkKieCap = checkProviderCap;
/** @deprecated use `logProviderUsage` — alias temporário */
export const logKieUsage = logProviderUsage;

// ═════════════════════════════════════════════════════════════════════
// 8. Cap diário Free
// ═════════════════════════════════════════════════════════════════════

/**
 * Verifica quantas gerações de um tipo o user fez hoje.
 * Para Free tier, usa FREE_DAILY_LIMITS para checar.
 *
 * @returns { allowed, count, limit } — allowed=false bloqueia
 */
export async function checkDailyLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: string,
  kind: "image" | "video" | "audio",
): Promise<{ allowed: boolean; count: number; limit: number; reason?: string }> {
  if (plan !== "free") return { allowed: true, count: 0, limit: -1 };

  const limit = FREE_DAILY_LIMITS[kind];
  if (limit === 0) {
    return { allowed: false, count: 0, limit, reason: `${kind === "video" ? "Vídeos" : "Áudios"} não disponíveis no plano Free. Faça upgrade para Premium.` };
  }

  const { data, error } = await supabase.rpc("get_daily_generations", { p_user_id: userId, p_kind: kind });
  if (error) {
    console.error("[dailyLimit] RPC falhou — liberando", error);
    return { allowed: true, count: 0, limit };
  }
  const count = (data as number) ?? 0;
  if (count >= limit) {
    return { allowed: false, count, limit, reason: `Limite diário Free atingido (${count}/${limit} ${kind === "image" ? "imagens" : kind === "video" ? "vídeos" : "áudios"}). Volte amanhã ou faça upgrade.` };
  }
  return { allowed: true, count, limit };
}

// ═════════════════════════════════════════════════════════════════════
// 9. Helper interno: client com service role
// ═════════════════════════════════════════════════════════════════════

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(url, key);
}
