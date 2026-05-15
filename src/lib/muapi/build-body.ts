/**
 * Construtor de body MuAPI por modelo.
 *
 * Cada modelo MuAPI aceita schema próprio. Esta função normaliza
 * params do app (vindos do form) pra body correto da API.
 *
 * Schema confirmado via OpenAPI spec (https://api.muapi.ai/openapi.json).
 */

import { normalizeModelName } from "@/lib/credits";

export interface BuildBodyOptions {
  prompt: string;
  /** Aspect ratio padrão: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" etc. */
  aspectRatio?: string;
  /** Resolução: "1K" | "2K" | "4K" — convertida em width/height ou param do modelo */
  resolution?: string;
  /** Para modelos image-to-image: URL única hospedada (Flux Kontext) */
  imageUrl?: string;
  /** Para modelos multimodais: várias URLs (Nano Banana até 8 refs do modelo + 3 vestuário) */
  imageUrls?: string[];
  /** Duração em segundos (vídeo) */
  duration?: number;
  /** Estilo (texto pra Suno) */
  style?: string;
  /** Título (Suno) */
  title?: string;
  /** Instrumental flag (Suno) */
  instrumental?: boolean;
}

/** Converte "1K"/"2K"/"4K" em width/height. Default 1024x1024. */
function resolutionToWH(resolution?: string, aspectRatio?: string): { width: number; height: number } {
  const base = resolution === "4K" ? 2048 : resolution === "2K" ? 1536 : 1024;
  if (!aspectRatio || aspectRatio === "1:1") return { width: base, height: base };
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) return { width: base, height: base };
  // Mantém o lado maior em `base`
  if (w >= h) {
    return { width: base, height: Math.round((base * h) / w) };
  } else {
    return { width: Math.round((base * w) / h), height: base };
  }
}

/**
 * Constrói body MuAPI conforme o modelo.
 *
 * @returns objeto pra passar ao `submitTask(endpoint, body)`
 */
export function buildMuapiBody(
  modelName: string,
  opts: BuildBodyOptions,
): Record<string, unknown> {
  const model = normalizeModelName(modelName);
  const { prompt, aspectRatio, resolution, imageUrl, imageUrls, duration, style, title, instrumental } = opts;

  // ───── IMAGEM ──────────────────────────────────────────────────────
  // Flux Schnell / Dev / 2 Pro: prompt + width + height
  if (model === "Flux Schnell" || model === "Flux Dev" || model === "Flux Pro") {
    const { width, height } = resolutionToWH(resolution, aspectRatio);
    return { prompt, width, height };
  }

  // Flux Kontext Pro / Max: prompt + image_url + aspect_ratio (i2i requer image_url)
  if (model === "Flux Kontext Pro" || model === "Flux Kontext Max") {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    };
  }

  // Nano Banana / Pro: prompt + image_urls (multi-image)
  if (model === "Nano Banana" || model === "Nano Banana Pro") {
    return {
      prompt,
      ...(imageUrls && imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    };
  }

  // GPT Image 2 / Seedream / Midjourney: prompt + aspect_ratio
  if (model === "GPT Image 2" || model === "Seedream 5.0" || model === "Midjourney v8") {
    return {
      prompt,
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    };
  }

  // ───── VÍDEO ───────────────────────────────────────────────────────
  // Kling 2.1 / 3.0: prompt + image_url + aspect_ratio + duration
  if (model.startsWith("Kling ")) {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      ...(duration ? { duration } : { duration: 5 }),
    };
  }

  // Veo 3.1 / Fast: prompt + image_url + resolution + duration
  if (model.startsWith("Veo ")) {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      ...(resolution ? { resolution } : {}),
      ...(duration ? { duration } : { duration: 8 }),
    };
  }

  // Seedance 2 / Fast: prompt + image_url + aspect_ratio + duration
  if (model.startsWith("Seedance ")) {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      ...(duration ? { duration } : { duration: 5 }),
    };
  }

  // Hailuo: prompt + image_url + duration
  if (model.startsWith("Hailuo ")) {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(duration ? { duration } : { duration: 6 }),
    };
  }

  // Sora 2 / Pro: prompt + (image_url se i2v)
  if (model.startsWith("Sora ")) {
    return {
      prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    };
  }

  // ───── ÁUDIO (Suno) ────────────────────────────────────────────────
  if (model.startsWith("Suno ")) {
    return {
      prompt,
      ...(style ? { style } : {}),
      ...(title ? { title } : {}),
      ...(instrumental !== undefined ? { instrumental } : {}),
    };
  }

  // Fallback: prompt mínimo
  return { prompt };
}
