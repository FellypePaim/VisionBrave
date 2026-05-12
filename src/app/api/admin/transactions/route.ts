/**
 * GET /api/admin/transactions
 *
 * Lista paginada global de credit_transactions com filtros + enrich de email.
 *
 * Query params:
 *   page, pageSize (default 25, max 100)
 *   type      → bonus | purchase | spend | refund | subscription
 *   source    → "admin" filtra apenas transactions com metadata.source = 'admin'
 *   userId    → filtra por user_id específico
 *   model     → filtra por metadata.model (ex: "Nano Banana")
 *   from, to  → range ISO de created_at
 *   search    → substring em description (ILIKE)
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface TransactionRow {
  id: string;
  userId: string;
  email: string | null;
  amount: number;
  type: string;
  description: string | null;
  refId: string | null;
  metadata: Record<string, unknown>;
  isAdmin: boolean;
  model: string | null;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin("transactions.read");

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const typeFilter = url.searchParams.get("type") ?? "";
    const sourceFilter = url.searchParams.get("source") ?? "";
    const userIdFilter = url.searchParams.get("userId") ?? "";
    const modelFilter = url.searchParams.get("model") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";

    const sb = createAdminClient();

    // Query base
    let query = sb
      .from("credit_transactions")
      .select("id, user_id, amount, type, description, ref_id, metadata, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    // Filtros server-side (postgrest)
    if (typeFilter) query = query.eq("type", typeFilter as never);
    if (userIdFilter) query = query.eq("user_id", userIdFilter);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (search) query = query.ilike("description", `%${search}%`);

    // Paginação
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[admin/transactions] query failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar transações" } },
        { status: 500 }
      );
    }

    // Filtros que dependem de metadata (não dá pra fazer no PostgREST com confiança):
    //   source=admin → metadata->>'source' = 'admin'
    //   model=X      → metadata->>'model' = X
    // Fazemos em memória — número de rows aqui já é pageSize, então OK.
    let filtered = rows ?? [];
    if (sourceFilter === "admin") {
      filtered = filtered.filter((r) => {
        const m = (r.metadata ?? {}) as Record<string, unknown>;
        return m.source === "admin";
      });
    }
    if (modelFilter) {
      filtered = filtered.filter((r) => {
        const m = (r.metadata ?? {}) as Record<string, unknown>;
        return m.model === modelFilter;
      });
    }

    // Enrich com email — busca em batch via auth.admin
    const uniqueUserIds = Array.from(new Set(filtered.map((r) => r.user_id)));
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

    const data: TransactionRow[] = filtered.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        userId: r.user_id,
        email: emailMap.get(r.user_id) ?? null,
        amount: r.amount,
        type: r.type,
        description: r.description,
        refId: r.ref_id,
        metadata: meta,
        isAdmin: meta.source === "admin",
        model: typeof meta.model === "string" ? meta.model : null,
        createdAt: r.created_at,
      };
    });

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
