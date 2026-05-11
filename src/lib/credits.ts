/**
 * Sistema de créditos — custos por modelo + helpers de débito.
 *
 * Custo é em "créditos VisionBrave" (VBC).
 *   1 VBC = R$ 0,098 (Pro) a R$ 0,080 (Studio) ≈ $0,018 USD
 *
 * Tabela calibrada em 2026-05-11 com markup ~3x sobre custo KIE.AI real
 * (USD/R$5,40 → ×3 / R$0,10 = VBC).
 *
 * Planos:
 *   Free   — 30 VBC/mês  — só imagem básica + Suno V4
 *   Pro    — 500 VBC/mês — todos exceto Veo Quality / Seedance 1080p / Kling Pro
 *   Studio — 2.500 VBC/mês — tudo liberado
 */

export const CREDIT_COSTS = {
  // ── Imagem (custos KIE $0.04-0.12 → ×3 markup)
  "Nano Banana": 7,
  "Nano Banana Pro": 20,        // novo — Gemini 3 Pro
  "GPT Image 2": 7,
  "Flux Pro": 8,
  "Flux Kontext": 7,            // pro
  "Flux Kontext Max": 13,       // novo — endpoint flux-kontext-max
  // ── Vídeo — custos por 5s @ 720p (multiplicado por duration/5 e resolution depois)
  "Seedance 2 Fast": 49,        // 720p t2v ($0.30/5s)
  "Seedance 2": 102,            // 720p i2v ($0.625/5s) — base
  "Kling 2.1": 65,              // i2v ($0.40/5s)
  "Kling 3.0": 103,             // std 720p ($0.63/5s)
  "Kling 3.0 Pro": 137,         // pro 1080p ($0.84/5s)
  "Veo 3 Fast": 65,             // 8s ($0.40)
  "Veo 3": 325,                 // quality 8s ($2.00) — só Studio
  // ── Áudio Suno
  "V4": 8,
  "V4_5": 8,
  "V4_5PLUS": 10,
  "V4_5ALL": 13,
  "V5": 13,
  "V5_5": 13,
} as const;

/**
 * Modelos disponíveis por plano. Usado em backend (gate) e UI (mostrar lock).
 */
export const PLAN_MODEL_ACCESS: Record<"free" | "pro" | "studio" | "enterprise", string[]> = {
  free: [
    "Nano Banana", "Flux Kontext",
    "V4", "V4_5",
  ],
  pro: [
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Veo 3 Fast", "Kling 2.1", "Kling 3.0",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
  studio: [
    // Tudo
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Seedance 2", "Veo 3 Fast", "Veo 3", "Kling 2.1", "Kling 3.0", "Kling 3.0 Pro",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
  enterprise: [
    // Tudo (alias de Studio por enquanto)
    "Nano Banana", "Nano Banana Pro", "GPT Image 2", "Flux Pro", "Flux Kontext", "Flux Kontext Max",
    "Seedance 2 Fast", "Seedance 2", "Veo 3 Fast", "Veo 3", "Kling 2.1", "Kling 3.0", "Kling 3.0 Pro",
    "V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5",
  ],
};

export function isModelAllowedForPlan(plan: string, model: string): boolean {
  const list = PLAN_MODEL_ACCESS[(plan as keyof typeof PLAN_MODEL_ACCESS)] ?? PLAN_MODEL_ACCESS.free;
  return list.includes(model);
}

export type ModelKey = keyof typeof CREDIT_COSTS;

/**
 * Calcula custo total para uma geração.
 * Para imagens, multiplica pelo `count` (quantas imagens).
 * Para vídeo, multiplica por (duration / 5) — vídeo de 10s custa 2x.
 */
export function calculateCost(
  model: string,
  options?: { count?: number; durationSeconds?: number; resolution?: string },
): number {
  const baseCost = (CREDIT_COSTS as Record<string, number>)[model] ?? 5;
  let multiplier = 1;

  if (options?.count && options.count > 1) {
    multiplier *= options.count;
  }
  if (options?.durationSeconds && options.durationSeconds > 5) {
    multiplier *= options.durationSeconds / 5;
  }
  if (options?.resolution === "4K" || options?.resolution === "4k") {
    multiplier *= 1.5;
  }

  return Math.max(1, Math.ceil(baseCost * multiplier));
}

import type { SupabaseClient } from "@supabase/supabase-js";

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
 * (proteção contra auto-crédito). Falha silenciosa em log — nunca quebra
 * a resposta ao usuário; melhor mostrar o erro original da API do que um
 * erro adicional de "refund failed".
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
  try {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("[refund] SUPABASE_SERVICE_ROLE_KEY ausente — refund de", amount, "VBC para", userId, "NÃO foi processado");
      return;
    }
    const sb = createServiceClient(url, key);
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
