const BASE = "https://api.kie.ai";

function apiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) throw new Error("KIE_AI_API_KEY not set");
  return key;
}

async function kiePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json as T;
}

async function kieGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const json = await res.json();
  return json as T;
}

export type KieState = "waiting" | "queuing" | "generating" | "success" | "fail";

export interface KieCreateResponse {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

export interface KieStatusResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    model: string;
    state: KieState;
    resultJson?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime?: number;
    creditsConsumed?: number;
  };
}

// ── Images ────────────────────────────────────────────────────────────────────

// Nano Banana 2, GPT Image 2, Flux Pro — POST /api/v1/jobs/createTask
// All input fields inside `input` object
export async function createImageTask(args: {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
  image_input?: string[];  // Nano Banana: up to 14 image URLs
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  const { model, prompt, aspect_ratio, resolution, image_input, callBackUrl } = args;
  return kiePost<KieCreateResponse>("/api/v1/jobs/createTask", {
    model,
    callBackUrl,
    input: {
      prompt,
      aspect_ratio,
      resolution,
      ...(image_input?.length ? { image_input } : {}),
    },
  });
}

// Flux Kontext — own endpoint, camelCase fields at top level
// inputImage must be a hosted URL (not base64)
export async function createFluxKontextTask(args: {
  prompt: string;
  model?: "flux-kontext-pro" | "flux-kontext-max";
  aspectRatio?: string;
  inputImage?: string;        // Hosted URL of reference image
  outputFormat?: "jpeg" | "png";
  promptUpsampling?: boolean;
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  return kiePost<KieCreateResponse>("/api/v1/flux/kontext/generate", {
    model: args.model ?? "flux-kontext-pro",
    prompt: args.prompt,
    aspectRatio: args.aspectRatio,
    inputImage: args.inputImage,
    outputFormat: args.outputFormat,
    promptUpsampling: args.promptUpsampling,
    callBackUrl: args.callBackUrl,
  });
}

// ── Videos ───────────────────────────────────────────────────────────────────

// Seedance 2 / Seedance 2 Fast — POST /api/v1/jobs/createTask, input wrapper required
export async function createSeedanceTask(args: {
  model: "bytedance/seedance-2" | "bytedance/seedance-2-fast";
  prompt: string;
  aspect_ratio?: string;
  duration?: number;
  resolution?: string;          // 480p | 720p | 1080p (Fast: max 720p)
  first_frame_url?: string;
  last_frame_url?: string;
  reference_image_urls?: string[];  // up to 9
  reference_video_urls?: string[];  // up to 3
  reference_audio_urls?: string[];  // up to 3
  generate_audio?: boolean;
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  const {
    model, prompt, aspect_ratio, duration, resolution,
    first_frame_url, last_frame_url,
    reference_image_urls, reference_video_urls, reference_audio_urls,
    generate_audio, callBackUrl,
  } = args;
  return kiePost<KieCreateResponse>("/api/v1/jobs/createTask", {
    model,
    callBackUrl,
    input: {
      prompt,
      aspect_ratio,
      duration,
      resolution,
      first_frame_url,
      last_frame_url,
      ...(reference_image_urls?.length ? { reference_image_urls } : {}),
      ...(reference_video_urls?.length ? { reference_video_urls } : {}),
      ...(reference_audio_urls?.length ? { reference_audio_urls } : {}),
      generate_audio,
    },
  });
}

// Kling 2.1 Standard — image_url is required (image-to-video model)
export async function createKlingTask(args: {
  prompt: string;
  image_url: string;            // Required — hosted URL
  model?: "kling/v2-1-standard";
  duration?: "5" | "10";
  negative_prompt?: string;
  cfg_scale?: number;           // 0–1, step 0.1
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  return kiePost<KieCreateResponse>("/api/v1/jobs/createTask", {
    model: args.model ?? "kling/v2-1-standard",
    callBackUrl: args.callBackUrl,
    input: {
      prompt: args.prompt,
      image_url: args.image_url,
      duration: args.duration ?? "5",
      negative_prompt: args.negative_prompt,
      cfg_scale: args.cfg_scale,
    },
  });
}

// Kling 3.0 — new model, text-to-video with optional image references
export async function createKling3Task(args: {
  prompt: string;
  model?: "kling-3.0/video";
  image_urls?: string[];        // 1–2 images (first frame / first+last)
  sound?: boolean;
  duration?: string;            // "3"–"15"
  aspect_ratio?: string;        // 16:9 | 9:16 | 1:1
  mode?: "std" | "pro" | "4K"; // std=720p, pro=1080p, 4K=3840p
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  return kiePost<KieCreateResponse>("/api/v1/jobs/createTask", {
    model: args.model ?? "kling-3.0/video",
    callBackUrl: args.callBackUrl,
    input: {
      prompt: args.prompt,
      image_urls: args.image_urls?.length ? args.image_urls : undefined,
      sound: args.sound ?? false,
      duration: args.duration ?? "5",
      aspect_ratio: args.aspect_ratio ?? "16:9",
      mode: args.mode ?? "pro",
      multi_shots: false,
    },
  });
}

// Veo 3 — own endpoint
export async function createVeo3Task(args: {
  prompt: string;
  model?: "veo3" | "veo3_fast" | "veo3_lite";
  aspect_ratio?: string;
  resolution?: string;          // 720p | 1080p | 4k
  imageUrls?: string[];         // 1–3 images for reference/first+last frame
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
  enableTranslation?: boolean;
  callBackUrl?: string;
}): Promise<KieCreateResponse> {
  return kiePost<KieCreateResponse>("/api/v1/veo/generate", {
    model: args.model ?? "veo3_fast",
    prompt: args.prompt,
    aspect_ratio: args.aspect_ratio ?? "16:9",
    resolution: args.resolution ?? "720p",
    imageUrls: args.imageUrls?.length ? args.imageUrls : undefined,
    generationType: args.generationType ?? "TEXT_2_VIDEO",
    enableTranslation: args.enableTranslation,
    callBackUrl: args.callBackUrl,
  });
}

// ── Audio (Suno) ──────────────────────────────────────────────────────────────

export type SunoStatus =
  | "PENDING" | "TEXT_SUCCESS" | "FIRST_SUCCESS" | "SUCCESS"
  | "CREATE_TASK_FAILED" | "GENERATE_AUDIO_FAILED" | "SENSITIVE_WORD_DETECTED";

export interface SunoTrack {
  id: string;
  audioUrl: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
  modelName?: string;
}

export interface SunoCreateResponse {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

export interface SunoStatusResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    status: SunoStatus;
    errorCode?: string;
    errorMessage?: string;
    response?: {
      sunoData?: SunoTrack[];
    };
  };
}

export async function createMusicTask(args: {
  prompt: string;
  model?: string;
  customMode?: boolean;
  style?: string;
  title?: string;
  instrumental?: boolean;
  vocalGender?: "m" | "f";
  negativeTags?: string;
  styleWeight?: number;        // 0–1
  weirdnessConstraint?: number; // 0–1
  audioWeight?: number;        // 0–1
  callBackUrl?: string;
}): Promise<SunoCreateResponse> {
  const {
    prompt, model = "V4_5", customMode = false,
    style, title, instrumental = false,
    vocalGender, negativeTags, styleWeight, weirdnessConstraint, audioWeight,
  } = args;
  return kiePost<SunoCreateResponse>("/api/v1/generate", {
    prompt,
    model,
    customMode,
    style: customMode ? style : undefined,
    title: customMode ? title : undefined,
    instrumental,
    vocalGender: vocalGender ?? undefined,
    negativeTags: negativeTags?.trim() || undefined,
    styleWeight: styleWeight ?? undefined,
    weirdnessConstraint: weirdnessConstraint ?? undefined,
    audioWeight: audioWeight ?? undefined,
    callBackUrl: args.callBackUrl,
  });
}

export async function getMusicStatus(taskId: string): Promise<SunoStatusResponse> {
  return kieGet<SunoStatusResponse>(
    `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`
  );
}

export async function getTaskStatus(taskId: string): Promise<KieStatusResponse> {
  return kieGet<KieStatusResponse>(
    `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
  );
}

export function parseResultUrl(resultJson?: string): string | null {
  if (!resultJson) return null;
  try {
    const parsed = JSON.parse(resultJson);
    return parsed?.resultUrls?.[0] ?? null;
  } catch {
    return null;
  }
}
