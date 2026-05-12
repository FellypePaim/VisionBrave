/**
 * GET /api/admin/kie/history
 *
 * Retorna os últimos 12 meses de uso KIE para gráfico/tabela na página /admin/kie.
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin("kie.read");
    const sb = createAdminClient();

    const { data, error } = await sb
      .from("kie_monthly_usage")
      .select("month_key, total_brl, total_requests, cap_brl, updated_at")
      .order("month_key", { ascending: false })
      .limit(12);

    if (error) {
      console.error("[admin/kie/history] query failed:", error);
      return NextResponse.json(
        { error: { code: "internal_error", message: "Erro ao listar histórico KIE" } },
        { status: 500 }
      );
    }

    const envDefaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);

    const history = (data ?? []).map((r) => {
      const cap = r.cap_brl ?? envDefaultCap;
      const total = r.total_brl ?? 0;
      const percent = cap > 0 ? (total / cap) * 100 : 0;
      return {
        monthKey: r.month_key,
        totalBRL: total,
        totalRequests: r.total_requests ?? 0,
        capBRL: cap,
        capOverridden: r.cap_brl !== null,
        percentUsed: Math.round(percent * 10) / 10,
        overCap: total > cap,
        updatedAt: r.updated_at,
      };
    });

    return NextResponse.json({ history, envDefaultCap });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
