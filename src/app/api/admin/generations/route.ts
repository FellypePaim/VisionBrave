/**
 * GET /api/admin/generations
 *
 * Lista paginada global de generations com filtros + enrich de email.
 *
 * Query params:
 *   page, pageSize (default 24, max 100)
 *   type           → image | video | audio
 *   model          → ex: "Nano Banana"
 *   userId         → filtra por user_id
 *   search         → substring em prompt (ILIKE)
 *   from, to       → range ISO de created_at
 *   includeDeleted → "true" inclui soft deleted, default false
 *   onlyDeleted    → "true" mostra só soft deleted
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface GenerationRow {
  id: string;
  userId: string;
  email: string | null;
  type: string;
  model: string;
  prompt: string;
  publicUrl: string | null;
  externalUrl: string | null;
  storagePath: string | null;
  metadata: Record<string, unknown>;
  watermarked: boolean;
  plan: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deleteReason: string | null;
  createdAt: string;
}

export async function GET(req: Request) {
  try {
    await requireAdmin("generations.read");

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 24)));
    const typeFilter = url.searchParams.get("type") ?? "";
    const modelFilter = url.searchParams.get("model") ?? "";
    const userIdFilter = url.searchParams.get("userId") ?? "";
    const search = url.searchParams.get("search")?.trim() ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";
    const onlyDeleted = url.searchParams.get("onlyDeleted") === "true";

    const sb = createAdminClient();

    let query = sb
      .from("generations")
      .select(
        "id, user_id, type, model, prompt, public_url, external_url, storage_path, metadata, created_at, deleted_at, deleted_by, delete_reason",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (typeFilter) query = query.eq("type", typeFilter);
    if (modelFilter) query = query.eq("model", modelFilter);
    if (userIdFilter) query = query.eq("user_id", userIdFilter);
    if (search) query = query.ilike("prompt", `%${search}%`);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    if (onlyDeleted) query = query.not("deleted_at", "is", null);
    else if (!includeDeleted) query = query.is("deleted_at", null);

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);

    const { data: rows, count, error } = await query;
    if (error) {
      console.error("[admin/generations] query failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar gerações" } },
        { status: 500 }
      );
    }

    // Enrich com email em batch
    const uniqueUserIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
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

    const data: GenerationRow[] = (rows ?? []).map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        userId: r.user_id,
        email: emailMap.get(r.user_id) ?? null,
        type: r.type,
        model: r.model,
        prompt: r.prompt,
        publicUrl: r.public_url,
        externalUrl: r.external_url,
        storagePath: r.storage_path,
        metadata: meta,
        watermarked: meta.watermarked === true,
        plan: typeof meta.plan === "string" ? meta.plan : null,
        isDeleted: !!r.deleted_at,
        deletedAt: r.deleted_at,
        deleteReason: r.delete_reason,
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
