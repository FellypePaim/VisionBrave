"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import {
  Image as ImageIcon, Video, Music, Sparkles, ArrowUpRight,
  Search, Layers,
} from "lucide-react";

type Category = "all" | "image" | "video" | "audio";

interface Template {
  id: string;
  category: "image" | "video" | "audio";
  title: string;
  prompt: string;
  tags: string[];
  emoji: string;
  bgGradient: string;
}

const TEMPLATES: Template[] = [
  // ─── Imagens ───
  {
    id: "img-1",
    category: "image",
    title: "Retrato cinematográfico",
    prompt: "Cinematic portrait of a person, dramatic side lighting, shallow depth of field, film grain, moody atmosphere, 85mm lens, professional photography",
    tags: ["Cinematográfico", "Retrato", "Profissional"],
    emoji: "🎬",
    bgGradient: "linear-gradient(135deg, #2a1510, #100504)",
  },
  {
    id: "img-2",
    category: "image",
    title: "Animal cyberpunk neon",
    prompt: "Cyberpunk robotic animal with glowing neon orange and blue accents, dark futuristic background with rain, hyper-detailed, 4k, cinematic",
    tags: ["Cyberpunk", "Neon", "Animal"],
    emoji: "🐺",
    bgGradient: "linear-gradient(135deg, #1a1410, #0a0a18)",
  },
  {
    id: "img-3",
    category: "image",
    title: "Paisagem fantasia épica",
    prompt: "Epic fantasy landscape, towering mountains, glowing sunset, mystical floating islands, painterly style, ultra-detailed, cinematic composition",
    tags: ["Fantasia", "Paisagem", "Épico"],
    emoji: "🏔️",
    bgGradient: "linear-gradient(135deg, #1a0808, #0a1a18)",
  },
  {
    id: "img-4",
    category: "image",
    title: "Produto minimalista",
    prompt: "Minimalist product photography, white seamless background, soft studio lighting, professional commercial style, sharp focus, clean composition",
    tags: ["Produto", "Minimalista", "E-commerce"],
    emoji: "📦",
    bgGradient: "linear-gradient(135deg, #f0f0f0, #ffffff)",
  },
  {
    id: "img-5",
    category: "image",
    title: "Anime estilizado",
    prompt: "Anime style illustration, vibrant colors, dynamic composition, expressive character, detailed background, cel-shaded, studio quality",
    tags: ["Anime", "Ilustração", "Personagem"],
    emoji: "🎨",
    bgGradient: "linear-gradient(135deg, #fbb6ce, #c084fc)",
  },
  {
    id: "img-6",
    category: "image",
    title: "Comida apetitosa",
    prompt: "Mouth-watering food photography, top-down or 45-degree angle, natural light, fresh ingredients, restaurant-quality plating, shallow depth of field",
    tags: ["Comida", "Fotografia", "Marketing"],
    emoji: "🍝",
    bgGradient: "linear-gradient(135deg, #f97316, #fbbf24)",
  },
  {
    id: "img-7",
    category: "image",
    title: "Arte abstrata digital",
    prompt: "Abstract digital art, fluid shapes, vibrant gradient colors, geometric patterns, modern composition, gallery quality, 4k resolution",
    tags: ["Abstrato", "Arte", "Moderno"],
    emoji: "🎭",
    bgGradient: "linear-gradient(135deg, #ec4899, #6366f1)",
  },
  {
    id: "img-8",
    category: "image",
    title: "Logotipo profissional",
    prompt: "Professional minimalist logo design, clean lines, vector style, monochromatic with single accent color, scalable, brand identity",
    tags: ["Logo", "Marca", "Design"],
    emoji: "✨",
    bgGradient: "linear-gradient(135deg, #1a1a1a, #FBBF24)",
  },

  // ─── Vídeos ───
  {
    id: "vid-1",
    category: "video",
    title: "Drone aéreo dramático",
    prompt: "Cinematic aerial drone shot flying over dramatic landscape, smooth camera movement, golden hour lighting, epic scale, 4k cinematic",
    tags: ["Drone", "Aéreo", "Cinematográfico"],
    emoji: "🚁",
    bgGradient: "linear-gradient(135deg, #0a1a2a, #1a0a05)",
  },
  {
    id: "vid-2",
    category: "video",
    title: "Câmera rotativa em produto",
    prompt: "Smooth 360-degree rotating camera around a product on white pedestal, studio lighting, commercial quality, slow motion, professional",
    tags: ["Produto", "E-commerce", "Comercial"],
    emoji: "💎",
    bgGradient: "linear-gradient(135deg, #ffffff, #cccccc)",
  },
  {
    id: "vid-3",
    category: "video",
    title: "Efeito hyperlapse urbano",
    prompt: "Urban hyperlapse through busy city streets, light trails, fast forward motion, neon signs, atmospheric, dynamic composition",
    tags: ["Urbano", "Hyperlapse", "Cidade"],
    emoji: "🌃",
    bgGradient: "linear-gradient(135deg, #4a1a4a, #1a0a3a)",
  },
  {
    id: "vid-4",
    category: "video",
    title: "Animação de personagem",
    prompt: "Animated character performing action, smooth motion, detailed expressions, dynamic pose, cinematic camera angle, professional animation quality",
    tags: ["Animação", "Personagem", "Ação"],
    emoji: "🦸",
    bgGradient: "linear-gradient(135deg, #f97316, #ec4899)",
  },
  {
    id: "vid-5",
    category: "video",
    title: "Natureza em câmera lenta",
    prompt: "Slow motion nature footage, water droplets, leaves moving in wind, golden sunlight through trees, peaceful atmosphere, ultra-smooth",
    tags: ["Natureza", "Slow Motion", "Calmo"],
    emoji: "🌿",
    bgGradient: "linear-gradient(135deg, #166534, #84cc16)",
  },
  {
    id: "vid-6",
    category: "video",
    title: "Transição estilizada",
    prompt: "Stylized creative transition effect, smooth morphing between scenes, dynamic motion graphics, vibrant colors, modern visual style",
    tags: ["Transição", "Motion", "Criativo"],
    emoji: "🌀",
    bgGradient: "linear-gradient(135deg, #6366f1, #ec4899)",
  },

  // ─── Áudios ───
  {
    id: "aud-1",
    category: "audio",
    title: "Lo-fi para estudar",
    prompt: "Chill lo-fi hip hop instrumental, mellow piano, soft drums, vinyl crackle, perfect for studying or relaxing, calm and focused",
    tags: ["Lo-fi", "Estudo", "Relax"],
    emoji: "🎧",
    bgGradient: "linear-gradient(135deg, #fbb6ce, #a78bfa)",
  },
  {
    id: "aud-2",
    category: "audio",
    title: "Trilha cinematográfica épica",
    prompt: "Epic cinematic orchestral soundtrack, building tension, full orchestra with choir, powerful drums, hero moment, movie trailer style",
    tags: ["Cinematográfico", "Épico", "Orquestral"],
    emoji: "🎼",
    bgGradient: "linear-gradient(135deg, #1a1a3a, #4a1a4a)",
  },
  {
    id: "aud-3",
    category: "audio",
    title: "Pop dance contagiante",
    prompt: "Upbeat pop dance track, catchy melody, danceable beat, modern production, summer vibes, radio-ready, energetic and uplifting",
    tags: ["Pop", "Dance", "Animado"],
    emoji: "🕺",
    bgGradient: "linear-gradient(135deg, #f97316, #ec4899)",
  },
  {
    id: "aud-4",
    category: "audio",
    title: "Ambient para meditação",
    prompt: "Peaceful ambient soundscape, gentle synthesizer pads, nature sounds, deep relaxation, meditation, calm and soothing, healing frequency",
    tags: ["Ambient", "Meditação", "Calmo"],
    emoji: "🧘",
    bgGradient: "linear-gradient(135deg, #166534, #0a4a4a)",
  },
  {
    id: "aud-5",
    category: "audio",
    title: "Rock anos 80",
    prompt: "Classic 80s rock track, electric guitars, powerful drums, anthemic chorus, nostalgic vibes, radio rock, energetic and timeless",
    tags: ["Rock", "Retrô", "Anos 80"],
    emoji: "🎸",
    bgGradient: "linear-gradient(135deg, #4a1a1a, #1a1a4a)",
  },
  {
    id: "aud-6",
    category: "audio",
    title: "Jazz suave noturno",
    prompt: "Smooth late-night jazz, soft saxophone, walking bass line, brushed drums, dimly lit lounge atmosphere, sophisticated and relaxed",
    tags: ["Jazz", "Noturno", "Sofisticado"],
    emoji: "🎷",
    bgGradient: "linear-gradient(135deg, #1a0a2a, #4a1a1a)",
  },
];

