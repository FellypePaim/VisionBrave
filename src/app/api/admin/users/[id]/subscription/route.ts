/**
 * PATCH /api/admin/users/[id]/subscription
 *
 * Atualiza plan e/ou status da subscription de um usuário.
 * Body: { plan?, status?, reason: string ≥ 5 chars }
 * Ao menos um de plan ou status deve ser informado.
 *
 * Segurança:
 *   - requireAdmin("subscriptions.update")
 *   - Rate limit 10/min/admin
 *   - Audit log com before/after
 *
 * NÃO faz upsert: se a subscription não existir, retorna 404 (todo user deve ter
 * sido criado via trigger handle_new_user_credits).
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { subscriptionUpdateSchema } from "@/lib/admin/schemas";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { ZodError } from "zod";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(req: Request, ctx: RouteParams) {
  try {
    const { user } = await requireAdmin("subscriptions.update");
    const { id } = ctx.params;

    const rl = checkAdminRateLimit(`sub.update:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: `Muitas operações. Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.` } },
        { status: 429 }
      );
    }

    const body = subscriptionUpdateSchema.parse({ ...(await req.json()), userId: id });

    if (!body.plan && !body.status) {
      throw new AdminError(400, "invalid_input", "Informe ao menos plan ou status");
    }

    const sb = createAdminClient();

    // 1. Buscar subscription atual
    const { data: current, error: getErr } = await sb
      .from("subscriptions")
      .select("plan, status, monthly_credits, current_period_end")
      .eq("user_id", id)
      .maybeSingle();

    if (getErr) {
      console.error("[admin/users/sub] get failed:", getErr);
      throw new AdminError(500, "db_error", getErr.message);
    }
    if (!current) {
      throw new AdminError(404, "not_found", "Subscription não encontrada para este usuário");
    }

    const before = {
      plan: current.plan,
      status: current.status,
      monthly_credits: current.monthly_credits,
    };

    // 2. Aplicar update parcial
    const update: { plan?: typeof body.plan; status?: typeof body.status; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (body.plan) update.plan = body.plan;
    if (body.status) update.status = body.status;

    const { data: updated, error: upErr } = await sb
      .from("subscriptions")
      .update(update)
      .eq("user_id", id)
      .select("plan, status, monthly_credits")
      .single();

    if (upErr) {
      console.error("[admin/users/sub] update failed:", upErr);
      throw new AdminError(500, "db_error", upErr.message);
    }

    const after = {
      plan: updated.plan,
      status: updated.status,
      monthly_credits: updated.monthly_credits,
    };

    // 3. Audit log
    await createAdminAuditLog({
      adminUserId: user.id,
      targetUserId: id,
      action: "subscription.update",
      entityType: "subscription",
      entityId: id,
      before,
      after,
      metadata: { reason: body.reason },
      request: req,
    });

    return NextResponse.json({ ok: true, before, after });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } },
        { status: 400 }
      );
    }
    return adminErrorResponse(err);
  }
}
