/**
 * Cliente Supabase com SERVICE ROLE (bypassa RLS).
 *
 * NUNCA importe este arquivo em Client Component — o `SUPABASE_SERVICE_ROLE_KEY`
 * iria parar no bundle do browser e qualquer pessoa teria acesso total ao banco.
 *
 * Uso correto:
 *   - dentro de Route Handlers (`app/api/...`)
 *   - dentro de Server Actions
 *   - dentro de helpers server-only (`src/lib/admin/*`)
 *
 * Nunca dentro de:
 *   - `"use client"` components
 *   - bibliotecas que rodam no browser
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[admin] Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
