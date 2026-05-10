import { NextRequest, NextResponse } from "next/server";
import { createMusicTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";
import { calculateCost, debitCredits } from "@/lib/credits";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 15 áudios por minuto
  const rl = rateLimit(`gen:audio:${user.id}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  const {
    prompt,
    model = "V4_5",
    customMode = false,
    style,
    title,
    instrumental = false,
    vocalGender,
    negativeTags,
    styleWeight,
    weirdnessConstraint,
    audioWeight,
  } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  // Débito de créditos antes de criar a task
  const cost = calculateCost(model);
  try {
    await debitCredits(
      supabase,
      cost,
      `Geração de áudio (Suno ${model})`,
      undefined,
      { model, customMode, instrumental },
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

  const task = await createMusicTask({
    prompt,
    model,
    customMode,
    style,
    title,
    instrumental,
    vocalGender,
    negativeTags,
    styleWeight,
    weirdnessConstraint,
    audioWeight,
  });

  if (task.code !== 200 || !task.data?.taskId) {
    return NextResponse.json({ error: task.msg ?? "Failed to start generation" }, { status: 500 });
  }

  return NextResponse.json({ taskId: task.data.taskId });
}
