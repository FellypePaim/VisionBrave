"use client";

import { useEffect, useState } from "react";
import { X, Lock, Unlock, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  target: { userId: string; email: string; isBlocked: boolean } | null;
  onSuccess?: () => void;
}

export function UserBlockModal({ open, onClose, target, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setConfirmEmail("");
      setError(null);
      setSuccess(null);
    }
  }, [open, target?.userId]);

  if (!open || !target) return null;

  const willBlock = !target.isBlocked;
  const reasonOk = reason.trim().length >= 10;
  // Pra banir, exige confirmEmail. Pra desbanir, não.
  const emailOk = !willBlock || confirmEmail.toLowerCase().trim() === target.email.toLowerCase();
  const canSubmit = reasonOk && emailOk && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${target!.userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocked: willBlock,
          reason: reason.trim(),
          confirmTargetEmail: willBlock ? confirmEmail.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Erro ao atualizar bloqueio");
        return;
      }
      setSuccess(data.message ?? "OK");
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
            <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center ${
              willBlock ? "bg-red-500/10 border border-red-500/20" : "bg-emerald-500/10 border border-emerald-500/20"
            }`}>
              {willBlock
                ? <Lock size={15} className="text-red-400" />
                : <Unlock size={15} className="text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">
                {willBlock ? "Banir usuário" : "Desbanir usuário"}
              </h2>
              <p className="text-[12px] text-t3">{target.email}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="text-t3 hover:text-white transition-colors disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {willBlock && (
            <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-red-500/5 border border-red-500/20">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-[12px] text-red-300 leading-relaxed">
                Ao banir o usuário, a sessão dele é <strong>invalidada imediatamente</strong>
                e ele não consegue mais logar nem fazer requests. Ação reversível via "Desbanir".
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Motivo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={willBlock
                ? "ex: Abuso reportado, comportamento suspeito, violação de ToS..."
                : "ex: Investigação concluída, contato comercial resolveu, falso positivo..."}
              rows={3}
              maxLength={500}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 resize-none"
            />
            <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 10 chars</p>
          </div>

          {willBlock && (
            <div className="p-3 rounded-[10px] bg-red-500/5 border border-red-500/20">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-300 leading-relaxed">
                  Confirme digitando o email do usuário-alvo:
                </p>
              </div>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={target.email}
                className="w-full bg-card border border-red-500/30 rounded-[8px] px-3 py-2 text-[12.5px] text-white placeholder-t4 outline-none focus:border-red-400"
              />
            </div>
          )}

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
            className={`flex-1 py-2.5 rounded-[9px] text-[13px] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              willBlock
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {willBlock ? "Banir" : "Desbanir"}
          </button>
        </div>
      </div>
    </div>
  );
}
