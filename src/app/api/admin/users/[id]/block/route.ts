/**
 * POST /api/admin/users/[id]/block
 *
 * Banir / desbanir usuário via Supabase Auth nativo (supabase.auth.admin.updateUserById).
 * Quando banido, o user perde a sessão automaticamente (Supabase invalida tokens).
 *
 * Body: { blocked: boolean, reason: string ≥ 10 chars, confirmTargetEmail?: string }
 *
 * Segurança:
 *   - requireAdmin("users.block")
 *   - Rate limit 10/min/admin
 *   - Double-confirm por email pra BANIR (não pra desbanir)
 *   - Audit log com before/after
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { userBlockSchema } from "@/lib/admin/schemas";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { ZodError } from "zod";

interface RouteParams {
  params: { id: string };
}

// ban_duration aceita "none" pra remover ban, ou string ISO 8601 duration / segundos numéricos.
// Supabase doc: ban_duration='876000h' = 100 anos (efetivamente permanente).
const PERMANENT_BAN = "876000h";

export async function POST(req: Request, ctx: RouteParams) {
  try {
    const { user } = await requireAdmin("users.block");
    const { id } = ctx.params;

    const rl = checkAdminRateLimit(`user.block:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: `Muitas operações. Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.` } },
        { status: 429 }
      );
    }

    const body = userBlockSchema.parse({ ...(await req.json()), userId: id });
    const sb = createAdminClient();

    // 1. Buscar target
    const { data: targetAuth, error: getErr } = await sb.auth.admin.getUserById(id);
    if (getErr || !targetAuth?.user) {
      throw new AdminError(404, "not_found", "Usuário não encontrado");
    }
    const target = targetAuth.user;
    const targetEmail = target.email ?? "";
    const currentBanUntil = (target as { banned_until?: string | null }).banned_until ?? null;
    const wasBlocked = !!currentBanUntil && new Date(currentBanUntil) > new Date();

    // 2. Não permitir admin banir a si mesmo
    if (body.blocked && id === user.id) {
      throw new AdminError(400, "self_block", "Você não pode banir a si mesmo.");
    }

    // 3. Double-confirm pra banir (não exige pra desbanir)
    if (body.blocked) {
      if (!body.confirmTargetEmail) {
        throw new AdminError(
          400,
          "confirmation_required",
          "Banir usuário exige confirmação digitando o email do usuário-alvo."
        );
      }
      if (body.confirmTargetEmail.toLowerCase() !== targetEmail.toLowerCase()) {
        throw new AdminError(
          400,
          "confirmation_mismatch",
          "Email de confirmação não bate com o email do usuário-alvo."
        );
      }
    }

    // 4. Aplicar ban/unban
    // updateUserById aceita ban_duration: "none" pra remover, ou string tipo "876000h" pra banir
    const { data: updated, error: upErr } = await sb.auth.admin.updateUserById(id, {
      ban_duration: body.blocked ? PERMANENT_BAN : "none",
    });

    if (upErr) {
      console.error("[admin/users/block] updateUserById failed:", upErr);
      throw new AdminError(500, "auth_error", `Falha ao ${body.blocked ? "banir" : "desbanir"}: ${upErr.message}`);
    }

    const newBanUntil = (updated?.user as { banned_until?: string | null } | undefined)?.banned_until ?? null;
    const isNowBlocked = !!newBanUntil && new Date(newBanUntil) > new Date();

    // 5. Audit log
    await createAdminAuditLog({
      adminUserId: user.id,
      targetUserId: id,
      action: body.blocked ? "user.block" : "user.unblock",
      entityType: "user",
      entityId: id,
      before: { isBlocked: wasBlocked, bannedUntil: currentBanUntil },
      after: { isBlocked: isNowBlocked, bannedUntil: newBanUntil },
      metadata: {
        reason: body.reason,
        targetEmail,
      },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      isBlocked: isNowBlocked,
      bannedUntil: newBanUntil,
      message: body.blocked
        ? "Usuário banido. A sessão dele foi invalidada automaticamente."
        : "Usuário desbanido. Ele pode voltar a usar a plataforma.",
    });
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
