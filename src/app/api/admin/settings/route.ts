/**
 * GET  /api/admin/settings        → lista todas as system_settings com timestamps
 * PATCH /api/admin/settings        → upsert por key + audit log
 *
 * Body do PATCH:
 *   { key: string, value: any, reason?: string }
 *
 * Segurança:
 *   - requireAdmin("settings.read" | "settings.update")
 *   - Rate limit 10/min/admin (apenas PATCH)
 *   - Audit log com before/after (apenas PATCH)
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse, AdminError } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { systemSettingsUpdateSchema } from "@/lib/admin/schemas";
import { createAdminAuditLog } from "@/lib/admin/audit";
import { bustSettingsCache } from "@/lib/admin/settings-cache";
import { ZodError } from "zod";

export async function GET() {
  try {
    await requireAdmin("settings.read");
    const sb = createAdminClient();

    const { data, error } = await sb
      .from("system_settings")
      .select("key, value, updated_by, updated_at")
      .order("key", { ascending: true });

    if (error) {
      console.error("[admin/settings GET] failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar configurações" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data ?? [] });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireAdmin("settings.update");

    const rl = checkAdminRateLimit(`settings:${user.id}`, 10);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: `Muitas operações. Aguarde até ${new Date(rl.resetAt).toLocaleTimeString("pt-BR")}.` } },
        { status: 429 }
      );
    }

    const body = systemSettingsUpdateSchema.parse(await req.json());
    const sb = createAdminClient();

    // Buscar valor atual
    const { data: existing } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", body.key)
      .maybeSingle();

    const before = { value: existing?.value ?? null };

    // UPSERT
    const { error: upErr } = await sb
      .from("system_settings")
      .upsert(
        {
          key: body.key,
          value: body.value as never,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (upErr) {
      console.error("[admin/settings PATCH] failed:", upErr);
      throw new AdminError(500, "db_error", `Falha ao atualizar setting: ${upErr.message}`);
    }

    // Invalida cache local imediatamente (outras instâncias Vercel atualizam via TTL 30s)
    bustSettingsCache();

    const after = { value: body.value };

    // Audit log
    await createAdminAuditLog({
      adminUserId: user.id,
      action: "settings.update",
      entityType: "system_setting",
      entityId: body.key,
      before,
      after,
      metadata: {
        key: body.key,
        reason: body.reason ?? null,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, key: body.key, before: before.value, after: body.value });
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
