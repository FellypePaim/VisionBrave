/**
 * PATCH /api/admin/kie/cap
 *
 * Altera o cap_brl do mês corrente em kie_monthly_usage.
 * Se a row do mês ainda não existe, faz UPSERT criando com total_brl=0.
 *
 * Body:
 *   { newCapBRL: number > 0 ≤ 10000, reason: string ≥ 10 chars }
 *
 * Segurança:
 *   - requireAdmin("kie.update")
 *   - Rate limit 10/min/admin
 *   - Audit log com before/after
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { kieCapUpdateSchema } from "@/lib/admin/schemas";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { ZodError } from "zod";

function currentMonthKey(): string {
  // YYYY-MM em horário de São Paulo (mesma lógica do RPC add_kie_usage)
  const now = new Date();
  const spDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${spDate.getFullYear()}-${String(spDate.getMonth() + 1).padStart(2, "0")}`;
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireAdmin("kie.update");

    const rl = checkAdminRateLimit(`kie.cap:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: `Muitas operações. Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.` } },
        { status: 429 }
      );
    }

    const body = kieCapUpdateSchema.parse(await req.json());
    const sb = createAdminClient();
    const monthKey = currentMonthKey();

    // Lê estado atual (cap_brl pode ser NULL = usa env default)
    const { data: existing } = await sb
      .from("kie_monthly_usage")
      .select("month_key, total_brl, total_requests, cap_brl")
      .eq("month_key", monthKey)
      .maybeSingle();

    const envDefaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
    const before = {
      monthKey,
      total_brl: existing?.total_brl ?? 0,
      cap_brl: existing?.cap_brl ?? null,
      effectiveCap: existing?.cap_brl ?? envDefaultCap,
    };

    // UPSERT
    const { error: upErr } = await sb
      .from("kie_monthly_usage")
      .upsert(
        {
          month_key: monthKey,
          total_brl: existing?.total_brl ?? 0,
          total_requests: existing?.total_requests ?? 0,
          cap_brl: body.newCapBRL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "month_key" }
      );

    if (upErr) {
      console.error("[admin/kie/cap] upsert failed:", upErr);
      throw new AdminError(500, "db_error", `Falha ao atualizar cap: ${upErr.message}`);
    }

    const after = {
      monthKey,
      total_brl: before.total_brl,
      cap_brl: body.newCapBRL,
      effectiveCap: body.newCapBRL,
    };

    // Audit log
    await createAdminAuditLog({
      adminUserId: user.id,
      action: "kie.cap_update",
      entityType: "kie_cap",
      entityId: monthKey,
      before,
      after,
      metadata: {
        reason: body.reason,
        previousEffectiveCap: before.effectiveCap,
        newCap: body.newCapBRL,
        envDefaultCap,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, monthKey, newCapBRL: body.newCapBRL, previousCap: before.effectiveCap });
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
