"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, Zap, Crown, ArrowLeft, Coins, X, Image as ImageIcon, Video, Music,
} from "lucide-react";

// ─── PLANOS ──────────────────────────────────────────────────────────
const PLANS = [
  { id: "free",        name: "Free",      monthly: 0,   annual: 0,   credits: 200,    icon: Sparkles, color: "#888",    cta: "Começar grátis",   highlight: false, note: "para sempre" },
  { id: "premium",     name: "Premium",   monthly: 49,  annual: 39,  credits: 8000,   icon: Zap,      color: "#FBBF24", cta: "Assinar Premium",  highlight: true,  note: "/mês" },
  { id: "premiumplus", name: "Premium+",  monthly: 129, annual: 103, credits: 25000,  icon: Crown,    color: "#a78bfa", cta: "Assinar Premium+", highlight: false, note: "/mês" },
  { id: "pro",         name: "Pro",       monthly: 449, annual: 359, credits: 100000, icon: Crown,    color: "#3dff7a", cta: "Assinar Pro",      highlight: false, note: "/mês" },
];

// ─── TABELA DE MODELOS ───────────────────────────────────────────────
type AccessRow = {
  name: string;
  cost: string;
  badge?: "NOVO" | "POPULAR" | "PRO";
  free: number | "❌";
  premium: number | "❌";
  premiumplus: number | "❌";
  pro: number | "❌";
};

const calc = (creditsAvailable: number, costPerGen: number): number =>
  Math.floor(creditsAvailable / costPerGen);

const IMAGE_MODELS: AccessRow[] = [
  { name: "Nano Banana 2 (1K)",   cost: "50 créditos/imagem",   badge: "POPULAR", free: calc(200, 50),  premium: calc(8000, 50),  premiumplus: calc(25000, 50),  pro: calc(100000, 50) },
  { name: "Nano Banana 2 (4K)",   cost: "100 créditos/imagem",                    free: calc(200, 100), premium: calc(8000, 100), premiumplus: calc(25000, 100), pro: calc(100000, 100) },
  { name: "Flux Kontext (Pro)",   cost: "100 créditos/imagem",                    free: calc(200, 100), premium: calc(8000, 100), premiumplus: calc(25000, 100), pro: calc(100000, 100) },
  { name: "GPT Image 2",          cost: "100 créditos/imagem",                    free: "❌",          premium: calc(8000, 100), premiumplus: calc(25000, 100), pro: calc(100000, 100) },
  { name: "Flux Pro 2",           cost: "125 créditos/imagem",                    free: "❌",          premium: calc(8000, 125), premiumplus: calc(25000, 125), pro: calc(100000, 125) },
  { name: "Flux Kontext Max",     cost: "200 créditos/imagem",                    free: "❌",          premium: calc(8000, 200), premiumplus: calc(25000, 200), pro: calc(100000, 200) },
  { name: "Nano Banana Pro (4K)", cost: "325 créditos/imagem", badge: "NOVO",     free: "❌",          premium: calc(8000, 325), premiumplus: calc(25000, 325), pro: calc(100000, 325) },
];

const VIDEO_MODELS: AccessRow[] = [
  { name: "Seedance 2 Fast 720p",         cost: "750 créditos/5s",     badge: "POPULAR", free: "❌", premium: calc(8000, 750),  premiumplus: calc(25000, 750),  pro: calc(100000, 750) },
  { name: "Veo 3 Fast (8s + áudio)",      cost: "1.000 créditos/vídeo",                  free: "❌", premium: calc(8000, 1000), premiumplus: calc(25000, 1000), pro: calc(100000, 1000) },
  { name: "Kling 2.1 (i2v)",              cost: "1.000 créditos/5s",                     free: "❌", premium: calc(8000, 1000), premiumplus: calc(25000, 1000), pro: calc(100000, 1000) },
  { name: "Kling 3.0 Std 720p",           cost: "1.575 créditos/5s",                     free: "❌", premium: "❌",            premiumplus: calc(25000, 1575), pro: calc(100000, 1575) },
  { name: "Seedance 2 720p (i2v)",        cost: "1.700 créditos/5s",                     free: "❌", premium: "❌",            premiumplus: calc(25000, 1700), pro: calc(100000, 1700) },
  { name: "Kling 3.0 Pro 1080p",          cost: "2.270 créditos/5s",   badge: "PRO",     free: "❌", premium: "❌",            premiumplus: "❌",             pro: calc(100000, 2270) },
  { name: "Veo 3 Quality (8s 4K + áudio)",cost: "5.000 créditos/vídeo",badge: "PRO",     free: "❌", premium: "❌",            premiumplus: "❌",             pro: calc(100000, 5000) },
];

const AUDIO_MODELS: AccessRow[] = [
  { name: "Suno V4 / V4.5",   cost: "125 créditos/música",                free: calc(200, 125), premium: calc(8000, 125), premiumplus: calc(25000, 125), pro: calc(100000, 125) },
  { name: "Suno V4.5 Plus",   cost: "175 créditos/música",                free: "❌",          premium: calc(8000, 175), premiumplus: calc(25000, 175), pro: calc(100000, 175) },
  { name: "Suno V5 / V5.5",   cost: "200 créditos/música", badge: "NOVO", free: "❌",          premium: "❌",            premiumplus: calc(25000, 200), pro: calc(100000, 200) },
];

