"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui você pode integrar com Sentry/Posthog quando configurar
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h1 className="text-[24px] font-bold text-white mb-3">Algo deu errado</h1>
        <p className="text-[14px] text-t3 mb-8 leading-relaxed">
          Encontramos um erro inesperado. Tente novamente ou volte para o início.
        </p>
        {error.digest && (
          <p className="text-[11px] text-t4 mb-6 font-mono">ID: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-b1 rounded-[10px] text-[13.5px] font-semibold text-white hover:border-b2 transition-colors"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-bold text-[#1a0e00] transition-all hover:-translate-y-px"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            <Home size={14} />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
