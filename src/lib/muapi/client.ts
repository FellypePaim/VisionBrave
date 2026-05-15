/**
 * Cliente HTTP para MuAPI (substitui src/lib/kie/client.ts).
 *
 * Padrão de uso assíncrono:
 *   1. `submitTask(model, body)` → recebe `request_id`
 *   2. Aguarda webhook (preferencial) ou pollar via `pollResult(id)`
 *
 * Em desenvolvimento: usa `MUAPI_API_KEY_SANDBOX` (custo $0)
 * Em produção: usa `MUAPI_API_KEY` (custo real)
 */

import type {
  MuapiSubmitResponse,
  MuapiPollResponse,
  MuapiSubmitOptions,
} from "./types";
import { MuapiError } from "./types";

const BASE_URL = process.env.MUAPI_BASE_URL ?? "https://api.muapi.ai";

/** Pega a API key: sandbox em dev, production em prod (com fallback) */
function apiKey(): string {
  const isProd = process.env.NODE_ENV === "production";
  const key = isProd
    ? process.env.MUAPI_API_KEY
    : (process.env.MUAPI_API_KEY_SANDBOX ?? process.env.MUAPI_API_KEY);
  if (!key) {
    throw new Error(
      "[muapi] MUAPI_API_KEY (ou MUAPI_API_KEY_SANDBOX) não configurada"
    );
  }
  return key;
}

/** Headers comuns pra todas as requests */
function headers(): HeadersInit {
  return {
    "x-api-key": apiKey(),
    "Content-Type": "application/json",
  };
}

/** Constrói URL absoluta com query params opcionais */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Submete uma task assíncrona pra MuAPI.
 *
 * @param modelEndpoint Endpoint relativo (ex: "flux-schnell-image", "nano-banana", "kling-v2.1-pro-i2v")
 * @param body Payload específico do modelo (depende do schema)
 * @param options webhookUrl, sync, teamId
 *
 * @example
 *   const { request_id } = await submitTask("flux-schnell-image", {
 *     prompt: "a cyber tiger",
 *     width: 1024, height: 1024,
 *   }, { webhookUrl: "https://meusite.com/api/webhooks/muapi/secret" });
 */
export async function submitTask<TBody extends Record<string, unknown>>(
  modelEndpoint: string,
  body: TBody,
  options?: MuapiSubmitOptions,
): Promise<MuapiSubmitResponse> {
  const url = buildUrl(`/api/v1/${modelEndpoint}`, {
    webhook: options?.webhookUrl,
    team_id: options?.teamId,
  });

  const finalBody = {
    ...body,
    ...(options?.sync !== undefined ? { sync: options.sync } : {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(finalBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new MuapiError(res.status, text || res.statusText, text);
  }

  return (await res.json()) as MuapiSubmitResponse;
}

/**
 * Consulta o status/resultado de uma prediction.
 * Use só quando webhook não for viável — webhook é mais eficiente.
 */
export async function pollResult(predictionId: string): Promise<MuapiPollResponse> {
  const url = buildUrl(`/api/v1/predictions/${predictionId}/result`);
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-api-key": apiKey() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new MuapiError(res.status, text || res.statusText, text);
  }

  return (await res.json()) as MuapiPollResponse;
}

/**
 * Faz upload de uma referência (imagem, áudio, vídeo) e retorna URL hospedada.
 * Limite: 100MB. Tipos: JPG, PNG, WebP, MP4, MOV, WebM, MP3, WAV.
 *
 * Multipart endpoint: POST /api/v1/upload_file
 *
 * @returns URL pública (cloudfront ou bucket MuAPI) válida para passar
 *          em params como `image_url`, `audio_url` etc.
 */
export async function uploadFile(file: File | Blob, filename?: string): Promise<{ url: string }> {
  const url = buildUrl(`/api/v1/upload_file`);
  const form = new FormData();
  form.append("file", file, filename);
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": apiKey() }, // SEM Content-Type — fetch põe boundary automaticamente
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new MuapiError(res.status, text || res.statusText, text);
  }

  const data = (await res.json()) as { url?: string; file_url?: string; result?: string };
  // A MuAPI pode retornar `url`, `file_url`, ou similar — normalizamos
  const finalUrl = data.url ?? data.file_url ?? data.result;
  if (!finalUrl) {
    throw new MuapiError(500, "Upload OK mas URL não retornada", data);
  }
  return { url: finalUrl };
}

/**
 * Atalho síncrono: submete e aguarda resultado (até timeout).
 * Use só pra dev/teste — em produção use webhook.
 *
 * @param maxWaitSec timeout total (padrão 90s)
 * @param pollIntervalSec intervalo entre polls (padrão 3s)
 */
export async function submitAndWait<TBody extends Record<string, unknown>>(
  modelEndpoint: string,
  body: TBody,
  maxWaitSec = 90,
  pollIntervalSec = 3,
): Promise<MuapiPollResponse> {
  const { request_id } = await submitTask(modelEndpoint, body);
  const deadline = Date.now() + maxWaitSec * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalSec * 1000));
    const result = await pollResult(request_id);
    if (result.status === "completed" || result.status === "failed") {
      return result;
    }
  }
  throw new MuapiError(408, `Timeout aguardando ${request_id}`);
}
