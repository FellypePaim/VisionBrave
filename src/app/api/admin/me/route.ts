/**
 * GET /api/admin/me
 *
 * Endpoint leve usado pela Sidebar do dashboard pra decidir se mostra
 * o botão "ADMIN".
 *
 * Retorna { isAdmin: boolean, role: string | null } — NÃO usa requireAdmin
 * pra não retornar 403, já que usuários comuns vão chamar e devem receber
 * { isAdmin: false } silenciosamente.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ isAdmin: false, role: null });
  }

  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row || !row.is_active) {
      return NextResponse.json({ isAdmin: false, role: null });
    }
    return NextResponse.json({ isAdmin: true, role: row.role });
  } catch {
    // Em caso de erro inesperado, degrada para "não admin" — falha segura
    return NextResponse.json({ isAdmin: false, role: null });
  }
}
