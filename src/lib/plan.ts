import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lê o plano ativo do usuário. Default 'free' se sem subscription.
 *
 * Usado nas APIs de geração para decidir se aplica watermark + para
 * mostrar restrições/ofertas de upgrade na UI.
 */
export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!data) return "free";
  // Trata canceled/past_due como free para watermark
  if (data.status !== "active" && data.status !== "trialing") return "free";
  return data.plan ?? "free";
}

/**
 * Decide se um plano deve aplicar marca d'água nas gerações.
 * Apenas Free recebe watermark.
 */
export function shouldWatermark(plan: string): boolean {
  return plan === "free";
}
