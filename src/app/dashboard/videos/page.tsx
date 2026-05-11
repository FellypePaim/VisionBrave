"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Wand2, Download, RefreshCw, Sparkles, Sliders, Zap, Loader2,
  AlertCircle, Play, Clock, ImagePlus, X, Volume2, VolumeX,
  ChevronDown, ChevronUp, Film, Monitor,
} from "lucide-react";
import { calculateCost } from "@/lib/credits";

const MODELS = [
  { id: "Seedance 2",      label: "Seedance 2",      badge: "Popular" },
  { id: "Seedance 2 Fast", label: "Seedance 2 Fast",  badge: "Rápido" },
  { id: "Veo 3 Fast",      label: "Veo 3 Fast",       badge: null },
  { id: "Veo 3",           label: "Veo 3",            badge: "Qualidade" },
  { id: "Kling 2.1",       label: "Kling 2.1",        badge: "Img→Vídeo" },
  { id: "Kling 3.0",       label: "Kling 3.0",        badge: "Novo" },
];

const RATIOS = ["16:9", "9:16", "1:1", "4:3"];
const VEO_RATIOS = ["16:9", "9:16"];
const STYLE_OPTIONS = ["Cinemático", "Realista", "Anime", "Render 3D", "Vintage", "Neon"];

// UI label PT-BR → key da API (em inglês)
const VIDEO_STYLE_TO_API: Record<string, string> = {
  "Cinemático": "Cinematic",
  "Realista": "Realistic",
  "Anime": "Anime",
  "Render 3D": "3D Render",
  "Vintage": "Vintage",
  "Neon": "Neon",
};

const RESOLUTIONS: Record<string, string[]> = {
  "Seedance 2":      ["480p", "720p", "1080p"],
  "Seedance 2 Fast": ["480p", "720p"],
  "Veo 3 Fast":      ["720p", "1080p", "4k"],
  "Veo 3":           ["720p", "1080p", "4k"],
};

const KLING3_MODES = [
  { id: "std", label: "Std", desc: "720p" },
  { id: "pro", label: "Pro", desc: "1080p" },
  { id: "4K",  label: "4K",  desc: "4K" },
] as const;

const VEO_GEN_TYPES = [
  { id: "TEXT_2_VIDEO",                   label: "Apenas texto" },
  { id: "FIRST_AND_LAST_FRAMES_2_VIDEO",  label: "Primeiro + Último frame" },
  { id: "REFERENCE_2_VIDEO",              label: "Imagens de referência" },
] as const;

