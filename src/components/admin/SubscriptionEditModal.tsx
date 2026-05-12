"use client";

import { useEffect, useState } from "react";
import { X, Crown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const PLANS = ["free", "premium", "premiumplus", "pro", "enterprise"] as const;
const STATUSES = ["active", "canceled", "past_due", "trialing", "incomplete"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  target: { userId: string; email: string; plan: string; status: string } | null;
  onSuccess?: () => void;
}

export function SubscriptionEditModal({ open, onClose, target, onSuccess }: Props) {
  const [plan, setPlan] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open && target) {
      setPlan(target.plan);
      setStatus(target.status);
      setReason("");
      setError(null);
      setSuccess(null);
    }
  }, [open, target?.userId, target?.plan, target?.status, target]);

  if (!open || !target) return null;

  const changed = plan !== target.plan || status !== target.status;
  const reasonOk = reason.trim().length >= 5;
  const canSubmit = changed && reasonOk && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const body: { plan?: string; status?: string; reason: string } = { reason: reason.trim() };
      if (plan !== target!.plan) body.plan = plan;
      if (status !== target!.status) body.status = status;

      const res = await fetch(`/api/admin/users/${target!.userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Erro ao atualizar assinatura");
        return;
      }
      setSuccess(`Assinatura atualizada: ${data.before.plan}/${data.before.status} → ${data.after.plan}/${data.after.status}`);
      onSuccess?.();
      setTimeout(() => onClose(), 1500);
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-b1 rounded-[14px] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-b1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[9px] bg-y/10 border border-y/20 flex items-center justify-center">
              <Crown size={15} className="text-y" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Alterar assinatura</h2>
              <p className="text-[12px] text-t3">{target.email}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="text-t3 hover:text-white transition-colors disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Plano
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2.5 text-[13px] text-white outline-none focus:border-b2"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {plan !== target.plan && (
              <p className="mt-1 text-[11px] text-y">
                {target.plan} → <strong>{plan}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2.5 text-[13px] text-white outline-none focus:border-b2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {status !== target.status && (
              <p className="mt-1 text-[11px] text-y">
                {target.status} → <strong>{status}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Motivo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: Upgrade manual após contato comercial, cancelamento por inadimplência..."
              rows={3}
              maxLength={500}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 resize-none"
            />
            <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 5 chars</p>
          </div>

          <div className="text-[11px] text-t4 p-3 rounded-[8px] bg-card2 border border-b1">
            <strong className="text-t2">Atenção:</strong> alterar plano NÃO altera <code>monthly_credits</code> automaticamente nem cria transação de bônus.
            Use o ajuste de créditos pra dar os créditos do novo plano.
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-[10px] bg-red-500/10 border border-red-500/20">
              <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-300">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-emerald-300">{success}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 bg-card2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-[9px] text-[13px] font-medium bg-card border border-b1 text-t2 hover:text-white hover:border-b2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-[9px] text-[13px] font-bold bg-y text-[#1a0e00] hover:bg-[#FCD34D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
