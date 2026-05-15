/**
 * Tipos compartilhados pra integração com MuAPI.
 *
 * Contrato confirmado via OpenAPI spec (https://api.muapi.ai/openapi.json):
 *
 * - Auth: header `x-api-key: <key>` (não Bearer)
 * - Base URL: https://api.muapi.ai
 * - Submit: POST /api/v1/{model_endpoint} → { request_id, status, cost }
 * - Poll:   GET /api/v1/predictions/{id}/result → { id, status, images, outputs, cost }
 * - Webhook: query param `?webhook=<url>` no submit
 */

export type MuapiStatus = "processing" | "completed" | "failed";

export interface MuapiCost {
  amount_usd: number;
  amount_credits: number;
  bonus_credits_used: number;
  refunded: boolean;
}

/** Response do POST inicial — task submetida, sem resultado ainda */
export interface MuapiSubmitResponse {
  request_id: string;
  status: MuapiStatus;
  cost: MuapiCost;
}

/** Response do GET /api/v1/predictions/{id}/result */
export interface MuapiPollResponse {
  id: string;
  status: MuapiStatus;
  /** Para modelos de imagem (alias de outputs) */
  images?: string[];
  /** Array de URLs públicas (cloudfront) — vídeo, áudio, imagem */
  outputs?: string[];
  cost: MuapiCost;
  error?: string | null;
  has_nsfw_contents?: boolean[];
  created_at?: string;
  executionTime?: string | number;
  timings?: { inference?: string | number };
}

/** Payload que MuAPI envia no webhook (POST pro nosso endpoint) */
export interface MuapiWebhookPayload {
  id: string;
  status: MuapiStatus;
  outputs: string[];
  urls?: { get?: string };
  has_nsfw_contents?: boolean[];
  created_at?: string;
  error?: string | null;
  executionTime?: string | number;
  timings?: { inference?: string | number };
  cost?: MuapiCost;
}

/** Opções comuns no submit (queries) */
export interface MuapiSubmitOptions {
  /** URL completa pra receber webhook quando completar (substitui polling) */
  webhookUrl?: string;
  /** Se true, espera resultado síncrono (até ~60s). Default false. */
  sync?: boolean;
  /** Team ID, se conta tiver múltiplos teams */
  teamId?: number;
}

/** Erro retornado pela MuAPI */
export interface MuapiErrorResponse {
  detail?: string | Array<{ msg: string; loc: string[]; type: string }>;
}

export class MuapiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public payload?: unknown,
  ) {
    super(`MuAPI ${status}: ${detail}`);
    this.name = "MuapiError";
  }
}