interface GeneratedVideo {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  videoUrl?: string;
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

function getDurations(model: string): number[] {
  if (model === "Kling 2.1") return [5, 10];
  if (model === "Kling 3.0") return [5, 8, 10, 15];
  if (model === "Veo 3" || model === "Veo 3 Fast") return [];
  return [5, 8, 10, 15]; // Seedance
}

export default function GenerateVideosPage() {
  const [activeModel, setActiveModel] = useState("Seedance 2");
  const [activeRatio, setActiveRatio] = useState("16:9");
  const [activeDuration, setActiveDuration] = useState(5);
  const [activeStyle, setActiveStyle] = useState("Cinemático");
  const [motionIntensity, setMotionIntensity] = useState(60);
  const [resolution, setResolution] = useState("720p");
  const [prompt, setPrompt] = useState("");
  const [video, setVideo] = useState<GeneratedVideo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Custo em créditos desta geração (espelha calculateCost do backend p/ mostrar no botão)
  const generationCost = useMemo(() => calculateCost(activeModel, {
    durationSeconds: Number(activeDuration) || 5,
    resolution,
  }), [activeModel, activeDuration, resolution]);

  // Reference media state
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [refImageUrls, setRefImageUrls] = useState<string[]>([]);  // Seedance up to 3
  const [isUploadingFirst, setIsUploadingFirst] = useState(false);
  const [isUploadingLast, setIsUploadingLast] = useState(false);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Seedance extras
  const [generateAudio, setGenerateAudio] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Kling 2.1 extras
  const [negativePrompt, setNegativePrompt] = useState("");
  const [cfgScale, setCfgScale] = useState(0.5);

  // Kling 3.0 extras
  const [klingMode, setKlingMode] = useState<"std" | "pro" | "4K">("pro");
  const [klingSound, setKlingSound] = useState(false);

  // Veo 3 extras
  const [veoGenerationType, setVeoGenerationType] = useState<"TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO">("TEXT_2_VIDEO");
  const [veoImageUrls, setVeoImageUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploadingVeo, setIsUploadingVeo] = useState<boolean[]>([false, false, false]);
  const veoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Load prompt from template (set by /dashboard/templates)
  useEffect(() => {
    const tpl = sessionStorage.getItem("template:prompt");
    if (tpl) {
      setPrompt(tpl);
      sessionStorage.removeItem("template:prompt");
    }
  }, []);

  const promptRef = useRef(prompt);
  const modelRef = useRef(activeModel);
  promptRef.current = prompt;
  modelRef.current = activeModel;

  const pollTask = useCallback((taskId: string) => {
    let ticks = 0;
    const MAX_TICKS = 120; // ~10min @ 5s
    const interval = setInterval(async () => {
      if (++ticks > MAX_TICKS) {
        clearInterval(interval);
        setVideo({ taskId, state: "fail", error: "Tempo limite excedido" });
        return;
      }
      try {
        const res = await fetch(`/api/generate/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (data.state === "success") {
          clearInterval(interval);
          setVideo({ taskId, state: "success", videoUrl: data.imageUrl });
          if (data.imageUrl) {
            fetch("/api/gallery/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "video", prompt: promptRef.current,
                model: modelRef.current, externalUrl: data.imageUrl,
              }),
            }).catch((e) => console.error("[gallery/save]", e));
          }
        } else if (data.state === "fail") {
          clearInterval(interval);
          setVideo({ taskId, state: "fail", error: data.error });
        } else if (["waiting", "queuing", "generating"].includes(data.state)) {
          setVideo((prev) => prev ? { ...prev, state: data.state } : prev);
        }
      } catch {
        clearInterval(interval);
        setVideo({ taskId, state: "fail", error: "Erro de rede" });
      }
    }, 5000);
    pollingRef.current = interval;
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function resetModel(m: string) {
    setActiveModel(m);
    setFirstFrameUrl(null);
    setLastFrameUrl(null);
    setRefImageUrls([]);
    setVeoImageUrls([null, null, null]);
    setNegativePrompt("");
    setCfgScale(0.5);
    setKlingMode("pro");
    setKlingSound(false);
    setVeoGenerationType("TEXT_2_VIDEO");
    const durs = getDurations(m);
    if (durs.length && !durs.includes(activeDuration)) setActiveDuration(durs[0]);
    const res = RESOLUTIONS[m];
    if (res) setResolution(res[1] ?? res[0]);
  }

  async function handleUploadFirstFrame(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFirst(true);
    const url = await uploadReferenceFile(file);
    if (url) setFirstFrameUrl(url);
    else showToast("Falha no upload");
    setIsUploadingFirst(false);
    if (e.target) e.target.value = "";
  }

  async function handleUploadLastFrame(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLast(true);
    const url = await uploadReferenceFile(file);
    if (url) setLastFrameUrl(url);
    else showToast("Falha no upload");
    setIsUploadingLast(false);
    if (e.target) e.target.value = "";
  }

  async function handleUploadRefImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || refImageUrls.length >= 3) return;
    setIsUploadingRef(true);
    const url = await uploadReferenceFile(file);
    if (url) setRefImageUrls((prev) => [...prev, url]);
    else showToast("Falha no upload");
    setIsUploadingRef(false);
    if (e.target) e.target.value = "";
  }

  async function handleUploadVeoImage(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVeo((prev) => prev.map((v, i) => (i === index ? true : v)));
    const url = await uploadReferenceFile(file);
    if (url) setVeoImageUrls((prev) => prev.map((v, i) => (i === index ? url : v)));
    else showToast("Falha no upload");
    setIsUploadingVeo((prev) => prev.map((v, i) => (i === index ? false : v)));
    if (e.target) e.target.value = "";
  }

  async function handleEnhancePrompt() {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "video" }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } finally {
      setIsEnhancing(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    if (activeModel === "Kling 2.1" && !firstFrameUrl) {
      setError("Kling 2.1 requer uma imagem de referência");
      return;
    }
    setError(null);
    setIsGenerating(true);
    if (pollingRef.current) clearInterval(pollingRef.current);

    // Collect Veo image URLs based on generation type
    const activeVeoImages = veoImageUrls.filter(Boolean) as string[];

    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: activeModel,
          aspect_ratio: activeRatio,
          duration: activeDuration,
          style: VIDEO_STYLE_TO_API[activeStyle] ?? activeStyle,
          motionIntensity,
          // Seedance
          firstFrameUrl: firstFrameUrl || undefined,
          lastFrameUrl: lastFrameUrl || undefined,
          referenceImageUrls: refImageUrls.length ? refImageUrls : undefined,
          generateAudio,
          resolution: RESOLUTIONS[activeModel] ? resolution : undefined,
          // Kling 2.1
          imageUrl: firstFrameUrl || undefined,
          negativePrompt: negativePrompt || undefined,
          cfgScale: cfgScale !== 0.5 ? cfgScale : undefined,
          // Kling 3.0
          klingMode,
          klingSound,
          // Veo 3
          veoImageUrls: activeVeoImages.length ? activeVeoImages : undefined,
          generationType: veoGenerationType,
          veoResolution: resolution,
          enableTranslation: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) {
        setError(data.error ?? "Falha ao iniciar geração");
        return;
      }

      setVideo({ taskId: data.taskId, state: "waiting" });
      pollTask(data.taskId);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  const isPending = video && ["waiting", "queuing", "generating"].includes(video.state);
  const stateLabel =
    video?.state === "generating" ? "Gerando vídeo..." :
    video?.state === "queuing"    ? "Na fila..." : "Aguardando...";

  const durations = getDurations(activeModel);
  const showRatios = activeModel === "Veo 3" || activeModel === "Veo 3 Fast"
    ? VEO_RATIOS
    : RATIOS;

  // Veo image slot count based on generationType
  const veoSlots =
    veoGenerationType === "FIRST_AND_LAST_FRAMES_2_VIDEO" ? 2 :
    veoGenerationType === "REFERENCE_2_VIDEO" ? 3 : 0;

  // Whether first frame upload should be shown
  const showFirstFrame =
    activeModel === "Seedance 2" || activeModel === "Seedance 2 Fast" ||
    activeModel === "Kling 2.1" || activeModel === "Kling 3.0";

  // Whether last frame upload should be shown
  const showLastFrame =
    activeModel === "Seedance 2" || activeModel === "Seedance 2 Fast";

  // Whether resolution selector should be shown
  const showResolution = !!RESOLUTIONS[activeModel];

  const isKling21RequiredImageMissing = activeModel === "Kling 2.1" && !firstFrameUrl;

  return (
    <>
      <Topbar title="Gerar Vídeos" />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-white bg-[#1a1a1a] border border-white/10 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-b1">
          {/* Ratio bar */}
          <div className="flex items-center gap-2 px-6 py-3.5 shrink-0 border-b border-b1">
            {showRatios.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRatio(r)}
                className={`px-4 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap border transition-all ${
                  activeRatio === r
                    ? "bg-[#1f1608] border-y text-y"
                    : "bg-card border-b1 text-t2 hover:text-white hover:border-b2"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-5 min-h-0">
            {!video ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                  <Play size={28} className="text-t4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#d0d0d0] mb-1">Nenhum vídeo ainda</p>
                  <p className="text-[13px] text-t3">Escreva um prompt e clique em Gerar</p>
                </div>
              </div>
            ) : video.state === "success" && video.videoUrl ? (
              <div
                className="relative rounded-[18px] overflow-hidden border border-b1 bg-card max-h-full"
                style={{ aspectRatio: activeRatio.replace(":", "/"), maxWidth: 640, boxShadow: "0 20px 60px #000000aa" }}
              >
                <video src={video.videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                <a
                  href={video.videoUrl} download target="_blank" rel="noopener noreferrer"
                  className="absolute top-3 right-3 w-8 h-8 bg-black/55 backdrop-blur-sm rounded-[9px] flex items-center justify-center z-10"
                >
                  <Download size={14} className="text-white" />
                </a>
              </div>
            ) : video.state === "fail" ? (
              <div className="flex flex-col items-center gap-3 text-red-400">
                <AlertCircle size={32} />
                <p className="text-[13px]">{video.error ?? "Falha na geração"}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-b2" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-y border-t-transparent animate-spin" />
                </div>
                <p className="text-[13px] text-t3">{stateLabel}</p>
                <p className="text-[11.5px] text-t4">Vídeos levam 1–3 minutos</p>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex justify-center gap-1.5 px-6 pb-3 shrink-0 pt-3">
            {[
              { icon: RefreshCw, label: "Regenerar",  action: handleGenerate },
              { icon: Sparkles,  label: "Aprimorar",  action: () => showToast("Aprimorar com IA em breve") },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label} title={label} onClick={action}
                className="w-[38px] h-[38px] bg-card border border-b1 rounded-[10px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {isPending && (
            <div className="flex items-center justify-center px-6 py-3 border-t border-b1 shrink-0">
              <span className="flex items-center gap-2 text-[13px] text-t3">
                <Loader2 size={13} className="animate-spin text-y" />
                {stateLabel}
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
              placeholder="Descreva o vídeo que você quer gerar..."
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
            <div className="flex flex-col gap-1.5">
              {MODELS.map(({ id, label, badge }) => (
                <button
                  key={id}
                  onClick={() => resetModel(id)}
                  className={`py-2 px-3 rounded-[8px] text-[12px] font-medium border transition-all text-left flex items-center justify-between ${
                    activeModel === id
                      ? "bg-[#1f1608] border-y text-y"
                      : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                  }`}
                >
                  {label}
                  {badge && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      activeModel === id ? "bg-y/20 text-y" : "bg-card border border-b1 text-t3"
                    }`}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Duration (hidden for Veo3) */}
          {durations.length > 0 && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <Clock size={14} className="text-t2" />
                Duração
              </div>
              <div className={`grid gap-[7px]`} style={{ gridTemplateColumns: `repeat(${durations.length}, 1fr)` }}>
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDuration(d)}
                    className={`h-[42px] rounded-[9px] flex items-center justify-center text-[13px] font-semibold border transition-all ${
                      activeDuration === d
                        ? "bg-y border-y text-[#1a0e00]"
                        : "bg-card border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                    style={activeDuration === d ? { boxShadow: "0 2px 14px #FBBF2440" } : {}}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          {showResolution && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <Monitor size={14} className="text-t2" />
                Resolução
              </div>
              <div className="flex gap-1.5">
                {RESOLUTIONS[activeModel].map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={`flex-1 py-2 rounded-[8px] text-[11.5px] font-semibold border transition-all ${
                      resolution === r
                        ? "bg-y border-y text-[#1a0e00]"
                        : "bg-card border-b1 text-t2 hover:border-b2 hover:text-white"
                    }`}
                    style={resolution === r ? { boxShadow: "0 2px 12px #FBBF2430" } : {}}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Kling 3.0 options ── */}
          {activeModel === "Kling 3.0" && (
            <>
              <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                  <Film size={14} className="text-t2" />
                  Modo de Qualidade
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {KLING3_MODES.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      onClick={() => setKlingMode(id)}
                      className={`py-2 rounded-[8px] border transition-all flex flex-col items-center gap-0.5 ${
                        klingMode === id
                          ? "bg-[#1f1608] border-y text-y"
                          : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                      }`}
                    >
                      <span className="text-[12px] font-semibold">{label}</span>
                      <span className="text-[10px] opacity-60">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-b1 rounded-[11px] flex items-center justify-between px-3.5 py-3 mb-2">
                <div className="flex items-center gap-2.5">
                  {klingSound ? <Volume2 size={14} className="text-t2" /> : <VolumeX size={14} className="text-t2" />}
                  <span className="text-[13px] font-medium text-[#d8d8d8]">Efeitos sonoros</span>
                </div>
                <button
                  onClick={() => setKlingSound(!klingSound)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${klingSound ? "bg-y" : "bg-card2 border border-b1"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${klingSound ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </>
          )}

          {/* ── Veo3 generation type ── */}
          {(activeModel === "Veo 3" || activeModel === "Veo 3 Fast") && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <Film size={14} className="text-t2" />
                Modo de Geração
              </div>
              <div className="flex flex-col gap-1.5">
                {VEO_GEN_TYPES.map(({ id, label }) => {
                  const disabled = id === "REFERENCE_2_VIDEO" && activeModel === "Veo 3";
                  return (
                    <button
                      key={id}
                      onClick={() => !disabled && setVeoGenerationType(id as typeof veoGenerationType)}
                      disabled={disabled}
                      className={`py-2 px-3 rounded-[8px] text-[12px] font-medium border transition-all text-left flex items-center justify-between ${
                        veoGenerationType === id
                          ? "bg-[#1f1608] border-y text-y"
                          : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      }`}
                    >
                      {label}
                      {disabled && <span className="text-[10px] text-t4">Apenas Fast</span>}
                    </button>
                  );
                })}
              </div>
              {/* Veo image upload slots */}
              {veoSlots > 0 && (
                <div className={`grid gap-2 mt-2.5 ${veoSlots === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {Array.from({ length: veoSlots }, (_, i) => (
                    <div key={i}>
                      <p className="text-[10px] text-t4 mb-1">
                        {veoSlots === 2 ? (i === 0 ? "Primeiro" : "Último") : `Ref ${i + 1}`}
                      </p>
                      <input
                        ref={veoInputRefs[i]}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => handleUploadVeoImage(i, e)}
                      />
                      {isUploadingVeo[i] ? (
                        <div className="aspect-square rounded-[8px] border border-b2 flex items-center justify-center bg-card2">
                          <Loader2 size={14} className="animate-spin text-y" />
                        </div>
                      ) : veoImageUrls[i] ? (
                        <div className="relative aspect-square rounded-[8px] overflow-hidden border border-b1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={veoImageUrls[i]!} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setVeoImageUrls((prev) => prev.map((v, j) => j === i ? null : v))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => veoInputRefs[i].current?.click()}
                          className="w-full aspect-square rounded-[8px] border border-dashed border-b2 flex items-center justify-center text-t4 hover:text-white hover:border-b2 transition-colors"
                        >
                          <ImagePlus size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── First Frame (Seedance / Kling 2.1 / Kling 3.0) ── */}
          {showFirstFrame && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <ImagePlus size={14} className="text-t2" />
                {activeModel === "Kling 2.1" ? "Imagem de Referência" : "Primeiro Frame"}
                <span className={`ml-auto text-[11px] font-normal ${activeModel === "Kling 2.1" ? "text-red-400" : "text-t4"}`}>
                  {activeModel === "Kling 2.1" ? "Obrigatório" : "Opcional"}
                </span>
              </div>
              <input ref={firstFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFirstFrame} />
              {isUploadingFirst ? (
                <div className="w-full border border-dashed border-b2 rounded-[10px] py-5 flex items-center justify-center gap-2 text-t3">
                  <Loader2 size={14} className="animate-spin text-y" />
                  <span className="text-[12px]">Enviando...</span>
                </div>
              ) : firstFrameUrl ? (
                <div className="relative rounded-[10px] overflow-hidden border border-b1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firstFrameUrl} alt="First frame" className="w-full h-[100px] object-cover" />
                  <button
                    onClick={() => { setFirstFrameUrl(null); if (firstFrameInputRef.current) firstFrameInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => firstFrameInputRef.current?.click()}
                  className={`w-full border border-dashed rounded-[10px] py-4 flex flex-col items-center gap-2 text-t3 hover:text-white transition-colors ${
                    activeModel === "Kling 2.1" ? "border-red-500/40 hover:border-red-400" : "border-b2 hover:border-b2"
                  }`}
                >
                  <ImagePlus size={18} />
                  <span className="text-[12px]">
                    {activeModel === "Kling 2.1" ? "Enviar imagem (obrigatório)" : "Enviar primeiro frame"}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* ── Last Frame (Seedance only) ── */}
          {showLastFrame && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
                <ImagePlus size={14} className="text-t2" />
                Último Frame
                <span className="ml-auto text-[11px] text-t4 font-normal">Opcional</span>
              </div>
              <input ref={lastFrameInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLastFrame} />
              {isUploadingLast ? (
                <div className="w-full border border-dashed border-b2 rounded-[10px] py-5 flex items-center justify-center gap-2 text-t3">
                  <Loader2 size={14} className="animate-spin text-y" />
                  <span className="text-[12px]">Enviando...</span>
                </div>
              ) : lastFrameUrl ? (
                <div className="relative rounded-[10px] overflow-hidden border border-b1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastFrameUrl} alt="Last frame" className="w-full h-[100px] object-cover" />
                  <button
                    onClick={() => { setLastFrameUrl(null); if (lastFrameInputRef.current) lastFrameInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => lastFrameInputRef.current?.click()}
                  className="w-full border border-dashed border-b2 rounded-[10px] py-4 flex flex-col items-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors"
                >
                  <ImagePlus size={18} />
                  <span className="text-[12px]">Enviar último frame</span>
                </button>
              )}
            </div>
          )}

          {/* ── Kling 2.1 extras ── */}
          {activeModel === "Kling 2.1" && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
              <div className="flex flex-col gap-2.5">
                <div>
                  <p className="text-[11.5px] font-medium text-t2 mb-1.5">Prompt Negativo</p>
                  <input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="O que evitar..."
                    maxLength={500}
                    className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[11.5px] font-medium text-t2">Fidelidade da Imagem</p>
                    <span className="text-[11px] text-t3">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.1} value={cfgScale}
                    onChange={(e) => setCfgScale(Number(e.target.value))}
                    className="w-full accent-y cursor-pointer"
                  />
                  <div className="flex justify-between text-[10.5px] text-t4 mt-1">
                    <span>Criativo</span>
                    <span>Fiel</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Seedance advanced: style + motion + references + audio toggle ── */}
          {(activeModel === "Seedance 2" || activeModel === "Seedance 2 Fast") && (
            <>
              {/* Style */}
              <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-8 h-8 rounded-[8px] shrink-0 flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg, #5a3520, #2a1410)" }}>
                    🎬
                  </div>
                  <span className="flex-1 text-[13px] font-semibold text-[#d8d8d8]">Estilo</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s} onClick={() => setActiveStyle(s)}
                      className={`py-1.5 rounded-[7px] text-[11.5px] font-medium border transition-all ${
                        activeStyle === s
                          ? "bg-[#1f1608] border-y text-y"
                          : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion intensity */}
              <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-3.5">
                  <Sliders size={14} className="text-t2" />
                  Intensidade de Movimento
                </div>
                <input
                  type="range" min={0} max={100} value={motionIntensity}
                  onChange={(e) => setMotionIntensity(Number(e.target.value))}
                  className="w-full accent-y mb-2 cursor-pointer"
                />
                <div className="flex justify-between text-[11.5px] text-t3">
                  <span>Sutil</span>
                  <span>Dinâmico</span>
                </div>
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-card border border-b1 rounded-[10px] text-[12.5px] text-t2 hover:text-white hover:border-b2 transition-colors mb-2"
              >
                <span>Opções avançadas</span>
                {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showAdvanced && (
                <>
                  {/* Audio toggle */}
                  <div className="bg-card border border-b1 rounded-[11px] flex items-center justify-between px-3.5 py-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      {generateAudio ? <Volume2 size={14} className="text-t2" /> : <VolumeX size={14} className="text-t2" />}
                      <span className="text-[13px] font-medium text-[#d8d8d8]">Gerar áudio</span>
                    </div>
                    <button
                      onClick={() => setGenerateAudio(!generateAudio)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${generateAudio ? "bg-y" : "bg-card2 border border-b1"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${generateAudio ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* Reference images */}
                  <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#d8d8d8] mb-2">
                      <ImagePlus size={13} className="text-t2" />
                      Imagens de Referência
                      <span className="ml-auto text-[11px] text-t4 font-normal">{refImageUrls.length}/3</span>
                    </div>
                    <input ref={refImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
                    {refImageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {refImageUrls.map((url, i) => (
                          <div key={i} className="relative aspect-square rounded-[8px] overflow-hidden border border-b1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setRefImageUrls((prev) => prev.filter((_, j) => j !== i))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                            >
                              <X size={10} className="text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {refImageUrls.length < 3 && (
                      <button
                        onClick={() => refImageInputRef.current?.click()}
                        disabled={isUploadingRef}
                        className="w-full border border-dashed border-b2 rounded-[9px] py-3 flex items-center justify-center gap-2 text-t3 hover:text-white transition-colors disabled:opacity-50 text-[12px]"
                      >
                        {isUploadingRef
                          ? <><Loader2 size={12} className="animate-spin text-y" /> Enviando...</>
                          : <><ImagePlus size={13} /> Adicionar referência</>
                        }
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3.5 py-2.5 mb-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {isKling21RequiredImageMissing && !error && (
            <div className="flex items-center gap-2 text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-[10px] px-3.5 py-2.5 mb-3">
              <AlertCircle size={13} className="shrink-0" />
              Envie uma imagem de referência para gerar com Kling 2.1
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || isKling21RequiredImageMissing}
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
