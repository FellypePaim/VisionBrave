import { NextRequest, NextResponse } from "next/server";
import { createImageTask, createFluxKontextTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const fullPrompt = style && STYLE_PREFIX[style]
    ? STYLE_PREFIX[style] + prompt
    : prompt;

  // Resolution mapping — Flux Pro max is 2K
  const rawResolution =
    detailLevel <= 30 ? "1K" :
    detailLevel <= 70 ? "2K" : "4K";
  const resolution = model === "Flux Pro" && rawResolution === "4K" ? "2K" : rawResolution;

  const tasks = await Promise.all(
    Array.from({ length: count }, () => {
      if (model === "Flux Kontext") {
        return createFluxKontextTask({
          prompt: fullPrompt,
          aspectRatio,
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
        aspect_ratio: aspectRatio,
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

  if (taskIds.length === 0) {
    const firstError = tasks[0]?.msg ?? "Failed to start generation";
    return NextResponse.json({ error: firstError }, { status: 500 });
  }

  return NextResponse.json({ taskIds });
}
