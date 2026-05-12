"use client";

import { useEffect, useState } from "react";
import {
  Users, UserPlus, Crown, CreditCard, TrendingUp, Zap,
  Sparkles, Activity, AlertTriangle, Loader2,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { HealthCard } from "@/components/admin/HealthCard";
import type { AdminOverview, AdminApiError } from "@/lib/admin/types";

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/overview");
        if (!res.ok) {
          const errData = (await res.json()) as AdminApiError;
          if (mounted) {
            setError(errData.error?.message ?? "Erro ao carregar overview");
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as AdminOverview;
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError("Erro de rede");
          setLoading(false);
        }
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="text-y animate-spin" />
        <span className="ml-2 text-[13px] text-t3">Carregando overview...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 rounded-[10px] bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={18} className="text-red-400" />
          <div className="text-[13px] text-red-300">{error ?? "Erro desconhecido"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-white mb-1">Visão Geral</h1>
        <p className="text-[13px] text-t3">
          KPIs em tempo real do VisionBrave. Dados extraídos diretamente do banco.
        </p>
      </div>

      {/* Health check — primeiro card, diagnóstico antes de tudo */}
      <div className="mb-5">
        <HealthCard health={data.health} />
      </div>

      {/* Usuários */}
      <SectionTitle>Usuários</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          icon={Users}
          label="Total de usuários"
          value={data.users.total}
        />
        <AdminStatCard
          icon={UserPlus}
          label="Novos hoje"
          value={data.users.newToday}
          hint={`${data.users.new7d} nos últimos 7d`}
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Novos em 30d"
          value={data.users.new30d}
        />
        <AdminStatCard
          icon={Crown}
          label="Pagantes"
          value={Object.entries(data.users.byPlan)
            .filter(([k]) => k !== "free")
            .reduce((sum, [, v]) => sum + v, 0)}
          hint="Não Free"
        />
      </div>

      {/* Assinaturas */}
      <SectionTitle>Assinaturas</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          icon={Activity}
          label="Ativas"
          value={data.subscriptions.active}
          tone="success"
        />
        <AdminStatCard
          icon={Activity}
          label="Trialing"
          value={data.subscriptions.trialing}
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="Past Due"
          value={data.subscriptions.pastDue}
          tone={data.subscriptions.pastDue > 0 ? "warning" : "default"}
        />
        <AdminStatCard
          icon={Activity}
          label="Canceladas"
          value={data.subscriptions.canceled}
        />
      </div>

      {/* Distribuição por plano */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-5">
        <div className="text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-3">
          Distribuição por plano
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {["free", "premium", "premiumplus", "pro", "enterprise", "starter"].map((plan) => (
            <div key={plan} className="px-3 py-2 rounded-[8px] bg-card2 border border-b1">
              <div className="text-[10.5px] text-t4 uppercase tracking-wider">{plan}</div>
              <div className="text-[16px] font-bold text-white tabular-nums">
                {(data.subscriptions.byPlan[plan] ?? 0).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Créditos */}
      <SectionTitle>Créditos</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          icon={CreditCard}
          label="Em circulação"
          value={data.credits.totalInCirculation}
          hint="Soma de balance"
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Total earned"
          value={data.credits.totalEarned}
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Total spent"
          value={data.credits.totalSpent}
        />
        <AdminStatCard
          icon={Zap}
          label="Ajustes admin (30d)"
          value={data.credits.adminAdjustmentsLast30d}
          hint="Transações com source=admin"
        />
      </div>

      {/* Gerações */}
      <SectionTitle>Gerações</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          icon={Sparkles}
          label="Total (lifetime)"
          value={data.generations.totalSpend}
          hint="Transações tipo spend"
        />
        <AdminStatCard
          icon={Activity}
          label="Últimas 24h"
          value={data.generations.last24h}
        />
        <AdminStatCard
          icon={Activity}
          label="Últimos 7d"
          value={data.generations.last7d}
        />
        <AdminStatCard
          icon={Crown}
          label="Modelo mais usado"
          value={data.generations.topModel ?? "—"}
          hint="Últimos 30d"
        />
      </div>

      {/* KIE */}
      <SectionTitle>KIE Global ({data.kie.monthKey})</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard
          icon={Activity}
          label="Gasto estimado"
          value={`R$ ${data.kie.totalBRL.toFixed(2)}`}
          tone={data.kie.status === "bloqueado" ? "danger"
              : data.kie.status === "critico" ? "warning"
              : "default"}
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Cap mensal"
          value={`R$ ${data.kie.capBRL.toFixed(2)}`}
        />
        <AdminStatCard
          icon={Activity}
          label="Disponível"
          value={`R$ ${data.kie.remainingBRL.toFixed(2)}`}
          tone={data.kie.remainingBRL <= 0 ? "danger" : "success"}
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="% usado"
          value={`${data.kie.percentUsed.toFixed(1)}%`}
          tone={data.kie.percentUsed >= 75 ? "warning" : data.kie.overCap ? "danger" : "default"}
          hint={data.kie.status === "bloqueado" ? "Bloqueado" : data.kie.status === "critico" ? "Crítico" : data.kie.status === "atencao" ? "Atenção" : "Normal"}
        />
      </div>

      <div className="text-[11px] text-t4 text-center mt-8 pb-4">
        Custo KIE é <strong>estimado</strong> via tabela KIE_COST_USD × R$5,40.
        Não é o custo cobrado da KIE.AI — usar essa tela só pra trend.
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-3 mt-1">
      {children}
    </div>
  );
}
