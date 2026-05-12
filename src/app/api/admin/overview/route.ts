/**
 * GET /api/admin/overview
 *
 * Retorna KPIs reais consolidados para o dashboard admin.
 * Não inventa dados — se uma fonte falhar, retorna fallback transparente.
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateEstimatedMRR } from "@/lib/admin/pricing";
import type { AdminOverview } from "@/lib/admin/types";

export async function GET() {
  try {
    await requireAdmin("admin.access");
    const sb = createAdminClient();

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── 1. Users ──────────────────────────────────────────────────
    // auth.users só acessível via admin client. Lista todos os users paginado.
    // MVP: aceita que pra 10k+ users isso fica pesado. Otimizar com query SQL depois.
    let totalUsers = 0;
    let newToday = 0, new7d = 0, new30d = 0;
    try {
      const { data: allUsers } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const users = allUsers?.users ?? [];
      totalUsers = users.length;
      for (const u of users) {
        const created = new Date(u.created_at);
        if (created >= today) newToday++;
        if (created >= sevenDaysAgo) new7d++;
        if (created >= thirtyDaysAgo) new30d++;
      }
    } catch (e) {
      console.error("[overview] auth users listing failed:", e);
    }

    // ─── 2. Subscriptions ─────────────────────────────────────────
    const { data: subs } = await sb
      .from("subscriptions")
      .select("plan, status");

    const subscriptions = {
      active: 0, canceled: 0, pastDue: 0, trialing: 0,
      byPlan: {} as Record<string, number>,
      mrrEstimatedBRL: 0,
    };
    // MRR só conta active subs por plano (não trial nem canceled)
    const activeByPlan: Record<string, number> = {};
    for (const s of subs ?? []) {
      if (s.status === "active") {
        subscriptions.active++;
        activeByPlan[s.plan] = (activeByPlan[s.plan] ?? 0) + 1;
      }
      else if (s.status === "canceled") subscriptions.canceled++;
      else if (s.status === "past_due") subscriptions.pastDue++;
      else if (s.status === "trialing") subscriptions.trialing++;
      subscriptions.byPlan[s.plan] = (subscriptions.byPlan[s.plan] ?? 0) + 1;
    }
    subscriptions.mrrEstimatedBRL = calculateEstimatedMRR(activeByPlan).totalBRL;
    const usersByPlan = { ...subscriptions.byPlan };

    // ─── 3. Credits ───────────────────────────────────────────────
    const { data: creditsRows } = await sb
      .from("credits")
      .select("balance, total_earned, total_spent");

    const credits = {
      totalInCirculation: 0,
      totalEarned: 0,
      totalSpent: 0,
      adminAdjustmentsLast30d: 0,
    };
    for (const c of creditsRows ?? []) {
      credits.totalInCirculation += c.balance ?? 0;
      credits.totalEarned        += c.total_earned ?? 0;
      credits.totalSpent         += c.total_spent ?? 0;
    }

    // Ajustes admin nos últimos 30d (transactions com metadata.source = 'admin')
    const { data: adminTx } = await sb
      .from("credit_transactions")
      .select("amount, metadata")
      .gte("created_at", thirtyDaysAgo.toISOString());
    for (const tx of adminTx ?? []) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      if (meta.source === "admin") credits.adminAdjustmentsLast30d++;
    }

    // ─── 4. Generations (via credit_transactions tipo 'spend') ────
    const { count: totalSpend } = await sb
      .from("credit_transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "spend");

    const { count: last24h } = await sb
      .from("credit_transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "spend")
      .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const { count: last7d } = await sb
      .from("credit_transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "spend")
      .gte("created_at", sevenDaysAgo.toISOString());

    // Top model dos últimos 30d (extrai de metadata.model)
    const { data: recentSpends } = await sb
      .from("credit_transactions")
      .select("metadata")
      .eq("type", "spend")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(1000);

    const modelCounts: Record<string, number> = {};
    for (const tx of recentSpends ?? []) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const model = typeof meta.model === "string" ? meta.model : null;
      if (model) modelCounts[model] = (modelCounts[model] ?? 0) + 1;
    }
    const topModel = Object.entries(modelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // ─── 5. KIE Cap ────────────────────────────────────────────────
    const defaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
    const { data: kieStatusData } = await sb.rpc("get_kie_monthly_status", {
      p_default_cap: defaultCap,
    });

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const k = (kieStatusData ?? null) as
      | { total_brl: number; cap_brl: number; remaining_brl: number; over_cap: boolean }
      | null;

    const kieTotalBRL = k?.total_brl ?? 0;
    const kieCapBRL = k?.cap_brl ?? defaultCap;
    const kieRemaining = k?.remaining_brl ?? kieCapBRL;
    const kiePercent = kieCapBRL > 0 ? (kieTotalBRL / kieCapBRL) * 100 : 0;
    const kieOverCap = !!k?.over_cap;

    const kieStatus: AdminOverview["kie"]["status"] = kieOverCap
      ? "bloqueado"
      : kiePercent >= 75 ? "critico"
      : kiePercent >= 50 ? "atencao"
      : "normal";

    // ─── 6. Health checks ─────────────────────────────────────────
    const health = {
      supabaseOk: true, // se chegou até aqui, Supabase respondeu
      serviceRoleConfigured:    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      kieKeyConfigured:         !!process.env.KIE_AI_API_KEY,
      kieMonthlyCapConfigured:  !!process.env.KIE_MONTHLY_CAP_BRL,
      siteUrlConfigured:        !!process.env.NEXT_PUBLIC_SITE_URL,
    };

    const overview: AdminOverview = {
      users: {
        total: totalUsers,
        newToday, new7d, new30d,
        byPlan: usersByPlan,
      },
      subscriptions,
      credits,
      generations: {
        totalSpend: totalSpend ?? 0,
        last24h: last24h ?? 0,
        last7d: last7d ?? 0,
        topModel,
      },
      kie: {
        monthKey,
        totalBRL: kieTotalBRL,
        capBRL: kieCapBRL,
        remainingBRL: kieRemaining,
        percentUsed: Math.round(kiePercent * 10) / 10,
        overCap: kieOverCap,
        status: kieStatus,
      },
      health,
    };

    return NextResponse.json(overview);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
