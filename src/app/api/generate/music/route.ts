/**
 * POST /api/generate/music — geração de áudio via MuAPI
 *
 * Modelos suportados (todos Suno):
 *   - Suno Create Music
 *   - Suno Extend Music
 *   - Suno Generate Sounds
 *   - Suno Remix Music
 *
 * Modelo legado "V4_5" e similares mapeiam automaticamente para
 * "Suno Create Music" via normalizeModelName.
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate 0: modo manutenção / kill switch global
  const sys = await checkGenerationAllowed("audio");
  if (!sys.allowed) {
    return NextResponse.json({ error: sys.reason, code: sys.code }, { status: 503 });
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
    model: modelInput = "Suno Create Music",
    style,
    title,
    instrumental = false,
  } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
  }

  // Normaliza nomes legados ("V4_5", "V5_5", etc.)
  const model = normalizeModelName(modelInput);
  const modelConfig = getModelConfig(model);
  if (!modelConfig) {
    return NextResponse.json(
      { error: `Modelo "${modelInput}" não suportado.`, code: "model_not_found" },
      { status: 400 }
    );
  }

  // ── Gate 1: plano permite esse modelo? ──────────────────────────────
  const plan = await getUserPlan(supabase, user.id);
  if (!isModelAllowedForPlan(plan, model)) {
    return NextResponse.json(
      { error: `${model} não disponível no plano ${plan}. Faça upgrade.`, code: "model_locked", plan, model },
      { status: 403 },
    );
  }

  // ── Gate 2: cap diário Free ─────────────────────────────────────────
  const daily = await checkDailyLimit(supabase, user.id, plan, "audio");
  if (!daily.allowed) {
    return NextResponse.json(
      { error: daily.reason, code: "daily_limit", count: daily.count, limit: daily.limit },
      { status: 429 },
    );
  }

  // ── Gate 3: cap mensal provider ─────────────────────────────────────
  const estimatedBRL = estimateMuapiCostBRL(model);
  const cap = await checkProviderCap(estimatedBRL);
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
      `Geração de áudio (${model})`,
      undefined,
      { model, instrumental, kind: "audio", provider: "muapi", estimated_brl: estimatedBRL },
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

  const muapiBody = buildMuapiBody(model, {
    prompt,
    style,
    title,
    instrumental,
  });

  // ── Chamada MuAPI ────────────────────────────────────────────────────
  const webhookUrl = getWebhookUrl();
  let submitResult;
  try {
    submitResult = await submitTask(modelConfig.endpoint, muapiBody, { webhookUrl });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Failed to start generation";
    await refundCredits(user.id, cost, `Refund: falha na geração (${model})`, { error: errMsg, model, provider: "muapi" });
    await logAppError({
      userId: user.id,
      route: "/api/generate/music",
      action: "muapi_create_task",
      provider: "MuAPI",
      model,
      errorCode: "muapi_failed",
      errorMessage: errMsg,
      metadata: { refundAmount: cost, endpoint: modelConfig.endpoint },
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
    prompt,
    costCredits: cost,
    estimatedCostBrl: estimatedBRL,
    metadata: { style, title, instrumental },
  });

  await logProviderUsage(estimatedBRL);

  return NextResponse.json({ taskId: submitResult.request_id });
}
