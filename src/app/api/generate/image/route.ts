import { NextRequest, NextResponse } from "next/server";
import { createTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";

const IMAGE_MODELS: Record<string, string> = {
  "Flux Pro":    "flux-pro",
  "Flux Dev":    "flux-dev",
  "Flux Schnell":"flux-schnell",
  "SDXL":        "stable-diffusion-xl",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, model = "Flux Pro", style, count = 1 } = await req.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const modelId = IMAGE_MODELS[model] ?? "flux-pro";

  const stylePrefix: Record<string, string> = {
    Cinematic: "cinematic photography, dramatic lighting, ",
    Realistic:  "photorealistic, ultra-detailed, ",
    Anime:      "anime style, cel shaded, vibrant colors, ",
    "3D Render":"3D render, octane render, photorealistic, ",
    "Oil Paint":"oil painting style, textured brushstrokes, ",
    Sketch:     "pencil sketch, black and white drawing, ",
    Neon:       "neon lights, cyberpunk, glowing, dark background, ",
  };

  const fullPrompt = style && stylePrefix[style]
    ? stylePrefix[style] + prompt
    : prompt;

  const tasks = await Promise.all(
    Array.from({ length: count }, () =>
      createTask({ model: modelId, input: { prompt: fullPrompt } })
    )
  );

  const taskIds = tasks
    .filter((t) => t.code === 200 && t.data?.taskId)
    .map((t) => t.data!.taskId);

  if (taskIds.length === 0) {
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 });
  }

  return NextResponse.json({ taskIds });
}
