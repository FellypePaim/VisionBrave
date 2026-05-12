/**
 * Tipos compartilhados do painel admin.
 * Estes podem ser importados tanto no server quanto no client (sem service role).
 */

export type AdminRole = "owner" | "admin" | "support" | "finance" | "viewer";

export type AdminPermission =
  | "admin.access"
  | "users.read"
  | "users.update"
  | "users.block"
  | "credits.read"
  | "credits.adjust"
  | "credits.refund"
  | "transactions.read"
  | "subscriptions.read"
  | "subscriptions.update"
  | "kie.read"
  | "kie.update"
  | "settings.read"
  | "settings.update"
  | "audit.read";

export interface AdminOverview {
  users: {
    total: number;
    newToday: number;
    new7d: number;
    new30d: number;
    byPlan: Record<string, number>;
  };
  subscriptions: {
    active: number;
    canceled: number;
    pastDue: number;
    trialing: number;
    byPlan: Record<string, number>;
  };
  credits: {
    totalInCirculation: number;
    totalEarned: number;
    totalSpent: number;
    adminAdjustmentsLast30d: number;
  };
  generations: {
    totalSpend: number;          // total de transações tipo 'spend'
    last24h: number;
    last7d: number;
    topModel: string | null;
  };
  kie: {
    monthKey: string;
    totalBRL: number;
    capBRL: number;
    remainingBRL: number;
    percentUsed: number;
    overCap: boolean;
    status: "normal" | "atencao" | "critico" | "bloqueado";
  };
  health: {
    supabaseOk: boolean;
    serviceRoleConfigured: boolean;
    kieKeyConfigured: boolean;
    kieMonthlyCapConfigured: boolean;
    siteUrlConfigured: boolean;
  };
}

export interface AdminUserRow {
  userId: string;
  email: string;
  createdAt: string;
  plan: string;
  subscriptionStatus: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isBlocked: boolean;
}

export interface AdminUserDetails extends AdminUserRow {
  monthlyCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

export interface KieStatus {
  monthKey: string;
  totalBRL: number;
  capBRL: number;
  remainingBRL: number;
  percentUsed: number;
  overCap: boolean;
}

export interface AdminAuditLogRow {
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

export interface AdminApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
