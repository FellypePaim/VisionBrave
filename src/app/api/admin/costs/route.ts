/**
 * GET /api/admin/costs
 *
 * Análise financeira consolidada:
 *   - Receita mensal estimada (MRR)
 *   - Gasto KIE estimado (mês corrente)
 *   - Margem bruta estimada
 *   - Créditos: emitidos, gastos, parados (saldo médio)
 *   - Custo estimado por modelo (top 10 últimos 30d)
 *   - Custo estimado por usuário (top 10 últimos 30d)
 *   - Receita estimada por plano
 *
 * Query params:
 *   period → "30d" (default) | "7d" | "month" (mês corrente)
 *
 * IMPORTANTE: Como NÃO temos gateway integrado, o MRR é teórico.
 * Custo KIE é estimado via KIE_COST_USD × R$5,40, não o real cobrado pela KIE.AI.
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateEstimatedMRR } from "@/lib/admin/pricing";

const KIE_COST_USD_PRIVATE: Record<string, number> = {
  // Imagem
  "Nano Banana": 0.04,
  "Nano Banana Pro": 0.12,
  "GPT Image 2": 0.04,
  "Flux Pro": 0.05,
  "Flux Kontext": 0.04,
  "Flux Kontext Max": 0.08,
  // Vídeo
  "Seedance 2 Fast": 0.30,
  "Veo 3 Fast": 0.40,
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
const USD_TO_BRL = 5.4;

interface CostsResponse {
  period: string;
  periodLabel: string;
  revenue: {
    mrrTotalBRL: number;
    byPlan: Record<string, { count: number; pricePerUnit: number; subtotalBRL: number }>;
    note: string;
  };
  kieCost: {
    monthKey: string;
    estimatedBRL: number;
    capBRL: number;
    note: string;
  };
  margin: {
    estimatedBRL: number;
    estimatedPercent: number;
    note: string;
  };
  credits: {
    totalInCirculation: number;
    totalEarned: number;
    totalSpent: number;
    averageBalancePerUser: number;
    stockholderRatio: number;  // earned/spent ratio — > 1 = créditos parados
  };
  byModel: Array<{
    model: string;
    spendCount: number;
    estimatedKieCostBRL: number;
    creditsCharged: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string | null;
    spendCount: number;
    creditsSpent: number;
    estimatedKieCostBRL: number;
  }>;
}

export async function GET(req: Request) {
  try {
    await requireAdmin("admin.access");

    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? "30d";

    const now = new Date();
    let fromDate: Date;
    let periodLabel: string;
    if (period === "7d") {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = "Últimos 7 dias";
    } else if (period === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = "Mês corrente";
    } else {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      periodLabel = "Últimos 30 dias";
    }

    const sb = createAdminClient();

    // ─── 1. Receita estimada (MRR) ────────────────────────────────────
    const { data: subs } = await sb
      .from("subscriptions")
      .select("plan, status")
      .eq("status", "active");

    const subsByPlan: Record<string, number> = {};
    for (const s of subs ?? []) {
      subsByPlan[s.plan] = (subsByPlan[s.plan] ?? 0) + 1;
    }
    const mrr = calculateEstimatedMRR(subsByPlan);

    // ─── 2. Gasto KIE estimado (mês corrente) ─────────────────────────
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const defaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
    const { data: kieStatus } = await sb.rpc("get_kie_monthly_status", { p_default_cap: defaultCap });
    const kie = (kieStatus ?? null) as { total_brl: number; cap_brl: number } | null;
    const kieEstimatedBRL = kie?.total_brl ?? 0;
    const kieCapBRL = kie?.cap_brl ?? defaultCap;

    // ─── 3. Créditos em circulação ────────────────────────────────────
    const { data: credits } = await sb
      .from("credits")
      .select("balance, total_earned, total_spent");

    let creditsInCirculation = 0;
    let creditsEarned = 0;
    let creditsSpent = 0;
    for (const c of credits ?? []) {
      creditsInCirculation += c.balance ?? 0;
      creditsEarned += c.total_earned ?? 0;
      creditsSpent += c.total_spent ?? 0;
    }
    const userCount = (credits ?? []).length || 1;
    const avgBalance = Math.round(creditsInCirculation / userCount);
    const stockholderRatio = creditsSpent > 0 ? creditsEarned / creditsSpent : creditsEarned > 0 ? Infinity : 1;

    // ─── 4. Spend por modelo (período) ────────────────────────────────
    const { data: spends } = await sb
      .from("credit_transactions")
      .select("user_id, amount, metadata, created_at")
      .eq("type", "spend")
      .gte("created_at", fromDate.toISOString())
      .limit(5000);

    const byModelMap = new Map<string, { count: number; creditsCharged: number; estimatedKieBRL: number }>();
    const byUserMap = new Map<string, { count: number; creditsSpent: number; estimatedKieBRL: number }>();

    for (const tx of spends ?? []) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const model = typeof meta.model === "string" ? meta.model : "unknown";
      // KIE BRL estimado: prefere o que foi gravado em metadata.kie_cost_brl, fallback recalcula
      let kieBRL = typeof meta.kie_cost_brl === "number" ? meta.kie_cost_brl : 0;
      if (kieBRL === 0 && model in KIE_COST_USD_PRIVATE) {
        kieBRL = (KIE_COST_USD_PRIVATE[model] ?? 0) * USD_TO_BRL;
      }
      const credits = Math.abs(tx.amount ?? 0);

      const mEntry = byModelMap.get(model) ?? { count: 0, creditsCharged: 0, estimatedKieBRL: 0 };
      mEntry.count++;
      mEntry.creditsCharged += credits;
      mEntry.estimatedKieBRL += kieBRL;
      byModelMap.set(model, mEntry);

      const uEntry = byUserMap.get(tx.user_id) ?? { count: 0, creditsSpent: 0, estimatedKieBRL: 0 };
      uEntry.count++;
      uEntry.creditsSpent += credits;
      uEntry.estimatedKieBRL += kieBRL;
      byUserMap.set(tx.user_id, uEntry);
    }

    const byModel = Array.from(byModelMap.entries())
      .map(([model, v]) => ({
        model,
        spendCount: v.count,
        estimatedKieCostBRL: Math.round(v.estimatedKieBRL * 100) / 100,
        creditsCharged: v.creditsCharged,
      }))
      .sort((a, b) => b.estimatedKieCostBRL - a.estimatedKieCostBRL)
      .slice(0, 10);

    // Top users por gasto KIE
    const topUsersRaw = Array.from(byUserMap.entries())
      .sort(([, a], [, b]) => b.estimatedKieBRL - a.estimatedKieBRL)
      .slice(0, 10);

    const emailMap = new Map<string, string | null>();
    await Promise.all(
      topUsersRaw.map(async ([uid]) => {
        try {
          const { data } = await sb.auth.admin.getUserById(uid);
          emailMap.set(uid, data?.user?.email ?? null);
        } catch {
          emailMap.set(uid, null);
        }
      })
    );

    const topUsers = topUsersRaw.map(([uid, v]) => ({
      userId: uid,
      email: emailMap.get(uid) ?? null,
      spendCount: v.count,
      creditsSpent: v.creditsSpent,
      estimatedKieCostBRL: Math.round(v.estimatedKieBRL * 100) / 100,
    }));

    // ─── 5. Margem estimada ───────────────────────────────────────────
    const marginBRL = mrr.totalBRL - kieEstimatedBRL;
    const marginPct = mrr.totalBRL > 0 ? (marginBRL / mrr.totalBRL) * 100 : 0;

    const response: CostsResponse = {
      period,
      periodLabel,
      revenue: {
        mrrTotalBRL: mrr.totalBRL,
        byPlan: mrr.byPlan,
        note: "MRR é ESTIMADO — gateway de pagamento ainda não integrado. Calculado a partir de subscriptions com status='active' × preço mensal hardcoded.",
      },
      kieCost: {
        monthKey,
        estimatedBRL: kieEstimatedBRL,
        capBRL: kieCapBRL,
        note: "Gasto KIE estimado via tabela KIE_COST_USD × R$5,40. NÃO é o valor real cobrado pela KIE.AI — use só pra trend.",
      },
      margin: {
        estimatedBRL: marginBRL,
        estimatedPercent: Math.round(marginPct * 10) / 10,
        note: "Margem = MRR estimado - Custo KIE estimado do mês. Ambas são estimativas, então a margem é aproximação dupla.",
      },
      credits: {
        totalInCirculation: creditsInCirculation,
        totalEarned: creditsEarned,
        totalSpent: creditsSpent,
        averageBalancePerUser: avgBalance,
        stockholderRatio: Math.round(stockholderRatio * 100) / 100,
      },
      byModel,
      topUsers,
    };

    return NextResponse.json(response);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
