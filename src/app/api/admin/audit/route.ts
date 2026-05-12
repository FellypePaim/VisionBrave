/**
 * GET /api/admin/audit
 *
 * Lista paginada de admin_audit_logs com filtros + enrich de emails dos admins/targets.
 *
 * Query params:
 *   page, pageSize (default 25, max 100)
 *   action       → ex: credits.add, user.block, kie.cap_update
 *   entityType   → credits, user, subscription, kie_cap, system_setting
 *   adminUserId  → filtra por quem executou
 *   targetUserId → filtra por quem foi afetado
 *   from, to     → range ISO de created_at
 *   search       → substring em action OR entity_id OR metadata.reason
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface AuditRow {
  id: string;
  adminUserId: string | null;
  adminEmail: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin("audit.read");

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const action = url.searchParams.get("action") ?? "";
    const entityType = url.searchParams.get("entityType") ?? "";
    const adminUserId = url.searchParams.get("adminUserId") ?? "";
    const targetUserId = url.searchParams.get("targetUserId") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";

    const sb = createAdminClient();

    let query = sb
      .from("admin_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (adminUserId) query = query.eq("admin_user_id", adminUserId);
    if (targetUserId) query = query.eq("target_user_id", targetUserId);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (search) {
      // OR em action / entity_id (Supabase PostgREST .or syntax)
      query = query.or(`action.ilike.%${search}%,entity_id.ilike.%${search}%`);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[admin/audit] query failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar audit logs" } },
        { status: 500 }
      );
    }

    // Enrich com email dos admin/target em batch
    const allIds = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.admin_user_id) allIds.add(r.admin_user_id);
      if (r.target_user_id) allIds.add(r.target_user_id);
    });
    const emailMap = new Map<string, string | null>();
    await Promise.all(
      Array.from(allIds).map(async (uid) => {
        try {
          const { data } = await sb.auth.admin.getUserById(uid);
          emailMap.set(uid, data?.user?.email ?? null);
        } catch {
          emailMap.set(uid, null);
        }
      })
    );

    const data: AuditRow[] = (rows ?? []).map((r) => ({
      id: r.id,
      adminUserId: r.admin_user_id,
      adminEmail: r.admin_user_id ? emailMap.get(r.admin_user_id) ?? null : null,
      targetUserId: r.target_user_id,
      targetEmail: r.target_user_id ? emailMap.get(r.target_user_id) ?? null : null,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      before: r.before,
      after: r.after,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));

    const total = count ?? data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
