"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Camera, Download, RefreshCw, Maximize2, Layers,
  Loader2, AlertCircle, ImagePlus, X, ChevronDown, ChevronUp, Pencil, Languages, Lock,
  Info, Plus, Shirt, User as UserIcon, Clock,
} from "lucide-react";
import { savePendingTask, getPendingTasks, removePendingTask, type PendingTask } from "@/lib/pending-tasks";
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

// Modelos com suporte real a imagem de referência via KIE.
// Removido Flux Pro (text-to-image puro, ignora qualquer imagem enviada).
// Removido Nano Banana Pro temporariamente — modelId KIE ainda não confirmado.
const PORTRAIT_MODELS = ["Nano Banana", "Flux Kontext"];

const MODEL_RESOLUTIONS: Record<string, Array<"1K" | "2K" | "4K">> = {
  "Nano Banana":      ["1K", "2K", "4K"],
  "Flux Kontext":     ["1K", "2K", "4K"],
};

// Quantas imagens de referência do MODELO (pessoa) cada modelo de IA aceita
const MAX_MODEL_REF_IMAGES: Record<string, number> = {
  "Nano Banana":      8,   // KIE aceita até 14, deixamos 8 pra balancear UX e custo
  "Flux Kontext":     1,   // edita 1 imagem específica
};

// Quantas imagens de referência de VESTUÁRIO cada modelo aceita
const MAX_OUTFIT_REF_IMAGES: Record<string, number> = {
  "Nano Banana":      3,
  "Flux Kontext":     0,   // não suporta múltiplas imagens
};

/** Total combinado de refs que vai pro KIE image_input array */
function totalRefImagesAllowed(model: string): number {
  return (MAX_MODEL_REF_IMAGES[model] ?? 0) + (MAX_OUTFIT_REF_IMAGES[model] ?? 0);
}

// ─── Composição do prompt ───────────────────────────────────────────────────

/**
 * Gera o prompt em inglês para envio à KIE.AI.
 *
 * Estrutura em frases completas (melhor coerência para modelos de difusão):
 *   [Estilo] photograph [Tipo]. [Referência se houver]. Wearing [Vestuário].
 *   [Cenário], [Iluminação], [Enquadramento]. [Tags de qualidade].
 *
 * Cada campo aceita tanto preset IDs (mapeados internamente) quanto texto EN
 * customizado de "outro" — se não encontrar no map, usa o valor diretamente.
 */
