/**
 * GET /api/admin/users/[id]
 *
 * Detalhe 360° de um usuário:
 *   - dados do auth.users (email, created_at, banned_until)
 *   - subscription completa
 *   - credits (balance + earned + spent)
 *   - últimas 50 transações
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserDetails } from "@/lib/admin/types";

interface RouteParams {
  params: { id: string };
}

export async function GET(_req: Request, ctx: RouteParams) {
  try {
    await requireAdmin("users.read");
    const { id } = ctx.params;

    // Valida UUID rapidinho
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AdminError(400, "invalid_input", "ID de usuário inválido");
    }

    const sb = createAdminClient();

    // 1. Auth user
    const { data: authData, error: authErr } = await sb.auth.admin.getUserById(id);
    if (authErr || !authData?.user) {
      throw new AdminError(404, "not_found", "Usuário não encontrado");
    }
    const u = authData.user;
    const banUntil = (u as { banned_until?: string | null }).banned_until ?? null;
    const isBlocked = !!banUntil && new Date(banUntil) > new Date();

    // 2. Subscription + credits em paralelo
    const [{ data: sub }, { data: creditsRow }] = await Promise.all([
      sb.from("subscriptions")
        .select("plan, status, monthly_credits, stripe_customer_id, stripe_subscription_id, current_period_end")
        .eq("user_id", id)
        .maybeSingle(),
      sb.from("credits")
        .select("balance, total_earned, total_spent")
        .eq("user_id", id)
        .maybeSingle(),
    ]);

    // 3. Últimas 50 transações
    const { data: txs } = await sb
      .from("credit_transactions")
      .select("id, amount, type, description, ref_id, metadata, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    const details: AdminUserDetails & {
      bannedUntil: string | null;
      transactions: Array<{
        id: string;
        amount: number;
        type: string;
        description: string | null;
        refId: string | null;
        metadata: unknown;
        createdAt: string;
      }>;
    } = {
      userId: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      plan: sub?.plan ?? "free",
      subscriptionStatus: sub?.status ?? "active",
      balance: creditsRow?.balance ?? 0,
      totalEarned: creditsRow?.total_earned ?? 0,
      totalSpent: creditsRow?.total_spent ?? 0,
      isBlocked,
      monthlyCredits: sub?.monthly_credits ?? 0,
      stripeCustomerId: sub?.stripe_customer_id ?? null,
      stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
      bannedUntil: banUntil,
      transactions: (txs ?? []).map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        refId: t.ref_id,
        metadata: t.metadata,
        createdAt: t.created_at,
      })),
    };

    return NextResponse.json(details);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
