/**
 * POST /api/generate/video — geração de vídeo via MuAPI
 *
 * Modelos suportados: Kling 2.1 (Std/Pro), Kling 3.0 Pro, Veo 3.1 Fast/Full,
 * Seedance 2 Fast/Full, Hailuo 02 Pro, Sora 2, Sora 2 Pro.
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
  Cinematic:  "cinematic, dramatic lighting, film quality, ",
  Realistic:  "realistic, photorealistic, natural lighting, ",
  Anime:      "anime style, cel animation, vibrant, ",
  "3D Render":"3D rendered, CGI, detailed render, ",
  Vintage:    "vintage film, grain texture, retro aesthetic, ",
  Neon:       "neon lights, cyberpunk, glowing, ",
};

function motionSuffix(intensity: number): string {
  if (intensity <= 33) return ", slow camera motion, gentle movement";
  if (intensity <= 66) return ", moderate motion, dynamic shots";
  return ", fast dynamic motion, intense movement";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate 0: modo manutenção / kill switch global
  const sys = await checkGenerationAllowed("video");
  if (!sys.allowed) {
    return NextResponse.json({ error: sys.reason, code: sys.code }, { status: 503 });
  }

  // Rate limit: 10 vídeos por minuto (mais caros)
  const rl = rateLimit(`gen:vid:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  const body = await req.json();
  const {
    prompt,
    model: modelInput = "Seedance 2 Fast",
    aspect_ratio = "16:9",
    duration = 5,
    style,
    motionIntensity = 60,
    imageUrl,                        // Kling 2.1 / Veo / Sora i2v
    referenceImageUrls,              // Seedance multi-ref
    resolution,                      // Veo / Seedance
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  const model = normalizeModelName(modelInput);
  const modelConfig = getModelConfig(model);
  if (!modelConfig) {
    return NextResponse.json(
      { error: `Modelo "${modelInput}" não suportado.`, code: "model_not_found" },
      { status: 400 }
    );
  }

  const effectiveDuration = Number(duration) || 5;

  // ── Gate 1: plano permite esse modelo? ──────────────────────────────
  const plan = await getUserPlan(supabase, user.id);
  if (!isModelAllowedForPlan(plan, model)) {
    return NextResponse.json(
      { error: `${model} não disponível no plano ${plan}. Faça upgrade.`, code: "model_locked", plan, model },
      { status: 403 },
    );
  }

  // ── Gate 2: cap diário Free (vídeo é 0 no Free → sempre bloqueia) ──
  const daily = await checkDailyLimit(supabase, user.id, plan, "video");
  if (!daily.allowed) {
    return NextResponse.json(
      { error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit },
      { status: 429 },
    );
  }

  // ── Gate 3: cap mensal provider ─────────────────────────────────────
  const estimatedBRL = estimateMuapiCostBRL(model, { durationSeconds: effectiveDuration, resolution });
  const cap = await checkProviderCap(estimatedBRL);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: cap.reason, code: "service_cap", current_total_brl: cap.current_total_brl, cap_brl: cap.cap_brl },
      { status: 503 },
    );
  }

  // ── Gate 4: débito de créditos ──────────────────────────────────────
  const cost = calculateCost(model, { durationSeconds: effectiveDuration, resolution });
  try {
    await debitCredits(
      supabase, cost,
      `Geração de vídeo (${model}, ${effectiveDuration}s)`,
      undefined,
      { model, duration: effectiveDuration, aspect_ratio, resolution, kind: "video", provider: "muapi", estimated_brl: estimatedBRL },
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
      route: "/api/generate/video",
      action: "debit_credits",
      errorCode: "debit_failed",
      errorMessage: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      metadata: { model, cost, duration: effectiveDuration },
    });
    return NextResponse.json({ error: "Erro ao debitar créditos" }, { status: 500 });
  }

  // Build full prompt
  let fullPrompt = prompt;
  if (style && STYLE_PREFIX[style]) fullPrompt = STYLE_PREFIX[style] + fullPrompt;
  if (model.startsWith("Seedance ") && motionIntensity !== undefined) {
    fullPrompt += motionSuffix(Number(motionIntensity));
  }

  // Para Veo/Sora/Seedance que aceitam ref images, prioriza imageUrl unico ou primeiro do array
  const refUrl = imageUrl ?? (Array.isArray(referenceImageUrls) ? referenceImageUrls[0] : undefined);

  const muapiBody = buildMuapiBody(model, {
    prompt: fullPrompt,
    aspectRatio: aspect_ratio,
    resolution,
    imageUrl: refUrl,
    duration: effectiveDuration,
  });

  // ── Chamada MuAPI ────────────────────────────────────────────────────
  const webhookUrl = getWebhookUrl();
  let submitResult;
  try {
    submitResult = await submitTask(modelConfig.endpoint, muapiBody, { webhookUrl });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (${model}, ${effectiveDuration}s)`, { error: errMsg, model, duration: effectiveDuration, provider: "muapi" });
    await logAppError({
      userId: user.id,
      route: "/api/generate/video",
      action: "muapi_create_task",
      provider: "MuAPI",
      model,
      errorCode: "muapi_failed",
      errorMessage: errMsg,
      metadata: { duration: effectiveDuration, refundAmount: cost, endpoint: modelConfig.endpoint },
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  // Salva pending
  await savePending({
    taskId: submitResult.request_id,
    userId: user.id,
    model,
    endpoint: modelConfig.endpoint,
    kind: getModelKind(model),
    prompt: fullPrompt,
    costCredits: cost,
    estimatedCostBrl: estimatedBRL,
    metadata: { aspect_ratio, duration: effectiveDuration, resolution, style },
  });

  // Log de gasto provider
  await logProviderUsage(estimatedBRL);

  // Resposta compatível: rotas antigas retornavam `taskId`. Mantém pra frontend.
  return NextResponse.json({ taskId: submitResult.request_id });
}
