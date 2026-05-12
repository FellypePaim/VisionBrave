"use client";

import { useEffect, useState } from "react";
import {
  ServerCog, Activity, AlertTriangle, CheckCircle2, Loader2,
  TrendingUp, Edit3, Info,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import type { KieStatus } from "@/lib/admin/types";

interface HistoryEntry {
  monthKey: string;
  totalBRL: number;
  totalRequests: number;
  capBRL: number;
  capOverridden: boolean;
  percentUsed: number;
  overCap: boolean;
  updatedAt: string;
}

export default function AdminKiePage() {
  const [status, setStatus] = useState<KieStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [envDefaultCap, setEnvDefaultCap] = useState<number>(200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit cap modal
  const [editOpen, setEditOpen] = useState(false);
  const [newCap, setNewCap] = useState("");
  const [reason, setReason] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([
        fetch("/api/admin/kie/status").then((r) => r.json()),
        fetch("/api/admin/kie/history").then((r) => r.json()),
      ]);
      if (s?.error) { setError(s.error.message); return; }
      if (h?.error) { setError(h.error.message); return; }
      setStatus(s);
      setHistory(h.history ?? []);
      setEnvDefaultCap(h.envDefaultCap ?? 200);
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function applyCap() {
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/kie/cap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCapBRL: Number(newCap),
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data?.error?.message ?? "Erro ao atualizar cap");
        return;
      }
      setEditOpen(false);
      setNewCap("");
      setReason("");
      await load();
    } catch {
      setEditError("Erro de rede");
    } finally {
      setEditBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="text-y animate-spin mr-2" />
        <span className="text-[13px] text-t3">Carregando KIE...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 rounded-[10px] bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={18} className="text-red-400" />
          <div className="text-[13px] text-red-300">{error ?? "Erro desconhecido"}</div>
        </div>
      </div>
    );
  }

  const statusColor = status.overCap
    ? { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" }
    : status.percentUsed >= 75
    ? { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" }
    : status.percentUsed >= 50
    ? { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" }
    : { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };

  const StatusIcon = status.overCap || status.percentUsed >= 75 ? AlertTriangle : CheckCircle2;

  const newCapNum = Number(newCap);
  const canApply =
    Number.isFinite(newCapNum) &&
    newCapNum > 0 &&
    newCapNum <= 10_000 &&
    reason.trim().length >= 10 &&
    !editBusy;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1 flex items-center gap-2">
            <ServerCog size={20} className="text-y" />
            KIE Global — {status.monthKey}
          </h1>
          <p className="text-[13px] text-t3">
            Controle do gasto KIE.AI mensal estimado. Proteção catastrófica contra prejuízo.
          </p>
        </div>
        <button
          onClick={() => { setEditOpen(true); setNewCap(String(status.capBRL)); setEditError(null); }}
          className="px-4 py-2.5 rounded-[10px] bg-y text-[#1a0e00] font-bold text-[13px] hover:bg-[#FCD34D] transition-colors flex items-center gap-2"
        >
          <Edit3 size={14} />
          Alterar cap
        </button>
      </div>

      {/* Big status card */}
      <div className={`rounded-[14px] p-5 border ${statusColor.bg} ${statusColor.border} mb-5`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-[12px] ${statusColor.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon size={22} className={statusColor.text} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[22px] font-bold text-white tabular-nums">
                R$ {status.totalBRL.toFixed(2)}
              </span>
              <span className="text-[13px] text-t3">
                / R$ {status.capBRL.toFixed(2)} cap
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[12px] font-bold uppercase tracking-wider ${statusColor.text}`}>
                {status.overCap ? "BLOQUEADO" : status.percentUsed >= 75 ? "CRÍTICO" : status.percentUsed >= 50 ? "ATENÇÃO" : "NORMAL"}
              </span>
              <span className="text-[11.5px] text-t3">
                · {status.percentUsed.toFixed(1)}% usado
              </span>
              <span className="text-[11.5px] text-t3">
                · R$ {status.remainingBRL.toFixed(2)} restantes
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="h-2 bg-card2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  status.overCap ? "bg-red-500"
                  : status.percentUsed >= 75 ? "bg-orange-500"
                  : status.percentUsed >= 50 ? "bg-yellow-500"
                  : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, status.percentUsed)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard icon={Activity} label="Gasto estimado" value={`R$ ${status.totalBRL.toFixed(2)}`} />
        <AdminStatCard icon={TrendingUp} label="Cap mensal" value={`R$ ${status.capBRL.toFixed(2)}`} hint={status.capBRL !== envDefaultCap ? "override manual" : "default env"} />
        <AdminStatCard icon={Activity} label="Disponível" value={`R$ ${status.remainingBRL.toFixed(2)}`} tone={status.remainingBRL <= 0 ? "danger" : "success"} />
        <AdminStatCard icon={AlertTriangle} label="% usado" value={`${status.percentUsed.toFixed(1)}%`} tone={status.percentUsed >= 75 ? "warning" : "default"} />
      </div>

      {/* Info card */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-y/5 border border-y/20 mb-5">
        <Info size={14} className="text-y shrink-0 mt-0.5" />
        <div className="text-[12px] text-t2 leading-relaxed">
          O custo KIE é <strong className="text-white">estimado</strong> via tabela <code className="text-y">KIE_COST_USD</code> × R$5,40,
          não o valor real cobrado pela KIE.AI. O cap atua como <strong className="text-white">circuit breaker</strong>:
          quando o gasto estimado bate no cap, as APIs <code className="text-y">/api/generate/*</code> retornam 503.
          Cap padrão vem da env <code className="text-y">KIE_MONTHLY_CAP_BRL</code> (atual: R$ {envDefaultCap.toFixed(2)}).
          Override por mês via esta tela é gravado em <code className="text-y">kie_monthly_usage.cap_brl</code>.
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-b1">
          <h2 className="text-[12px] font-semibold text-white uppercase tracking-wider">Histórico (12 meses)</h2>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-t3">
            <Activity size={24} className="text-t4 mb-2" />
            <p className="text-[13px]">Nenhum histórico ainda</p>
            <p className="text-[11.5px] text-t4 mt-1">Aparecerá assim que houver gerações neste mês ou em meses anteriores.</p>
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-card2 border-b border-b1">
              <tr className="text-left text-t3">
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Mês</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Gasto</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Cap</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">% usado</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Requests</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.monthKey} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">{h.monthKey}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white">R$ {h.totalBRL.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">
                    R$ {h.capBRL.toFixed(2)}
                    {h.capOverridden && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0 rounded-[4px] bg-y/10 border border-y/20 text-y text-[9.5px] font-bold uppercase tracking-wider">
                        override
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                    h.overCap ? "text-red-400"
                    : h.percentUsed >= 75 ? "text-orange-400"
                    : h.percentUsed >= 50 ? "text-yellow-400"
                    : "text-emerald-400"
                  }`}>
                    {h.percentUsed.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t3">{h.totalRequests}</td>
                  <td className="px-4 py-2.5">
                    {h.overCap ? (
                      <span className="text-[11px] font-bold text-red-400 uppercase">Bloqueado</span>
                    ) : h.percentUsed >= 75 ? (
                      <span className="text-[11px] font-bold text-orange-400 uppercase">Crítico</span>
                    ) : (
                      <span className="text-[11px] text-emerald-400">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de alterar cap */}
      <AdminConfirmDialog
        open={editOpen}
        onClose={() => !editBusy && setEditOpen(false)}
        onConfirm={applyCap}
        title="Alterar cap mensal"
        tone="warning"
        confirmLabel={editBusy ? "Aplicando..." : "Aplicar"}
        description={
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                Novo cap (BRL)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={newCap}
                onChange={(e) => setNewCap(e.target.value)}
                placeholder="200"
                className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[13px] text-white placeholder-t4 outline-none focus:border-b2"
              />
              <p className="mt-1 text-[10.5px] text-t4">
                Cap atual: R$ {status.capBRL.toFixed(2)} · gasto até agora: R$ {status.totalBRL.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: aumentar para acomodar campanha de marketing, baixar pra segurança extra..."
                rows={3}
                className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 resize-none"
              />
              <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 10 chars</p>
            </div>
            {editError && (
              <p className="text-[12px] text-red-400">{editError}</p>
            )}
            {!canApply && newCap && reason && (
              <p className="text-[11.5px] text-t4">
                {!Number.isFinite(newCapNum) || newCapNum <= 0
                  ? "Valor inválido"
                  : newCapNum > 10000
                  ? "Máximo R$ 10.000"
                  : reason.trim().length < 10
                  ? "Motivo precisa ter ao menos 10 caracteres"
                  : ""}
              </p>
            )}
          </div>
        }
      />
    </div>
  );
}
