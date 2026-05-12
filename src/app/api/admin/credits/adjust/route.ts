/**
 * POST /api/admin/credits/adjust
 *
 * Operação central do painel: adicionar, remover ou estornar créditos manualmente.
 *
 * Camadas de segurança encadeadas:
 *   1. requireAdmin("credits.adjust") — auth + permission
 *   2. Rate limit: 10 ops/min/admin
 *   3. Validação Zod do body
 *   4. Double-confirm por email se amount > 5000
 *   5. RPC atômico (add/refund usa credit_credits; remove faz UPDATE check-and-debit)
 *   6. Audit log com before/after
 *
 * Padrão de metadata em transactions:
 *   { source: "admin", operation: "add"|"remove"|"refund",
 *     admin_user_id: "...", reason: "..." }
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { creditAdjustSchema } from "@/lib/admin/schemas";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { ZodError } from "zod";

const DOUBLE_CONFIRM_THRESHOLD = 5000;

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin("credits.adjust");

    // Rate limit por admin (chave = adminUserId, não por target — admin honesto não dispara isso)
    const rl = checkAdminRateLimit(`credits.adjust:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: `Muitas operações. Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.`,
          },
        },
        { status: 429 }
      );
    }

    const body = creditAdjustSchema.parse(await req.json());
    const sb = createAdminClient();

    // 1. Busca saldo atual e email do alvo
    const [{ data: targetCredits }, { data: targetAuth }] = await Promise.all([
      sb.from("credits").select("balance, total_earned, total_spent").eq("user_id", body.userId).maybeSingle(),
      sb.auth.admin.getUserById(body.userId),
    ]);

    if (!targetAuth?.user) {
      throw new AdminError(404, "not_found", "Usuário não encontrado");
    }
    if (!targetCredits) {
      throw new AdminError(404, "not_found", "Registro de créditos não encontrado para este usuário");
    }

    // 2. Double-confirm pra ajustes grandes
    if (body.amount > DOUBLE_CONFIRM_THRESHOLD) {
      if (!body.confirmTargetEmail) {
        throw new AdminError(
          400,
          "confirmation_required",
          `Ajustes acima de ${DOUBLE_CONFIRM_THRESHOLD.toLocaleString("pt-BR")} créditos exigem digitação do email do usuário-alvo.`
        );
      }
      if (body.confirmTargetEmail.toLowerCase() !== (targetAuth.user.email ?? "").toLowerCase()) {
        throw new AdminError(
          400,
          "confirmation_mismatch",
          "Email de confirmação não bate com o email do usuário-alvo."
        );
      }
    }

    const before = {
      balance: targetCredits.balance,
      totalEarned: targetCredits.total_earned,
      totalSpent: targetCredits.total_spent,
    };

    const adminMetadata = {
      source: "admin",
      operation: body.operation,
      admin_user_id: user.id,
      admin_email: user.email,
      reason: body.reason,
    };

    let newBalance: number;

    // ─── Executar a operação ────────────────────────────────────
    if (body.operation === "add") {
      // Usa RPC `credit_credits` (atômica, service role only) com type='bonus'
      const { data, error } = await sb.rpc("credit_credits", {
        p_user_id: body.userId,
        p_amount: body.amount,
        p_type: "bonus",
        p_description: `[admin] ${body.reason}`,
        p_ref_id: body.referenceId,
        p_metadata: adminMetadata,
      });
      if (error) {
        console.error("[credits.adjust][add] RPC failed:", error);
        throw new AdminError(500, "rpc_failed", `Falha ao creditar: ${error.message}`);
      }
      newBalance = data as number;

    } else if (body.operation === "remove") {
      // Não tem RPC pra debit pelo admin. Faz UPDATE atômico com guard:
      //   UPDATE credits SET balance = balance - X, total_spent = total_spent + X
      //   WHERE user_id = ... AND balance >= X
      //   RETURNING balance
      // Se não retornar row, foi rejeitado (saldo insuficiente).
      if (targetCredits.balance < body.amount) {
        throw new AdminError(
          400,
          "insufficient_balance",
          `Saldo atual (${targetCredits.balance}) é menor que o valor solicitado (${body.amount}).`
        );
      }

      const { data: updated, error: updErr } = await sb
        .from("credits")
        .update({
          balance: targetCredits.balance - body.amount,
          total_spent: targetCredits.total_spent + body.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", body.userId)
        .gte("balance", body.amount)  // guard: só desce se saldo ainda for >= amount
        .select("balance")
        .maybeSingle();

      if (updErr || !updated) {
        console.error("[credits.adjust][remove] update failed:", updErr);
        throw new AdminError(
          409,
          "concurrent_update",
          "Falha ao debitar — saldo pode ter mudado durante a operação. Tente novamente."
        );
      }
      newBalance = updated.balance;

      // Registra a transação de débito
      const { error: txErr } = await sb.from("credit_transactions").insert({
        user_id: body.userId,
        amount: -body.amount,
        type: "spend",
        description: `[admin] ${body.reason}`,
        ref_id: body.referenceId ?? null,
        metadata: adminMetadata,
      });
      if (txErr) {
        console.error("[credits.adjust][remove] tx insert failed:", txErr);
        // Não rollback aqui — saldo já foi debitado. Loga e segue. Audit log preserva o caminho.
      }

    } else {
      // refund — usa credit_credits com type='refund'
      const { data, error } = await sb.rpc("credit_credits", {
        p_user_id: body.userId,
        p_amount: body.amount,
        p_type: "refund",
        p_description: `[admin] ${body.reason}`,
        p_ref_id: body.referenceId,
        p_metadata: adminMetadata,
      });
      if (error) {
        console.error("[credits.adjust][refund] RPC failed:", error);
        throw new AdminError(500, "rpc_failed", `Falha ao estornar: ${error.message}`);
      }
      newBalance = data as number;
    }

    // ─── Audit log (best-effort, não derruba a operação se falhar) ──
    await createAdminAuditLog({
      adminUserId: user.id,
      targetUserId: body.userId,
      action: `credits.${body.operation}`,
      entityType: "credits",
      entityId: body.userId,
      before,
      after: { balance: newBalance },
      metadata: {
        amount: body.amount,
        reason: body.reason,
        referenceId: body.referenceId ?? null,
        targetEmail: targetAuth.user.email,
      },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      operation: body.operation,
      newBalance,
      previousBalance: before.balance,
      delta: newBalance - before.balance,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_input",
            message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
          },
        },
        { status: 400 }
      );
    }
    return adminErrorResponse(err);
  }
}
