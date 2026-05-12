"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Camera, Download, RefreshCw, Maximize2, Layers,
  Loader2, AlertCircle, ImagePlus, X, ChevronDown, ChevronUp, Pencil, Languages, Lock,
} from "lucide-react";
import { calculateCost, isModelAllowedForPlan, PLAN_MODEL_ACCESS } from "@/lib/credits";

// ─── Opções dos campos guiados ──────────────────────────────────────────────

const PORTRAIT_TYPES = [
  { id: "feminino",  label: "Feminina",  emoji: "👩" },
  { id: "masculino", label: "Masculino", emoji: "👨" },
  { id: "casal",     label: "Casal",     emoji: "👫" },
  { id: "grupo",     label: "Grupo",     emoji: "👥" },
];

const SHOOT_STYLES = [
  "Editorial Fashion",
  "Alta Costura",
  "Comercial",
  "Lifestyle",
  "Street Fashion",
  "Retrato Artístico",
];

const SETTINGS = [
  { id: "studio-white",  label: "Estúdio Branco" },
  { id: "studio-black",  label: "Estúdio Preto" },
  { id: "urban",         label: "Urbano" },
  { id: "nature",        label: "Natureza" },
  { id: "interior",      label: "Interior Elegante" },
  { id: "rooftop",       label: "Rooftop" },
];

const LIGHTINGS = [
  { id: "natural",    label: "Natural Suave" },
  { id: "studio",     label: "Estúdio Pro" },
  { id: "golden",     label: "Golden Hour" },
  { id: "dramatic",   label: "Dramática" },
  { id: "highkey",    label: "High-Key" },
  { id: "neon",       label: "Neon" },
];

const FRAMINGS = [
  { id: "closeup",   label: "Close-up" },
  { id: "halfbody",  label: "Meio Corpo" },
  { id: "fullbody",  label: "Corpo Inteiro" },
  { id: "wide",      label: "Composição Ampla" },
];

// Modelos melhores para fotorrealismo
const PORTRAIT_MODELS = ["Flux Pro", "Nano Banana", "Nano Banana Pro"];

const MODEL_RESOLUTIONS: Record<string, Array<"1K" | "2K" | "4K">> = {
  "Flux Pro":         ["1K", "2K"],
  "Nano Banana":      ["1K", "2K", "4K"],
  "Nano Banana Pro":  ["1K", "2K", "4K"],
};

// ─── Composição do prompt ───────────────────────────────────────────────────

function buildPortraitPrompt(fields: {
  type: string;
  style: string;
  outfit: string;
  setting: string;
  lighting: string;
  framing: string;
}): string {
  const parts: string[] = [];

  // Estilo fotográfico
  const styleMap: Record<string, string> = {
    "Editorial Fashion":  "high-fashion editorial photography",
    "Alta Costura":       "haute couture fashion photography",
    "Comercial":          "commercial product photography",
    "Lifestyle":          "lifestyle photography",
    "Street Fashion":     "street fashion photography",
    "Retrato Artístico":  "fine art portrait photography",
  };
  parts.push(styleMap[fields.style] ?? "professional photography");

  // Sujeito
  const typeMap: Record<string, string> = {
    "feminino":  "of a beautiful female model",
    "masculino": "of a handsome male model",
    "casal":     "of an elegant couple",
    "grupo":     "of stylish models",
  };
  parts.push(typeMap[fields.type] ?? "of a model");

  // Vestuário
  if (fields.outfit.trim()) {
    parts.push(`wearing ${fields.outfit.trim()}`);
  }

  // Cenário
  const settingMap: Record<string, string> = {
    "studio-white": "in a clean white photography studio",
    "studio-black": "in a dramatic black studio",
    "urban":        "in an urban city street environment",
    "nature":       "in a natural outdoor setting",
    "interior":     "in a luxurious elegant interior",
    "rooftop":      "on a rooftop with city skyline backdrop",
  };
  if (fields.setting) parts.push(settingMap[fields.setting]);

  // Iluminação
  const lightingMap: Record<string, string> = {
    "natural":   "soft natural lighting",
    "studio":    "professional studio lighting, Rembrandt lighting",
    "golden":    "beautiful golden hour warm sunlight",
    "dramatic":  "dramatic low-key lighting, deep shadows",
    "highkey":   "clean high-key lighting, minimal shadows",
    "neon":      "vibrant neon colored lighting",
  };
  if (fields.lighting) parts.push(lightingMap[fields.lighting]);

  // Enquadramento
  const framingMap: Record<string, string> = {
    "closeup":   "close-up portrait",
    "halfbody":  "half-body shot",
    "fullbody":  "full-body shot",
    "wide":      "wide environmental shot",
  };
  if (fields.framing) parts.push(framingMap[fields.framing]);

  // Tags de qualidade
  parts.push(
    "photorealistic, ultra-detailed, sharp focus, professional camera, bokeh background, high resolution"
  );

  return parts.join(", ");
}

