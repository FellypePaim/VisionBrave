/**
 * Sistema de créditos VisionBrave — pricing v2 (2026-05-11).
 *
 * Modelo "Magnific-look" mas conservador:
 *   1 crédito ≈ R$ 0,0061 (Premium) a R$ 0,0045 (Pro)
 *   Markup 2,8x sobre custo KIE.AI real (USD × R$5,40 × 2,8 ÷ R$0,0061)
 *
 * Planos:
 *   Free        — 200 créd/mês  — só imagem básica + Suno V4 (cap 3 imagens/dia)
 *   Premium     — 8.000 créd/mês — tudo exceto Veo Quality / Seedance 1080p / Kling Pro
 *   Premium+    — 25.000 créd/mês — idem Premium + mais volume
 *   Pro         — 100.000 créd/mês — tudo liberado
 *
 * Ver `arquitetura-visionbrave.md` no vault PAIM para detalhes de pricing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ═════════════════════════════════════════════════════════════════════
// 1. Tabela de custos (créditos cobrados do user)
// ═════════════════════════════════════════════════════════════════════

export const CREDIT_COSTS = {
  // ── Imagem (custo KIE × 2,8 markup ÷ R$0,0061)
  "Nano Banana": 50,            // 1K. 4K usa multiplier ×2 = 100
  "Nano Banana Pro": 325,       // Gemini 3 Pro 4K
  "GPT Image 2": 100,
  "Flux Pro": 125,
  "Flux Kontext": 100,          // pro
  "Flux Kontext Max": 200,
  // ── Vídeo — base 5s, 720p (multiplier por duration/5 e ×1.5 se 1080p, ×2 se 4K)
  "Seedance 2 Fast": 750,       // 720p ($0.30/5s)
  "Veo 3 Fast": 1000,           // 8s ($0.40 — fixo, sem multiplier de duração)
  "Kling 2.1": 1000,            // i2v ($0.40/5s)
  "Seedance 2": 1700,           // 720p i2v ($0.625/5s) — só Premium+/Pro
  "Kling 3.0": 1575,            // std 720p ($0.63/5s) — só Premium+/Pro
  "Kling 3.0 Pro": 2270,        // 1080p ($0.84/5s) — só Pro
  "Veo 3": 5000,                // quality 8s ($2.00) — só Pro
  // ── Áudio Suno
  "V4": 125,
  "V4_5": 125,
  "V4_5PLUS": 175,
  "V4_5ALL": 200,
  "V5": 200,
  "V5_5": 200,
} as const;

// ═════════════════════════════════════════════════════════════════════
// 2. Tabela de custo KIE em R$ (para tracking de cap mensal)
//    Usado por checkAndLogKieCost — NUNCA exibido ao user.
// ═════════════════════════════════════════════════════════════════════

const USD_TO_BRL = 5.4;  // taxa fixa pra evitar volatilidade

const KIE_COST_USD: Record<string, number> = {
  // Imagem
  "Nano Banana": 0.04,
  "Nano Banana Pro": 0.12,
  "GPT Image 2": 0.04,
  "Flux Pro": 0.05,
  "Flux Kontext": 0.04,
  "Flux Kontext Max": 0.08,
  // Vídeo (5s base 720p, exceto Veo Fast/Quality que são 8s fixo)
  "Seedance 2 Fast": 0.30,
  "Veo 3 Fast": 0.40,           // 8s c/ áudio
  "Kling 2.1": 0.40,
  "Seedance 2": 0.625,
  "Kling 3.0": 0.63,
  "Kling 3.0 Pro": 0.84,
  "Veo 3": 2.00,
  // Áudio
  "V4": 0.05,
  "V4_5": 0.05,
  "V4_5PLUS": 0.06,
  "V4_5ALL": 0.07,
  "V5": 0.08,
  "V5_5": 0.08,
};

/**
 * Calcula custo KIE estimado em R$ (para tracking de cap mensal).
 * Mesmo multiplier do calculateCost — assim o cap acompanha proporcionalmente.
 */
