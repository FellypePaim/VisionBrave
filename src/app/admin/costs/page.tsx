"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Users, Crown, Info,
  Loader2, AlertCircle, ExternalLink,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

interface CostsData {
  period: string;
  periodLabel: string;
  revenue: {
    mrrTotalBRL: number;
    byPlan: Record<string, { count: number; pricePerUnit: number; subtotalBRL: number }>;
    note: string;
  };
  kieCost: {
    monthKey: string;
    estimatedBRL: number;
    capBRL: number;
    note: string;
  };
  margin: {
    estimatedBRL: number;
    estimatedPercent: number;
    note: string;
  };
  credits: {
    totalInCirculation: number;
    totalEarned: number;
    totalSpent: number;
    averageBalancePerUser: number;
    stockholderRatio: number;
  };
  byModel: Array<{
    model: string;
    spendCount: number;
    estimatedKieCostBRL: number;
    creditsCharged: number;
  }>;
  topUsers: Array<{
    userId: string;
    email: string | null;
    spendCount: number;
    creditsSpent: number;
    estimatedKieCostBRL: number;
  }>;
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "7d",    label: "7 dias" },
  { value: "30d",   label: "30 dias" },
  { value: "month", label: "Mês corrente" },
];

const PLAN_COLORS: Record<string, string> = {
  free:        "#3A3A3A",
  premium:     "#60A5FA",
  premiumplus: "#A78BFA",
  pro:         "#FBBF24",
  enterprise:  "#34D399",
};

