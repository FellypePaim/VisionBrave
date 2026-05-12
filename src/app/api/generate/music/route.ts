import { NextRequest, NextResponse } from "next/server";
import { createMusicTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCost, debitCredits, refundCredits, estimateKieCostBRL,
  checkKieCap, logKieUsage, checkDailyLimit, isModelAllowedForPlan,
} from "@/lib/credits";
import { getUserPlan } from "@/lib/plan";
import { rateLimit } from "@/lib/rate-limit";
import { checkGenerationAllowed } from "@/lib/admin/settings-cache";
import { logAppError } from "@/lib/log-error";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate 0: modo manutenção / kill switch global
  const sys = await checkGenerationAllowed("audio");
  if (!sys.allowed) {
    return NextResponse.json(
      { error: sys.reason, code: sys.code },
      { status: 503 }
    );
  }

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

  // ── Gate 1: plano permite esse modelo? ──────────────────────────────
  const plan = await getUserPlan(supabase, user.id);
  if (!isModelAllowedForPlan(plan, model)) {
    return NextResponse.json(
      { error: `Suno ${model} não disponível no plano ${plan}. Faça upgrade.`, code: "model_locked", plan, model },
      { status: 403 },
    );
  }

  // ── Gate 2: cap diário Free ─────────────────────────────────────────
  const daily = await checkDailyLimit(supabase, user.id, plan, "audio");
  if (!daily.allowed) {
    return NextResponse.json({ error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit }, { status: 429 });
  }

  // ── Gate 3: cap mensal KIE global ───────────────────────────────────
  const estimatedBRL = estimateKieCostBRL(model);
  const cap = await checkKieCap(estimatedBRL);
  if (!cap.allowed) {
    return NextResponse.json(
      { error: cap.reason, code: "service_cap", current_total_brl: cap.current_total_brl, cap_brl: cap.cap_brl },
      { status: 503 },
    );
  }

  // ── Gate 4: débito de créditos ──────────────────────────────────────
  const cost = calculateCost(model);
  try {
    await debitCredits(
      supabase, cost,
      `Geração de áudio (Suno ${model})`,
      undefined,
      { model, customMode, instrumental, kind: "audio", kie_cost_brl: estimatedBRL },
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
      route: "/api/generate/music",
      action: "debit_credits",
      errorCode: "debit_failed",
      errorMessage: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      metadata: { model, cost },
    });
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
    const errMsg = task.msg ?? "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (Suno ${model})`, { error: errMsg, model });
    await logAppError({
      userId: user.id,
      route: "/api/generate/music",
      action: "kie_create_task",
      provider: "KIE",
      model,
      errorCode: "kie_failed",
      errorMessage: errMsg,
      metadata: { refundAmount: cost, kieCode: task.code },
    });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }

  await logKieUsage(estimatedBRL);

  return NextResponse.json({ taskId: task.data.taskId });
}
