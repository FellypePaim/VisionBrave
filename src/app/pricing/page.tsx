import Link from "next/link";
import { Check, Sparkles, Zap, Crown, ArrowLeft, Coins } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    credits: 50,
    icon: Sparkles,
    color: "#888",
    features: [
      "50 créditos por mês",
      "Imagens em até 2K",
      "Vídeos de até 5s (480p)",
      "Áudios de até 60s",
      "Galeria pessoal",
      "Marca d'água visível",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 49",
    period: "por mês",
    credits: 500,
    icon: Zap,
    color: "#FBBF24",
    features: [
      "500 créditos por mês",
      "Imagens em 4K (Flux Pro)",
      "Vídeos até 10s (1080p)",
      "Áudios completos (Suno V5.5)",
      "Sem marca d'água",
      "Suporte por e-mail",
    ],
    cta: "Assinar Starter",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 149",
    period: "por mês",
    credits: 2000,
    icon: Crown,
    color: "#a78bfa",
    features: [
      "2000 créditos por mês",
      "Todos os modelos premium (Veo 3, Kling 3.0)",
      "Vídeos até 15s (4K)",
      "Geração prioritária (fila rápida)",
      "Uso comercial garantido",
      "Suporte prioritário",
      "API access (em breve)",
    ],
    cta: "Assinar Pro",
    highlight: false,
  },
];

// Pacotes avulsos — sem assinatura, créditos não expiram
const CREDIT_PACKS = [
  { id: "pack-100",  vbc: 100,  price: "R$ 15",  perVbc: "R$ 0,15",  badge: null },
  { id: "pack-300",  vbc: 300,  price: "R$ 39",  perVbc: "R$ 0,13",  badge: "Popular" },
  { id: "pack-1000", vbc: 1000, price: "R$ 119", perVbc: "R$ 0,12",  badge: "Melhor valor" },
];

