import { NextRequest, NextResponse } from "next/server";
import { createSeedanceTask, createKlingTask, createKling3Task, createVeo3Task } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCost, debitCredits, refundCredits, estimateKieCostBRL,
  checkKieCap, logKieUsage, checkDailyLimit, isModelAllowedForPlan,
} from "@/lib/credits";
import { getUserPlan } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";

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

  // Rate limit: 10 vídeos por minuto por usuário (mais caros)
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
    model = "Seedance 2",
    aspect_ratio = "16:9",
    duration = 5,
    style,
    motionIntensity = 60,
    // Seedance
    firstFrameUrl,
    lastFrameUrl,
    referenceImageUrls,
    referenceAudioUrls,
    generateAudio = true,
    resolution,
    // Kling 2.1
    imageUrl,
    negativePrompt,
    cfgScale,
    // Kling 3.0
    klingMode = "pro",
    klingSound = false,
    // Veo 3
    veoImageUrls,
    generationType = "TEXT_2_VIDEO",
    veoResolution = "720p",
    enableTranslation = false,
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  const effectiveResolution = resolution ?? veoResolution;
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
    return NextResponse.json({ error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit }, { status: 429 });
  }

  // ── Gate 3: cap mensal KIE global ───────────────────────────────────
  const estimatedBRL = estimateKieCostBRL(model, { durationSeconds: effectiveDuration, resolution: effectiveResolution });
  const cap = await checkKieCap(estimatedBRL);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: cap.reason, code: "service_cap", current_total_brl: cap.current_total_brl, cap_brl: cap.cap_brl },
      { status: 503 },
    );
  }

  // ── Gate 4: débito de créditos ──────────────────────────────────────
  const cost = calculateCost(model, { durationSeconds: effectiveDuration, resolution: effectiveResolution });
  try {
    await debitCredits(
      supabase, cost,
      `Geração de vídeo (${model}, ${effectiveDuration}s)`,
      undefined,
      { model, duration: effectiveDuration, aspect_ratio, resolution: effectiveResolution, kind: "video", kie_cost_brl: estimatedBRL },
    );
  } catch (e) {
    if ((e as Error).message === "insufficient_credits") {
      return NextResponse.json(
        { error: `Créditos insuficientes. Esta geração custa ${cost} créditos.`, code: "insufficient_credits", cost },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Erro ao debitar créditos" }, { status: 500 });
  }

  // Build full prompt with optional style prefix and motion suffix
  let fullPrompt = prompt;
  if (style && STYLE_PREFIX[style]) {
    fullPrompt = STYLE_PREFIX[style] + fullPrompt;
  }
  if (
    (model === "Seedance 2" || model === "Seedance 2 Fast") &&
    motionIntensity !== undefined
  ) {
    fullPrompt += motionSuffix(Number(motionIntensity));
  }

  let task;

  if (model === "Veo 3" || model === "Veo 3 Fast") {
    task = await createVeo3Task({
      prompt: fullPrompt,
      model: model === "Veo 3" ? "veo3" : "veo3_fast",
      aspect_ratio,
      resolution: veoResolution,
      imageUrls: veoImageUrls?.length ? veoImageUrls : undefined,
      generationType: generationType !== "TEXT_2_VIDEO" ? generationType : undefined,
      enableTranslation: enableTranslation || undefined,
    });
  } else if (model === "Kling 3.0") {
    task = await createKling3Task({
      prompt: fullPrompt,
      image_urls: veoImageUrls?.length ? veoImageUrls : undefined,
      sound: klingSound,
      duration: String(duration),
      aspect_ratio,
      mode: klingMode,
    });
  } else if (model === "Kling 2.1") {
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Kling 2.1 requires a reference image" },
        { status: 400 }
      );
    }
    const dur: "5" | "10" = duration === 10 || duration === "10" ? "10" : "5";
    task = await createKlingTask({
      prompt: fullPrompt,
      image_url: imageUrl,
      duration: dur,
      negative_prompt: negativePrompt || undefined,
      cfg_scale: cfgScale !== undefined ? Number(cfgScale) : undefined,
    });
  } else {
    // Seedance 2 or Seedance 2 Fast
    const modelId =
      model === "Seedance 2 Fast"
        ? "bytedance/seedance-2-fast"
        : "bytedance/seedance-2";
    task = await createSeedanceTask({
      model: modelId as "bytedance/seedance-2" | "bytedance/seedance-2-fast",
      prompt: fullPrompt,
      aspect_ratio,
      duration: Number(duration),
      resolution: resolution || undefined,
      first_frame_url: firstFrameUrl || undefined,
      last_frame_url: lastFrameUrl || undefined,
      reference_image_urls: referenceImageUrls?.length ? referenceImageUrls : undefined,
      reference_audio_urls: referenceAudioUrls?.length ? referenceAudioUrls : undefined,
      generate_audio: generateAudio,
    });
  }

  if (task.code !== 200 || !task.data?.taskId) {
    const errMsg = task.msg ?? "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (${model}, ${effectiveDuration}s)`, { error: errMsg, model, duration: effectiveDuration });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  // Log de gasto KIE real
  await logKieUsage(estimatedBRL);

  return NextResponse.json({ taskId: task.data.taskId });
}
