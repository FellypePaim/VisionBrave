/**
 * Helper de instrumentação de erros para app_error_logs.
 *
 * Best-effort: nunca derruba a operação principal — falha silenciosa em log.
 * Pode ser chamado de qualquer Route Handler. Sempre usa service role pra evitar
 * problemas com RLS (a tabela tem RLS deny-all).
 *
 * Uso típico:
 *   try { ... } catch (err) {
 *     await logAppError({
 *       userId: user.id,
 *       route: "/api/generate/image",
 *       action: "kie_create_task",
 *       provider: "KIE",
 *       model: "Nano Banana",
 *       errorMessage: err instanceof Error ? err.message : String(err),
 *       stack: err instanceof Error ? err.stack : undefined,
 *       metadata: { taskId, prompt: prompt.slice(0, 200) },
 *     });
 *   }
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface LogAppErrorInput {
  userId?: string | null;
  route?: string;
  action?: string;
  provider?: string;
  model?: string;
  errorCode?: string;
  errorMessage: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export async function logAppError(input: LogAppErrorInput): Promise<void> {
  try {
    // Trunca stack pra evitar payloads gigantes no banco
    const stack = input.stack ? input.stack.slice(0, 4000) : null;
    // Trunca message pra ficar searchable mas não explodir
    const message = input.errorMessage.slice(0, 2000);

    const sb = createAdminClient();
    const { error } = await sb.from("app_error_logs").insert({
      user_id: input.userId ?? null,
      route: input.route ?? null,
      action: input.action ?? null,
      provider: input.provider ?? null,
      model: input.model ?? null,
      error_code: input.errorCode ?? null,
      error_message: message,
      stack,
      metadata: (input.metadata ?? {}) as never,
    });
    if (error) {
      // Loga no console mas não relança — esse helper não pode quebrar nada
      console.error("[logAppError] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[logAppError] unexpected:", e);
  }
}