const FAQ = [
  {
    q: "O que é um crédito (VBC)?",
    a: "Crédito (VBC) é a moeda interna do VisionBrave. Cada geração custa um número de créditos baseado no modelo: imagem simples 2-4 VBC, vídeo curto 6-30 VBC, áudio 4-8 VBC. Veja a tabela completa em Cobrança.",
  },
  {
    q: "Qual a diferença entre assinatura e pacote avulso?",
    a: "Assinatura renova mensalmente — créditos do plano não acumulam. Pacote avulso é compra única, sem mensalidade, e os créditos comprados não expiram nunca.",
  },
  {
    q: "Como funciona a marca d'água?",
    a: "No plano Free, todas as gerações recebem uma marca d'água visível 'VisionBrave'. Em qualquer plano pago (Starter, Pro ou pacote avulso), suas criações ficam limpas, sem marca, prontas para uso comercial.",
  },
  {
    q: "Posso usar comercialmente?",
    a: "Sim, em qualquer plano pago você é dono das criações e pode usar comercialmente sem restrições. O plano Free permite uso pessoal e em testes; uso comercial recomenda assinar Starter ou comprar avulso.",
  },
  {
    q: "Como funciona o cancelamento?",
    a: "Você pode cancelar a qualquer momento. A assinatura permanece ativa até o fim do período pago, depois volta ao plano Free. Créditos avulsos não são afetados.",
  },
  {
    q: "Tem reembolso?",
    a: "Sim, garantia de 7 dias em assinaturas e pacotes. Se não gostar, devolvemos 100% sem perguntas.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1200px] mx-auto px-7 py-12">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-t3 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>

        <div className="text-center max-w-2xl mx-auto mb-14">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-y mb-5"
            style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
          >
            <Sparkles size={13} fill="currentColor" />
            Preços simples e transparentes
          </div>
          <h1 className="text-[48px] font-bold leading-[1.1] tracking-[-1.5px] text-white mb-5">
            Crie sem limites,<br />
            pague apenas pelo que <span className="text-y">usar</span>
          </h1>
          <p className="text-[16px] leading-[1.6] text-t3">
            Escolha o plano que se encaixa no seu fluxo. Pode mudar ou cancelar quando quiser.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className="rounded-[20px] p-7 relative"
                style={{
                  background: plan.highlight
                    ? "linear-gradient(180deg, #1a1408 0%, #0a0604 100%)"
                    : "#0A0A0A",
                  border: plan.highlight ? "1.5px solid #FBBF24" : "1px solid #1F1F1F",
                  boxShadow: plan.highlight ? "0 0 60px #FBBF2420" : undefined,
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-[#1a0e00]"
                    style={{ background: "#FBBF24" }}
                  >
                    MAIS POPULAR
                  </div>
                )}

                <div
                  className="w-11 h-11 rounded-[11px] flex items-center justify-center mb-5"
                  style={{
                    background: `${plan.color}15`,
                    border: `1px solid ${plan.color}30`,
                  }}
                >
                  <Icon size={20} style={{ color: plan.color }} />
                </div>

                <h2 className="text-[22px] font-bold text-white mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[36px] font-extrabold text-white tracking-tight">{plan.price}</span>
                  <span className="text-[13px] text-t3">/{plan.period}</span>
                </div>
                <p className="text-[13.5px] text-y font-semibold mb-6">
                  {plan.credits.toLocaleString("pt-BR")} créditos/mês
                </p>

                <ul className="flex flex-col gap-3 mb-8 min-h-[200px]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-[#c0c0c0]">
                      <Check size={14} className="text-y shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.id === "free" ? "/login" : `/dashboard/billing?plan=${plan.id}`}
                  className={`w-full block text-center py-3 rounded-[11px] text-[13.5px] font-bold transition-all ${
                    plan.highlight
                      ? "text-[#1a0e00] hover:-translate-y-px"
                      : "text-white border border-b2 hover:border-[#4a4a4a] hover:bg-[#1a1a1a]"
                  }`}
                  style={plan.highlight ? { background: "#FBBF24", boxShadow: "0 4px 20px #FBBF2440" } : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Pacotes avulsos */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-y mb-4"
              style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
            >
              <Coins size={13} />
              Pacotes avulsos
            </div>
            <h2 className="text-[26px] font-bold text-white tracking-tight mb-2">
              Sem assinatura? Compre só o que precisa
            </h2>
            <p className="text-[14px] text-t3">
              Créditos avulsos não expiram. Compre uma vez, use quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="rounded-[16px] p-6 relative"
                style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
              >
                {pack.badge && (
                  <div
                    className="absolute -top-2.5 left-5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-[#1a0e00]"
                    style={{ background: "#FBBF24" }}
                  >
                    {pack.badge.toUpperCase()}
                  </div>
                )}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[32px] font-extrabold text-y tracking-tight tabular-nums">
                    {pack.vbc.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[13px] text-y font-semibold">VBC</span>
                </div>
                <p className="text-[12.5px] text-t3 mb-4">{pack.perVbc} por crédito</p>
                <Link
                  href={`/dashboard/billing?pack=${pack.id}`}
                  className="w-full block text-center py-2.5 rounded-[10px] text-[13.5px] font-bold text-white border border-b2 hover:border-y hover:bg-[#1f1608] hover:text-y transition-colors"
                >
                  Comprar por {pack.price}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[28px] font-bold text-white text-center mb-10 tracking-tight">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-[14px] p-5 cursor-pointer"
                style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
              >
                <summary className="flex items-center justify-between text-[14.5px] font-semibold text-white list-none">
                  {item.q}
                  <span className="text-y transition-transform group-open:rotate-45 text-[18px] leading-none">+</span>
                </summary>
                <p className="text-[13.5px] text-t3 leading-[1.6] mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center mt-16 mb-8">
          <p className="text-[14px] text-t3 mb-4">
            Ainda tem dúvidas? <Link href="/" className="text-y hover:underline">Fale com a gente</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
