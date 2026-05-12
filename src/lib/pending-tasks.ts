/**
 * Helper client-side pra rastrear gerações que deram timeout no polling.
 *
 * Quando o polling client-side expira (limite de ~6min), a tarefa pode AINDA
 * estar processando na KIE. Em vez de marcar como "falhou pra sempre" e perder
 * a imagem, salvamos no localStorage e oferecemos recuperar manualmente.
 *
 * Estrutura: array de PendingTask em "vb:pending-tasks".
 *
 * Limpeza automática: tasks > 24h são consideradas perdidas (KIE expira URLs).
 */

const STORAGE_KEY = "vb:pending-tasks";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export interface PendingTask {
  taskId: string;
  /** Página de origem (pra filtrar ao recuperar) */
  source: "portrait" | "images" | "videos" | "audio";
  type: "image" | "video" | "audio";
  model: string;
  prompt: string;
  createdAt: number;
}

function read(): PendingTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingTask[];
  } catch {
    return [];
  }
}

function write(tasks: PendingTask[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage quota cheio — falha silenciosa
  }
}

/** Salva uma task pendente. Se já existe, ignora (idempotente). */
export function savePendingTask(task: PendingTask): void {
  const current = read();
  if (current.some((t) => t.taskId === task.taskId)) return;
  current.push(task);
  write(current);
}

/** Remove uma task pelo taskId (após sucesso ou desistência). */
export function removePendingTask(taskId: string): void {
  const current = read();
  write(current.filter((t) => t.taskId !== taskId));
}

/** Lista tasks pendentes, opcionalmente filtrando por source. Remove expiradas. */
export function getPendingTasks(source?: PendingTask["source"]): PendingTask[] {
  const current = read();
  const now = Date.now();
  // Filtra expiradas e re-salva limpo
  const fresh = current.filter((t) => now - t.createdAt < MAX_AGE_MS);
  if (fresh.length !== current.length) write(fresh);
  if (source) return fresh.filter((t) => t.source === source);
  return fresh;
}

/** Quantas tasks pendentes existem (após limpeza). */
export function countPendingTasks(source?: PendingTask["source"]): number {
  return getPendingTasks(source).length;
}
