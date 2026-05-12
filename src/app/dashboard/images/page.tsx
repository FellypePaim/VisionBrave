"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Wand2, Download, RefreshCw, Crop, Layers, Sparkles,
  Maximize2, ChevronRight, Plus, MoreHorizontal, Zap, Loader2, AlertCircle,
  ImagePlus, X, Ratio, Lock,
} from "lucide-react";
import { calculateCost, isModelAllowedForPlan, PLAN_MODEL_ACCESS } from "@/lib/credits";

const TAGS = ["Todos", "Realista", "Cinemático", "Anime", "Render 3D", "Pintura a Óleo", "Esboço", "Neon"];

// Mapeia o nome do estilo PT-BR (UI) → key em inglês (API)
const TAG_TO_STYLE: Record<string, string | undefined> = {
  "Todos": undefined,
  "Realista": "Realistic",
  "Cinemático": "Cinematic",
  "Anime": "Anime",
  "Render 3D": "3D Render",
  "Pintura a Óleo": "Oil Paint",
  "Esboço": "Sketch",
  "Neon": "Neon",
};
const COUNTS = [1, 2, 3, 4];
const MODELS = ["Nano Banana", "Flux Kontext", "GPT Image 2", "Flux Pro"];

// Retorna o nome do plano mínimo para acessar um modelo
function minPlanFor(model: string): string {
  if (PLAN_MODEL_ACCESS.free.includes(model)) return "Free";
  if (PLAN_MODEL_ACCESS.premium.includes(model)) return "Premium";
  if (PLAN_MODEL_ACCESS.premiumplus.includes(model)) return "Premium+";
  return "Pro";
}

// Resoluções disponíveis por modelo (Flux Pro max 2K per KIE docs)
const MODEL_RESOLUTIONS: Record<string, Array<"1K" | "2K" | "4K">> = {
  "Nano Banana":  ["1K", "2K", "4K"],
  "Flux Kontext": ["1K", "2K", "4K"],
  "GPT Image 2":  ["1K", "2K", "4K"],
  "Flux Pro":     ["1K", "2K"],
};

// Common aspect ratios per model
const ASPECT_RATIOS: Record<string, string[]> = {
  "Nano Banana":  ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2"],
  "Flux Kontext": ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
  "GPT Image 2":  ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"],
  "Flux Pro":     ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2"],
};

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

