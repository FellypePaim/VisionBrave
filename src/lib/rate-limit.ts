/**
 * Rate limiter in-memory simples (token bucket).
 *
 * Para produção em escala, trocar por Upstash Redis (`@upstash/ratelimit`).
 * Esta implementação funciona em uma única instância de servidor — ao escalar
 * horizontalmente (Vercel multi-region), a contagem por IP/user não é
 * compartilhada entre instâncias. Ainda assim previne spam casual.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Limpa buckets expirados a cada 5min para evitar leak (no-op em dev hot reload)
if (typeof globalThis !== "undefined" && !(globalThis as unknown as { __rl_cleanup?: boolean }).__rl_cleanup) {
  (globalThis as unknown as { __rl_cleanup?: boolean }).__rl_cleanup = true;
  setInterval(() => {
    const now = Date.now();
    buckets.forEach((b, k) => { if (b.resetAt < now) buckets.delete(k); });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // ms
}

/**
 * Limita um identificador (user_id ou IP) a `limit` requests numa janela de `windowMs`.
 *
 * @example
 * const r = rateLimit(`gen:img:${userId}`, 10, 60_000); // 10/min
 * if (!r.allowed) return new Response("Too many requests", { status: 429 });
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: bucket.resetAt - now };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetIn: bucket.resetAt - now };
}

/**
 * Gera resposta padronizada de 429 com headers úteis.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(result.resetIn / 1000)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetIn) / 1000)),
      },
    },
  );
}
