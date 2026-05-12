"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { KieStatus } from "@/lib/admin/types";

interface Props {
  adminEmail: string | null;
  role: string;
}

export function AdminTopbar({ adminEmail, role }: Props) {
  const [kie, setKie] = useState<KieStatus | null>(null);
  const [loadingKie, setLoadingKie] = useState(true);

  // Polling leve de 30s pro status KIE (sem react-query pra não adicionar dep)
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/kie/status");
        if (!res.ok) {
          if (mounted) setLoadingKie(false);
          return;
        }
        const data = (await res.json()) as KieStatus;
        if (mounted) setKie(data);
      } catch {
        // silencioso — topbar não deve quebrar a UI
      } finally {
        if (mounted) setLoadingKie(false);
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Status visual do cap KIE
  const kieStatus = kie
    ? kie.overCap
      ? { label: "Bloqueado", color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle }
      : kie.percentUsed >= 75
      ? { label: "Crítico", color: "text-orange-400", bg: "bg-orange-500/10", icon: AlertTriangle }
      : kie.percentUsed >= 50
      ? { label: "Atenção", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: AlertTriangle }
      : { label: "Normal", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 }
    : null;

  return (
    <header
      style={{ background: "#0A0A0A" }}
      className="h-14 border-b border-b1 px-5 flex items-center gap-4 shrink-0"
    >
      <h1 className="text-[15px] font-semibold text-white">Painel Admin</h1>

      <div className="ml-auto flex items-center gap-3">
        {/* Cap KIE status */}
        {loadingKie ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-card border border-b1">
            <Activity size={12} className="text-t4 animate-pulse" />
            <span className="text-[11.5px] text-t4">Verificando KIE...</span>
          </div>
        ) : kie && kieStatus ? (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-b1 ${kieStatus.bg}`}>
            <kieStatus.icon size={12} className={kieStatus.color} />
            <span className="text-[11.5px] text-t2 font-medium">KIE</span>
            <span className={`text-[11.5px] font-semibold tabular-nums ${kieStatus.color}`}>
              R$ {kie.totalBRL.toFixed(0)} / {kie.capBRL.toFixed(0)}
            </span>
            <span className={`text-[10px] font-bold uppercase ${kieStatus.color}`}>
              {kieStatus.label}
            </span>
          </div>
        ) : null}

        {/* Admin info */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] bg-card border border-b1">
          <div className="text-right">
            <div className="text-[12px] font-semibold text-white truncate max-w-[180px]">
              {adminEmail ?? "Admin"}
            </div>
            <div className="text-[10px] text-t3 uppercase tracking-wider">{role}</div>
          </div>
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-[#1a0e00]"
            style={{ background: "linear-gradient(135deg, #FBBF24 30%, #D49B16 100%)" }}
          >
            {adminEmail?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
