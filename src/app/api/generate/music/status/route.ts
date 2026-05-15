/**
 * GET /api/generate/music/status?taskId=<request_id>
 *
 * Status específico do Suno via MuAPI. Mantém o formato de resposta
 * do frontend antigo (tracks: [{id, audioUrl, ...}]) por compatibilidade.
 */

import { NextRequest, NextResponse } from "next/server";
import { pollResult } from "@/lib/muapi/client";
import { markCompleted, markFailed } from "@/lib/muapi/pending";
import { refundCredits } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("pending_generations")
    .select("status, result_urls, error, cost_credits, model, prompt, metadata, user_id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (!pending) return NextResponse.json({ status: "PENDING" });
  if (pending.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Terminal — retorna cacheado
  if (pending.status === "completed") {
    return NextResponse.json({
      status: "SUCCESS",
      tracks: (pending.result_urls ?? []).map((url, i) => ({
        id: `${taskId}-${i}`,
        audioUrl: url,
      })),
    });
  }
  if (pending.status === "failed") {
    return NextResponse.json({ status: "FAILED", error: pending.error ?? "Generation failed" });
  }

  // Consulta MuAPI
  let muapiResp;
  try {
    muapiResp = await pollResult(taskId);
  } catch (e) {
    console.error("[music/status] MuAPI pollResult falhou:", e);
    return NextResponse.json({ status: "PENDING" });
  }

  if (muapiResp.status === "completed") {
    const outputs = muapiResp.outputs ?? muapiResp.images ?? [];
    if (outputs.length === 0) return NextResponse.json({ status: "PENDING" });

    const actualCostUsd = muapiResp.cost?.amount_usd ?? null;
    await markCompleted(taskId, outputs, actualCostUsd);

    // Garante entry na gallery (idempotente)
    const { data: existing } = await admin
      .from("generations")
      .select("id")
      .eq("user_id", user.id)
      .eq("external_url", outputs[0])
      .limit(1)
      .maybeSingle();

    if (!existing) {
      const meta = (pending.metadata ?? {}) as Record<string, unknown>;
      await admin.from("generations").insert({
        user_id: user.id,
        type: "audio",
        prompt: pending.prompt ?? "",
        model: pending.model,
        external_url: outputs[0],
        metadata: { ...meta, provider: "muapi", task_id: taskId, actual_cost_usd: actualCostUsd, all_outputs: outputs },
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      tracks: outputs.map((url, i) => ({ id: `${taskId}-${i}`, audioUrl: url })),
    });
  }

  if (muapiResp.status === "failed") {
    const errMsg = muapiResp.error ?? "Generation failed";
    await markFailed(taskId, errMsg);
    await refundCredits(user.id, pending.cost_credits, `Refund: ${pending.model} falhou`, { task_id: taskId, provider: "muapi" });
    return NextResponse.json({ status: "FAILED", error: errMsg });
  }

  return NextResponse.json({ status: "PENDING" });
}
