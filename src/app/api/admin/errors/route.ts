/**
 * GET /api/admin/errors
 *
 * Lista paginada de app_error_logs.
 *
 * Query params:
 *   page, pageSize (default 25, max 100)
 *   route, action, provider, model, errorCode
 *   userId
 *   from, to
 *   search (substring em error_message)
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface ErrorRow {
  id: string;
  userId: string | null;
  email: string | null;
  route: string | null;
  action: string | null;
  provider: string | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string;
  stack: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin("errors.read");

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const routeFilter = url.searchParams.get("route") ?? "";
    const actionFilter = url.searchParams.get("action") ?? "";
    const providerFilter = url.searchParams.get("provider") ?? "";
    const modelFilter = url.searchParams.get("model") ?? "";
    const errorCodeFilter = url.searchParams.get("errorCode") ?? "";
    const userIdFilter = url.searchParams.get("userId") ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    const sb = createAdminClient();

    let query = sb
      .from("app_error_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (routeFilter) query = query.eq("route", routeFilter);
    if (actionFilter) query = query.eq("action", actionFilter);
    if (providerFilter) query = query.eq("provider", providerFilter);
    if (modelFilter) query = query.eq("model", modelFilter);
    if (errorCodeFilter) query = query.eq("error_code", errorCodeFilter);
    if (userIdFilter) query = query.eq("user_id", userIdFilter);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (search) query = query.ilike("error_message", `%${search}%`);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[admin/errors] query failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar erros" } },
        { status: 500 }
      );
    }

    // Enrich com email
    const uniqueUserIds = Array.from(new Set((rows ?? []).map((r) => r.user_id).filter(Boolean) as string[]));
    const emailMap = new Map<string, string | null>();
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const { data } = await sb.auth.admin.getUserById(uid);
          emailMap.set(uid, data?.user?.email ?? null);
        } catch {
          emailMap.set(uid, null);
        }
      })
    );

    const data: ErrorRow[] = (rows ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.user_id ? emailMap.get(r.user_id) ?? null : null,
      route: r.route,
      action: r.action,
      provider: r.provider,
      model: r.model,
      errorCode: r.error_code,
      errorMessage: r.error_message,
      stack: r.stack,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      createdAt: r.created_at,
    }));

    // KPIs rápidos pro topo da página
    const { count: last24h } = await sb
      .from("app_error_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const total = count ?? data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages },
      stats: { last24h: last24h ?? 0 },
    });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
