/**
 * Sistema de créditos — custos por modelo + helpers de débito.
 *
 * Custo é em "créditos VisionBrave" (VBC). Aproximação:
 *   1 crédito = $0.01 USD em custo KIE médio
 *
 * Plano Free: 50 VBC/mês. Pro: 1500 VBC. Enterprise: 10000 VBC.
 */

export const CREDIT_COSTS = {
  // Imagem
  "Nano Banana": 2,
  "GPT Image 2": 4,
  "Flux Pro": 3,
  "Flux Kontext": 3,
  // Vídeo
  "Seedance 2": 12,
  "Seedance 2 Fast": 6,
  "Veo 3 Fast": 18,
  "Veo 3": 30,
  "Kling 2.1": 8,
  "Kling 3.0": 15,
  // Áudio (Suno)
  "V4": 4,
  "V4_5": 5,
  "V4_5PLUS": 6,
  "V4_5ALL": 8,
  "V5": 7,
  "V5_5": 8,
} as const;

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
