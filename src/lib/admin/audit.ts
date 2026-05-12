/**
 * Helper para registrar ações sensíveis em `admin_audit_logs`.
 *
 * Toda ação que mexe em $$ (créditos, plano, cap KIE, settings, ban)
 * DEVE chamar este helper imediatamente após aplicar a mudança.
 *
 * Falha em registrar audit log NÃO desfaz a operação (best-effort logging),
 * mas loga erro pra investigação.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export interface AdminAuditLogInput {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;        // ex: "credits.add", "user.block", "kie.cap_update"
  entityType: string;    // ex: "credits", "user", "kie_cap", "system_setting"
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  request?: Request;
}

/**
 * Extrai IP do cabeçalho x-forwarded-for (Vercel/Cloudflare).
 * Pega só o primeiro IP da cadeia (o do cliente original).
 */
function extractIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function createAdminAuditLog(input: AdminAuditLogInput): Promise<void> {
  try {
    const sb = createAdminClient();
    const { error } = await sb.from("admin_audit_logs").insert({
      admin_user_id: input.adminUserId,
      target_user_id: input.targetUserId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before: (input.before ?? null) as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["before"],
      after: (input.after ?? null) as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["after"],
      metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["metadata"],
      ip_address: extractIp(input.request),
      user_agent: input.request?.headers.get("user-agent") ?? null,
    });

    if (error) {
      // Best-effort: loga mas não derruba a operação principal
      console.error("[audit] insert failed:", error.message, {
        action: input.action,
        entityType: input.entityType,
      });
    }
  } catch (err) {
    console.error("[audit] unexpected error:", err);
  }
}
