/**
 * Rate limit in-memory para rotas /api/admin/* que mutam dados.
 *
 * NÃO compartilha entre instâncias Vercel multi-region — mas pra MVP é
 * suficiente contra abuso simples (admin loop bug, conta comprometida
 * tentando drenar créditos em sequência).
 *
 * Quando o painel escalar, migrar pra Upstash Redis.
 */

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;          // 1 minuto
const DEFAULT_MAX = 10;            // 10 operações por minuto por chave

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Retorna true e registra a tentativa se ainda houver vaga.
 * Retorna false se a chave atingiu o teto.
 *
 * @param key Identificador único — geralmente `operation:adminUserId`
 *            (ex: `credits.adjust:abc-uuid`)
 * @param max Máximo de operações na janela (default 10/min)
 */
export function checkAdminRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
): RateLimitResult {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (arr.length >= max) {
    const oldest = arr[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + WINDOW_MS,
    };
  }

  arr.push(now);
  hits.set(key, arr);

  return {
    allowed: true,
    remaining: max - arr.length,
    resetAt: now + WINDOW_MS,
  };
}

/**
 * Limpa entradas antigas pra evitar memory leak em runtime longo (raro no Vercel).
 * Não precisa chamar manualmente — o `checkAdminRateLimit` já filtra na leitura.
 */
export function clearExpired(): void {
  const now = Date.now();
  const entries = Array.from(hits.entries());
  for (const [key, arr] of entries) {
    const filtered = arr.filter((t: number) => now - t < WINDOW_MS);
    if (filtered.length === 0) hits.delete(key);
    else hits.set(key, filtered);
  }
}
