const BASE_URL = "https://api.kie.ai";

export interface KieCreateTaskInput {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface KieCreateTaskResponse {
  code: number;
  msg?: string;
  data?: { taskId: string };
}

export interface KieTaskStatusResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    state: "queued" | "running" | "success" | "fail";
    resultJson?: string;
    failMsg?: string;
    completeTime?: number;
  };
}

function getApiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) throw new Error("KIE_AI_API_KEY não configurada");
  return key;
}

async function kieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`kie.ai ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function createTask(args: KieCreateTaskInput): Promise<KieCreateTaskResponse> {
  return kieFetch<KieCreateTaskResponse>("/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function getTaskStatus(taskId: string): Promise<KieTaskStatusResponse> {
  return kieFetch<KieTaskStatusResponse>(
    `/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
  );
}
