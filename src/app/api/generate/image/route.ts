/**
 * POST /api/generate/image — geração de imagem via MuAPI
 *
 * Fluxo:
 *   1. Auth + 4 gates (manutenção, plano, daily limit, KIE/Muapi cap, débito)
 *   2. Para cada imagem solicitada (count): submitTask na MuAPI
 *   3. Grava pending_generations
 *   4. Frontend polla via /api/generate/status até webhook completar
 *
 * Modelos suportados (do MUAPI_MODELS registry):
 *   - Flux Schnell / Dev / Pro / Kontext Pro / Kontext Max
 *   - Nano Banana / Nano Banana Pro
 *   - GPT Image 2, Seedream 5.0, Midjourney v8
 */

import { NextRequest, NextResponse } from "next/server";
import { submitTask } from "@/lib/muapi/client";
import { buildMuapiBody } from "@/lib/muapi/build-body";
import { savePending, getWebhookUrl, getModelKind } from "@/lib/muapi/pending";
import { getModelConfig } from "@/lib/muapi/registry";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCost, debitCredits, refundCredits, estimateMuapiCostBRL,
  checkProviderCap, logProviderUsage, checkDailyLimit, isModelAllowedForPlan,
  normalizeModelName,
} from "@/lib/credits";
import { getUserPlan } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { checkGenerationAllowed } from "@/lib/admin/settings-cache";
import { logAppError } from "@/lib/log-error";

