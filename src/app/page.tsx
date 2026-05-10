import Link from "next/link";
import { FoxIcon } from "@/components/FoxIcon";
import { Image, Video, Music, Star, ChevronRight, Zap, CheckCircle, Globe } from "lucide-react";

const features = [
  {
    icon: Image,
    title: "Imagens",
    desc: "Gere imagens com IA ultra-detalhadas em qualquer estilo que imaginar.",
    link: "Explorar Imagens",
    href: "/dashboard/images",
    image: "/hero/ai-image.png",
    placeholder: "Imagens",
  },
  {
    icon: Video,
    title: "Vídeos",
    desc: "Crie vídeos cinematográficos a partir de texto ou imagens com IA.",
    link: "Explorar Vídeos",
    href: "/dashboard/videos",
    image: "/hero/ai-video.png",
    placeholder: "Videos",
  },
  {
    icon: Music,
    title: "Áudio",
    desc: "Componha trilhas, vozes e efeitos sonoros originais com IA.",
    link: "Explorar Áudio",
    href: "/dashboard/audio",
    image: "/hero/ai-sound.png",
    placeholder: "Audio",
  },
  {
    icon: Star,
    title: "Edição com IA",
    desc: "Edite, melhore e transforme com poderosas ferramentas de IA.",
    link: "Explorar Ferramentas",
    href: "/dashboard/images",
    image: "/hero/ai-edit.png",
    placeholder: "AI+Editing",
  },
];

const stats = [
  { value: "50K+", label: "Criadores Ativos" },
  { value: "1M+", label: "Criações com IA" },
  { value: "4.9/5", label: "Avaliação" },
  { value: "100+", label: "Países" },
];

