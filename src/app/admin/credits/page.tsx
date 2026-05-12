"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Coins, Loader2, AlertCircle, Plus, ExternalLink, Info,
} from "lucide-react";
import { CreditAdjustModal } from "@/components/admin/CreditAdjustModal";
import type { AdminUserRow, PaginatedResponse } from "@/lib/admin/types";

export default function AdminCreditsPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminUserRow | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: "1", pageSize: "10", search: q });
      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro na busca");
        return;
      }
      const json = (await res.json()) as PaginatedResponse<AdminUserRow>;
      setResults(json.data);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-white mb-1">Créditos</h1>
        <p className="text-[13px] text-t3">
          Busque um usuário por email e ajuste o saldo dele (adicionar, remover ou estornar).
        </p>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-y/5 border border-y/20 mb-4">
        <Info size={14} className="text-y shrink-0 mt-0.5" />
        <div className="text-[12px] text-t2 leading-relaxed">
          Todo ajuste exige <strong className="text-white">motivo (mín. 10 caracteres)</strong> e gera 2 registros automáticos:
          uma linha em <code className="text-y">credit_transactions</code> (com <code className="text-y">metadata.source=admin</code>) e
          uma linha em <code className="text-y">admin_audit_logs</code> com <code className="text-y">before/after</code>.
          Ajustes acima de 5.000 créditos exigem confirmação digitando o email do usuário-alvo.
        </div>
      </div>

      {/* Busca */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <label className="block text-[10.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
          Buscar usuário por email
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="user@example.com"
            className="w-full pl-10 pr-3 py-3 bg-card2 border border-b1 rounded-[10px] text-[14px] text-white placeholder-t4 outline-none focus:border-b2 transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-t3">
            <Loader2 size={16} className="animate-spin mr-2" />
            <span className="text-[13px]">Buscando...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-6 text-red-400">
            <AlertCircle size={14} />
            <span className="text-[13px]">{error}</span>
          </div>
        ) : !search.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-t3">
            <Search size={28} className="text-t4 mb-3" />
            <p className="text-[14px] font-semibold text-t2">Digite um email para começar</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-t3">
            <AlertCircle size={28} className="text-t4 mb-3" />
            <p className="text-[14px] font-semibold text-t2">Nenhum usuário encontrado</p>
            <p className="text-[12px] text-t4 mt-1">Tente outra busca</p>
          </div>
        ) : (
          <div className="divide-y divide-b1">
            {results.map((u) => (
              <div key={u.userId} className="flex items-center gap-3 p-3 hover:bg-card2/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">
                    {u.email || <span className="text-t4 italic">(sem email)</span>}
                  </div>
                  <div className="text-[11px] text-t4 truncate mt-0.5">
                    {u.userId}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10.5px] text-t3 uppercase tracking-wider">Saldo</div>
                  <div className="text-[15px] font-bold text-white tabular-nums">
                    {u.balance.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setAdjustTarget(u)}
                    className="px-3 py-2 rounded-[8px] bg-y text-[#1a0e00] font-semibold text-[12px] hover:bg-[#FCD34D] transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={12} />
                    Ajustar
                  </button>
                  <Link
                    href={`/admin/users/${u.userId}`}
                    className="w-8 h-8 rounded-[8px] bg-card2 border border-b1 hover:border-b2 text-t2 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreditAdjustModal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        target={adjustTarget ? {
          userId: adjustTarget.userId,
          email: adjustTarget.email,
          balance: adjustTarget.balance,
        } : null}
        onSuccess={() => {
          // Re-busca pra atualizar os saldos exibidos
          doSearch(search);
        }}
      />

      <p className="text-[11px] text-t4 text-center mt-4">
        <Coins size={11} className="inline mr-1" />
        Veja todas as ações executadas em <Link href="/admin/audit" className="text-y hover:underline">Auditoria</Link>
      </p>
    </div>
  );
}
