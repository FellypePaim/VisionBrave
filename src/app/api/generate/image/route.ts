import { NextRequest, NextResponse } from "next/server";
import { createImageTask, createFluxKontextTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";
import { calculateCost, debitCredits, refundCredits } from "@/lib/credits";
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

  // Rate limit: 30 gerações de imagem por minuto por usuário
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
    detailLevel = 72,
    aspectRatio,
    // Flux Kontext
    inputImage,
    outputFormat,
    promptUpsampling,
    // Nano Banana
    referenceImages,
  } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  // Débito de créditos antes de criar a task
  const cost = calculateCost(model, { count });
  try {
    await debitCredits(
      supabase,
      cost,
      `Geração de ${count} imagem${count > 1 ? "ns" : ""} (${model})`,
      undefined,
      { model, count, style, aspectRatio },
    );
  } catch (e) {
    if ((e as Error).message === "insufficient_credits") {
      return NextResponse.json(
        { error: `Créditos insuficientes. Esta geração custa ${cost} créditos.` },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "Erro ao debitar créditos" }, { status: 500 });
  }

  const fullPrompt = style && STYLE_PREFIX[style]
    ? STYLE_PREFIX[style] + prompt
    : prompt;

  // Resolution mapping — Flux Pro max is 2K
  const rawResolution =
    detailLevel <= 30 ? "1K" :
    detailLevel <= 70 ? "2K" : "4K";
  const resolution = model === "Flux Pro" && rawResolution === "4K" ? "2K" : rawResolution;

  // KIE exige aspect_ratio quando resolution é 2K ou 4K. "auto" não é aceito.
  // Defaulta pra "1:1" se vier vazio/auto e resolução requer aspect_ratio explícito.
  const requiresAspect = resolution === "2K" || resolution === "4K";
  const normalizedAspectRatio =
    !aspectRatio || aspectRatio === "auto"
      ? (requiresAspect ? "1:1" : undefined)
      : aspectRatio;

  const tasks = await Promise.all(
    Array.from({ length: count }, () => {
      if (model === "Flux Kontext") {
        return createFluxKontextTask({
          prompt: fullPrompt,
          aspectRatio: normalizedAspectRatio,
          inputImage,       // Must be a hosted URL (uploaded via /api/upload/reference)
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
        image_input: model === "Nano Banana" && referenceImages?.length
          ? referenceImages
          : undefined,
      });
    })
  );

  const taskIds = tasks
    .filter((t) => t.code === 200 && t.data?.taskId)
    .map((t) => t.data!.taskId);

  // Se TODAS as tasks falharam, refund integral
  if (taskIds.length === 0) {
    const firstError = tasks[0]?.msg ?? "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (${model})`, { error: firstError, model });
    return NextResponse.json({ error: firstError }, { status: 500 });
  }

  // Se algumas falharam, refund proporcional
  const failedCount = count - taskIds.length;
  if (failedCount > 0) {
    const refundAmount = Math.ceil((cost / count) * failedCount);
    await refundCredits(user.id, refundAmount, `Refund parcial: ${failedCount}/${count} falharam (${model})`, { model, failedCount });
  }

  return NextResponse.json({ taskIds });
}
