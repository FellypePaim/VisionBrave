"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import {
  Sparkles, TrendingUp, TrendingDown, Plus, Crown, Zap, Loader2, ArrowUpRight,
  Image as ImageIcon, Video, Music, Gift,
} from "lucide-react";

interface CreditsState {
  balance: number;
  total_earned: number;
  total_spent: number;
}
interface SubscriptionState {
  plan: "free" | "starter" | "pro" | "enterprise";
  status: string;
  current_period_end?: string;
  monthly_credits: number;
}
interface Transaction {
  id: string;
  amount: number;
  type: "purchase" | "bonus" | "spend" | "refund" | "subscription";
  description: string;
  created_at: string;
}

const PLAN_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  free:       { label: "Free",       color: "#888",    icon: Sparkles },
  starter:    { label: "Starter",    color: "#FBBF24", icon: Zap },
  pro:        { label: "Pro",        color: "#a78bfa", icon: Crown },
  enterprise: { label: "Enterprise", color: "#3dff7a", icon: Crown },
};

const TX_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  purchase:     { icon: Plus,         color: "#3dff7a" },
  bonus:        { icon: Gift,         color: "#FBBF24" },
  subscription: { icon: TrendingUp,   color: "#a78bfa" },
  refund:       { icon: TrendingUp,   color: "#3dff7a" },
  spend:        { icon: TrendingDown, color: "#888" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function BillingPage() {
  const [credits, setCredits] = useState<CreditsState | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/credits").then((r) => r.ok ? r.json() : null),
      fetch("/api/credits/transactions?limit=50").then((r) => r.ok ? r.json() : null),
    ]).then(([info, txs]) => {
      if (info) {
        setCredits(info.credits);
        setSubscription(info.subscription);
      }
      if (txs?.transactions) setTransactions(txs.transactions);
    }).finally(() => setLoading(false));
  }, []);

  const planInfo = subscription ? PLAN_INFO[subscription.plan] : PLAN_INFO.free;
  const PlanIcon = planInfo.icon;

  return (
    <>
      <Topbar title="Cobrança e Créditos" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
            {/* Saldo */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1a1408 0%, #0a0604 100%)",
                border: "1px solid #2a1f08",
              }}
            >
              <div className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full bg-[radial-gradient(circle,#FBBF2440,transparent_70%)]" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-y uppercase tracking-wider mb-3">
                  <Sparkles size={12} fill="currentColor" />
                  Saldo atual
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[40px] font-extrabold text-white tracking-tight">
                    {credits ? credits.balance.toLocaleString("pt-BR") : "—"}
                  </span>
                  <span className="text-[13px] text-y font-semibold">créditos</span>
                </div>
                <p className="text-[12px] text-t3">Saldo disponível</p>
              </div>
            </div>

            {/* Plano */}
            <div className="bg-card border border-b1 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-t3 uppercase tracking-wider mb-3">
                <PlanIcon size={12} style={{ color: planInfo.color }} />
                Plano atual
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[28px] font-extrabold text-white tracking-tight">
                  {planInfo.label}
                </span>
              </div>
              <p className="text-[12px] text-t3 mb-4">
                {(subscription?.monthly_credits ?? 200).toLocaleString("pt-BR")} créditos / mês
              </p>
              <Link
                href="/pricing"
                className="text-[12.5px] font-semibold text-y hover:underline inline-flex items-center gap-1"
              >
                {subscription?.plan === "free" ? "Fazer upgrade" : "Mudar plano"}
                <ArrowUpRight size={12} />
              </Link>
            </div>

            {/* Histórico geral */}
            <div className="bg-card border border-b1 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-t3 uppercase tracking-wider mb-3">
                <TrendingUp size={12} />
                Total
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-t3">Recebido</span>
                  <span className="text-[15px] font-bold text-[#3dff7a]">
                    +{credits ? credits.total_earned.toLocaleString("pt-BR") : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-t3">Gasto</span>
                  <span className="text-[15px] font-bold text-t2">
                    -{credits ? credits.total_spent.toLocaleString("pt-BR") : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA: Comprar créditos */}
          {(subscription?.plan === "free" || (credits && credits.balance < 200)) && (
            <div
              className="rounded-2xl p-6 mb-7 flex items-center justify-between"
              style={{ background: "#0A0A0A", border: "1px solid #2a1f08" }}
            >
              <div>
                <h3 className="text-[16px] font-bold text-white mb-1">
                  {subscription?.plan === "free" ? "Faça upgrade e ganhe mais créditos" : "Saldo baixo"}
                </h3>
                <p className="text-[13px] text-t3">
                  Planos a partir de R$ 39/mês (anual) ou R$ 49/mês.
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-[#1a0e00] flex items-center gap-2 transition-all hover:-translate-y-px shrink-0 ml-4"
                style={{ background: "#FBBF24", boxShadow: "0 4px 20px #FBBF2440" }}
              >
                <Zap size={13} fill="currentColor" />
                Ver planos
              </Link>
            </div>
          )}

          {/* Custos por modelo (referência) */}
          <div className="bg-card border border-b1 rounded-2xl p-6 mb-7">
            <h2 className="text-[15px] font-bold text-white mb-4">Custo por geração (referência)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-t2 mb-2">
                  <ImageIcon size={13} className="text-y" /> Imagens
                </div>
                <ul className="text-[12px] text-t3 space-y-1">
                  <li>Nano Banana 2 (1K) — <span className="text-white font-medium">50 créditos</span></li>
                  <li>Nano Banana 2 (4K) / Flux Kontext — <span className="text-white font-medium">100</span></li>
                  <li>GPT Image 2 — <span className="text-white font-medium">100</span></li>
                  <li>Flux Pro 2 — <span className="text-white font-medium">125</span></li>
                  <li>Nano Banana Pro — <span className="text-white font-medium">325</span></li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-t2 mb-2">
                  <Video size={13} className="text-y" /> Vídeos (5s base)
                </div>
                <ul className="text-[12px] text-t3 space-y-1">
                  <li>Seedance 2 Fast — <span className="text-white font-medium">750 créditos</span></li>
                  <li>Veo 3 Fast (8s) / Kling 2.1 — <span className="text-white font-medium">1.000</span></li>
                  <li>Kling 3.0 / Seedance 2 — <span className="text-white font-medium">1.575-1.700</span></li>
                  <li>Kling 3.0 Pro — <span className="text-white font-medium">2.270</span></li>
                  <li>Veo 3 Quality (8s) — <span className="text-white font-medium">5.000</span></li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-t2 mb-2">
                  <Music size={13} className="text-y" /> Áudios
                </div>
                <ul className="text-[12px] text-t3 space-y-1">
                  <li>Suno V4 / V4.5 — <span className="text-white font-medium">125 créditos</span></li>
                  <li>Suno V4.5 Plus — <span className="text-white font-medium">175</span></li>
                  <li>Suno V5 / V5.5 — <span className="text-white font-medium">200</span></li>
                </ul>
              </div>
            </div>
            <p className="text-[11.5px] text-t4 mt-4 leading-relaxed">
              Vídeos mais longos custam proporcionalmente mais (10s = 2x). Resolução 4K aplica multiplicador de 1.5x.
              Múltiplas imagens (count {">"} 1) multiplicam o custo.
            </p>
          </div>

          {/* Histórico */}
          <div className="bg-card border border-b1 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-b1">
              <h2 className="text-[15px] font-bold text-white">Histórico de transações</h2>
              <span className="text-[12px] text-t3">{transactions.length} {transactions.length === 1 ? "registro" : "registros"}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-t3">
                <Loader2 size={16} className="animate-spin text-y" />
                Carregando...
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[13px] text-t3">Nenhuma transação ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1F1F1F]">
                {transactions.map((tx) => {
                  const meta = TX_ICON[tx.type] ?? TX_ICON.spend;
                  const Icon = meta.icon;
                  const isPositive = tx.amount > 0;
                  return (
                    <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div
                        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
                      >
                        <Icon size={15} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">{tx.description}</p>
                        <p className="text-[11.5px] text-t4">{timeAgo(tx.created_at)}</p>
                      </div>
                      <span
                        className={`text-[14px] font-bold tabular-nums ${
                          isPositive ? "text-[#3dff7a]" : "text-t2"
                        }`}
                      >
                        {isPositive ? "+" : ""}{tx.amount.toLocaleString("pt-BR")} créd
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
