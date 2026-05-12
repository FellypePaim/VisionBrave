"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Coins, Lock, ExternalLink, Plus,
} from "lucide-react";
import { CreditAdjustModal } from "@/components/admin/CreditAdjustModal";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import type { AdminUserRow, PaginatedResponse } from "@/lib/admin/types";
import type { CsvColumn } from "@/lib/admin/csv";

const PLAN_OPTIONS = ["", "free", "premium", "premiumplus", "pro", "enterprise"];
const STATUS_OPTIONS = ["", "active", "canceled", "past_due", "trialing", "incomplete"];

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [page, setPage] = useState(1);

  // Modal de ajuste
  const [adjustTarget, setAdjustTarget] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", "25");
      if (search) qs.set("search", search);
      if (plan) qs.set("plan", plan);
      if (status) qs.set("status", status);
      if (blocked) qs.set("blocked", "true");

      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar usuários");
        return;
      }
      const json = (await res.json()) as PaginatedResponse<AdminUserRow>;
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [page, search, plan, status, blocked]);

  // Debounce de search
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [search, plan, status, blocked]);

  const csvColumns: CsvColumn<AdminUserRow>[] = [
    { header: "User ID",      accessor: (r) => r.userId },
    { header: "Email",        accessor: (r) => r.email },
    { header: "Criado em",    accessor: (r) => new Date(r.createdAt).toISOString() },
    { header: "Plano",        accessor: (r) => r.plan },
    { header: "Status",       accessor: (r) => r.subscriptionStatus },
    { header: "Saldo",        accessor: (r) => r.balance },
    { header: "Total earned", accessor: (r) => r.totalEarned },
    { header: "Total spent",  accessor: (r) => r.totalSpent },
    { header: "Bloqueado",    accessor: (r) => r.isBlocked ? "sim" : "não" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1">Usuários</h1>
          <p className="text-[13px] text-t3">
            {pagination.total.toLocaleString("pt-BR")} {pagination.total === 1 ? "usuário" : "usuários"} no total
          </p>
        </div>
        <ExportCsvButton data={data} columns={csvColumns} filenamePrefix="users" />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Buscar email
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-9 pr-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Plano
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2 min-w-[130px]"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p || "Todos"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2 min-w-[130px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || "Todos"}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setBlocked((b) => !b)}
            className={`px-3 py-2 rounded-[8px] border text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
              blocked
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
            }`}
          >
            <Lock size={12} />
            Bloqueados
          </button>

          {(search || plan || status || blocked) && (
            <button
              onClick={() => { setSearch(""); setPlan(""); setStatus(""); setBlocked(false); }}
              className="px-3 py-2 rounded-[8px] text-[12px] text-t3 hover:text-white transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-t3">
            <Loader2 size={16} className="animate-spin mr-2" />
            <span className="text-[13px]">Carregando...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-6 text-red-400">
            <AlertCircle size={14} />
            <span className="text-[13px]">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-t3">
            <Filter size={28} className="text-t4 mb-3" />
            <p className="text-[14px] font-semibold text-t2">Nenhum usuário encontrado</p>
            <p className="text-[12px] text-t4 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-card2 border-b border-b1">
                <tr className="text-left text-t3">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Email</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Plano</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Status</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px] text-right">Saldo</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px] text-right">Gasto</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Criado</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.userId} className="border-b border-b1 hover:bg-card2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.isBlocked && <Lock size={11} className="text-red-400 shrink-0" />}
                        <Link href={`/admin/users/${u.userId}`} className="text-white hover:text-y truncate max-w-[260px]">
                          {u.email || <span className="text-t4 italic">(sem email)</span>}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.subscriptionStatus} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white font-semibold">
                      {u.balance.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-t2">
                      {u.totalSpent.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-t3 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAdjustTarget(u)}
                          title="Ajustar créditos"
                          className="w-7 h-7 rounded-[6px] bg-y/10 border border-y/20 hover:bg-y/20 text-y flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                        <Link
                          href={`/admin/users/${u.userId}`}
                          title="Abrir detalhe"
                          className="w-7 h-7 rounded-[6px] bg-card2 border border-b1 hover:border-b2 text-t2 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-b1 bg-card2/30">
            <span className="text-[11.5px] text-t3">
              Página {pagination.page} de {pagination.totalPages} · {pagination.total.toLocaleString("pt-BR")} total
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="w-7 h-7 rounded-[6px] bg-card border border-b1 text-t2 hover:text-white hover:border-b2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="w-7 h-7 rounded-[6px] bg-card border border-b1 text-t2 hover:text-white hover:border-b2 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de ajuste */}
      <CreditAdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        target={adjustTarget ? {
          userId: adjustTarget.userId,
          email: adjustTarget.email,
          balance: adjustTarget.balance,
        } : null}
        onSuccess={() => load()}
      />

      <p className="text-[11px] text-t4 text-center mt-4">
        <Coins size={11} className="inline mr-1" />
        Ajustes manuais geram audit log + transaction com metadata source=admin.
      </p>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free:         "bg-t4/10 text-t2 border-t4/20",
    premium:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    premiumplus:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pro:          "bg-y/10 text-y border-y/30",
    enterprise:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    starter:      "bg-t4/10 text-t3 border-t4/20",
  };
  const cls = styles[plan] ?? "bg-t4/10 text-t3 border-t4/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10.5px] font-semibold uppercase tracking-wider border ${cls}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:     "text-emerald-400",
    canceled:   "text-t3",
    past_due:   "text-orange-400",
    trialing:   "text-blue-400",
    incomplete: "text-red-400",
  };
  return (
    <span className={`text-[11.5px] font-medium ${styles[status] ?? "text-t3"}`}>
      {status}
    </span>
  );
}