export default function GenerateImagesPage() {
  const [activeTag, setActiveTag] = useState("Cinemático");
  const [activeCount, setActiveCount] = useState(1);
  const [activeModel, setActiveModel] = useState("Nano Banana");
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  // Flux Kontext reference image (hosted URL)
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const fluxFileRef = useRef<HTMLInputElement>(null);

  // Nano Banana reference images (hosted URLs, up to 5)
  const [nanoBananaRefs, setNanoBananaRefs] = useState<string[]>([]);
  const [isUploadingNano, setIsUploadingNano] = useState(false);
  const nanoFileRef = useRef<HTMLInputElement>(null);

  const pollingRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup polling timers on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach(clearInterval);
      pollingRef.current = [];
    };
  }, []);

  // Busca plano do usuário para UI lock de modelos
  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { if (d?.subscription?.plan) setUserPlan(d.subscription.plan); })
      .catch(() => {/* mantém "free" como fallback seguro */});
  }, []);

  // Load prompt from template (set by /dashboard/templates)
  useEffect(() => {
    const tpl = sessionStorage.getItem("template:prompt");
    if (tpl) {
      setPrompt(tpl);
      sessionStorage.removeItem("template:prompt");
    }
  }, []);

  // KIE rejeita aspect_ratio="auto" quando resolução é 2K/4K.
  // Auto-corrige para "1:1" e avisa o usuário (mantém alinhado com o backend).
  const requiresFixedRatio = resolution !== "1K";

  // Custo em créditos desta geração (espelha calculateCost do backend para mostrar no botão)
  const generationCost = useMemo(() => {
    return calculateCost(activeModel, { count: activeCount, resolution });
  }, [activeModel, activeCount, resolution]);

  useEffect(() => {
    if (requiresFixedRatio && aspectRatio === "auto") {
      setAspectRatio("1:1");
      setToast("Resolução 2K/4K requer proporção fixa — ajustado para 1:1");
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [requiresFixedRatio, aspectRatio]);

  const promptRef = useRef(prompt);
  const modelRef = useRef(activeModel);
  promptRef.current = prompt;
  modelRef.current = activeModel;

  const pollTask = useCallback((taskId: string, index: number) => {
    let ticks = 0;
    const MAX_TICKS = 60; // ~3min @ 3s
    const interval = setInterval(async () => {
      if (++ticks > MAX_TICKS) {
        clearInterval(interval);
        setImages((prev) => prev.map((img, i) =>
          i === index ? { ...img, state: "fail", error: "Tempo limite excedido" } : img
        ));
        return;
      }
      try {
        const res = await fetch(`/api/generate/status?taskId=${encodeURIComponent(taskId)}`);
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Flux Kontext reference image upload → Supabase → hosted URL
  async function handleFluxRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

  // Nano Banana reference image upload (up to 5)
  async function handleNanoRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || nanoBananaRefs.length >= 5) return;
    setIsUploadingNano(true);
    try {
      const url = await uploadReferenceFile(file);
      if (url) setNanoBananaRefs((prev) => [...prev, url]);
      else showToast("Falha no upload — tente novamente");
    } finally {
      setIsUploadingNano(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleEnhancePrompt() {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "image" }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } finally {
      setIsEnhancing(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    pollingRef.current.forEach(clearInterval);
    pollingRef.current = [];

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: activeModel,
          style: TAG_TO_STYLE[activeTag],
          count: activeCount,
          resolution,
          aspectRatio: aspectRatio === "auto" ? undefined : aspectRatio,
          // Flux Kontext
          inputImage: activeModel === "Flux Kontext" ? refImageUrl || undefined : undefined,
          // Nano Banana
          referenceImages: activeModel === "Nano Banana" && nanoBananaRefs.length
            ? nanoBananaRefs
            : undefined,
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

  const pendingCount = images.filter((i) =>
    ["waiting", "queuing", "generating"].includes(i.state)
  ).length;

  const ratios = ASPECT_RATIOS[activeModel] ?? ASPECT_RATIOS["Nano Banana"];

  return (
    <>
      <Topbar title="Gerar Imagens" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[#1a1a1a] border border-white/10 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-b1">
          {/* Tags bar */}
          <div className="flex items-center gap-2 px-6 py-3.5 shrink-0 overflow-x-auto">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap border transition-all ${
                  activeTag === tag
                    ? "bg-[#1f1608] border-y text-y"
                    : "bg-card border-b1 text-t2 hover:text-white hover:border-b2"
                }`}
              >
                {tag}
              </button>
            ))}
            <button className="ml-auto w-9 h-8 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 shrink-0">
              <MoreHorizontal size={15} />
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-5 min-h-0">
            {images.length === 0 ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-t4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#d0d0d0] mb-1">Nenhuma imagem ainda</p>
                  <p className="text-[13px] text-t3">Escreva um prompt e clique em Gerar</p>
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
                    className="relative rounded-[18px] overflow-hidden border border-b1 bg-card aspect-square"
                    style={{ boxShadow: "0 20px 60px #000000aa" }}
                  >
                    {img.state === "success" && img.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
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
          <div className="flex justify-center gap-1.5 px-6 pb-3 shrink-0 pt-3">
            {[
              { icon: RefreshCw,  label: "Regenerar",    action: handleGenerate },
              { icon: Crop,       label: "Recortar",     action: () => showToast("Recorte em breve") },
              { icon: Layers,     label: "Variações",    action: () => showToast("Variações em breve") },
              { icon: Sparkles,   label: "Aprimorar",    action: () => showToast("Aprimorar com IA em breve") },
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
                Gerando {pendingCount} {pendingCount > 1 ? "imagens" : "imagem"}...
              </span>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div
          className="flex flex-col overflow-y-auto p-[18px] shrink-0"
          style={{ width: 320, minWidth: 320, background: "#0A0A0A" }}
        >
          {/* Prompt */}
          <div className="bg-card border border-b1 rounded-xl p-3.5 mb-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva sua imagem em detalhes..."
              rows={4}
              maxLength={500}
              className="w-full bg-transparent text-[12.5px] leading-[1.6] text-[#c0c0c0] placeholder-t4 outline-none resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-t3">{prompt.length} / 500</span>
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-y disabled:opacity-50"
                style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
                title="Aprimorar prompt"
              >
                {isEnhancing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
              <Zap size={14} className="text-t2" />
              Modelo
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MODELS.map((m) => {
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
                      setAspectRatio((ASPECT_RATIOS[m] ?? [])[0] ?? "1:1");
                      const resOptions = MODEL_RESOLUTIONS[m] ?? ["1K", "2K", "4K"];
                      if (!resOptions.includes(resolution)) setResolution(resOptions[0]);
                      setRefImageUrl(null);
                      setNanoBananaRefs([]);
                    }}
                    title={locked ? `Disponível a partir do plano ${minPlan}` : undefined}
                    className={`py-2 rounded-[8px] text-[12px] font-medium border transition-all flex items-center justify-center gap-1.5 ${
                      activeModel === m && !locked
                        ? "bg-[#1f1608] border-y text-y"
                        : locked
                        ? "bg-card2 border-b1 text-t4 cursor-not-allowed opacity-50"
                        : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                  >
                    {locked && <Lock size={10} className="shrink-0" />}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
              <Ratio size={14} className="text-t2" />
              Proporção
              {requiresFixedRatio && ratios.includes("auto") && (
                <span className="ml-auto text-[10.5px] text-t3 font-normal">
                  &ldquo;auto&rdquo; indisponível em 2K/4K
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ratios.map((r) => {
                const isAutoDisabled = r === "auto" && requiresFixedRatio;
                return (
                  <button
                    key={r}
                    disabled={isAutoDisabled}
                    onClick={() => !isAutoDisabled && setAspectRatio(r)}
                    title={isAutoDisabled ? "Proporção 'auto' não é suportada em resolução 2K/4K. Reduza o Nível de Detalhe ou escolha uma proporção fixa." : undefined}
                    className={`px-3 py-1.5 rounded-[7px] text-[11.5px] font-medium border transition-all ${
                      isAutoDisabled
                        ? "bg-card2 border-b1 text-t4 line-through cursor-not-allowed opacity-50"
                        : aspectRatio === r
                        ? "bg-[#1f1608] border-y text-y"
                        : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Image — Flux Kontext */}
          {activeModel === "Flux Kontext" && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <ImagePlus size={14} className="text-t2" />
                Imagem de Referência
                <span className="ml-auto text-[11px] text-t4 font-normal">Opcional</span>
              </div>
              <input ref={fluxFileRef} type="file" accept="image/*" className="hidden" onChange={handleFluxRefUpload} />
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
                    onClick={() => { setRefImageUrl(null); if (fluxFileRef.current) fluxFileRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fluxFileRef.current?.click()}
                  className="w-full border border-dashed border-b2 rounded-[10px] py-4 flex flex-col items-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors"
                >
                  <ImagePlus size={18} />
                  <span className="text-[12px]">Enviar imagem de referência</span>
                </button>
              )}
            </div>
          )}

          {/* Reference Images — Nano Banana (up to 5) */}
          {activeModel === "Nano Banana" && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <ImagePlus size={14} className="text-t2" />
                Imagens de Referência
                <span className="ml-auto text-[11px] text-t4 font-normal">{nanoBananaRefs.length}/5</span>
              </div>
              <input ref={nanoFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleNanoRefUpload} />
              {nanoBananaRefs.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {nanoBananaRefs.map((url, i) => (
                    <div key={i} className="relative rounded-[8px] overflow-hidden border border-b1 aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setNanoBananaRefs((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {nanoBananaRefs.length < 5 && (
                <button
                  onClick={() => nanoFileRef.current?.click()}
                  disabled={isUploadingNano}
                  className="w-full border border-dashed border-b2 rounded-[10px] py-3 flex items-center justify-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors disabled:opacity-50"
                >
                  {isUploadingNano
                    ? <><Loader2 size={13} className="animate-spin text-y" /><span className="text-[12px]">Enviando...</span></>
                    : <><Plus size={14} /><span className="text-[12px]">Adicionar imagem</span></>
                  }
                </button>
              )}
            </div>
          )}

          {/* Style */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-2 cursor-pointer hover:border-b2 transition-colors">
            <div
              className="w-8 h-8 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center text-base"
              style={{ background: "linear-gradient(135deg, #5a3520, #2a1410)" }}
            >
              🎨
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Estilo</span>
            <span className="text-[12.5px] text-t2 mr-2">{activeTag}</span>
            <ChevronRight size={13} className="text-t3" />
          </div>

          {/* Effects */}
          <div
            onClick={() => showToast("Efeitos em breve")}
            role="button"
            className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-3 cursor-pointer hover:border-b2 transition-colors"
          >
            <div className="w-8 h-8 bg-card2 border border-b1 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center">
              <Sparkles size={14} className="text-t2" />
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Efeitos</span>
            <span className="text-[12.5px] text-t2 mr-2">Nenhum</span>
            <ChevronRight size={13} className="text-t3" />
            <button
              onClick={(e) => { e.stopPropagation(); showToast("Efeitos em breve"); }}
              className="w-6 h-6 rounded-[6px] flex items-center justify-center ml-1.5 text-y"
              style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Resolution */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
              <Maximize2 size={14} className="text-t2" />
              Resolução
            </div>
            <div className={`grid gap-1.5 ${(MODEL_RESOLUTIONS[activeModel] ?? ["1K","2K","4K"]).length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {(MODEL_RESOLUTIONS[activeModel] ?? ["1K", "2K", "4K"]).map((res) => {
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

          {/* Number of images */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-3.5">
              <Layers size={14} className="text-t2" />
              Quantidade de Imagens
            </div>
            <div className="grid grid-cols-4 gap-[7px]">
              {COUNTS.map((n) => (
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
            <div className="flex items-center gap-2 text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3.5 py-2.5 mb-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full rounded-xl py-3.5 text-[14.5px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Iniciando...</>
            ) : (
              <>
                <Zap size={14} fill="currentColor" />
                Gerar
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
