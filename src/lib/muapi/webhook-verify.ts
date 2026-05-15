/**
 * Validação de webhooks MuAPI.
 *
 * MuAPI NÃO oferece HMAC nativo nem secret token oficial. Mitigamos via:
 *
 * 1. Secret embarcado no PATH do webhook (não na query — paths não vazam em logs nem referer).
 *    Ex: POST /api/webhooks/muapi/<MUAPI_WEBHOOK_SECRET>
 *
 * 2. Validação adicional: o payload deve conter `id` que existe em
 *    `pending_generations` (origem MuAPI). Atacante teria que conhecer
 *    request_ids reais para conseguir injetar payload falso útil.
 *
 * Limitações:
 *   - Sem HMAC, atacante com secret consegue forjar callbacks
 *   - Rotacionar `MUAPI_WEBHOOK_SECRET` periodicamente é recomendado
 *   - Considere IP allowlist se MuAPI publicar IPs estáveis no futuro
 */

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Valida que o secret no path bate com o esperado, usando timing-safe comparison.
 * Retorna boolean — caller decide retornar 401/403.
 */
export function isValidWebhookSecret(receivedSecret: string): boolean {
  const expected = process.env.MUAPI_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[muapi/webhook] MUAPI_WEBHOOK_SECRET não configurada");
    return false;
  }
  if (!receivedSecret || typeof receivedSecret !== "string") return false;

  // Hash ambos pra evitar timing attack baseado em length
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(receivedSecret).digest();

  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
