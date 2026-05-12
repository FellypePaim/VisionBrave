/**
 * GET /api/admin/users
 *
 * Lista paginada de usuários combinando auth.users + subscriptions + credits.
 *
 * Query params:
 *   page?      (default 1)
 *   pageSize?  (default 25, max 100)
 *   search?    (substring no email, case-insensitive)
 *   plan?      (filtra por subscription.plan)
 *   status?    (filtra por subscription.status)
 *   blocked?   ("true" filtra só banidos)
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserRow, PaginatedResponse } from "@/lib/admin/types";

export async function GET(req: Request) {
  try {
    await requireAdmin("users.read");

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const search = url.searchParams.get("search")?.toLowerCase().trim() ?? "";
    const planFilter = url.searchParams.get("plan") ?? "";
    const statusFilter = url.searchParams.get("status") ?? "";
    const blockedFilter = url.searchParams.get("blocked") === "true";

    const sb = createAdminClient();

    // 1. Lista todos os users do auth (paginado em memória pro MVP)
    // Limite alto pra capturar todos antes de filtrar. Otimizar quando passar de 5k users.
    const { data: authData, error: authErr } = await sb.auth.admin.listUsers({
      page: 1, perPage: 1000,
    });
    if (authErr) {
      console.error("[admin/users] auth.admin.listUsers failed:", authErr);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar usuários" } },
        { status: 500 }
      );
    }
    const allAuthUsers = authData?.users ?? [];

    // 2. Busca subscriptions e credits em batch
    const userIds = allAuthUsers.map((u) => u.id);
    const [{ data: subs }, { data: creditsRows }] = await Promise.all([
      sb.from("subscriptions").select("user_id, plan, status").in("user_id", userIds),
      sb.from("credits").select("user_id, balance, total_earned, total_spent").in("user_id", userIds),
    ]);

    const subsMap = new Map((subs ?? []).map((s) => [s.user_id, s]));
    const creditsMap = new Map((creditsRows ?? []).map((c) => [c.user_id, c]));

    // 3. Combina e filtra
    let combined: AdminUserRow[] = allAuthUsers.map((u) => {
      const sub = subsMap.get(u.id);
      const c = creditsMap.get(u.id);
      // `banned_until` vem do Supabase Auth (string ISO no futuro = banido)
      const banUntil = (u as { banned_until?: string | null }).banned_until ?? null;
      const isBlocked = !!banUntil && new Date(banUntil) > new Date();
      return {
        userId: u.id,
        email: u.email ?? "",
        createdAt: u.created_at,
        plan: sub?.plan ?? "free",
        subscriptionStatus: sub?.status ?? "active",
        balance: c?.balance ?? 0,
        totalEarned: c?.total_earned ?? 0,
        totalSpent: c?.total_spent ?? 0,
        isBlocked,
      };
    });

    if (search) {
      combined = combined.filter((row) => row.email.toLowerCase().includes(search));
    }
    if (planFilter) {
      combined = combined.filter((row) => row.plan === planFilter);
    }
    if (statusFilter) {
      combined = combined.filter((row) => row.subscriptionStatus === statusFilter);
    }
    if (blockedFilter) {
      combined = combined.filter((row) => row.isBlocked);
    }

    // 4. Ordena por createdAt desc + pagina
    combined.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const total = combined.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = combined.slice(start, start + pageSize);

    const response: PaginatedResponse<AdminUserRow> = {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
    return NextResponse.json(response);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
