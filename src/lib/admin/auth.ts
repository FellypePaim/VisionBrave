/**
 * Guarda central de autorização do painel admin.
 *
 * Toda Route Handler `/api/admin/*` e Server Component em `/admin/*`
 * DEVE começar chamando `requireAdmin(permission?)`.
 *
 * Nunca confiar só em proteção de UI — security real está aqui.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminPermission, AdminRole, AdminApiError } from "./types";

export class AdminError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export interface AdminAuthContext {
  /** Auth user (autenticado via Supabase SSR cookies) */
  user: { id: string; email: string | null };
  /** Linha do admin_users com role + permissions */
  admin: {
    role: AdminRole;
    permissions: Record<string, boolean>;
    isActive: boolean;
  };
}

/**
 * Valida que o caller é um admin ativo com a permission solicitada.
 *
 * @param permission Permission key (ex: "credits.adjust"). Se omitida, valida só admin.access.
 * @throws AdminError(401) se não autenticado
 * @throws AdminError(403) se não for admin ativo ou faltar permission
 */
export async function requireAdmin(
  permission: AdminPermission = "admin.access",
): Promise<AdminAuthContext> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    throw new AdminError(401, "unauthorized", "Não autenticado");
  }

  // Consulta admin_users via service role (RLS deny-all impede leitura via anon).
  // Cast `any` aqui é workaround até `database.types.ts` ser regenerado pós-migration —
  // a tabela `admin_users` ainda não está no schema gerado.
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin as any)
    .from("admin_users")
    .select("role, permissions, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[requireAdmin] DB error:", error.message);
    throw new AdminError(500, "internal_error", "Erro ao validar credenciais admin");
  }

  if (!row || !row.is_active) {
    throw new AdminError(403, "forbidden", "Acesso negado ao painel admin");
  }

  const role = row.role as AdminRole;
  const permissions = (row.permissions ?? {}) as Record<string, boolean>;

  // owner libera tudo automaticamente
  if (role !== "owner" && !permissions[permission]) {
    throw new AdminError(
      403,
      "forbidden",
      `Permissão necessária: ${permission}`,
    );
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    admin: { role, permissions, isActive: row.is_active },
  };
}

/**
 * Converte erros em NextResponse padronizada para Route Handlers.
 *
 * Uso:
 *   export async function GET(req: Request) {
 *     try {
 *       const { user } = await requireAdmin("users.read");
 *       ...
 *     } catch (err) {
 *       return adminErrorResponse(err);
 *     }
 *   }
 */
export function adminErrorResponse(err: unknown): NextResponse<AdminApiError> {
  if (err instanceof AdminError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }
  console.error("[admin] unexpected error:", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Erro interno do servidor" } },
    { status: 500 },
  );
}

/**
 * Variante de requireAdmin para Server Components que precisam redirecionar
 * em vez de devolver JSON. Retorna `null` se não for admin (caller decide o que fazer).
 */
export async function tryAdmin(
  permission: AdminPermission = "admin.access",
): Promise<AdminAuthContext | null> {
  try {
    return await requireAdmin(permission);
  } catch {
    return null;
  }
}
