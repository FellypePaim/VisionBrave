"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertCircle, Coins, User, Crown, CreditCard,
  Calendar, Lock, Plus, Copy, ArrowDownLeft, ArrowUpRight, RotateCcw,
} from "lucide-react";
import { CreditAdjustModal } from "@/components/admin/CreditAdjustModal";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  refId: string | null;
  metadata: unknown;
  createdAt: string;
}

interface UserDetails {
  userId: string;
  email: string;
  createdAt: string;
  plan: string;
  subscriptionStatus: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isBlocked: boolean;
  bannedUntil: string | null;
  monthlyCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  transactions: Transaction[];
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar usuário");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="text-y animate-spin mr-2" />
        <span className="text-[13px] text-t3">Carregando usuário...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-[12.5px] text-t3 hover:text-white mb-4">
          <ArrowLeft size={13} /> Voltar
        </Link>
        <div className="flex items-center gap-3 p-4 rounded-[10px] bg-red-500/10 border border-red-500/20">
          <AlertCircle size={18} className="text-red-400" />
          <div className="text-[13px] text-red-300">{error ?? "Erro desconhecido"}</div>
        </div>
      </div>
    );
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-[12.5px] text-t3 hover:text-white mb-4">
        <ArrowLeft size={13} /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[22px] font-bold text-white">{data.email || "(sem email)"}</h1>
            {data.isBlocked && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-red-500/10 border border-red-500/30 text-red-400 text-[10.5px] font-bold uppercase tracking-wider">
                <Lock size={11} /> Bloqueado
              </span>
            )}
          </div>
          <button
            onClick={() => copy(data.userId)}
            className="text-[12px] text-t3 hover:text-white flex items-center gap-1.5"
          >
            {data.userId}
            <Copy size={11} />
          </button>
        </div>
        <button
          onClick={() => setAdjustOpen(true)}
          className="px-4 py-2.5 rounded-[10px] bg-y text-[#1a0e00] font-bold text-[13px] hover:bg-[#FCD34D] transition-colors flex items-center gap-2"
        >
          <Plus size={14} />
          Ajustar créditos
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <AdminStatCard icon={Coins} label="Saldo atual" value={data.balance} />
        <AdminStatCard icon={ArrowDownLeft} label="Total earned" value={data.totalEarned} />
        <AdminStatCard icon={ArrowUpRight} label="Total spent" value={data.totalSpent} />
        <AdminStatCard icon={Crown} label="Plano" value={data.plan.toUpperCase()} hint={`status: ${data.subscriptionStatus}`} />
      </div>

      {/* Resumo + Assinatura lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Resumo */}
        <Section title="Resumo" icon={User}>
          <Row label="User ID" value={data.userId} mono />
          <Row label="Email" value={data.email || "—"} />
          <Row label="Criado em" value={new Date(data.createdAt).toLocaleString("pt-BR")} />
          <Row label="Status" value={data.isBlocked ? "Bloqueado" : "Ativo"} valueClass={data.isBlocked ? "text-red-400" : "text-emerald-400"} />
          {data.bannedUntil && (
            <Row label="Banido até" value={new Date(data.bannedUntil).toLocaleString("pt-BR")} valueClass="text-red-400" />
          )}
        </Section>

        {/* Assinatura */}
        <Section title="Assinatura" icon={Crown}>
          <Row label="Plano" value={data.plan} />
          <Row label="Status" value={data.subscriptionStatus} />
          <Row label="Créditos mensais" value={data.monthlyCredits.toLocaleString("pt-BR")} />
          <Row
            label="Stripe customer ID"
            value={data.stripeCustomerId ?? "—"}
            mono
            faded={!data.stripeCustomerId}
          />
          <Row
            label="Stripe subscription ID"
            value={data.stripeSubscriptionId ?? "—"}
            mono
            faded={!data.stripeSubscriptionId}
          />
          <Row
            label="Período atual termina em"
            value={data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleString("pt-BR") : "—"}
            faded={!data.currentPeriodEnd}
          />
          <p className="text-[10.5px] text-t4 mt-3 pt-3 border-t border-b1">
            Gateway de pagamento ainda não integrado. Stripe IDs são reservados pra integração futura.
          </p>
        </Section>
      </div>

      {/* Transações */}
      <Section title={`Últimas transações (${data.transactions.length})`} icon={CreditCard}>
        {data.transactions.length === 0 ? (
          <p className="text-[12.5px] text-t3 py-4">Nenhuma transação registrada</p>
        ) : (
          <div className="overflow-x-auto -mx-4 -mb-2">
            <table className="w-full text-[12px]">
              <thead className="bg-card2 border-y border-b1">
                <tr className="text-left text-t3">
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider text-[10.5px]">Tipo</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider text-[10.5px] text-right">Valor</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider text-[10.5px]">Descrição</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider text-[10.5px]">Fonte</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider text-[10.5px]">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => {
                  const meta = (t.metadata ?? {}) as Record<string, unknown>;
                  const isAdmin = meta.source === "admin";
                  return (
                    <tr key={t.id} className="border-b border-b1 hover:bg-card2/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <TxTypeBadge type={t.type} />
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                        t.amount > 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 text-t2 max-w-[300px] truncate" title={t.description ?? ""}>
                        {t.description || <span className="text-t4">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] bg-y/10 border border-y/20 text-y text-[10px] font-semibold uppercase tracking-wider">
                            Admin
                          </span>
                        ) : (
                          <span className="text-t4 text-[11px]">user</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-t3 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Modal */}
      <CreditAdjustModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        target={{ userId: data.userId, email: data.email, balance: data.balance }}
        onSuccess={() => load()}
      />
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-b1 rounded-[12px] p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-b1">
        <Icon size={14} className="text-y" />
        <h2 className="text-[12px] font-semibold text-white uppercase tracking-wider">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  label, value, mono, faded, valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  faded?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px]">
      <span className="text-t3 shrink-0 min-w-[180px]">{label}</span>
      <span className={`text-right flex-1 break-all ${mono ? "font-mono text-[11.5px]" : ""} ${faded ? "text-t4" : "text-white"} ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

function TxTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { color: string; icon: typeof ArrowDownLeft }> = {
    bonus:        { color: "text-emerald-400", icon: ArrowDownLeft },
    purchase:     { color: "text-emerald-400", icon: ArrowDownLeft },
    subscription: { color: "text-blue-400",    icon: ArrowDownLeft },
    refund:       { color: "text-y",           icon: RotateCcw },
    spend:        { color: "text-red-400",     icon: ArrowUpRight },
  };
  const s = styles[type] ?? { color: "text-t3", icon: Calendar };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 ${s.color}`}>
      <Icon size={11} />
      <span className="text-[11px] font-medium">{type}</span>
    </span>
  );
}
