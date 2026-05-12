/**
 * DELETE /api/admin/generations/[id]  → soft delete (marca deleted_at)
 * POST   /api/admin/generations/[id]/restore → tira o soft delete
 *
 * Soft delete preserva o registro pra auditoria e refund/forensics.
 * A galeria do usuário filtra `deleted_at IS NULL` automaticamente.
 *
 * Body do DELETE: { reason: string ≥ 10 chars }
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { z } from "zod";

const deleteSchema = z.object({
  reason: z.string().min(10).max(500),
  restore: z.boolean().optional(),
});

interface RouteParams {
  params: { id: string };
}

export async function DELETE(req: Request, ctx: RouteParams) {
  return handle(req, ctx, false);
}

// Restore via PATCH com body { restore: true }
export async function PATCH(req: Request, ctx: RouteParams) {
  return handle(req, ctx, true);
}

async function handle(req: Request, ctx: RouteParams, isRestore: boolean) {
  try {
    const { user } = await requireAdmin("generations.delete");
    const { id } = ctx.params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new AdminError(400, "invalid_input", "ID inválido");
    }

    const rl = checkAdminRateLimit(`generations.delete:${user.id}`, 30);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: `Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.` } },
        { status: 429 }
      );
    }

    let body: { reason: string };
    try {
      body = deleteSchema.pick({ reason: true }).parse(await req.json());
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: { code: "invalid_input", message: e.issues.map((i) => i.message).join("; ") } },
          { status: 400 }
        );
      }
      throw e;
    }

    const sb = createAdminClient();

    const { data: existing, error: getErr } = await sb
      .from("generations")
      .select("id, user_id, type, model, deleted_at")
      .eq("id", id)
      .maybeSingle();

    if (getErr || !existing) {
      throw new AdminError(404, "not_found", "Geração não encontrada");
    }

    const before = {
      isDeleted: !!existing.deleted_at,
      deletedAt: existing.deleted_at,
    };

    const update = isRestore
      ? { deleted_at: null, deleted_by: null, delete_reason: null }
      : { deleted_at: new Date().toISOString(), deleted_by: user.id, delete_reason: body.reason };

    const { error: upErr } = await sb
      .from("generations")
      .update(update)
      .eq("id", id);

    if (upErr) {
      console.error(`[admin/generations] ${isRestore ? "restore" : "soft delete"} failed:`, upErr);
      throw new AdminError(500, "db_error", upErr.message);
    }

    const action = isRestore ? "generation.restore" : "generation.delete";
    const after = isRestore
      ? { isDeleted: false, deletedAt: null }
      : { isDeleted: true, deletedAt: update.deleted_at };

    await createAdminAuditLog({
      adminUserId: user.id,
      targetUserId: existing.user_id,
      action,
      entityType: "generation",
      entityId: id,
      before,
      after,
      metadata: {
        reason: body.reason,
        type: existing.type,
        model: existing.model,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, action });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