// ─── PÁGINA ──────────────────────────────────────────────────────────
export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-bg text-t1">
      <nav className="border-b border-b1 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-t2 hover:text-white text-[13.5px]">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <div className="flex-1" />
        <Link href="/login" className="text-[13.5px] text-t2 hover:text-white">Entrar</Link>
      </nav>

      <main className="max-w-[1280px] mx-auto px-6 py-12">
        <header className="text-center mb-10">
          <h1 className="text-[40px] font-bold tracking-tight mb-3">
            Compare os planos: <span className="text-y">vídeo, imagem e áudio com IA</span>
          </h1>
          <p className="text-t2 text-[15px] max-w-[640px] mx-auto">
            Tudo o que você precisa para criar — em um só lugar. Sem watermark a partir do Premium.
          </p>
        </header>

        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex bg-card border border-b1 rounded-[10px] p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-[7px] text-[13px] font-medium transition-all ${billing === "monthly" ? "bg-white text-bg" : "text-t2 hover:text-white"}`}
            >Mensal</button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-[7px] text-[13px] font-medium transition-all ${billing === "annual" ? "bg-white text-bg" : "text-t2 hover:text-white"}`}
            >Anual</button>
          </div>
          <span className="text-[12.5px] text-t3">Economize 20% com o plano anual</span>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = billing === "annual" ? plan.annual : plan.monthly;
            const yearlyTotal = billing === "annual" && plan.annual > 0 ? plan.annual * 12 : null;
            return (
              <div key={plan.id} className={`relative rounded-[14px] border p-5 flex flex-col ${plan.highlight ? "border-y bg-[#1a1208]" : "border-b1 bg-card"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10.5px] font-bold tracking-wide bg-y text-[#1a0e00]">
                    MAIS POPULAR
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${plan.color}20` }}>
                    <Icon size={16} style={{ color: plan.color }} />
                  </div>
                  <span className="text-[15px] font-bold">{plan.name}</span>
                </div>
                <div className="mb-3">
                  <span className="text-[28px] font-bold">R$ {price.toLocaleString("pt-BR")}</span>
                  <span className="text-[13px] text-t3 ml-1">{plan.note}</span>
                  {yearlyTotal !== null && (
                    <div className="text-[11.5px] text-t3 mt-0.5">R$ {yearlyTotal.toLocaleString("pt-BR")} cobrado anualmente</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-t2 mb-4">
                  <Coins size={13} className="text-y" />
                  <span className="font-bold text-white">{plan.credits.toLocaleString("pt-BR")}</span>&nbsp;créditos/mês
                </div>
                <Link
                  href={plan.id === "free" ? "/login" : `/login?plan=${plan.id}`}
                  className={`w-full text-center py-2.5 rounded-[9px] text-[13px] font-bold transition-all ${plan.highlight ? "bg-y text-[#1a0e00] hover:bg-[#FCD34D]" : "bg-card2 border border-b2 text-white hover:border-b1"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <ComparisonTable title="Imagem com IA" icon={ImageIcon} rows={IMAGE_MODELS} />
        <ComparisonTable title="Vídeo com IA"  icon={Video}     rows={VIDEO_MODELS} />
        <ComparisonTable title="Áudio com IA"  icon={Music}     rows={AUDIO_MODELS} />

        <div className="mt-10 text-center text-[12.5px] text-t3 max-w-[720px] mx-auto leading-relaxed">
          Os números mostram quantas gerações cabem em cada plano se você usar 100% dos créditos só naquele modelo.
          Você pode misturar à vontade — os créditos são compartilhados entre imagem, vídeo e áudio.
        </div>
      </main>
    </div>
  );
}

function ComparisonTable({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: AccessRow[] }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-3 text-[15px] font-bold">
        <Icon size={16} className="text-y" />
        {title}
      </div>
      <div className="border border-b1 rounded-[12px] overflow-hidden bg-card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-[12px] font-semibold text-t3 bg-card2 border-b border-b1">
          <div className="px-4 py-3">Modelo</div>
          <div className="px-3 py-3 text-center">Free</div>
          <div className="px-3 py-3 text-center">Premium</div>
          <div className="px-3 py-3 text-center">Premium+</div>
          <div className="px-3 py-3 text-center">Pro</div>
        </div>
        {rows.map((row, i) => (
          <div key={row.name} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center text-[13px] ${i % 2 === 1 ? "bg-card2/50" : ""}`}>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 font-medium">
                <span>{row.name}</span>
                {row.badge && (
                  <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md tracking-wider ${
                    row.badge === "POPULAR" ? "bg-y/20 text-y" :
                    row.badge === "NOVO"    ? "bg-pink-500/20 text-pink-400" :
                                              "bg-purple-500/20 text-purple-400"
                  }`}>{row.badge}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11.5px] text-t3 mt-0.5">
                <Coins size={10} /> {row.cost}
              </div>
            </div>
            <Cell value={row.free} />
            <Cell value={row.premium} />
            <Cell value={row.premiumplus} />
            <Cell value={row.pro} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Cell({ value }: { value: number | "❌" }) {
  if (value === "❌") {
    return <div className="px-3 py-3 flex items-center justify-center text-t4"><X size={14} /></div>;
  }
  return <div className="px-3 py-3 text-center text-[13px] font-medium text-t1 tabular-nums">{value.toLocaleString("pt-BR")}</div>;
}