const navLinks = [
  { label: "Recursos", href: "#features" },
  { label: "Casos de Uso", href: "#features" },
  { label: "Como Funciona", href: "#stats" },
  { label: "Preços", href: "/login" },
  { label: "Materiais", href: "#features" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto px-7 py-5">

        {/* Nav */}
        <nav
          className="flex items-center gap-4 px-5 py-3.5 rounded-[18px] mb-4"
          style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
        >
          <div className="flex items-center mr-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero/logo-no-bg.png" alt="VisionBrave" className="h-12 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-1 flex-1">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-4 py-2 text-[14px] font-medium text-t2 cursor-pointer rounded-[8px] hover:text-white hover:bg-white/5 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 text-[13.5px] font-semibold text-white border border-b2 rounded-[10px] hover:border-[#4a4a4a] hover:bg-white/5 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-[13.5px] font-bold text-[#1a0e00] rounded-[10px] transition-colors hover:bg-[#FCD34D]"
              style={{ background: "#FBBF24", boxShadow: "0 2px 16px #FBBF2440" }}
            >
              Começar a Criar
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section
          className="rounded-[22px] px-14 py-12 relative overflow-hidden mb-4"
          style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
        >
          <div className="grid gap-8 items-center relative" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            {/* Tiger image - bleeds into hero background */}
            <div
              className="relative -ml-14 -my-6"
              style={{
                aspectRatio: "16/10",
                maxWidth: 720,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero/cyber-tiger-fundo.png"
                alt="Cyberfang Tiger"
                className="w-full h-full object-cover saturate-[.95] contrast-105"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 12%, black 60%, rgba(0,0,0,0.55) 80%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, black 12%, black 60%, rgba(0,0,0,0.55) 80%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                }}
              />

              {/* Badge */}
              <div
                className="absolute bottom-4 left-4 flex items-center gap-2.5 px-3.5 py-2 rounded-[10px]"
                style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(10px)", border: "1px solid #ffffff10" }}
              >
                <FoxIcon size={24} />
                <div className="flex flex-col text-[11px] leading-[1.3]">
                  <span className="text-[#888]">
                    Gerado no <b className="text-y font-semibold">VisionBrave</b>
                  </span>
                  <span className="text-white font-semibold text-[11.5px]">Cyberfang Tiger</span>
                </div>
              </div>
            </div>

            {/* Right content */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium text-[#d4d4d4] mb-5"
                style={{ background: "#ffffff05", border: "1px solid #1F1F1F" }}
              >
                <Star size={13} className="text-y" fill="currentColor" />
                Estúdio Criativo com IA
              </div>

              <h1 className="text-[60px] font-bold leading-[1.05] tracking-[-2px] text-white mb-5">
                Crie Sem<br />
                Limites.<br />
                Movido por <span className="text-y">IA.</span>
              </h1>

              <p className="text-[16.5px] leading-[1.55] text-[#999] max-w-[520px] mb-7">
                VisionBrave é seu estúdio criativo com IA completo para gerar imagens, vídeos e áudio impressionantes. Liberte sua imaginação com ferramentas poderosas feitas para criadores.
              </p>

              <div className="flex items-center gap-3 mb-8">
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 px-7 py-4 rounded-[13px] text-[15.5px] font-bold text-[#1a0e00] transition-all hover:-translate-y-px"
                  style={{ background: "#FBBF24", boxShadow: "0 4px 28px #FBBF2440" }}
                >
                  Começar a Criar
                  <Star size={16} fill="currentColor" />
                </Link>
                <Link
                  href="#features"
                  className="flex items-center gap-3 px-7 py-4 rounded-[13px] text-[15.5px] font-semibold text-white border border-b2 bg-card hover:border-[#4a4a4a] hover:bg-[#1a1a1a] transition-colors"
                >
                  <span
                    className="w-7 h-7 rounded-full border-[1.5px] border-white flex items-center justify-center"
                    style={{ paddingLeft: 2 }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="white"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                  </span>
                  Ver Demo
                </Link>
              </div>

              <div className="flex items-center gap-7">
                {[
                  { icon: CheckCircle, title: "Sem Cartão de Crédito", sub: "Comece gratuitamente" },
                  { icon: Zap, title: "Ultrarrápido", sub: "Gere em segundos" },
                  { icon: Globe, title: "Uso Comercial", sub: "Suas criações, seus direitos" },
                ].map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ background: "#1a1408", border: "1px solid #2a1f08" }}
                    >
                      <Icon size={16} className="text-y" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-white">{title}</div>
                      <div className="text-[12px] text-[#666]">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {features.map(({ icon: Icon, title, desc, link, href, image, placeholder }) => (
            <Link
              key={title}
              href={href}
              className="group rounded-[18px] p-5 pb-0 flex flex-col min-h-[260px] overflow-hidden cursor-pointer hover:border-[#FBBF2440] hover:bg-[#0F0B05] hover:-translate-y-0.5 transition-all"
              style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
            >
              <div
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-4"
                style={{ background: "#1a1408", border: "1px solid #2a1f08" }}
              >
                <Icon size={18} className="text-y" />
              </div>
              <h3 className="text-[18px] font-bold text-white mb-2 tracking-tight">{title}</h3>
              <p className="text-[13px] leading-[1.5] text-[#777] mb-4 max-w-[200px]">{desc}</p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-y mb-4 group-hover:gap-3 transition-all">
                {link} <ChevronRight size={12} />
              </span>
              <div className="mt-auto -mx-5 h-[120px] overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover saturate-[.55] brightness-90 contrast-110 group-hover:saturate-75 group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                />
                {/* Gold tint + vignette */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity group-hover:opacity-40"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.06) 50%, transparent 100%), linear-gradient(180deg, rgba(10,10,10,0.55) 0%, transparent 40%)",
                    opacity: 0.85,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Stats bar */}
        <div
          id="stats"
          className="flex items-center gap-7 px-7 py-5 rounded-[18px]"
          style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
        >
          <div className="flex items-center gap-3.5 pr-7 border-r border-b1">
            <div className="flex -space-x-2.5">
              {["#d4a574,#8b5e3c", "#f4c2a5,#c08866", "#a08070,#604030", "#e8b890,#a87858"].map((g, i) => (
                <div
                  key={i}
                  className="w-[30px] h-[30px] rounded-full border-2 border-[#050505]"
                  style={{ background: `linear-gradient(135deg, ${g})` }}
                />
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 text-y text-sm">{"★★★★★"}</div>
              <div className="text-[12.5px] text-[#999] leading-[1.35]">
                Confiado por +50.000 criadores<br />no mundo
              </div>
            </div>
          </div>

          {stats.map(({ value, label }) => (
            <div key={label} className="flex-1 text-center">
              <div className="text-[22px] font-extrabold text-y tracking-tight mb-0.5">{value}</div>
              <div className="text-[12.5px] text-[#888]">{label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