const CAT_LABELS: Record<Category, { label: string; icon: React.ElementType }> = {
  all:   { label: "Todos",   icon: Layers },
  image: { label: "Imagens", icon: ImageIcon },
  video: { label: "Vídeos",  icon: Video },
  audio: { label: "Áudios",  icon: Music },
};

const CATEGORY_HREF: Record<string, string> = {
  image: "/dashboard/images",
  video: "/dashboard/videos",
  audio: "/dashboard/audio",
};

export default function TemplatesPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let items = TEMPLATES;
    if (category !== "all") items = items.filter((t) => t.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.prompt.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [category, search]);

  function applyTemplate(t: Template) {
    // Persiste o prompt no sessionStorage; a página de geração lê e auto-preenche
    sessionStorage.setItem("template:prompt", t.prompt);
    window.location.href = CATEGORY_HREF[t.category];
  }

  return (
    <>
      <Topbar title="Templates e Presets" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-y mb-2">
              <Sparkles size={13} fill="currentColor" />
              {TEMPLATES.length} templates curados
            </div>
            <h1 className="text-[28px] font-bold text-white tracking-tight mb-2">
              Comece com um template
            </h1>
            <p className="text-[14.5px] text-t3">
              Prompts prontos e otimizados. Clique para usar e personalize na hora de gerar.
            </p>
          </div>

          {/* Tabs + Search */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex gap-1 bg-card border border-b1 rounded-xl p-1 w-fit">
              {(Object.keys(CAT_LABELS) as Category[]).map((c) => {
                const Icon = CAT_LABELS[c].icon;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[12.5px] font-semibold transition-all ${
                      category === c ? "bg-y text-[#1a0e00]" : "text-t2 hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {CAT_LABELS[c].label}
                  </button>
                );
              })}
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar templates..."
                className="w-full bg-card border border-b1 rounded-[10px] pl-10 pr-4 py-2 text-[13px] text-white placeholder-t4 outline-none focus:border-b2 transition-colors"
              />
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-t3">Nenhum template encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="group bg-card border border-b1 rounded-2xl overflow-hidden text-left hover:border-[#FBBF2440] hover:-translate-y-0.5 transition-all"
                >
                  {/* Visual */}
                  <div
                    className="h-[140px] flex items-center justify-center text-[60px] relative overflow-hidden"
                    style={{ background: t.bgGradient }}
                  >
                    <span
                      className="filter drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                      style={{ transform: "translateZ(0)" }}
                    >
                      {t.emoji}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-y flex items-center gap-1.5">
                        {t.category === "image" && <ImageIcon size={11} />}
                        {t.category === "video" && <Video size={11} />}
                        {t.category === "audio" && <Music size={11} />}
                        {t.category === "image" ? "Imagem" : t.category === "video" ? "Vídeo" : "Áudio"}
                      </span>
                      <ArrowUpRight size={14} className="text-t4 group-hover:text-y transition-colors" />
                    </div>
                    <h3 className="text-[15px] font-bold text-white mb-2 tracking-tight">{t.title}</h3>
                    <p className="text-[12px] text-t3 leading-[1.5] mb-3 line-clamp-2">
                      {t.prompt}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10.5px] px-2 py-0.5 rounded-full bg-card2 text-t3 border border-b1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Hint */}
          <div className="mt-10 flex items-center justify-center gap-2 text-[12px] text-t4">
            <Link href="/dashboard" className="hover:text-y transition-colors">
              ← Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