function buildPortraitPrompt(fields: {
  type: string;
  style: string;
  outfit: string;
  setting: string;
  lighting: string;
  framing: string;
  /** Tem ao menos 1 imagem do modelo (pessoa)? */
  hasModelRef?: boolean;
  /** Tem ao menos 1 imagem de vestuário? */
  hasOutfitRef?: boolean;
  /** Quantidade de cada tipo (pra prompt explícito com Gemini Image) */
  modelRefCount?: number;
  outfitRefCount?: number;
}): string {
  // Presets → EN photography terminology
  // Se o valor não estiver no map, assume texto EN customizado (campo "outro" traduzido)
  const styleMap: Record<string, string> = {
    "Editorial Fashion":  "high-fashion editorial",
    "Alta Costura":       "haute couture fashion",
    "Comercial":          "commercial fashion",
    "Lifestyle":          "lifestyle fashion",
    "Street Fashion":     "street fashion",
    "Retrato Artístico":  "fine art portrait",
  };
  const typeMap: Record<string, string> = {
    "feminino":  "of a beautiful female model",
    "masculino": "of a handsome male model",
    "casal":     "of an elegant couple",
    "grupo":     "of stylish models",
  };
  const settingMap: Record<string, string> = {
    "studio-white": "in a clean minimalist white photography studio",
    "studio-black": "in a dramatic black studio with dark backdrop",
    "urban":        "in an urban city street environment",
    "nature":       "in a natural outdoor setting with soft ambient light",
    "interior":     "in a luxurious elegant interior space",
    "rooftop":      "on a rooftop terrace with city skyline backdrop",
  };
  const lightingMap: Record<string, string> = {
    "natural":   "with soft natural diffused window lighting",
    "studio":    "with professional Rembrandt studio lighting setup",
    "golden":    "with warm golden hour sunlight",
    "dramatic":  "with dramatic low-key lighting and deep cinematic shadows",
    "highkey":   "with clean high-key lighting and minimal shadows",
    "neon":      "with vibrant neon colored accent lighting",
  };
  const framingMap: Record<string, string> = {
    "closeup":   "close-up portrait",
    "halfbody":  "half-body shot",
    "fullbody":  "full-body shot",
    "wide":      "wide environmental composition",
  };

  const style    = styleMap[fields.style]       ?? fields.style;
  const type_    = typeMap[fields.type]         ?? fields.type;
  const setting  = settingMap[fields.setting]   ?? fields.setting;
  const lighting = lightingMap[fields.lighting] ?? fields.lighting;
  const framing  = framingMap[fields.framing]   ?? fields.framing;

  const sentences: string[] = [];

  // Cena principal
  const scene = [style, "photograph", type_].filter(Boolean).join(" ");
  if (scene.trim()) sentences.push(scene.charAt(0).toUpperCase() + scene.slice(1) + ".");

  // Fidelidade à referência — instrução de maior prioridade para o modelo.
  // Texto reforçado em duas frases pra modelos diffusion-based dar mais peso.
  if (fields.hasModelRef) {
    sentences.push(
      "The subject's face, hairstyle, skin tone, and overall identity must match exactly the reference image(s) provided — same person, no facial alterations."
    );
    sentences.push(
      "Maintain consistent facial structure, eye shape, nose, lips, and jawline from the reference."
    );
  }

  // Quando há referência de vestuário separada, instrui o modelo a combinar:
  // as primeiras N imagens são a pessoa, as últimas M são a roupa.
  // Funciona melhor com modelos multimodais (Gemini Image / Nano Banana 2).
  if (fields.hasOutfitRef && fields.hasModelRef) {
    const n = fields.modelRefCount ?? 1;
    const m = fields.outfitRefCount ?? 1;
    const totalNum = n + m;
    sentences.push(
      `Important: among the ${totalNum} reference images provided, the first ${n} ${n === 1 ? "image shows" : "images show"} the model's identity (face, hair, body) and must be preserved. The remaining ${m} ${m === 1 ? "image shows" : "images show"} the desired clothing/outfit — replicate this clothing style and design on the model.`
    );
  } else if (fields.hasOutfitRef && !fields.hasModelRef) {
    // Só referência de roupa — instrui só sobre vestuário
    sentences.push(
      "The reference image(s) show the desired clothing/outfit style to be worn by the model."
    );
  }

  // Vestuário
  if (fields.outfit?.trim()) sentences.push(`Wearing ${fields.outfit.trim()}.`);

  // Ambiente + técnica fotográfica
  const env: string[] = [];
  if (setting)  env.push(setting);
  if (lighting) env.push(lighting);
  if (framing)  env.push(framing);
  if (env.length > 0) sentences.push(env.join(", ") + ".");

  // Tags de qualidade
  sentences.push(
    "Photorealistic, ultra-detailed, sharp focus, 85mm prime lens, professional camera, subtle background bokeh, high resolution, magazine editorial quality."
  );

  return sentences.join(" ");
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
  const [activeModel, setActiveModel]     = useState("Nano Banana");
  const [resolution, setResolution]       = useState<"1K" | "2K" | "4K">("1K");
  const [activeCount, setActiveCount]     = useState(1);

  // Tradução automática do vestuário (PT → EN, debounced)
  const [outfitEn, setOutfitEn]           = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Referências do MODELO (rosto/corpo da pessoa) — múltiplas pra fidelidade
  const [refImageUrls, setRefImageUrls]   = useState<string[]>([]);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const refFileRef = useRef<HTMLInputElement>(null);

  // Referências de VESTUÁRIO (peças de roupa que devem ser usadas)
  const [outfitRefUrls, setOutfitRefUrls] = useState<string[]>([]);
  const [isUploadingOutfit, setIsUploadingOutfit] = useState(false);
  const outfitRefFileRef = useRef<HTMLInputElement>(null);

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

  // Gerações pendentes (timeout no polling) — exibidas em banner pra recuperar
  const [pending, setPending] = useState<PendingTask[]>([]);
  const [recovering, setRecovering] = useState(false);

  // Campos "outro" — texto livre PT + tradução EN
  const [outroTexts, setOutroTexts] = useState<Record<string, string>>({
    tipo: "", style: "", cenario: "", lighting: "", framing: "",
  });
  const [outroTextsEn, setOutroTextsEn] = useState<Record<string, string>>({});
  const [isTranslatingOutro, setIsTranslatingOutro] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout[]>([]);
  const promptRef  = useRef("");
  const modelRef   = useRef(activeModel);
  modelRef.current = activeModel;

  useEffect(() => {
    return () => { pollingRef.current.forEach(clearInterval); pollingRef.current = []; };
  }, []);

  // Carrega pending tasks do localStorage ao montar (filtra apenas portrait)
  useEffect(() => {
    setPending(getPendingTasks("portrait"));
  }, []);

  /** Recupera tasks pendentes: checa status na KIE e salva na gallery se sucesso. */
  async function recoverPendingTasks() {
    if (recovering || pending.length === 0) return;
    setRecovering(true);
    let recoveredCount = 0;
    let stillPendingCount = 0;
    let failedCount = 0;

    for (const task of pending) {
      try {
        const res = await fetch(`/api/generate/status?taskId=${encodeURIComponent(task.taskId)}`);
        const data = await res.json();
        if (data.state === "success" && data.imageUrl) {
          // Salva na gallery
          await fetch("/api/gallery/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: task.type, prompt: task.prompt,
              model: task.model, externalUrl: data.imageUrl,
            }),
          }).catch(() => {});
          removePendingTask(task.taskId);
          recoveredCount++;
        } else if (data.state === "fail") {
          removePendingTask(task.taskId);
          failedCount++;
        } else {
          // Ainda processando — mantém na lista
          stillPendingCount++;
        }
      } catch {
        // Erro de rede — mantém pra tentar de novo
        stillPendingCount++;
      }
    }

    setPending(getPendingTasks("portrait"));
    setRecovering(false);

    if (recoveredCount > 0) {
      showToast(`✓ ${recoveredCount} ${recoveredCount === 1 ? "imagem recuperada" : "imagens recuperadas"} pra galeria`);
    } else if (failedCount > 0 && stillPendingCount === 0) {
      showToast(`${failedCount} ${failedCount === 1 ? "geração falhou" : "gerações falharam"} na KIE`);
    } else if (stillPendingCount > 0) {
      showToast(`${stillPendingCount} ainda processando — tente em alguns minutos`);
    }
  }

  function dismissPending(taskId: string) {
    removePendingTask(taskId);
    setPending(getPendingTasks("portrait"));
  }

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

  // Tradução batch dos campos "outro" — 600ms debounce, todos de uma vez
  useEffect(() => {
    const entries = Object.entries(outroTexts).filter(([, v]) => v.trim());
    if (entries.length === 0) { setOutroTextsEn({}); return; }
    setIsTranslatingOutro(true);
    const timer = setTimeout(async () => {
      try {
        const results: Record<string, string> = {};
        await Promise.all(
          entries.map(async ([key, text]) => {
            try {
              const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              });
              const data = await res.json();
              results[key] = data.translated ?? text;
            } catch { results[key] = text; }
          })
        );
        setOutroTextsEn(results);
      } finally { setIsTranslatingOutro(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [outroTexts]);

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

  // Prompt composto — resolve campos "outro" para EN antes de passar ao builder
  const composedPrompt = useMemo(() => {
    const resolve = (field: string, key: string) =>
      field === "outro" ? (outroTextsEn[key] || outroTexts[key] || "") : field;
    return buildPortraitPrompt({
      type:         resolve(portraitType, "tipo"),
      style:        resolve(shootStyle,   "style"),
      outfit:       outfitEn || outfit,
      setting:      resolve(setting,      "cenario"),
      lighting:     resolve(lighting,     "lighting"),
      framing:      resolve(framing,      "framing"),
      hasModelRef:  refImageUrls.length > 0,
      hasOutfitRef: outfitRefUrls.length > 0,
      modelRefCount:  refImageUrls.length,
      outfitRefCount: outfitRefUrls.length,
    });
  }, [portraitType, shootStyle, outfit, outfitEn, setting, lighting, framing, outroTexts, outroTextsEn, refImageUrls, outfitRefUrls]);

  // Quando qualquer campo muda, limpa o override manual do prompt
  useEffect(() => {
    setPromptOverride(null);
  }, [portraitType, shootStyle, outfit, outfitEn, setting, lighting, framing, outroTexts, outroTextsEn, refImageUrls, outfitRefUrls]);

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

  // Upload de referência do MODELO (rosto/corpo) — múltiplas imagens
  async function handleRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxForModel = MAX_MODEL_REF_IMAGES[activeModel] ?? 1;
    if (refImageUrls.length >= maxForModel) {
      showToast(`Limite de ${maxForModel} ${maxForModel === 1 ? "imagem" : "imagens"} de modelo para ${activeModel}`);
      return;
    }
    setIsUploadingRef(true);
    try {
      const url = await uploadReferenceFile(file);
      if (url) setRefImageUrls((prev) => [...prev, url]);
      else showToast("Falha no upload — tente novamente");
    } finally {
      setIsUploadingRef(false);
      if (e.target) e.target.value = "";
    }
  }

  function removeRefImage(idx: number) {
    setRefImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  // Upload de referência de VESTUÁRIO — múltiplas imagens
  async function handleOutfitRefUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxOutfit = MAX_OUTFIT_REF_IMAGES[activeModel] ?? 0;
    if (outfitRefUrls.length >= maxOutfit) {
      showToast(`Limite de ${maxOutfit} ${maxOutfit === 1 ? "imagem" : "imagens"} de vestuário para ${activeModel}`);
      return;
    }
    setIsUploadingOutfit(true);
    try {
      const url = await uploadReferenceFile(file);
      if (url) setOutfitRefUrls((prev) => [...prev, url]);
      else showToast("Falha no upload — tente novamente");
    } finally {
      setIsUploadingOutfit(false);
      if (e.target) e.target.value = "";
    }
  }

  function removeOutfitRefImage(idx: number) {
    setOutfitRefUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  // Polling — timeout aumentado pra 6min (Flux Kontext é mais lento).
  // No timeout, salva no localStorage pra usuário recuperar depois.
  const pollTask = useCallback((taskId: string, index: number) => {
    let ticks = 0;
    const MAX_TICKS = 120; // ~6min @ 3s — antes era 60 (3min) e estourava em Flux Kontext
    const interval = setInterval(async () => {
      if (++ticks > MAX_TICKS) {
        clearInterval(interval);
        // Salva no localStorage — usuário pode recuperar depois via banner
        savePendingTask({
          taskId,
          source: "portrait",
          type: "image",
          model: modelRef.current,
          prompt: promptRef.current.slice(0, 300),
          createdAt: Date.now(),
        });
        setImages((prev) => prev.map((img, i) =>
          i === index ? {
            ...img,
            state: "fail",
            error: "Tempo limite do navegador — geração salva pra recuperar depois",
          } : img
        ));
        return;
      }
      try {
        const res  = await fetch(`/api/generate/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (data.state === "success") {
          clearInterval(interval);
          // Remove de pending se estava lá
          removePendingTask(taskId);
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
          removePendingTask(taskId);
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
      // Mapeia uploads pro parâmetro certo conforme o modelo:
      //  - Nano Banana → referenceImages (array, KIE aceita até 14). Concatenamos
      //    [...modelo, ...vestuário] nessa ordem — o prompt diz ao Gemini Image
      //    "as primeiras N são modelo, as últimas M são roupa".
      //  - Flux Kontext → inputImage (única imagem, sem suporte a vestuário separado)
      const isNanoFamily = activeModel === "Nano Banana" || activeModel === "Nano Banana Pro";
      const isFluxKontext = activeModel === "Flux Kontext";

      const combinedRefs = [...refImageUrls, ...outfitRefUrls];

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
            isNanoFamily && combinedRefs.length > 0 ? combinedRefs : undefined,
          inputImage:
            isFluxKontext && refImageUrls.length > 0 ? refImageUrls[0] : undefined,
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

      {/* Banner de gerações pendentes (timeout no polling) */}
      {pending.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex items-start gap-3 p-3 rounded-[10px] bg-orange-500/5 border border-orange-500/20">
            <Clock size={14} className="text-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-orange-300 mb-0.5">
                {pending.length} {pending.length === 1 ? "geração pendente" : "gerações pendentes"} de recuperação
              </div>
              <div className="text-[11.5px] text-orange-200/80 leading-relaxed">
                Gerações que estouraram o tempo limite do navegador mas podem ter completado na KIE.
                Click <strong>Recuperar</strong> pra checar status e salvar as que terminaram.
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {pending.slice(0, 3).map((t) => (
                  <div key={t.taskId} className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-card2 border border-b1 text-[10.5px] text-t2">
                    <span className="font-mono text-t4">{t.taskId.slice(0, 8)}…</span>
                    <span className="text-t3">·</span>
                    <span>{t.model}</span>
                    <button
                      onClick={() => dismissPending(t.taskId)}
                      className="text-t4 hover:text-red-400 ml-1"
                      title="Descartar"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {pending.length > 3 && (
                  <span className="text-[10.5px] text-t4">+ {pending.length - 3}</span>
                )}
              </div>
            </div>
            <button
              onClick={recoverPendingTasks}
              disabled={recovering}
              className="px-3 py-2 rounded-[8px] bg-orange-500 text-white text-[12px] font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {recovering ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Recuperar
            </button>
          </div>
        </div>
      )}

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
              <OptionBtn active={portraitType === "outro"} onClick={() => setPortraitType("outro")}
                className="col-span-4 py-2 flex items-center justify-center gap-1.5"
              >
                <Pencil size={11} />
                Outro
              </OptionBtn>
            </div>
            {portraitType === "outro" && (
              <div className="mt-2">
                <input
                  type="text" value={outroTexts.tipo}
                  onChange={(e) => setOutroTexts((p) => ({ ...p, tipo: e.target.value }))}
                  placeholder="ex: pessoa idosa, criança, grupo corporativo..."
                  maxLength={80}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
                />
                {outroTexts.tipo.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
                    {isTranslatingOutro
                      ? <Loader2 size={10} className="animate-spin text-t4 shrink-0" />
                      : <Languages size={10} className="text-y shrink-0" />}
                    <span className="text-[10.5px] text-t3">
                      {isTranslatingOutro ? "Traduzindo..." : outroTextsEn.tipo
                        ? <><span className="text-t4">en: </span><span className="text-[#c8a84b] italic">{outroTextsEn.tipo}</span></>
                        : null}
                    </span>
                  </div>
                )}
              </div>
            )}
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
              <OptionBtn active={shootStyle === "outro"} onClick={() => setShootStyle("outro")}
                className="col-span-2 py-2 flex items-center justify-center gap-1.5"
              >
                <Pencil size={11} />
                Outro
              </OptionBtn>
            </div>
            {shootStyle === "outro" && (
              <div className="mt-2">
                <input
                  type="text" value={outroTexts.style}
                  onChange={(e) => setOutroTexts((p) => ({ ...p, style: e.target.value }))}
                  placeholder="ex: ensaio grunge, fotografia vintage, moda praia..."
                  maxLength={80}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
                />
                {outroTexts.style.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
                    {isTranslatingOutro
                      ? <Loader2 size={10} className="animate-spin text-t4 shrink-0" />
                      : <Languages size={10} className="text-y shrink-0" />}
                    <span className="text-[10.5px] text-t3">
                      {isTranslatingOutro ? "Traduzindo..." : outroTextsEn.style
                        ? <><span className="text-t4">en: </span><span className="text-[#c8a84b] italic">{outroTextsEn.style}</span></>
                        : null}
                    </span>
                  </div>
                )}
              </div>
            )}
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
              <OptionBtn active={setting === "outro"} onClick={() => setSetting("outro")}
                className="col-span-2 py-2 flex items-center justify-center gap-1.5"
              >
                <Pencil size={11} />
                Outro
              </OptionBtn>
            </div>
            {setting === "outro" && (
              <div className="mt-2">
                <input
                  type="text" value={outroTexts.cenario}
                  onChange={(e) => setOutroTexts((p) => ({ ...p, cenario: e.target.value }))}
                  placeholder="ex: piscina, praia tropical, parque florido..."
                  maxLength={80}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
                />
                {outroTexts.cenario.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
                    {isTranslatingOutro
                      ? <Loader2 size={10} className="animate-spin text-t4 shrink-0" />
                      : <Languages size={10} className="text-y shrink-0" />}
                    <span className="text-[10.5px] text-t3">
                      {isTranslatingOutro ? "Traduzindo..." : outroTextsEn.cenario
                        ? <><span className="text-t4">en: </span><span className="text-[#c8a84b] italic">{outroTextsEn.cenario}</span></>
                        : null}
                    </span>
                  </div>
                )}
              </div>
            )}
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
              <OptionBtn active={lighting === "outro"} onClick={() => setLighting("outro")}
                className="col-span-3 py-2 flex items-center justify-center gap-1.5"
              >
                <Pencil size={11} />
                Outro
              </OptionBtn>
            </div>
            {lighting === "outro" && (
              <div className="mt-2">
                <input
                  type="text" value={outroTexts.lighting}
                  onChange={(e) => setOutroTexts((p) => ({ ...p, lighting: e.target.value }))}
                  placeholder="ex: luz de vela, luz de neon azul, pôr do sol..."
                  maxLength={80}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
                />
                {outroTexts.lighting.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
                    {isTranslatingOutro
                      ? <Loader2 size={10} className="animate-spin text-t4 shrink-0" />
                      : <Languages size={10} className="text-y shrink-0" />}
                    <span className="text-[10.5px] text-t3">
                      {isTranslatingOutro ? "Traduzindo..." : outroTextsEn.lighting
                        ? <><span className="text-t4">en: </span><span className="text-[#c8a84b] italic">{outroTextsEn.lighting}</span></>
                        : null}
                    </span>
                  </div>
                )}
              </div>
            )}
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
              <OptionBtn active={framing === "outro"} onClick={() => setFraming("outro")}
                className="col-span-2 py-2 flex items-center justify-center gap-1.5"
              >
                <Pencil size={11} />
                Outro
              </OptionBtn>
            </div>
            {framing === "outro" && (
              <div className="mt-2">
                <input
                  type="text" value={outroTexts.framing}
                  onChange={(e) => setOutroTexts((p) => ({ ...p, framing: e.target.value }))}
                  placeholder="ex: plano americano, visão de baixo para cima, perspectiva aérea..."
                  maxLength={80}
                  className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2 transition-colors"
                />
                {outroTexts.framing.trim() && (
                  <div className="mt-1.5 flex items-center gap-1.5 min-h-[16px]">
                    {isTranslatingOutro
                      ? <Loader2 size={10} className="animate-spin text-t4 shrink-0" />
                      : <Languages size={10} className="text-y shrink-0" />}
                    <span className="text-[10.5px] text-t3">
                      {isTranslatingOutro ? "Traduzindo..." : outroTextsEn.framing
                        ? <><span className="text-t4">en: </span><span className="text-[#c8a84b] italic">{outroTextsEn.framing}</span></>
                        : null}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Referência do MODELO (rosto/corpo da pessoa) */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon size={12} className="text-y" />
              <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider flex-1">Referência do Modelo</p>
              <span className="text-[10.5px] text-t4">
                {refImageUrls.length}/{MAX_MODEL_REF_IMAGES[activeModel] ?? 1}
              </span>
            </div>

            {/* Dica contextual */}
            <div className="flex items-start gap-1.5 mb-2.5 p-2 rounded-[8px] bg-y/5 border border-y/15">
              <Info size={11} className="text-y shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-t2 leading-[1.45]">
                {activeModel === "Flux Kontext" ? (
                  <>Envie <strong className="text-white">1 foto</strong> do rosto/corpo — o modelo edita essa imagem aplicando o estilo.</>
                ) : (
                  <>Pra fidelidade máxima, envie <strong className="text-white">3-8 fotos</strong> de ângulos diferentes (frontal, 3/4, perfil, sorrindo, sério).</>
                )}
              </p>
            </div>

            <input ref={refFileRef} type="file" accept="image/*" className="hidden" onChange={handleRefUpload} />

            {refImageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {refImageUrls.map((url, i) => (
                  <div key={url + i} className="relative rounded-[8px] overflow-hidden border border-b1 aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Ref modelo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeRefImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isUploadingRef ? (
              <div className="w-full border border-dashed border-b2 rounded-[10px] py-4 flex items-center justify-center gap-2 text-t3">
                <Loader2 size={13} className="animate-spin text-y" />
                <span className="text-[12px]">Enviando...</span>
              </div>
            ) : refImageUrls.length < (MAX_MODEL_REF_IMAGES[activeModel] ?? 1) ? (
              <button
                onClick={() => refFileRef.current?.click()}
                className="w-full border border-dashed border-b2 rounded-[10px] py-3 flex items-center justify-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors"
              >
                {refImageUrls.length === 0 ? <ImagePlus size={14} /> : <Plus size={13} />}
                <span className="text-[12px]">
                  {refImageUrls.length === 0 ? "Adicionar foto do modelo" : "Adicionar mais"}
                </span>
              </button>
            ) : (
              <p className="text-[11px] text-t4 text-center py-2">
                Limite de {MAX_MODEL_REF_IMAGES[activeModel]} {MAX_MODEL_REF_IMAGES[activeModel] === 1 ? "imagem" : "imagens"} atingido
              </p>
            )}
          </div>

          {/* Referência de VESTUÁRIO — só pra modelos que suportam múltiplas imagens */}
          {(MAX_OUTFIT_REF_IMAGES[activeModel] ?? 0) > 0 && (
            <div className="bg-card border border-b1 rounded-[11px] p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Shirt size={12} className="text-y" />
                <p className="text-[12px] font-semibold text-t3 uppercase tracking-wider flex-1">Referência de Vestuário</p>
                <span className="text-[10.5px] text-t4">
                  {outfitRefUrls.length}/{MAX_OUTFIT_REF_IMAGES[activeModel]}
                </span>
              </div>

              <div className="flex items-start gap-1.5 mb-2.5 p-2 rounded-[8px] bg-y/5 border border-y/15">
                <Info size={11} className="text-y shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-t2 leading-[1.45]">
                  Envie até <strong className="text-white">3 fotos de roupas</strong> (camisa, calça, vestido…). O modelo de IA combina a pessoa da referência acima com essas peças. <strong className="text-white">Complementa</strong> o campo de texto Vestuário — pode usar os dois.
                </p>
              </div>

              <input ref={outfitRefFileRef} type="file" accept="image/*" className="hidden" onChange={handleOutfitRefUpload} />

              {outfitRefUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {outfitRefUrls.map((url, i) => (
                    <div key={url + i} className="relative rounded-[8px] overflow-hidden border border-b1 aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ref vestuário ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeOutfitRefImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isUploadingOutfit ? (
                <div className="w-full border border-dashed border-b2 rounded-[10px] py-4 flex items-center justify-center gap-2 text-t3">
                  <Loader2 size={13} className="animate-spin text-y" />
                  <span className="text-[12px]">Enviando...</span>
                </div>
              ) : outfitRefUrls.length < (MAX_OUTFIT_REF_IMAGES[activeModel] ?? 0) ? (
                <button
                  onClick={() => outfitRefFileRef.current?.click()}
                  className="w-full border border-dashed border-b2 rounded-[10px] py-3 flex items-center justify-center gap-2 text-t3 hover:text-white hover:border-b2 transition-colors"
                >
                  {outfitRefUrls.length === 0 ? <Shirt size={14} /> : <Plus size={13} />}
                  <span className="text-[12px]">
                    {outfitRefUrls.length === 0 ? "Adicionar foto de roupa" : "Adicionar mais"}
                  </span>
                </button>
              ) : (
                <p className="text-[11px] text-t4 text-center py-2">
                  Limite de {MAX_OUTFIT_REF_IMAGES[activeModel]} imagens de vestuário atingido
                </p>
              )}
            </div>
          )}

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
                      // Recorta arrays se excederem os novos limites
                      const maxModel = MAX_MODEL_REF_IMAGES[m] ?? 1;
                      if (refImageUrls.length > maxModel) {
                        setRefImageUrls((prev) => prev.slice(0, maxModel));
                      }
                      const maxOutfit = MAX_OUTFIT_REF_IMAGES[m] ?? 0;
                      if (outfitRefUrls.length > maxOutfit) {
                        setOutfitRefUrls((prev) => prev.slice(0, maxOutfit));
                      }
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
