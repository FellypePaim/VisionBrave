/**
 * GET /api/admin/kie/status
 *
 * Retorna o status atual do cap KIE para o topbar admin (polling 30s).
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KieStatus } from "@/lib/admin/types";

export async function GET() {
  try {
    await requireAdmin("kie.read");
    const sb = createAdminClient();

    const defaultCap = Number(process.env.KIE_MONTHLY_CAP_BRL ?? 200);
    const { data, error } = await sb.rpc("get_kie_monthly_status", {
      p_default_cap: defaultCap,
    });

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (error || !data) {
      // Fallback transparente: retorna zeros mas indica que ainda está dentro do cap
      const fallback: KieStatus = {
        monthKey,
        totalBRL: 0,
        capBRL: defaultCap,
        remainingBRL: defaultCap,
        percentUsed: 0,
        overCap: false,
      };
      return NextResponse.json(fallback);
    }

    const k = data as {
      total_brl: number;
      cap_brl: number;
      remaining_brl: number;
      over_cap: boolean;
    };

    const status: KieStatus = {
      monthKey,
      totalBRL: k.total_brl,
      capBRL: k.cap_brl,
      remainingBRL: k.remaining_brl,
      percentUsed: k.cap_brl > 0 ? Math.round((k.total_brl / k.cap_brl) * 1000) / 10 : 0,
      overCap: k.over_cap,
    };

    return NextResponse.json(status);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
