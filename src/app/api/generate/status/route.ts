/**
 * GET /api/generate/status?taskId=<request_id>
 *
 * Endpoint usado pelo frontend pra pollar uma task em andamento.
 *
 * Estratégia híbrida:
 *   1. Consulta pending_generations primeiro (rápido, sem hit em provider)
 *   2. Se já está terminal (completed/failed), retorna direto
 *   3. Se ainda processing, consulta MuAPI pollResult
 *   4. Se MuAPI já completou mas webhook ainda não chegou, atualiza pending
 *      + cria entry em generations (gallery)
 *
 * Resposta normalizada (compatível com client antigo do KIE):
 *   { state: "waiting" | "queuing" | "generating" | "success" | "fail",
 *     imageUrl?: string, error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { pollResult } from "@/lib/muapi/client";
import { markCompleted, markFailed } from "@/lib/muapi/pending";
import { refundCredits } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface StatusResponse {
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  imageUrl?: string;
  error?: string;
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  // Auth — apenas user dono da task pode consultar
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Consulta pending_generations
  const { data: pending } = await admin
    .from("pending_generations")
    .select("status, result_urls, error, cost_credits, model, kind, user_id, prompt, metadata")
    .eq("task_id", taskId)
    .maybeSingle();

  // Se a task não existe em pending, retorna waiting (pode estar criando)
  if (!pending) {
    return NextResponse.json({ state: "waiting" } satisfies StatusResponse);
  }

  // Se pertence a outro user, bloqueia
  if (pending.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Status terminal — retorna direto sem hit em provider
  if (pending.status === "completed") {
    const url = pending.result_urls?.[0];
    return NextResponse.json({ state: "success", imageUrl: url ?? undefined } satisfies StatusResponse);
  }
  if (pending.status === "failed") {
    return NextResponse.json({ state: "fail", error: pending.error ?? "Generation failed" } satisfies StatusResponse);
  }

  // 3. Ainda processing — consulta MuAPI
  let muapiResp;
  try {
    muapiResp = await pollResult(taskId);
  } catch (e) {
    console.error("[status] MuAPI pollResult falhou:", e);
    return NextResponse.json({ state: "generating" } satisfies StatusResponse);
  }

  // 4. Se MuAPI completou mas pending ainda não foi atualizado (webhook atrasado/perdido)
  if (muapiResp.status === "completed") {
    const outputs = muapiResp.outputs ?? muapiResp.images ?? [];
    const actualCostUsd = muapiResp.cost?.amount_usd ?? null;

    if (outputs.length > 0) {
      // Atualiza pending
      await markCompleted(taskId, outputs, actualCostUsd);

      // Garante que entry em generations existe (idempotente — webhook pode já ter feito)
      const { data: existingGen } = await admin
        .from("generations")
        .select("id")
        .eq("user_id", user.id)
        .eq("external_url", outputs[0])
        .limit(1)
        .maybeSingle();

      if (!existingGen) {
        const meta = (pending.metadata ?? {}) as Record<string, unknown>;
        await admin.from("generations").insert({
          user_id: user.id,
          type: pending.kind === "video" ? "video" : pending.kind === "audio" ? "audio" : "image",
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
      }

      return NextResponse.json({
        state: "success",
        imageUrl: outputs[0],
      } satisfies StatusResponse);
    }
  }

  if (muapiResp.status === "failed") {
    const errMsg = muapiResp.error ?? "Generation failed";
    await markFailed(taskId, errMsg);
    // Refund automático
    await refundCredits(
      user.id,
      pending.cost_credits,
      `Refund: falha na geração (${pending.model})`,
      { task_id: taskId, provider: "muapi", error: errMsg },
    );
    return NextResponse.json({ state: "fail", error: errMsg } satisfies StatusResponse);
  }

  // MuAPI ainda processing
  return NextResponse.json({ state: "generating" } satisfies StatusResponse);
}
