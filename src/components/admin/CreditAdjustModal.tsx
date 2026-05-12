"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const DOUBLE_CONFIRM_THRESHOLD = 5000;

type Operation = "add" | "remove" | "refund";

interface UserTarget {
  userId: string;
  email: string;
  balance: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: UserTarget | null;
  /** Chamado depois do sucesso pra atualizar a UI parent */
  onSuccess?: (result: { newBalance: number; delta: number; operation: Operation }) => void;
}

const OPERATIONS: { value: Operation; label: string; icon: typeof Plus; color: string }[] = [
  { value: "add",    label: "Adicionar", icon: Plus,     color: "text-emerald-400" },
  { value: "remove", label: "Remover",   icon: Minus,    color: "text-red-400" },
  { value: "refund", label: "Refund",    icon: RotateCcw, color: "text-y" },
];

export function CreditAdjustModal({ open, onClose, target, onSuccess }: Props) {
  const [operation, setOperation] = useState<Operation>("add");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setOperation("add");
      setAmount("");
      setReason("");
      setReferenceId("");
      setConfirmEmail("");
      setError(null);
      setSuccess(null);
    }
  }, [open, target?.userId]);

  if (!open || !target) return null;

  const amountNum = Number(amount);
  const requiresDoubleConfirm = amountNum > DOUBLE_CONFIRM_THRESHOLD;

  // Validações locais (espelham o backend pra UX rápida)
  const reasonOk = reason.trim().length >= 10;
  const amountOk = Number.isFinite(amountNum) && amountNum > 0 && Number.isInteger(amountNum);
  const removeOk = operation !== "remove" || amountNum <= target.balance;
  const confirmOk = !requiresDoubleConfirm || confirmEmail.toLowerCase().trim() === target.email.toLowerCase();
  const canSubmit = reasonOk && amountOk && removeOk && confirmOk && !busy;

  const projectedBalance =
    operation === "remove"
      ? target.balance - (amountNum || 0)
      : target.balance + (amountNum || 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: target!.userId,
          operation,
          amount: amountNum,
          reason: reason.trim(),
          referenceId: referenceId.trim() || undefined,
          confirmTargetEmail: requiresDoubleConfirm ? confirmEmail.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Erro ao ajustar créditos");
        return;
      }
      setSuccess(
        `Saldo: ${target!.balance.toLocaleString("pt-BR")} → ${(data.newBalance as number).toLocaleString("pt-BR")} (${
          (data.delta as number) > 0 ? "+" : ""
        }${(data.delta as number).toLocaleString("pt-BR")})`
      );
      onSuccess?.({ newBalance: data.newBalance, delta: data.delta, operation });
      // Fecha o modal automaticamente após 1.5s
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-b1">
          <div>
            <h2 className="text-[15px] font-semibold text-white mb-0.5">Ajuste de créditos</h2>
            <p className="text-[12px] text-t3">
              {target.email} · saldo atual: <span className="text-white font-semibold">{target.balance.toLocaleString("pt-BR")}</span>
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-t3 hover:text-white transition-colors disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Operação */}
          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Operação
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {OPERATIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setOperation(value)}
                  className={`py-2.5 rounded-[8px] border text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    operation === value
                      ? "bg-[#1f1608] border-y text-y"
                      : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                  }`}
                >
                  <Icon size={12} className={operation === value ? "text-y" : color} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Quantidade (créditos)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2.5 text-[14px] text-white placeholder-t4 outline-none focus:border-b2 transition-colors tabular-nums"
            />
            {amount && amountOk && (
              <p className="mt-1.5 text-[11.5px] text-t3">
                Saldo após: <span className={`font-bold tabular-nums ${
                  projectedBalance < 0 ? "text-red-400" : "text-white"
                }`}>{projectedBalance.toLocaleString("pt-BR")}</span>
              </p>
            )}
            {amount && operation === "remove" && !removeOk && (
              <p className="mt-1.5 text-[11.5px] text-red-400">
                Saldo insuficiente — máximo é {target.balance.toLocaleString("pt-BR")}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              Motivo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: Bônus de boas-vindas após troca de plano, refund por bug XYZ..."
              rows={3}
              maxLength={500}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors resize-none"
            />
            <p className="mt-1 text-[10.5px] text-t4">
              {reason.length}/500 · mínimo 10 chars
            </p>
          </div>

          {/* Referência opcional */}
          <div>
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              ID de referência <span className="text-t4 normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="task_id, ticket, etc."
              maxLength={200}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
            />
          </div>

          {/* Double-confirm */}
          {requiresDoubleConfirm && (
            <div className="p-3 rounded-[10px] bg-orange-500/5 border border-orange-500/20">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={13} className="text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-orange-300 leading-relaxed">
                  Ajuste acima de {DOUBLE_CONFIRM_THRESHOLD.toLocaleString("pt-BR")} créditos. Digite o email do usuário-alvo para confirmar.
                </p>
              </div>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={target.email}
                className="w-full bg-card border border-orange-500/30 rounded-[8px] px-3 py-2 text-[12.5px] text-white placeholder-t4 outline-none focus:border-orange-400 transition-colors"
              />
            </div>
          )}

          {/* Feedback */}
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

        {/* Actions */}
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
