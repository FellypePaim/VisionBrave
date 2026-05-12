"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "warning" | "danger";
  /** Se passado, o user precisa digitar exatamente esse texto pra liberar o botão de confirmar. */
  requireTypedConfirmation?: string;
  /** Label do input de confirmação (ex: "Digite o email do usuário") */
  requireTypedLabel?: string;
}

export function AdminConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  requireTypedConfirmation,
  requireTypedLabel,
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  if (!open) return null;

  const typedOk =
    !requireTypedConfirmation ||
    typed.trim().toLowerCase() === requireTypedConfirmation.trim().toLowerCase();

  const toneStyles = {
    default: { btn: "bg-y text-[#1a0e00] hover:bg-[#FCD34D]", iconBg: "bg-y/10", iconColor: "text-y" },
    warning: { btn: "bg-orange-500 text-white hover:bg-orange-600", iconBg: "bg-orange-500/10", iconColor: "text-orange-400" },
    danger:  { btn: "bg-red-500 text-white hover:bg-red-600",       iconBg: "bg-red-500/10",    iconColor: "text-red-400" },
  }[tone];

  async function handleConfirm() {
    if (!typedOk || busy) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-b1 rounded-[14px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-b1">
          <div className={`w-10 h-10 rounded-[10px] ${toneStyles.iconBg} flex items-center justify-center shrink-0`}>
            <AlertTriangle size={18} className={toneStyles.iconColor} />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold text-white mb-1">{title}</h2>
            <div className="text-[13px] text-t2 leading-relaxed">{description}</div>
          </div>
          <button
            onClick={onClose}
            className="text-t3 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Typed confirmation */}
        {requireTypedConfirmation && (
          <div className="px-5 py-4 border-b border-b1">
            <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-2">
              {requireTypedLabel ?? "Digite para confirmar"}
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireTypedConfirmation}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[13px] text-white placeholder-t4 outline-none focus:border-b2 transition-colors"
              autoFocus
            />
            {typed.length > 0 && !typedOk && (
              <p className="mt-1.5 text-[11px] text-red-400">Texto não corresponde</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 bg-card2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-[9px] text-[13px] font-medium bg-card border border-b1 text-t2 hover:text-white hover:border-b2 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!typedOk || busy}
            className={`flex-1 py-2.5 rounded-[9px] text-[13px] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${toneStyles.btn}`}
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