export default function AdminCostsPage() {
  const [data, setData] = useState<CostsData | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/costs?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d?.error) setError(d.error.message);
        else setData(d);
      })
      .catch(() => mounted && setError("Erro de rede"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="text-y animate-spin mr-2" />
        <span className="text-[13px] text-t3">Calculando custos...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 rounded-[10px] bg-red-500/10 border border-red-500/20">
          <AlertCircle size={18} className="text-red-400" />
          <div className="text-[13px] text-red-300">{error ?? "Erro desconhecido"}</div>
        </div>
      </div>
    );
  }

  const isMarginPositive = data.margin.estimatedBRL >= 0;
  const maxKieByModel = Math.max(...data.byModel.map((m) => m.estimatedKieCostBRL), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-white mb-1 flex items-center gap-2">
            <DollarSign size={20} className="text-y" />
            Custos e margem
          </h1>
          <p className="text-[13px] text-t3">
            Análise financeira agregada · {data.periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-card border border-b1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors ${
                period === p.value
                  ? "bg-[#1f1608] text-y"
                  : "text-t3 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner de aviso sobre estimativa */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-orange-500/5 border border-orange-500/20 mb-5">
        <Info size={14} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="text-[12px] text-orange-200 leading-relaxed">
          <strong className="text-orange-300">Todos os valores são estimativas.</strong> MRR é teórico
          (gateway de pagamento ainda não integrado). Custo KIE é estimado via tabela <code className="text-y">KIE_COST_USD × R$5,40</code>,
          não o real cobrado pela KIE.AI. Use pra trend e priorização — não pra contabilidade.
        </div>
      </div>

      {/* Big revenue/cost/margin cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <BigCard
          icon={TrendingUp}
          label="Receita mensal (MRR estimado)"
          value={`R$ ${data.revenue.mrrTotalBRL.toFixed(2)}`}
          hint={`${Object.values(data.revenue.byPlan).reduce((s, p) => s + p.count, 0)} assinaturas ativas`}
          tone="success"
        />
        <BigCard
          icon={TrendingDown}
          label={`Custo KIE estimado (${data.kieCost.monthKey})`}
          value={`R$ ${data.kieCost.estimatedBRL.toFixed(2)}`}
          hint={`Cap mensal: R$ ${data.kieCost.capBRL.toFixed(2)}`}
          tone="warning"
        />
        <BigCard
          icon={isMarginPositive ? TrendingUp : TrendingDown}
          label="Margem bruta estimada"
          value={`R$ ${data.margin.estimatedBRL.toFixed(2)}`}
          hint={`${data.margin.estimatedPercent.toFixed(1)}% do MRR`}
          tone={isMarginPositive ? "success" : "danger"}
        />
      </div>

      {/* Créditos */}
      <SectionTitle>Créditos</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard icon={Activity} label="Em circulação" value={data.credits.totalInCirculation} hint="Soma de balance" />
        <AdminStatCard icon={TrendingUp} label="Total earned" value={data.credits.totalEarned} />
        <AdminStatCard icon={TrendingDown} label="Total spent" value={data.credits.totalSpent} />
        <AdminStatCard
          icon={Users}
          label="Saldo médio/user"
          value={data.credits.averageBalancePerUser}
          hint={
            data.credits.stockholderRatio === Infinity
              ? "Nada gasto ainda"
              : `Ratio earned/spent: ${data.credits.stockholderRatio === Infinity ? "—" : data.credits.stockholderRatio.toFixed(2)}`
          }
        />
      </div>

      {/* Receita por plano */}
      <SectionTitle>Receita por plano</SectionTitle>
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden mb-5">
        {Object.keys(data.revenue.byPlan).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-t3">
            <Crown size={24} className="text-t4 mb-2" />
            <p className="text-[13px]">Nenhuma subscription ativa ainda</p>
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-card2 border-b border-b1">
              <tr className="text-left text-t3">
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Plano</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Assinaturas</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Preço/mês</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Subtotal MRR</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.revenue.byPlan)
                .filter(([, v]) => v.count > 0)
                .sort(([, a], [, b]) => b.subtotalBRL - a.subtotalBRL)
                .map(([plan, v]) => (
                <tr key={plan} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PLAN_COLORS[plan] ?? "#3A3A3A" }}
                      />
                      <span className="text-white font-medium uppercase tracking-wider text-[11.5px]">{plan}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white">{v.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">R$ {v.pricePerUnit.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white font-semibold">
                    R$ {v.subtotalBRL.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-y/30 bg-y/5">
                <td className="px-4 py-2.5 text-y font-bold uppercase tracking-wider text-[11.5px]">Total MRR</td>
                <td colSpan={2} />
                <td className="px-4 py-2.5 text-right tabular-nums text-y font-bold">
                  R$ {data.revenue.mrrTotalBRL.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Custo KIE por modelo */}
      <SectionTitle>Top 10 modelos — custo KIE estimado</SectionTitle>
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden mb-5">
        {data.byModel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-t3">
            <Activity size={24} className="text-t4 mb-2" />
            <p className="text-[13px]">Sem gerações nesse período</p>
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-card2 border-b border-b1">
              <tr className="text-left text-t3">
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Modelo</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Gerações</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Créditos cobrados</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Custo KIE est.</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((m) => (
                <tr key={m.model} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">{m.model}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">{m.spendCount.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">{m.creditsCharged.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white font-semibold">
                    R$ {m.estimatedKieCostBRL.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 w-[140px]">
                    <div className="h-1.5 bg-card2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-y rounded-full"
                        style={{ width: `${(m.estimatedKieCostBRL / maxKieByModel) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top users */}
      <SectionTitle>Top 10 usuários — gasto KIE estimado</SectionTitle>
      <div className="bg-card border border-b1 rounded-[12px] overflow-hidden">
        {data.topUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-t3">
            <Users size={24} className="text-t4 mb-2" />
            <p className="text-[13px]">Sem dados de uso nesse período</p>
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-card2 border-b border-b1">
              <tr className="text-left text-t3">
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px]">Usuário</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Gerações</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Créditos gastos</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right">Custo KIE est.</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10.5px] text-right"></th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((u) => (
                <tr key={u.userId} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                  <td className="px-4 py-2.5">
                    {u.email ? (
                      <Link href={`/admin/users/${u.userId}`} className="text-white hover:text-y truncate inline-block max-w-[240px]" title={u.email}>
                        {u.email}
                      </Link>
                    ) : (
                      <span className="text-t4 text-[11px]">{u.userId.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">{u.spendCount.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-t2">{u.creditsSpent.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white font-semibold">
                    R$ {u.estimatedKieCostBRL.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/users/${u.userId}`}
                      className="w-6 h-6 rounded-[5px] bg-card2 border border-b1 hover:border-b2 text-t3 hover:text-white flex items-center justify-center transition-colors ml-auto"
                    >
                      <ExternalLink size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

function BigCard({
  icon: Icon, label, value, hint, tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  hint: string;
  tone: "success" | "warning" | "danger";
}) {
  const styles = {
    success: { bg: "bg-emerald-500/5",  border: "border-emerald-500/20", text: "text-emerald-400" },
    warning: { bg: "bg-orange-500/5",   border: "border-orange-500/20",  text: "text-orange-400" },
    danger:  { bg: "bg-red-500/5",      border: "border-red-500/20",     text: "text-red-400" },
  }[tone];

  return (
    <div className={`rounded-[14px] p-5 border ${styles.bg} ${styles.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={styles.text} />
        <span className="text-[11px] font-semibold text-t3 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[28px] font-bold text-white tabular-nums leading-tight mb-1">
        {value}
      </div>
      <div className="text-[12px] text-t3">{hint}</div>
    </div>
  );
}
