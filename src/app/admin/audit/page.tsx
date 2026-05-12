"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, AlertCircle, FileText, ExternalLink,
} from "lucide-react";
import { JsonViewer } from "@/components/admin/JsonViewer";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import type { CsvColumn } from "@/lib/admin/csv";

interface AuditRow {
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

const ENTITY_TYPE_OPTIONS = ["", "credits", "user", "subscription", "kie_cap", "system_setting"];

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
      if (entityType) qs.set("entityType", entityType);
      if (from) qs.set("from", `${from}T00:00:00.000Z`);
      if (to) qs.set("to", `${to}T23:59:59.999Z`);

      const res = await fetch(`/api/admin/audit?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar audit logs");
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
  }, [page, search, entityType, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, entityType, from, to]);

  const csvColumns: CsvColumn<AuditRow>[] = [
    { header: "Data",         accessor: (r) => new Date(r.createdAt).toISOString() },
    { header: "Ação",         accessor: (r) => r.action },
    { header: "Entity Type",  accessor: (r) => r.entityType },
    { header: "Entity ID",    accessor: (r) => r.entityId ?? "" },
    { header: "Admin ID",     accessor: (r) => r.adminUserId ?? "" },
    { header: "Admin email",  accessor: (r) => r.adminEmail ?? "" },
    { header: "Target ID",    accessor: (r) => r.targetUserId ?? "" },
    { header: "Target email", accessor: (r) => r.targetEmail ?? "" },
    { header: "Before JSON",  accessor: (r) => JSON.stringify(r.before) },
    { header: "After JSON",   accessor: (r) => JSON.stringify(r.after) },
    { header: "Metadata JSON", accessor: (r) => JSON.stringify(r.metadata) },
    { header: "IP",           accessor: (r) => r.ipAddress ?? "" },
    { header: "User-Agent",   accessor: (r) => r.userAgent ?? "" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1 flex items-center gap-2">
            <FileText size={20} className="text-y" />
            Auditoria
          </h1>
          <p className="text-[13px] text-t3">
            {pagination.total.toLocaleString("pt-BR")} {pagination.total === 1 ? "ação registrada" : "ações registradas"}
            {" · "}trilha imutável de todas as operações admin
          </p>
        </div>
        <ExportCsvButton data={data} columns={csvColumns} filenamePrefix="audit_logs" />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Buscar ação ou entity ID
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="credits.add, user.block..."
                className="w-full pl-9 pr-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Tipo de entidade
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            >
              {ENTITY_TYPE_OPTIONS.map((e) => (
                <option key={e} value={e}>{e || "Todos"}</option>
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

        {(search || entityType || from || to) && (
          <button
            onClick={() => { setSearch(""); setEntityType(""); setFrom(""); setTo(""); }}
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
            <Filter size={28} className="text-t4 mb-3" />
            <p className="text-[14px] font-semibold text-t2">Nenhuma ação encontrada</p>
            <p className="text-[12px] text-t4 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="divide-y divide-b1">
            {data.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <div key={row.id} className="hover:bg-card2/40 transition-colors">
                  <button
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <ActionBadge action={row.action} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate">
                        {row.adminEmail ?? (row.adminUserId ? `${row.adminUserId.slice(0, 8)}…` : "—")}
                        {row.targetUserId && row.targetUserId !== row.adminUserId && (
                          <>
                            <span className="text-t4 mx-1.5">→</span>
                            <span className="text-t2">
                              {row.targetEmail ?? `${row.targetUserId.slice(0, 8)}…`}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-t4 mt-0.5 truncate">
                        {typeof row.metadata.reason === "string" ? row.metadata.reason : row.entityType}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-t3 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      {row.ipAddress && (
                        <div className="text-[10px] text-t4 mt-0.5 font-mono">{row.ipAddress}</div>
                      )}
                    </div>
                    {expanded
                      ? <ChevronUp size={14} className="text-t3 shrink-0" />
                      : <ChevronDown size={14} className="text-t3 shrink-0" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-card2/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <DetailRow label="Ação" value={row.action} mono />
                          <DetailRow label="Entidade" value={row.entityType} />
                          <DetailRow label="Entity ID" value={row.entityId ?? "—"} mono />
                          <DetailRow
                            label="Admin"
                            value={row.adminEmail ?? row.adminUserId ?? "—"}
                            link={row.adminUserId ? `/admin/users/${row.adminUserId}` : undefined}
                          />
                          {row.targetUserId && row.targetUserId !== row.adminUserId && (
                            <DetailRow
                              label="Target"
                              value={row.targetEmail ?? row.targetUserId}
                              link={`/admin/users/${row.targetUserId}`}
                            />
                          )}
                        </div>
                        <div>
                          <DetailRow label="Data" value={new Date(row.createdAt).toLocaleString("pt-BR")} />
                          <DetailRow label="IP" value={row.ipAddress ?? "—"} mono />
                          <DetailRow label="User-Agent" value={row.userAgent ?? "—"} truncate />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <JsonViewer label="Before" value={row.before} maxHeight={180} />
                        <JsonViewer label="After" value={row.after} maxHeight={180} />
                      </div>

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
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  // Cor por prefixo
  const prefix = action.split(".")[0];
  const styles: Record<string, string> = {
    credits:      "bg-y/10 text-y border-y/30",
    user:         "bg-red-500/10 text-red-400 border-red-500/30",
    subscription: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    kie:          "bg-orange-500/10 text-orange-400 border-orange-500/30",
    system:       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  };
  const cls = styles[prefix] ?? "bg-card2 text-t2 border-b1";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[11px] font-semibold border ${cls} shrink-0 font-mono`}>
      {action}
    </span>
  );
}

function DetailRow({
  label, value, mono, truncate, link,
}: {
  label: string; value: string; mono?: boolean; truncate?: boolean; link?: string;
}) {
  const content = (
    <span className={`text-white ${mono ? "font-mono text-[11px]" : "text-[12px]"} ${truncate ? "truncate inline-block max-w-[300px]" : ""}`}>
      {value}
    </span>
  );
  return (
    <div className="flex items-baseline gap-3 text-[12px] py-1">
      <span className="text-t3 shrink-0 w-[100px]">{label}</span>
      {link ? (
        <Link href={link} className="hover:text-y transition-colors flex items-center gap-1">
          {content}
          <ExternalLink size={10} className="text-t4" />
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
