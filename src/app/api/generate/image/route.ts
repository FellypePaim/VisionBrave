import { NextRequest, NextResponse } from "next/server";
import { createImageTask, createFluxKontextTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCost, debitCredits, refundCredits, estimateKieCostBRL,
  checkKieCap, logKieUsage, checkDailyLimit, isModelAllowedForPlan,
} from "@/lib/credits";
import { getUserPlan } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";

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
    model = "Nano Banana",
    style,
    count = 1,
    resolution: resolutionParam,   // novo: string direto ("1K" | "2K" | "4K")
    detailLevel = 72,              // legado: fallback se resolution não vier
    aspectRatio,
    inputImage, outputFormat, promptUpsampling,   // Flux Kontext
    referenceImages,                              // Nano Banana
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  // ── Resolução (define multiplier de custo) ──────────────────────────
  // Aceita "resolution" direto do novo frontend; fallback para cálculo por detailLevel (legado)
  const rawResolution: string =
    resolutionParam ??
    (detailLevel <= 30 ? "1K" : detailLevel <= 70 ? "2K" : "4K");
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
    return NextResponse.json({ error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit }, { status: 429 });
  }

  // ── Gate 3: cap mensal KIE global (proteção catastrófica) ───────────
  const estimatedBRL = estimateKieCostBRL(model, { count, resolution });
  const cap = await checkKieCap(estimatedBRL);
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
      { model, count, style, aspectRatio, resolution, kind: "image", kie_cost_brl: estimatedBRL },
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

  // ── Construir prompt + normalizar aspect_ratio ──────────────────────
  const fullPrompt = style && STYLE_PREFIX[style] ? STYLE_PREFIX[style] + prompt : prompt;

  const requiresAspect = resolution === "2K" || resolution === "4K";
  const normalizedAspectRatio =
    !aspectRatio || aspectRatio === "auto"
      ? (requiresAspect ? "1:1" : undefined)
      : aspectRatio;

  // ── Chamada KIE ─────────────────────────────────────────────────────
  const tasks = await Promise.all(
    Array.from({ length: count }, () => {
      if (model === "Flux Kontext") {
        return createFluxKontextTask({
          prompt: fullPrompt,
          aspectRatio: normalizedAspectRatio,
          inputImage,
          outputFormat,
          promptUpsampling,
        });
      }

      const modelId =
        model === "Nano Banana"  ? "nano-banana-2" :
        model === "GPT Image 2"  ? "gpt-image-2-text-to-image" :
        model === "Flux Pro"     ? "flux-2/pro-text-to-image" :
        "nano-banana-2";

      return createImageTask({
        model: modelId,
        prompt: fullPrompt,
        aspect_ratio: normalizedAspectRatio,
        resolution,
        image_input: model === "Nano Banana" && referenceImages?.length ? referenceImages : undefined,
      });
    })
  );

  const taskIds = tasks
    .filter((t) => t.code === 200 && t.data?.taskId)
    .map((t) => t.data!.taskId);

  // ── Falha total: refund integral ────────────────────────────────────
  if (taskIds.length === 0) {
    const firstError = tasks[0]?.msg ?? "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (${model})`, { error: firstError, model });
    return NextResponse.json({ error: firstError }, { status: 500 });
  }

  // ── Falha parcial: refund proporcional ──────────────────────────────
  const failedCount = count - taskIds.length;
  if (failedCount > 0) {
    const refundAmount = Math.ceil((cost / count) * failedCount);
    await refundCredits(user.id, refundAmount, `Refund parcial: ${failedCount}/${count} falharam (${model})`, { model, failedCount });
  }

  // ── Log de gasto KIE real (proporcional aos que efetivamente foram criados) ──
  const actualKieBRL = (estimatedBRL / count) * taskIds.length;
  await logKieUsage(actualKieBRL);

  return NextResponse.json({ taskIds });
}
