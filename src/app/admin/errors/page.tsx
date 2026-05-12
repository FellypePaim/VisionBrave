"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, AlertCircle, AlertTriangle, Activity, Copy,
} from "lucide-react";
import { JsonViewer } from "@/components/admin/JsonViewer";

interface ErrorRow {
  id: string;
  userId: string | null;
  email: string | null;
  route: string | null;
  action: string | null;
  provider: string | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string;
  stack: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ROUTE_OPTIONS = ["", "/api/generate/image", "/api/generate/video", "/api/generate/music"];

export default function AdminErrorsPage() {
  const [data, setData] = useState<ErrorRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ last24h: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [errorCodeFilter, setErrorCodeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", "25");
      if (search) qs.set("search", search);
      if (routeFilter) qs.set("route", routeFilter);
      if (providerFilter) qs.set("provider", providerFilter);
      if (modelFilter) qs.set("model", modelFilter);
      if (errorCodeFilter) qs.set("errorCode", errorCodeFilter);

      const res = await fetch(`/api/admin/errors?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar logs");
        return;
      }
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
      setStats(json.stats ?? { last24h: 0 });
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [page, search, routeFilter, providerFilter, modelFilter, errorCodeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, routeFilter, providerFilter, modelFilter, errorCodeFilter]);

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-400" />
            Erros
          </h1>
          <p className="text-[13px] text-t3">
            {pagination.total.toLocaleString("pt-BR")} {pagination.total === 1 ? "erro registrado" : "erros registrados"}
            {" · "}<span className={stats.last24h > 10 ? "text-orange-400 font-semibold" : ""}>
              {stats.last24h.toLocaleString("pt-BR")} nas últimas 24h
            </span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Buscar mensagem
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ex: timeout, rate limit..."
                className="w-full pl-9 pr-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Rota
            </label>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            >
              {ROUTE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r || "Todas"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Provider
            </label>
            <input
              type="text"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              placeholder="KIE, Supabase..."
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Error code
            </label>
            <input
              type="text"
              value={errorCodeFilter}
              onChange={(e) => setErrorCodeFilter(e.target.value)}
              placeholder="kie_failed..."
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
            />
          </div>
        </div>

        {(search || routeFilter || providerFilter || modelFilter || errorCodeFilter) && (
          <button
            onClick={() => { setSearch(""); setRouteFilter(""); setProviderFilter(""); setModelFilter(""); setErrorCodeFilter(""); }}
            className="mt-3 px-3 py-1.5 rounded-[8px] text-[11.5px] text-t3 hover:text-white transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
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
            <Activity size={28} className="text-emerald-400 mb-3" />
            <p className="text-[14px] font-semibold text-emerald-300">Nenhum erro registrado</p>
            <p className="text-[12px] text-t4 mt-1">
              {search || routeFilter || providerFilter || modelFilter || errorCodeFilter
                ? "Tente outros filtros"
                : "Tudo silencioso por aqui 🎉"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-b1">
            {data.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <div key={row.id} className="hover:bg-card2/40 transition-colors">
                  <button
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left"
                  >
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate font-medium" title={row.errorMessage}>
                        {row.errorMessage}
                      </div>
                      <div className="text-[11px] text-t3 mt-1 flex items-center gap-2 flex-wrap">
                        {row.route && (
                          <span className="font-mono text-t2">{row.route}</span>
                        )}
                        {row.action && (
                          <span className="text-t4">· {row.action}</span>
                        )}
                        {row.provider && (
                          <span className="inline-flex items-center px-1.5 py-0 rounded-[4px] bg-card2 border border-b1 text-[10px] text-t2 font-semibold uppercase tracking-wider">
                            {row.provider}
                          </span>
                        )}
                        {row.model && (
                          <span className="inline-flex items-center px-1.5 py-0 rounded-[4px] bg-card2 border border-b1 text-[10px] text-t2">
                            {row.model}
                          </span>
                        )}
                        {row.errorCode && (
                          <span className="inline-flex items-center px-1.5 py-0 rounded-[4px] bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400 font-mono">
                            {row.errorCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-t3 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      {row.email && (
                        <div className="text-[10px] text-t4 mt-0.5 truncate max-w-[140px]" title={row.email}>
                          {row.email}
                        </div>
                      )}
                    </div>
                    {expanded
                      ? <ChevronUp size={14} className="text-t3 shrink-0 mt-0.5" />
                      : <ChevronDown size={14} className="text-t3 shrink-0 mt-0.5" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-card2/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5 text-[12px]">
                          <DetailRow label="Rota" value={row.route ?? "—"} mono />
                          <DetailRow label="Ação" value={row.action ?? "—"} mono />
                          <DetailRow label="Provider" value={row.provider ?? "—"} />
                          <DetailRow label="Modelo" value={row.model ?? "—"} />
                          <DetailRow label="Error code" value={row.errorCode ?? "—"} mono />
                        </div>
                        <div className="space-y-1.5 text-[12px]">
                          <DetailRow label="Data" value={new Date(row.createdAt).toLocaleString("pt-BR")} />
                          {row.email ? (
                            <div className="flex items-baseline gap-3 py-1">
                              <span className="text-t3 shrink-0 w-[100px]">Usuário</span>
                              <Link
                                href={`/admin/users/${row.userId}`}
                                className="text-white hover:text-y truncate text-[12px]"
                              >
                                {row.email}
                              </Link>
                            </div>
                          ) : (
                            <DetailRow label="Usuário" value="—" />
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10.5px] font-semibold text-t3 uppercase tracking-wider">
                            Mensagem completa
                          </span>
                          <button
                            onClick={() => copy(row.errorMessage)}
                            className="text-[10.5px] text-t3 hover:text-white flex items-center gap-1"
                          >
                            <Copy size={10} />
                            Copiar
                          </button>
                        </div>
                        <pre className="bg-card2 border border-b1 rounded-[8px] p-3 text-[11.5px] text-[#e8e8e8] font-mono whitespace-pre-wrap break-words">
                          {row.errorMessage}
                        </pre>
                      </div>

                      {row.stack && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10.5px] font-semibold text-t3 uppercase tracking-wider">
                              Stack trace
                            </span>
                            <button
                              onClick={() => copy(row.stack ?? "")}
                              className="text-[10.5px] text-t3 hover:text-white flex items-center gap-1"
                            >
                              <Copy size={10} />
                              Copiar
                            </button>
                          </div>
                          <pre className="bg-card2 border border-b1 rounded-[8px] p-3 text-[10.5px] text-t2 font-mono whitespace-pre overflow-auto max-h-[240px]">
                            {row.stack}
                          </pre>
                        </div>
                      )}

                      <JsonViewer label="Metadata" value={row.metadata} maxHeight={180} />
                    </div>
                  )}
                </div>
              );
            })}
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

      <p className="text-[11px] text-t4 text-center mt-4">
        Retenção sugerida: 90 dias (não aplicada automaticamente — limpar via SQL quando necessário).
      </p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-t3 shrink-0 w-[100px]">{label}</span>
      <span className={`text-white break-all ${mono ? "font-mono text-[11px]" : "text-[12px]"}`}>
        {value}
      </span>
    </div>
  );
}
