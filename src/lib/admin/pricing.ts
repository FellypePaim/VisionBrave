/**
 * Tabela de preços mensais por plano em BRL.
 *
 * Usada pra calcular MRR estimado (Monthly Recurring Revenue) e margem bruta.
 * Hardcoded em código pelo mesmo motivo do CREDIT_COSTS: pricing deve ser
 * code-reviewed, não configurável via banco.
 *
 * Como NÃO temos gateway de pagamento integrado, este MRR é uma ESTIMATIVA
 * baseada nas subscriptions ativas no banco. Quando integrar Stripe/Hoopay,
 * substituir por receita real reportada pelo gateway.
 */

import { PLAN_MODEL_ACCESS, type PlanKey } from "@/lib/credits";

/** Preços oficiais mensais em BRL (matching /pricing page) */
export const PLAN_MONTHLY_BRL: Record<PlanKey, number> = {
  free:         0,
  premium:      49,
  premiumplus:  129,
  pro:          449,
  enterprise:   449,  // tratado como Pro até existir tier corporativo
};

/** Variante anual com desconto de 20% — preço mensal equivalente */
export const PLAN_ANNUAL_BRL: Record<PlanKey, number> = {
  free:         0,
  premium:      39,
  premiumplus:  103,
  pro:          359,
  enterprise:   359,
};

/** Créditos mensais incluídos no plano */
export const PLAN_MONTHLY_CREDITS: Record<PlanKey, number> = {
  free:         200,
  premium:      8_000,
  premiumplus:  25_000,
  pro:          100_000,
  enterprise:   100_000,
};

/**
 * Calcula o MRR estimado dado a contagem de subscriptions ativas por plano.
 * @param byPlan Map plan → quantidade de subs ativas (status='active')
 * @returns MRR total em BRL (assume todos os pagantes estão no mensal — pessimista)
 */
export function calculateEstimatedMRR(byPlan: Record<string, number>): {
  totalBRL: number;
  byPlan: Record<string, { count: number; pricePerUnit: number; subtotalBRL: number }>;
} {
  const breakdown: Record<string, { count: number; pricePerUnit: number; subtotalBRL: number }> = {};
  let totalBRL = 0;

  for (const [plan, count] of Object.entries(byPlan)) {
    const price = PLAN_MONTHLY_BRL[plan as PlanKey] ?? 0;
    const subtotal = price * count;
    breakdown[plan] = {
      count,
      pricePerUnit: price,
      subtotalBRL: subtotal,
    };
    totalBRL += subtotal;
  }

  return { totalBRL, byPlan: breakdown };
}

/** Helper pra UI: lista de planos em ordem de preço crescente */
export function getPlanOrder(): PlanKey[] {
  return ["free", "premium", "premiumplus", "pro", "enterprise"];
}

/** Quantos modelos cada plano libera */
export function getPlanModelCount(plan: PlanKey): number {
  return PLAN_MODEL_ACCESS[plan]?.length ?? 0;
}
