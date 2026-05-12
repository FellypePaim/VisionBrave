"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  Image as ImageIcon, Video, Music, ExternalLink, Trash2, RotateCcw,
  Copy, Download, X, Eye,
} from "lucide-react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

interface GenerationRow {
  id: string;
  userId: string;
  email: string | null;
  type: string;
  model: string;
  prompt: string;
  publicUrl: string | null;
  externalUrl: string | null;
  storagePath: string | null;
  metadata: Record<string, unknown>;
  watermarked: boolean;
  plan: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deleteReason: string | null;
  createdAt: string;
}

const TYPE_OPTIONS = ["", "image", "video", "audio"];

export default function AdminGenerationsPage() {
  const [data, setData] = useState<GenerationRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 24, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [page, setPage] = useState(1);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<GenerationRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<GenerationRow | null>(null);
  const [reason, setReason] = useState("");

  // Lightbox
  const [preview, setPreview] = useState<GenerationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", "24");
      if (search) qs.set("search", search);
      if (typeFilter) qs.set("type", typeFilter);
      if (modelFilter) qs.set("model", modelFilter);
      if (onlyDeleted) qs.set("onlyDeleted", "true");
      else if (includeDeleted) qs.set("includeDeleted", "true");

      const res = await fetch(`/api/admin/generations?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar gerações");
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
  }, [page, search, typeFilter, modelFilter, includeDeleted, onlyDeleted]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, typeFilter, modelFilter, includeDeleted, onlyDeleted]);

  async function applyDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/generations/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!res.ok) {
      const errData = await res.json();
      alert(errData?.error?.message ?? "Erro ao deletar");
      return;
    }
    setDeleteTarget(null);
    setReason("");
    await load();
  }

  async function applyRestore() {
    if (!restoreTarget) return;
    const res = await fetch(`/api/admin/generations/${restoreTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!res.ok) {
      const errData = await res.json();
      alert(errData?.error?.message ?? "Erro ao restaurar");
      return;
    }
    setRestoreTarget(null);
    setReason("");
    await load();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-white mb-1">Gerações</h1>
        <p className="text-[13px] text-t3">
          {pagination.total.toLocaleString("pt-BR")} {pagination.total === 1 ? "geração" : "gerações"}
          {onlyDeleted ? " (apenas deletadas)" : includeDeleted ? " (incl. deletadas)" : " ativas"}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Buscar prompt
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="cyberpunk, fox, etc."
                className="w-full pl-9 pr-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white outline-none focus:border-b2"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t || "Todos"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
              Modelo
            </label>
            <input
              type="text"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              placeholder="ex: Nano Banana"
              className="w-full px-3 py-2 bg-card2 border border-b1 rounded-[8px] text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setIncludeDeleted((v) => !v); if (onlyDeleted) setOnlyDeleted(false); }}
            className={`px-3 py-1.5 rounded-[8px] border text-[11.5px] font-medium transition-colors ${
              includeDeleted
                ? "bg-y/10 border-y/30 text-y"
                : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
            }`}
          >
            Incluir deletadas
          </button>
          <button
            onClick={() => { setOnlyDeleted((v) => !v); if (includeDeleted) setIncludeDeleted(false); }}
            className={`px-3 py-1.5 rounded-[8px] border text-[11.5px] font-medium transition-colors ${
              onlyDeleted
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
            }`}
          >
            Apenas deletadas
          </button>

          {(search || typeFilter || modelFilter || includeDeleted || onlyDeleted) && (
            <button
              onClick={() => { setSearch(""); setTypeFilter(""); setModelFilter(""); setIncludeDeleted(false); setOnlyDeleted(false); }}
              className="px-3 py-1.5 rounded-[8px] text-[11.5px] text-t3 hover:text-white transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-t3">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span className="text-[13px]">Carregando...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-6 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={14} />
          <span className="text-[13px]">{error}</span>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card border border-b1 rounded-[12px] flex flex-col items-center justify-center py-16 text-t3">
          <Filter size={28} className="text-t4 mb-3" />
          <p className="text-[14px] font-semibold text-t2">Nenhuma geração encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.map((g) => (
            <GenerationCard
              key={g.id}
              g={g}
              onDelete={() => { setDeleteTarget(g); setReason(""); }}
              onRestore={() => { setRestoreTarget(g); setReason(""); }}
              onPreview={() => setPreview(g)}
              onCopy={copy}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
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

      {/* Lightbox de preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-[10px] bg-card border border-b1 text-white hover:bg-card2 flex items-center justify-center"
          >
            <X size={16} />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-3">
            <div className="flex-1 flex items-center justify-center overflow-hidden rounded-[12px] bg-card border border-b1">
              {preview.type === "image" && preview.publicUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview.publicUrl} alt="" className="max-w-full max-h-[70vh] object-contain" />
              ) : preview.type === "video" && preview.publicUrl ? (
                <video src={preview.publicUrl} controls className="max-w-full max-h-[70vh]" />
              ) : preview.type === "audio" && preview.publicUrl ? (
                <audio src={preview.publicUrl} controls className="w-full" />
              ) : (
                <div className="text-t3 text-[13px] p-6">Sem URL pública disponível</div>
              )}
            </div>
            <div className="bg-card border border-b1 rounded-[10px] p-3 text-[12px] text-t2 leading-relaxed max-h-[20vh] overflow-y-auto">
              {preview.prompt}
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <AdminConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={applyDelete}
        title="Soft delete da geração"
        tone="danger"
        confirmLabel="Deletar"
        description={
          <div className="space-y-3 mt-2">
            <p className="text-[12.5px] text-t2 leading-relaxed">
              Marca a geração como deletada. Ela some da galeria do usuário mas o registro
              fica preservado pra auditoria. Reversível via &ldquo;Restaurar&rdquo;.
            </p>
            <div>
              <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: conteúdo inadequado, falha técnica, refund solicitado..."
                rows={3}
                className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2 resize-none"
              />
              <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 10 chars</p>
            </div>
          </div>
        }
      />

      {/* Restore modal */}
      <AdminConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={applyRestore}
        title="Restaurar geração"
        tone="default"
        confirmLabel="Restaurar"
        description={
          <div className="space-y-3 mt-2">
            <p className="text-[12.5px] text-t2 leading-relaxed">
              Volta a geração pra galeria do usuário. Soft delete será desfeito.
            </p>
            <div>
              <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: análise concluída, falso positivo..."
                rows={3}
                className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2 resize-none"
              />
              <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 10 chars</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

// ─── Subcomponente: card de geração ────────────────────────────────────

function GenerationCard({
  g, onDelete, onRestore, onPreview, onCopy,
}: {
  g: GenerationRow;
  onDelete: () => void;
  onRestore: () => void;
  onPreview: () => void;
  onCopy: (s: string) => void;
}) {
  const TypeIcon = g.type === "image" ? ImageIcon : g.type === "video" ? Video : Music;

  return (
    <div className={`bg-card border rounded-[12px] overflow-hidden ${
      g.isDeleted ? "border-red-500/30 opacity-70" : "border-b1"
    }`}>
      {/* Preview area */}
      <button
        onClick={onPreview}
        className="relative w-full aspect-square bg-card2 flex items-center justify-center overflow-hidden group"
      >
        {g.type === "image" && g.publicUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={g.publicUrl} alt="" className="w-full h-full object-cover" />
        ) : g.type === "video" && g.publicUrl ? (
          <video src={g.publicUrl} className="w-full h-full object-cover" muted />
        ) : (
          <div className="text-t4 flex flex-col items-center gap-2">
            <TypeIcon size={28} />
            <span className="text-[10.5px] uppercase">{g.type}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye size={18} className="text-white" />
        </div>
        {g.isDeleted && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-[5px] bg-red-500/80 text-white text-[10px] font-bold uppercase tracking-wider">
            Deletada
          </div>
        )}
        {g.watermarked && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-[5px] bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider">
            WM
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px]">
          <TypeIcon size={11} className="text-y" />
          <span className="text-white font-medium">{g.model}</span>
          <span className="text-t4 ml-auto">{new Date(g.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>

        <p className="text-[11.5px] text-t2 line-clamp-2 leading-snug" title={g.prompt}>
          {g.prompt || <span className="text-t4 italic">(sem prompt)</span>}
        </p>

        {g.email && (
          <Link
            href={`/admin/users/${g.userId}`}
            className="text-[11px] text-t3 hover:text-y truncate inline-block max-w-full"
            title={g.email}
          >
            {g.email}
          </Link>
        )}

        {g.isDeleted && g.deleteReason && (
          <p className="text-[10.5px] text-red-300 line-clamp-1" title={g.deleteReason}>
            🗑 {g.deleteReason}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1.5 border-t border-b1">
          {g.publicUrl && (
            <>
              <button
                onClick={() => onCopy(g.publicUrl!)}
                title="Copiar URL"
                className="w-6 h-6 rounded-[5px] bg-card2 border border-b1 hover:border-b2 text-t3 hover:text-white flex items-center justify-center transition-colors"
              >
                <Copy size={10} />
              </button>
              <a
                href={g.publicUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                title="Download"
                className="w-6 h-6 rounded-[5px] bg-card2 border border-b1 hover:border-b2 text-t3 hover:text-white flex items-center justify-center transition-colors"
              >
                <Download size={10} />
              </a>
            </>
          )}
          {g.email && (
            <Link
              href={`/admin/users/${g.userId}`}
              title="Ver user"
              className="w-6 h-6 rounded-[5px] bg-card2 border border-b1 hover:border-b2 text-t3 hover:text-white flex items-center justify-center transition-colors"
            >
              <ExternalLink size={10} />
            </Link>
          )}
          <div className="flex-1" />
          {g.isDeleted ? (
            <button
              onClick={onRestore}
              title="Restaurar"
              className="w-6 h-6 rounded-[5px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
            >
              <RotateCcw size={10} />
            </button>
          ) : (
            <button
              onClick={onDelete}
              title="Deletar"
              className="w-6 h-6 rounded-[5px] bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