// Retorna o nome do plano mínimo para acessar um modelo
function minPlanFor(model: string): string {
  if (PLAN_MODEL_ACCESS.free.includes(model)) return "Free";
  if (PLAN_MODEL_ACCESS.premium.includes(model)) return "Premium";
  if (PLAN_MODEL_ACCESS.premiumplus.includes(model)) return "Premium+";
  return "Pro";
}

// ─── Interfaces ────────────────────────────────────────────────────────────

interface GeneratedImage {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  imageUrl?: string;
  error?: string;
}

async function uploadReferenceFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload/reference", { method: "POST", body: form });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

// ─── Componente auxiliar: botão de opção ───────────────────────────────────

function OptionBtn({
  active, onClick, children, className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`border rounded-[8px] transition-all text-[12px] font-medium ${
        active
          ? "bg-[#1f1608] border-y text-y"
          : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

export default function PortraitPage() {
  // Campos guiados
  const [portraitType, setPortraitType]   = useState("feminino");
  const [shootStyle, setShootStyle]       = useState("Editorial Fashion");
  const [outfit, setOutfit]               = useState("");
  const [setting, setSetting]             = useState("studio-white");
  const [lighting, setLighting]           = useState("studio");
  const [framing, setFraming]             = useState("fullbody");

  // Configurações de geração
  const [activeModel, setActiveModel]     = useState("Flux Pro");
  const [resolution, setResolution]       = useState<"1K" | "2K" | "4K">("1K");
  const [activeCount, setActiveCount]     = useState(1);

  // Tradução automática do vestuário (PT → EN, debounced)
  const [outfitEn, setOutfitEn]           = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Referência de aparência (opcional)
  const [refImageUrl, setRefImageUrl]     = useState<string | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const refFileRef = useRef<HTMLInputElement>(null);

  // Estado de geração
  const [images, setImages]               = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [toast, setToast]                 = useState<string | null>(null);

  // Prompt editável (auto-gerado ou editado manualmente)
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Plano do usuário para UI lock de modelos
  const [userPlan, setUserPlan] = useState<string>("free");

  const pollingRef = useRef<NodeJS.Timeout[]>([]);
  const promptRef  = useRef("");
  const modelRef   = useRef(activeModel);
  modelRef.current = activeModel;

  useEffect(() => {
    return () => { pollingRef.current.forEach(clearInterval); pollingRef.current = []; };
  }, []);

  // Busca plano do usuário; auto-troca para Nano Banana se modelo padrão for locked
  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        const plan: string = d?.subscription?.plan ?? "free";
        setUserPlan(plan);
        // Se o modelo padrão (Flux Pro) não for permitido no plano, troca para Nano Banana
        if (!isModelAllowedForPlan(plan, activeModel)) {
          const first = PORTRAIT_MODELS.find((m) => isModelAllowedForPlan(plan, m));
          if (first) setActiveModel(first);
        }
      })
      .catch(() => {/* mantém "free" como fallback seguro */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tradução automática do vestuário: debounce 600ms após o user parar de digitar
  useEffect(() => {
    if (!outfit.trim()) { setOutfitEn(""); return; }
    setIsTranslating(true);
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: outfit }),
        });
        const data = await res.json();
        setOutfitEn(data.translated ?? outfit);
      } catch {
        setOutfitEn(outfit); // fallback silencioso
      } finally {
        setIsTranslating(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [outfit]);

  // Prompt composto (campos → string) — usa versão em inglês do vestuário
  const composedPrompt = useMemo(
    () => buildPortraitPrompt({ type: portraitType, style: shootStyle, outfit: outfitEn || outfit, setting, lighting, framing }),
    [portraitType, shootStyle, outfit, outfitEn, setting, lighting, framing]
  );

  // Quando os campos mudam e o user não editou manualmente, limpa o override
  useEffect(() => { setPromptOverride(null); }, [portraitType, shootStyle, outfit, outfitEn, setting, lighting, framing]);

  const activePrompt = promptOverride ?? composedPrompt;
  promptRef.current  = activePrompt;

  // Custo
  const generationCost = useMemo(
    () => calculateCost(activeModel, { count: activeCount, resolution }),
    [activeModel, activeCount, resolution]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Upload de referência
  async function handleRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRef(true);
    try {
      const url = await uploadReferenceFile(file);
      if (url) setRefImageUrl(url);
      else showToast("Falha no upload — tente novamente");
    } finally {
      setIsUploadingRef(false);
      if (e.target) e.target.value = "";
    }
  }

  // Polling
  const pollTask = useCallback((taskId: string, index: number) => {
    let ticks = 0;
    const MAX_TICKS = 60;
    const interval = setInterval(async () => {
      if (++ticks > MAX_TICKS) {
        clearInterval(interval);
        setImages((prev) => prev.map((img, i) =>
          i === index ? { ...img, state: "fail", error: "Tempo limite excedido" } : img
        ));
        return;
      }
      try {
        const res  = await fetch(`/api/generate/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (data.state === "success") {
          clearInterval(interval);
          setImages((prev) => prev.map((img, i) =>
            i === index ? { ...img, state: "success", imageUrl: data.imageUrl } : img
          ));
          if (data.imageUrl) {
            fetch("/api/gallery/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "image", prompt: promptRef.current,
                model: modelRef.current, externalUrl: data.imageUrl,
              }),
            }).catch((e) => console.error("[gallery/save]", e));
          }
        } else if (data.state === "fail") {
          clearInterval(interval);
          setImages((prev) => prev.map((img, i) =>
            i === index ? { ...img, state: "fail", error: data.error } : img
          ));
        } else {
          setImages((prev) => prev.map((img, i) =>
            i === index ? { ...img, state: data.state } : img
          ));
        }
      } catch {
        clearInterval(interval);
        setImages((prev) => prev.map((img, i) =>
          i === index ? { ...img, state: "fail", error: "Erro de rede" } : img
        ));
      }
    }, 3000);
    pollingRef.current.push(interval);
  }, []);

  // Geração
  async function handleGenerate() {
    if (!activePrompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    pollingRef.current.forEach(clearInterval);
    pollingRef.current = [];

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activePrompt,
          model: activeModel,
          count: activeCount,
          resolution,
          aspectRatio: "2:3",   // Proporção retrato (padrão para ensaios)
          referenceImages:
            activeModel === "Nano Banana" && refImageUrl ? [refImageUrl] : undefined,
          inputImage:
            activeModel === "Flux Pro" && refImageUrl ? refImageUrl : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskIds) {
        setError(data.error ?? "Falha ao iniciar geração");
        return;
      }

      const initial: GeneratedImage[] = data.taskIds.map((taskId: string) => ({
        taskId, state: "waiting" as const,
      }));
      setImages(initial);
      initial.forEach((img, i) => pollTask(img.taskId, i));
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  const pendingCount = images.filter((i) => ["waiting", "queuing", "generating"].includes(i.state)).length;
  const resOptions   = MODEL_RESOLUTIONS[activeModel] ?? ["1K", "2K", "4K"];

  return (
    <>
      <Topbar title="Ensaio Fotográfico" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[#1a1a1a] border border-white/10 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Centro: canvas ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-b1">

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-5 min-h-0">
            {images.length === 0 ? (
              <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                <div className="w-16 h-16 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                  <Camera size={28} className="text-t4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#d0d0d0] mb-1">Nenhuma foto ainda</p>
                  <p className="text-[13px] text-t3">Configure o ensaio e clique em Gerar</p>
                </div>
                {/* Prompt preview */}
                <div className="w-full bg-card border border-b1 rounded-xl p-3 text-left">
                  <p className="text-[10.5px] text-t4 mb-1 font-medium uppercase tracking-wide">Prompt gerado</p>
                  <p className="text-[11.5px] text-t3 leading-[1.5] line-clamp-3">{composedPrompt}</p>
                </div>
              </div>
            ) : (
              <div className={`grid gap-4 w-full max-w-3xl ${
                activeCount === 1 ? "grid-cols-1 max-w-sm"
                : activeCount === 2 ? "grid-cols-2"
                : activeCount === 3 ? "grid-cols-3"
                : "grid-cols-2"
              }`}>
                {images.map((img, i) => (
                  <div
                    key={img.taskId}
                    className="relative rounded-[18px] overflow-hidden border border-b1 bg-card"
                    style={{ aspectRatio: "2/3", boxShadow: "0 20px 60px #000000aa" }}
                  >
                    {img.state === "success" && img.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt={`Portrait ${i + 1}`} className="w-full h-full object-cover" />
                        <a
                          href={img.imageUrl} download target="_blank" rel="noopener noreferrer"
                          className="absolute top-3 right-3 w-8 h-8 bg-black/55 backdrop-blur-sm rounded-[9px] flex items-center justify-center z-10"
                        >
                          <Download size={14} className="text-white" />
                        </a>
                        <div className="absolute bottom-3.5 right-3.5 bg-y text-[#1a0e00] text-[11px] font-bold px-2 py-1 rounded-[6px]">
                          v{i + 1}
                        </div>
                      </>
                    ) : img.state === "fail" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400 p-4">
                        <AlertCircle size={28} />
                        <p className="text-[12px] text-center">{img.error ?? "Falhou"}</p>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-b2" />
                          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-y border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[12px] text-t3 capitalize">
                          {img.state === "generating" ? "Gerando..." : img.state === "queuing" ? "Na fila..." : "Aguardando..."}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex justify-center gap-1.5 px-6 pb-3 pt-3 shrink-0">
            {[
              { icon: RefreshCw, label: "Regenerar", action: handleGenerate },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label} title={label} onClick={action}
                className="w-[38px] h-[38px] bg-card border border-b1 rounded-[10px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center justify-center px-6 py-3 border-t border-b1 shrink-0">
              <span className="flex items-center gap-2 text-[13px] text-t3">
                <Loader2 size={13} className="animate-spin text-y" />
                Gerando {pendingCount} foto{pendingCount > 1 ? "s" : ""}...
              </span>
            </div>
          )}
        </div>

        {/* ── Painel direito: configurações guiadas ──────────────────────── */}
        <div
          className="flex flex-col overflow-y-auto p-[18px] shrink-0 gap-2"
          style={{ width: 320, minWidth: 320, background: "#0A0A0A" }}
        >

          {/* Tipo de modelo */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Tipo</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PORTRAIT_TYPES.map((t) => (
                <OptionBtn key={t.id} active={portraitType === t.id} onClick={() => setPortraitType(t.id)}
                  className="py-2.5 flex flex-col items-center gap-0.5"
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-[10.5px]">{t.label}</span>
                </OptionBtn>
              ))}
            </div>
          </div>

          {/* Estilo do ensaio */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Estilo do Ensaio</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SHOOT_STYLES.map((s) => (
                <OptionBtn key={s} active={shootStyle === s} onClick={() => setShootStyle(s)}
                  className="py-2 px-2 text-center"
                >
                  {s}
                </OptionBtn>
              ))}
            </div>
          </div>

          {/* Vestuário */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider flex-1">Vestuário</p>
              <div className="flex items-center gap-1 text-[10.5px] text-t4">
                <Languages size={11} />
                <span>Escreva em português</span>
              </div>
            </div>
            <input
              type="text"
              value={outfit}
              onChange={(e) => setOutfit(e.target.value)}
              placeholder="ex: terno azul marinho, vestido vermelho de seda..."
              maxLength={120}
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2.5 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
            />
            {/* Preview da tradução */}
            {outfit.trim() && (
              <div className="mt-2 flex items-center gap-1.5 min-h-[18px]">
                {isTranslating ? (
                  <Loader2 size={11} className="animate-spin text-t4 shrink-0" />
                ) : (
                  <Languages size={11} className="text-y shrink-0" />
                )}
                <span className="text-[11px] text-t3">
                  {isTranslating
                    ? "Traduzindo..."
                    : outfitEn
                    ? <><span className="text-t4">em inglês: </span><span className="text-[#c8a84b] italic">{outfitEn}</span></>
                    : null}
                </span>
              </div>
            )}
          </div>

          {/* Cenário */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Cenário</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SETTINGS.map((s) => (
                <OptionBtn key={s.id} active={setting === s.id} onClick={() => setSetting(s.id)}
                  className="py-2 px-2 text-center"
                >
                  {s.label}
                </OptionBtn>
              ))}
            </div>
          </div>

          {/* Iluminação */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Iluminação</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LIGHTINGS.map((l) => (
                <OptionBtn key={l.id} active={lighting === l.id} onClick={() => setLighting(l.id)}
                  className="py-2 text-center text-[11px]"
                >
                  {l.label}
                </OptionBtn>
              ))}
            </div>
          </div>

          {/* Enquadramento */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Enquadramento</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FRAMINGS.map((f) => (
                <OptionBtn key={f.id} active={framing === f.id} onClick={() => setFraming(f.id)}
                  className="py-2 text-center"
                >
                  {f.label}
                </OptionBtn>
              ))}
            </div>
          </div>

          {/* Referência visual (opcional) */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider flex-1">Referência Visual</p>
              <span className="text-[10.5px] text-t4">Opcional</span>
            </div>
            <p className="text-[11px] text-t4 mb-2.5 leading-[1.4]">
              Envie uma foto para manter o estilo ou aparência da modelo.
            </p>
            <input ref={refFileRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />
            {isUploadingRef ? (
              <div className="w-full border border-dashed border-b2 rounded-[10px] py-5 flex items-center justify-center gap-2 text-t3">
                <Loader2 size={14} className="animate-spin text-y" />
                <span className="text-[12px]">Enviando...</span>
              </div>
            ) : refImageUrl ? (
              <div className="relative rounded-[10px] overflow-hidden border border-b1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={refImageUrl} alt="Reference" className="w-full h-[110px] object-cover" />
                <button
                  onClick={() => { setRefImageUrl(null); if (refFileRef.current) refFileRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => refFileRef.current?.click()}
                className="w-full border border-dashed border-b2 rounded-[10px] py-4 flex flex-col items-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors"
              >
                <ImagePlus size={18} />
                <span className="text-[12px]">Adicionar referência</span>
              </button>
            )}
          </div>

          {/* Prompt gerado (expansível / editável) */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <button
              onClick={() => setPromptExpanded((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Pencil size={13} className="text-t2 shrink-0" />
              <span className="text-[12px] font-semibold text-t3 uppercase tracking-wider flex-1">Prompt Gerado</span>
              {promptExpanded
                ? <ChevronUp size={13} className="text-t4" />
                : <ChevronDown size={13} className="text-t4" />}
            </button>
            {promptExpanded && (
              <div className="mt-2.5">
                <textarea
                  value={promptOverride ?? composedPrompt}
                  onChange={(e) => setPromptOverride(e.target.value)}
                  rows={4}
                  maxLength={800}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2.5 text-[11.5px] leading-[1.6] text-[#c0c0c0] placeholder-t4 outline-none resize-none focus:border-b2 transition-colors"
                />
                {promptOverride && (
                  <button
                    onClick={() => setPromptOverride(null)}
                    className="mt-1.5 text-[11px] text-y hover:underline"
                  >
                    ↩ Resetar para automático
                  </button>
                )}
              </div>
            )}
            {!promptExpanded && (
              <p className="mt-2 text-[11px] text-t4 line-clamp-2 leading-[1.5]">{promptOverride ?? composedPrompt}</p>
            )}
          </div>

          {/* Modelo de IA */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">Modelo de IA</p>
            <div className="flex flex-col gap-1.5">
              {PORTRAIT_MODELS.map((m) => {
                const locked = !isModelAllowedForPlan(userPlan, m);
                const minPlan = locked ? minPlanFor(m) : null;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (locked) {
                        showToast(`🔒 ${m} disponível a partir do plano ${minPlan}`);
                        return;
                      }
                      setActiveModel(m);
                      const opts = MODEL_RESOLUTIONS[m] ?? ["1K", "2K", "4K"];
                      if (!opts.includes(resolution)) setResolution(opts[0]);
                    }}
                    title={locked ? `Disponível a partir do plano ${minPlan}` : undefined}
                    className={`py-2 px-3 rounded-[8px] text-[12px] font-medium border transition-all flex items-center ${
                      activeModel === m && !locked
                        ? "bg-[#1f1608] border-y text-y"
                        : locked
                        ? "bg-card2 border-b1 text-t4 cursor-not-allowed opacity-50"
                        : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                  >
                    {locked && <Lock size={10} className="shrink-0 mr-1.5" />}
                    <span className="flex-1 text-left">{m}</span>
                    <span className={`text-[10.5px] font-normal ${activeModel === m && !locked ? "text-y/70" : "text-t4"}`}>
                      {locked ? minPlan : `${calculateCost(m, { count: 1, resolution: "1K" })} créd/1K`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolução */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">
              <Maximize2 size={12} className="text-t2" />
              Resolução
            </div>
            <div className={`grid gap-1.5 ${resOptions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {resOptions.map((res) => {
                const btnCost = calculateCost(activeModel, { count: 1, resolution: res });
                return (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`py-2.5 rounded-[8px] flex flex-col items-center gap-0.5 border transition-all ${
                      resolution === res
                        ? "bg-[#1f1608] border-y text-y"
                        : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                  >
                    <span className="text-[13px] font-semibold">{res}</span>
                    <span className={`text-[10.5px] font-normal ${resolution === res ? "text-y/70" : "text-t4"}`}>
                      {btnCost} créd
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantidade */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-t3 uppercase tracking-wider mb-2.5">
              <Layers size={12} className="text-t2" />
              Quantidade
            </div>
            <div className="grid grid-cols-4 gap-[7px]">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n} onClick={() => setActiveCount(n)}
                  className={`h-[42px] rounded-[9px] flex items-center justify-center text-[14px] font-semibold border transition-all ${
                    activeCount === n
                      ? "bg-y border-y text-[#1a0e00]"
                      : "bg-card border-b1 text-t2 hover:border-b2 hover:text-white"
                  }`}
                  style={activeCount === n ? { boxShadow: "0 2px 14px #FBBF2440" } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3.5 py-2.5">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Botão Gerar */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-xl py-3.5 text-[14.5px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Iniciando...</>
            ) : (
              <>
                <Camera size={14} fill="currentColor" />
                Gerar Ensaio
                <span className="ml-1 px-2 py-0.5 rounded-md bg-[#1a0e00]/15 text-[12px] font-bold tabular-nums">
                  −{generationCost.toLocaleString("pt-BR")} créditos
                </span>
              </>
            )}
          </button>

        </div>
      </div>
    </>
  );
}