const STYLE_PREFIX: Record<string, string> = {
  Cinematic:  "cinematic photography, dramatic lighting, ",
  Realistic:  "photorealistic, ultra-detailed, ",
  Anime:      "anime style, cel shaded, vibrant colors, ",
  "3D Render":"3D render, octane render, photorealistic, ",
  "Oil Paint":"oil painting style, textured brushstrokes, ",
  Sketch:     "pencil sketch, black and white drawing, ",
  Neon:       "neon lights, cyberpunk, glowing, dark background, ",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Gate 0: modo manutenção / kill switch global ────────────────────
  const sys = await checkGenerationAllowed("image");
  if (!sys.allowed) {
    return NextResponse.json({ error: sys.reason, code: sys.code }, { status: 503 });
  }

  // ── Rate limit: 30 gerações/min/user ────────────────────────────────
  const rl = rateLimit(`gen:img:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  const body = await req.json();
  const {
    prompt,
    model: modelInput = "Nano Banana",
    style,
    count = 1,
    resolution: resolutionParam,
    detailLevel = 72,
    aspectRatio,
    inputImage,              // legado: Flux Kontext single image
    referenceImages,         // multi-image: Nano Banana / Pro
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  // Normaliza nomes legados ("Flux Kontext" → "Flux Kontext Pro", etc.)
  const model = normalizeModelName(modelInput);
  const modelConfig = getModelConfig(model);
  if (!modelConfig) {
    return NextResponse.json(
      { error: `Modelo "${modelInput}" não suportado.`, code: "model_not_found" },
      { status: 400 }
    );
  }

  // ── Resolução (define multiplier de custo) ──────────────────────────
  const rawResolution: string =
    resolutionParam ??
    (detailLevel <= 30 ? "1K" : detailLevel <= 70 ? "2K" : "4K");
  // Flux 2 Pro só suporta até 2K
  const resolution = model === "Flux Pro" && rawResolution === "4K" ? "2K" : rawResolution;

  // ── Gate 1: plano permite esse modelo? ──────────────────────────────
  const plan = await getUserPlan(supabase, user.id);
  if (!isModelAllowedForPlan(plan, model)) {
    return NextResponse.json(
      { error: `${model} não disponível no plano ${plan}. Faça upgrade.`, code: "model_locked", plan, model },
      { status: 403 },
    );
  }

  // ── Gate 2: cap diário Free ─────────────────────────────────────────
  const daily = await checkDailyLimit(supabase, user.id, plan, "image");
  if (!daily.allowed) {
    return NextResponse.json(
      { error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit },
      { status: 429 },
    );
  }

  // ── Gate 3: cap mensal provider (proteção catastrófica) ─────────────
  const estimatedBRL = estimateMuapiCostBRL(model, { count, resolution });
  const cap = await checkProviderCap(estimatedBRL);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: cap.reason, code: "service_cap", current_total_brl: cap.current_total_brl, cap_brl: cap.cap_brl },
      { status: 503 },
    );
  }

  // ── Gate 4: débito de créditos ──────────────────────────────────────
  const cost = calculateCost(model, { count, resolution });
  try {
    await debitCredits(
      supabase, cost,
      `Geração de ${count} imagem${count > 1 ? "ns" : ""} (${model})`,
      undefined,
      { model, count, style, aspectRatio, resolution, kind: "image", provider: "muapi", estimated_brl: estimatedBRL },
    );
  } catch (e) {
    if ((e as Error).message === "insufficient_credits") {
      return NextResponse.json(
        { error: `Créditos insuficientes. Esta geração custa ${cost} créditos.`, code: "insufficient_credits", cost },
        { status: 402 },
      );
    }
    await logAppError({
      userId: user.id,
      route: "/api/generate/image",
      action: "debit_credits",
      errorCode: "debit_failed",
      errorMessage: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      metadata: { model, cost, count },
    });
    return NextResponse.json({ error: "Erro ao debitar créditos" }, { status: 500 });
  }

  // ── Construir prompt + body MuAPI ────────────────────────────────────
  const fullPrompt = style && STYLE_PREFIX[style] ? STYLE_PREFIX[style] + prompt : prompt;

  // Para Flux Kontext (single image) usa inputImage; para Nano Banana usa array
  const refUrls: string[] = Array.isArray(referenceImages) && referenceImages.length > 0
    ? referenceImages
    : inputImage ? [inputImage] : [];

  const muapiBody = buildMuapiBody(model, {
    prompt: fullPrompt,
    aspectRatio,
    resolution,
    imageUrl: refUrls[0],
    imageUrls: refUrls,
  });

  // ── Chamada MuAPI ────────────────────────────────────────────────────
  // N submits paralelos (1 por imagem). Cada um retorna request_id próprio.
  const webhookUrl = getWebhookUrl();
  const submitResults = await Promise.allSettled(
    Array.from({ length: count }, () =>
      submitTask(modelConfig.endpoint, muapiBody, { webhookUrl })
    )
  );

  const successful = submitResults
    .map((r, i) => ({ idx: i, r }))
    .filter((x): x is { idx: number; r: PromiseFulfilledResult<Awaited<ReturnType<typeof submitTask>>> } =>
      x.r.status === "fulfilled"
    );

  const taskIds = successful.map((x) => x.r.value.request_id);

  // ── Falha total: refund integral ─────────────────────────────────────
  if (taskIds.length === 0) {
    const firstError = submitResults
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")[0];
    const errMsg = firstError?.reason instanceof Error
      ? firstError.reason.message
      : "Failed to start generation";

    await refundCredits(user.id, cost, `Refund: falha na geração (${model})`, { error: errMsg, model, provider: "muapi" });
    await logAppError({
      userId: user.id,
      route: "/api/generate/image",
      action: "muapi_create_task_total_fail",
      provider: "MuAPI",
      model,
      errorCode: "muapi_failed",
      errorMessage: errMsg,
      metadata: { count, refundAmount: cost, endpoint: modelConfig.endpoint },
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  // ── Salva pendentes (sucesso ou parcial) ─────────────────────────────
  await Promise.all(
    taskIds.map((taskId) =>
      savePending({
        taskId,
        userId: user.id,
        model,
        endpoint: modelConfig.endpoint,
        kind: getModelKind(model),
        prompt: fullPrompt,
        costCredits: Math.ceil(cost / count),
        estimatedCostBrl: estimatedBRL / count,
        metadata: { style, aspectRatio, resolution, count, batch_index: taskIds.indexOf(taskId) },
      })
    )
  );

  // ── Falha parcial: refund proporcional ───────────────────────────────
  const failedCount = count - taskIds.length;
  if (failedCount > 0) {
    const refundAmount = Math.ceil((cost / count) * failedCount);
    await refundCredits(
      user.id,
      refundAmount,
      `Refund parcial: ${failedCount}/${count} falharam (${model})`,
      { model, failedCount, provider: "muapi" },
    );
  }

  // ── Log de gasto provider (proporcional aos sucessos) ───────────────
  const actualProviderBRL = (estimatedBRL / count) * taskIds.length;
  await logProviderUsage(actualProviderBRL);

  return NextResponse.json({ taskIds });
}
