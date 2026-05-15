/**
 * POST /api/webhooks/muapi/[secret]
 *
 * Recebe notificação da MuAPI quando uma geração completa (ou falha).
 *
 * Fluxo:
 *   1. MuAPI manda POST com payload { id, status, outputs, cost, error, ... }
 *   2. Validamos secret no path (`MUAPI_WEBHOOK_SECRET`)
 *   3. Buscamos `pending_generations` pela task_id
 *   4. Atualizamos status + outputs + actual_cost_usd
 *   5. Se sucesso: salvamos em `generations` (galeria do user)
 *   6. Se falha: refund automático dos créditos
 *
 * Segurança:
 *   - Secret no path (não query/header) reduz vazamento em logs
 *   - Validamos task_id existe em pending_generations (impede injection arbitrária)
 *   - Idempotente: se mesmo webhook chegar 2x, segundo é no-op
 *
 * URL pública (configurar na MuAPI via query `?webhook=<url>`):
 *   https://vision-brave.vercel.app/api/webhooks/muapi/<secret>
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidWebhookSecret } from "@/lib/muapi/webhook-verify";
import { refundCredits, logProviderUsage, estimateMuapiCostBRL } from "@/lib/credits";
import { logAppError } from "@/lib/log-error";
import type { MuapiWebhookPayload } from "@/lib/muapi/types";

interface RouteParams {
  params: { secret: string };
}

export async function POST(req: Request, ctx: RouteParams) {
  const { secret } = ctx.params;

  // 1. Valida secret
  if (!isValidWebhookSecret(secret)) {
    console.warn("[muapi/webhook] secret inválido recebido");
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Parse payload
  let payload: MuapiWebhookPayload;
  try {
    payload = (await req.json()) as MuapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { id: taskId, status, outputs, error: muapiError } = payload;
  if (!taskId || !status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const sb = createAdminClient();

  // 3. Busca pending_generation
  const { data: pending, error: getErr } = await sb
    .from("pending_generations")
    .select("*")
    .eq("task_id", taskId)
    .maybeSingle();

  if (getErr) {
    console.error("[muapi/webhook] erro ao buscar pending:", getErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!pending) {
    console.warn(`[muapi/webhook] task_id ${taskId} não encontrada em pending_generations`);
    // Não retorna erro: pode ser webhook duplicado de task já completada e removida.
    return NextResponse.json({ ok: true, ignored: "not_found" });
  }

  // 4. Idempotência — se já tá completed/failed, não reprocessa
  if (pending.status === "completed" || pending.status === "failed") {
    return NextResponse.json({ ok: true, ignored: "already_processed" });
  }

  // 5. Processa conforme status
  const actualCostUsd = payload.cost?.amount_usd ?? null;
  const completedAt = new Date().toISOString();

  if (status === "completed" && outputs && outputs.length > 0) {
    // 5a. Salva em pending_generations
    await sb
      .from("pending_generations")
      .update({
        status: "completed",
        actual_cost_usd: actualCostUsd,
        result_urls: outputs,
        completed_at: completedAt,
      })
      .eq("task_id", taskId);

    // 5b. Log de gasto provider (BRL estimado pra cap; custo real fica em metadata)
    const estimatedBRL = estimateMuapiCostBRL(pending.model);
    await logProviderUsage(estimatedBRL);

    // 5c. Salva em generations (galeria do user)
    const meta = (pending.metadata ?? {}) as Record<string, unknown>;
    await sb.from("generations").insert({
      user_id: pending.user_id,
      type: pending.kind === "image" ? "image"
          : pending.kind === "video" ? "video"
          : pending.kind === "audio" ? "audio"
          : "image",
      prompt: pending.prompt ?? "",
      model: pending.model,
      external_url: outputs[0],
      metadata: {
        ...meta,
        provider: "muapi",
        task_id: taskId,
        actual_cost_usd: actualCostUsd,
        all_outputs: outputs,
      },
    });

    return NextResponse.json({ ok: true, status: "completed" });
  }

  if (status === "failed") {
    // 5d. Salva failure + refund automático
    await sb
      .from("pending_generations")
      .update({
        status: "failed",
        error: muapiError ?? "Unknown failure",
        completed_at: completedAt,
      })
      .eq("task_id", taskId);

    await refundCredits(
      pending.user_id,
      pending.cost_credits,
      `Refund automático: geração ${pending.model} falhou`,
      { task_id: taskId, provider: "muapi", error: muapiError },
    );

    await logAppError({
      userId: pending.user_id,
      route: "/api/webhooks/muapi",
      action: "muapi_generation_failed",
      provider: "MuAPI",
      model: pending.model,
      errorCode: "muapi_failed",
      errorMessage: muapiError ?? "MuAPI reported failure without message",
      metadata: { task_id: taskId, refundAmount: pending.cost_credits },
    });

    return NextResponse.json({ ok: true, status: "failed", refunded: pending.cost_credits });
  }

  // status "processing" — pode ser update intermediário, só atualiza status sem fechar
  await sb
    .from("pending_generations")
    .update({ status: "processing" })
    .eq("task_id", taskId);
  return NextResponse.json({ ok: true, status: "processing" });
}

/**
 * GET endpoint pra healthcheck — útil pra debug e UptimeRobot.
 * Não revela informação sensível.
 */
export async function GET(_req: Request, ctx: RouteParams) {
  const ok = isValidWebhookSecret(ctx.params.secret);
  return NextResponse.json({
    endpoint: "muapi-webhook",
    secret_valid: ok,
  });
}
