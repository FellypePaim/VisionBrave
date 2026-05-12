"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  value: unknown;
  label?: string;
  maxHeight?: number;
}

/**
 * Visualizador de JSON com syntax highlight básico, copy-to-clipboard e collapse.
 * Usado pra exibir `before` / `after` / `metadata` em audit logs.
 */
export function JsonViewer({ value, label, maxHeight = 240 }: Props) {
  const [copied, setCopied] = useState(false);

  const formatted = (() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  })();

  function copy() {
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const isEmpty = value === null || value === undefined ||
    (typeof value === "object" && value !== null && Object.keys(value).length === 0);

  return (
    <div className="bg-card2 border border-b1 rounded-[8px] overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-b1 bg-card">
          <span className="text-[10.5px] font-semibold text-t3 uppercase tracking-wider">{label}</span>
          {!isEmpty && (
            <button
              onClick={copy}
              className="text-t3 hover:text-white transition-colors flex items-center gap-1 text-[10.5px]"
              title="Copiar JSON"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          )}
        </div>
      )}
      <div
        className="overflow-auto p-3 font-mono text-[11px] leading-[1.5] text-[#c8c8c8] whitespace-pre"
        style={{ maxHeight }}
      >
        {isEmpty ? (
          <span className="text-t4 italic">— vazio —</span>
        ) : (
          formatted
        )}
      </div>
    </div>
  );
}
