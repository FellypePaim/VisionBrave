"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  ArrowDownLeft, ArrowUpRight, RotateCcw, Calendar, Copy, Shield,
} from "lucide-react";

interface Transaction {
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

const TYPE_OPTIONS = ["", "bonus", "purchase", "spend", "refund", "subscription"];

export default function AdminTransactionsPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", "25");
      if (type) qs.set("type", type);
      if (adminOnly) qs.set("source", "admin");
      if (search) qs.set("search", search);
      if (from) qs.set("from", `${from}T00:00:00.000Z`);
      if (to) qs.set("to", `${to}T23:59:59.999Z`);

      const res = await fetch(`/api/admin/transactions?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar transações");
        return;
      }
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [page, type, adminOnly, search, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [type, adminOnly, search, from, to]);

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1">Transações</h1>
          <p className="text-[13px] text-t3">
            {pagination.total.toLocaleString("pt-BR")} {pagination.total === 1 ? "transação" : "transações"} no total
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Buscar descrição
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ex: nano banana"
                className="w-full pl-9 pr-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t || "Todos"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              De
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Até
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAdminOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-[8px] border text-[11.5px] font-medium flex items-center gap-1.5 transition-colors ${
              adminOnly
                ? "bg-y/10 border-y/30 text-y"
                : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
            }`}
          >
            <Shield size={11} />
            Apenas ações admin
          </button>

          {(type || adminOnly || search || from || to) && (
            <button
              onClick={() => { setType(""); setAdminOnly(false); setSearch(""); setFrom(""); setTo(""); }}
              className="px-3 py-1.5 rounded-[8px] text-[11.5px] text-t3 hover:text-white transition-colors"
            >
              Limpar filtros
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
            <p className="text-[14px] font-semibold text-t2">Nenhuma transação encontrada</p>
            <p className="text-[12px] text-t4 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-card2 border-b border-b1">
                <tr className="text-left text-t3">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Data</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Usuário</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Tipo</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px] text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Descrição</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px]">Modelo</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10.5px] text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                    <td className="px-4 py-2.5 text-t3 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.email ? (
                        <Link href={`/admin/users/${t.userId}`} className="text-white hover:text-y truncate inline-block max-w-[200px]" title={t.email}>
                          {t.email}
                        </Link>
                      ) : (
                        <span className="text-t4 text-[11px]">{t.userId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <TxTypeBadge type={t.type} isAdmin={t.isAdmin} />
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                      t.amount > 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2.5 text-t2 max-w-[280px] truncate" title={t.description ?? ""}>
                      {t.description || <span className="text-t4">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.model ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] bg-card2 border border-b1 text-[10.5px] text-t2 font-medium">
                          {t.model}
                        </span>
                      ) : (
                        <span className="text-t4 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => copy(JSON.stringify(t.metadata, null, 2))}
                        title="Copiar metadata"
                        className="w-7 h-7 rounded-[6px] bg-card2 border border-b1 hover:border-b2 text-t3 hover:text-white flex items-center justify-center transition-colors ml-auto"
                      >
                        <Copy size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}

function TxTypeBadge({ type, isAdmin }: { type: string; isAdmin: boolean }) {
  const styles: Record<string, { color: string; icon: typeof ArrowDownLeft }> = {
    bonus:        { color: "text-emerald-400", icon: ArrowDownLeft },
    purchase:     { color: "text-emerald-400", icon: ArrowDownLeft },
    subscription: { color: "text-blue-400",    icon: ArrowDownLeft },
    refund:       { color: "text-y",           icon: RotateCcw },
    spend:        { color: "text-red-400",     icon: ArrowUpRight },
  };
  const s = styles[type] ?? { color: "text-t3", icon: Calendar };
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 ${s.color}`}>
        <Icon size={11} />
        <span className="text-[11px] font-medium">{type}</span>
      </span>
      {isAdmin && (
        <span className="inline-flex items-center px-1.5 py-0 rounded-[4px] bg-y/10 border border-y/20 text-y text-[9.5px] font-bold uppercase tracking-wider">
          Admin
        </span>
      )}
    </div>
  );
}
