/**
 * Helpers de pending_generations — rastreamento async de tasks MuAPI.
 *
 * Quando submit retorna request_id, criamos linha. Quando webhook chega
 * (ou polling capta), atualizamos status + result_urls.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getModelConfig } from "./registry";

export interface SavePendingInput {
  taskId: string;
  userId: string;
  model: string;
  endpoint: string;
  kind: "image" | "video" | "audio" | "3d" | "vfx";
  prompt: string;
  metadata?: Record<string, unknown>;
  costCredits: number;
  estimatedCostBrl?: number;
}

/** Cria linha em pending_generations no momento do submit. */
export async function savePending(input: SavePendingInput): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from("pending_generations").insert({
    task_id: input.taskId,
    user_id: input.userId,
    provider: "muapi",
    model: input.model,
    endpoint: input.endpoint,
    kind: input.kind,
    prompt: input.prompt.slice(0, 1000),
    metadata: (input.metadata ?? {}) as never,
    status: "processing",
    cost_credits: input.costCredits,
    estimated_cost_brl: input.estimatedCostBrl ?? null,
  });
  if (error) {
    console.error("[pending] insert failed:", error.message);
  }
}

/** Marca como completed e grava outputs. Idempotente. */
export async function markCompleted(
  taskId: string,
  outputs: string[],
  actualCostUsd?: number | null,
): Promise<void> {
  const sb = createAdminClient();
  await sb
    .from("pending_generations")
    .update({
      status: "completed",
      result_urls: outputs,
      actual_cost_usd: actualCostUsd ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .in("status", ["pending", "processing"]); // idempotência
}

/** Marca como failed e dispara refund. */
export async function markFailed(
  taskId: string,
  errorMessage: string,
): Promise<void> {
  const sb = createAdminClient();
  await sb
    .from("pending_generations")
    .update({
      status: "failed",
      error: errorMessage.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .in("status", ["pending", "processing"]);
}

/**
 * Resolve URL pública do webhook (usada no submit `?webhook=URL`).
 *
 * Em produção, usa NEXT_PUBLIC_SITE_URL.
 * Em dev local, retorna undefined (frontend faz polling).
 */
export function getWebhookUrl(): string | undefined {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.MUAPI_WEBHOOK_SECRET;
  if (!baseUrl || !secret) return undefined;
  // baseUrl pode ou não ter trailing slash
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/muapi/${secret}`;
}

/** Lookup do kind ("image" | "video" | "audio") via registry */
export function getModelKind(modelName: string): "image" | "video" | "audio" | "3d" | "vfx" {
  const cfg = getModelConfig(modelName);
  return cfg?.kind ?? "image";
}
