import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { Image, Video, Music, ChevronRight, Plus } from "lucide-react";

const tools = [
  {
    icon: Image,
    name: "Gerador de Imagens",
    desc: "Crie e transforme imagens com modelos de IA de próxima geração.",
    badge: "Popular",
    badgeNew: false,
    stat: "2.4M",
    href: "/dashboard/images",
    bg: "/hero/ai-image.png",
  },
  {
    icon: Video,
    name: "Gerador de Vídeos",
    desc: "Crie e edite vídeos de ponta a ponta com IA generativa.",
    badge: "Novo",
    badgeNew: true,
    stat: "840K",
    href: "/dashboard/videos",
    bg: "/hero/ai-video.png",
  },
  {
    icon: Music,
    name: "Gerador de Áudio",
    desc: "Adicione som, voz e trilha sonora ao seu projeto com IA.",
    badge: null,
    badgeNew: false,
    stat: "310K",
    href: "/dashboard/audio",
    bg: "/hero/ai-sound.png",
  },
];

const TYPE_COLOR: Record<string, string> = {
  image: "#FBBF24",
  video: "#3dff7a",
  audio: "#a78bfa",
};

const TYPE_LABEL_PT: Record<string, string> = {
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recent } = user
    ? await supabase
        .from("generations")
        .select("id, type, prompt, model, public_url, external_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const recentItems = recent ?? [];

  return (
    <>
      <Topbar title="Home" />
      <div className="flex-1 overflow-y-auto p-8">
        {/* Hero */}
        <div className="mb-9">
          <h1 className="text-[32px] font-extrabold text-white tracking-tight mb-1.5">
            {greeting()}, <span className="text-y">vamos criar!</span> ✦
          </h1>
          <p className="text-[14.5px] text-t3 mb-6">
            O que você gostaria de criar hoje com o VisionBrave?
          </p>
          <Link
            href="/dashboard/gallery"
            className="max-w-[720px] bg-card border border-b1 rounded-[13px] px-5 py-[15px] flex items-center gap-3.5 hover:border-b2 transition-colors"
          >
            <svg className="w-4 h-4 text-t3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-[14px] text-t4">Explorar minhas criações na galeria</span>
            <span className="text-[11.5px] text-t3 bg-card2 border border-b1 rounded-[6px] px-2 py-0.5">
              Ver tudo →
            </span>
          </Link>
        </div>

        {/* Tools */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white tracking-tight">Ferramentas</h2>
          <Link href="/dashboard/gallery" className="flex items-center gap-1 text-[13px] text-y font-medium cursor-pointer hover:text-y/80 transition-colors">
            Ver tudo <ChevronRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-9">
          {tools.map(({ icon: Icon, name, desc, badge, badgeNew, stat, href, bg }) => (
            <Link
              key={name}
              href={href}
              className="group bg-card border border-b1 rounded-2xl p-[22px] cursor-pointer relative overflow-hidden hover:border-[#FBBF2440] hover:-translate-y-0.5 transition-all block"
            >
              {/* Background image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bg}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-30 saturate-[.5] brightness-95 contrast-110 group-hover:opacity-50 group-hover:saturate-75 transition-all duration-500"
              />
              {/* Gold tint */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.04) 50%, transparent 100%)",
                }}
              />
              {/* Dark gradient overlay for readability */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.72) 55%, rgba(10,10,10,0.45) 100%)",
                }}
              />
              {/* Glow */}
              <div className="absolute -top-10 -right-10 w-[130px] h-[130px] rounded-full bg-[radial-gradient(circle,#FBBF2440,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative flex items-start justify-between mb-[18px]">
                <div className="w-[46px] h-[46px] bg-[#1a1408] border border-[#2a1f08] rounded-xl flex items-center justify-center">
                  <Icon size={21} className="text-y" />
                </div>
                {badge && (
                  <span
                    className={`text-[10.5px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full border ${
                      badgeNew
                        ? "bg-[#0d2218] text-[#3dff7a] border-[#1a3a28]"
                        : "bg-[#1f1608] text-y border-[#2a1f08]"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>

              <div className="relative text-base font-bold text-white mb-1.5 tracking-tight">{name}</div>
              <div className="relative text-[13px] text-t3 leading-[1.55]">{desc}</div>

              <div className="relative mt-[18px] pt-4 border-t border-b1 flex items-center justify-between">
                <span className="text-[12px] text-t3">
                  Mais de <span className="text-[#d0d0d0] font-semibold">{stat}</span> criações
                </span>
                <div className="w-[30px] h-[30px] bg-card2 rounded-[8px] flex items-center justify-center group-hover:bg-y transition-colors">
                  <ChevronRight size={13} className="text-t2 group-hover:text-[#1a0e00] transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white tracking-tight">Projetos Recentes</h2>
          <Link href="/dashboard/gallery" className="flex items-center gap-1 text-[13px] text-y font-medium cursor-pointer hover:text-y/80 transition-colors">
            Ver tudo <ChevronRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3.5">
          {recentItems.map((item) => {
            const color = TYPE_COLOR[item.type] ?? "#FBBF24";
            const url = item.public_url ?? item.external_url;
            return (
              <Link
                key={item.id}
                href={`/dashboard/gallery?id=${item.id}`}
                className="bg-card border border-b1 rounded-[14px] overflow-hidden cursor-pointer hover:border-[#FBBF2440] hover:-translate-y-0.5 transition-all block"
              >
                <div
                  className="h-[110px] flex items-center justify-center overflow-hidden"
                  style={{ background: `radial-gradient(ellipse at 50% 50%, ${color}33 0%, #050202 80%)` }}
                >
                  {item.type === "image" && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={item.prompt} className="w-full h-full object-cover" />
                  ) : item.type === "video" && url ? (
                    <video src={url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <div className="w-12 h-12 rounded-full opacity-60" style={{ background: color }} />
                  )}
                </div>
                <div className="px-3.5 py-3">
                  <div className="text-[13.5px] font-semibold text-white mb-1 truncate">{item.prompt || "Sem título"}</div>
                  <div className="text-[12px] text-t3 flex items-center gap-1.5">
                    {timeAgo(item.created_at)}
                    <span className="w-[3px] h-[3px] rounded-full bg-t4 inline-block" />
                    <span>{TYPE_LABEL_PT[item.type] ?? item.type}</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* New project */}
          <Link
            href="/dashboard/images"
            className="border-[1.5px] border-dashed border-b1 rounded-[14px] flex flex-col items-center justify-center gap-2.5 cursor-pointer min-h-[165px] group hover:border-[#FBBF2455] hover:bg-[#FBBF2408] transition-all"
          >
            <div className="w-[38px] h-[38px] bg-card border border-b1 rounded-full flex items-center justify-center group-hover:bg-[#1f1608] group-hover:border-y transition-all">
              <Plus size={16} className="text-t3 group-hover:text-y transition-colors" />
            </div>
            <span className="text-[13px] text-t3 group-hover:text-y transition-colors">Novo projeto</span>
          </Link>
        </div>
      </div>
    </>
  );
}