export function estimateKieCostBRL(
  model: string,
  options?: { count?: number; durationSeconds?: number; resolution?: string },
): number {
  const baseUSD = KIE_COST_USD[model] ?? 0.05;
  let multiplier = 1;
  if (options?.count && options.count > 1) multiplier *= options.count;
  if (options?.durationSeconds && options.durationSeconds > 5) multiplier *= options.durationSeconds / 5;
  if (options?.resolution === "4K" || options?.resolution === "4k") multiplier *= 2;
  else if (options?.resolution === "1080p") multiplier *= 1.5;
  return Math.round(baseUSD * multiplier * USD_TO_BRL * 100) / 100;
}

// ═════════════════════════════════════════════════════════════════════
// 3. Acesso por plano
// ═════════════════════════════════════════════════════════════════════

export type PlanKey = "free" | "premium" | "premiumplus" | "pro" | "enterprise";

export const PLAN_MODEL_ACCESS: Record<PlanKey, string[]> = {
  free: [
    // só básico — sem vídeo, sem premium audio
    "Nano Banana", "Flux Kontext",
    "V4", "V4_5",
  ],
  premium: [
    // tudo exceto vídeo premium e Suno top
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Veo 3 Fast", "Kling 2.1",
    "V4", "V4_5", "V4_5PLUS",
  ],
  premiumplus: [
    // Premium + vídeos médios + áudio top
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Seedance 2", "Veo 3 Fast", "Kling 2.1", "Kling 3.0",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
  pro: [
    // tudo
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Seedance 2", "Veo 3 Fast", "Veo 3", "Kling 2.1", "Kling 3.0", "Kling 3.0 Pro",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
  enterprise: [
    // alias de Pro (até existir tier corporativo)
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Seedance 2", "Veo 3 Fast", "Veo 3", "Kling 2.1", "Kling 3.0", "Kling 3.0 Pro",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
};

export function isModelAllowedForPlan(plan: string, model: string): boolean {
  const list = PLAN_MODEL_ACCESS[(plan as PlanKey)] ?? PLAN_MODEL_ACCESS.free;
  return list.includes(model);
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
  const baseCost = (CREDIT_COSTS as Record<string, number>)[model] ?? 100;
  let multiplier = 1;
  if (options?.count && options.count > 1) multiplier *= options.count;
  if (options?.durationSeconds && options.durationSeconds > 5) multiplier *= options.durationSeconds / 5;
  if (options?.resolution === "4K" || options?.resolution === "4k") multiplier *= 2;
  else if (options?.resolution === "1080p") multiplier *= 1.5;
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
// 7. Cap KIE global mensal — proteção catastrófica
// ═════════════════════════════════════════════════════════════════════

/**
 * Verifica se a chamada cabe no cap mensal de gasto KIE.
 * Se exceder, bloqueia. Se passar de 75% pela primeira vez, dispara alerta.
 *
 * @returns { allowed: true, remaining_brl } se ok
 * @returns { allowed: false, reason } se cap atingido (HTTP 503 no caller)
 */
export interface KieCapCheckResult {
  allowed: boolean;
  estimated_brl: number;
  current_total_brl: number;
  cap_brl: number;
  remaining_brl: number;
  reason?: string;
}

export async function checkKieCap(estimatedBRL: number): Promise<KieCapCheckResult> {
  const defaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
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
 * Registra gasto KIE real após sucesso da chamada.
 * Dispara alerta 75% se for o primeiro request a cruzar esse threshold.
 */
export async function logKieUsage(actualBRL: number): Promise<void> {
  if (actualBRL <= 0) return;
  const sb = serviceClient();
  if (!sb) return;

  try {
    const { data: newTotal } = await sb.rpc("add_kie_usage", { p_brl: actualBRL });
    const cap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
    if (typeof newTotal === "number" && newTotal >= cap * 0.75) {
      const { data: justMarked } = await sb.rpc("mark_kie_alert_75pct");
      if (justMarked === true) {
        // TODO: enviar email para o admin (Resend / nodemailer)
        console.warn("[kieCap] 🚨 ALERTA 75%: gasto KIE chegou em R$", newTotal, "/ R$", cap, "— enviar email ao admin");
      }
    }
  } catch (e) {
    console.error("[kieUsage] log falhou:", e);
  }
}

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
