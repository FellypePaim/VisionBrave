"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { calculateCost } from "@/lib/credits";
import { Topbar } from "@/components/layout/Topbar";
import {
  Wand2, Download, Zap, Loader2, AlertCircle,
  Music, Mic, MicOff, Play, Pause, ChevronDown, ChevronUp,
} from "lucide-react";

const MODELS = [
  { id: "V4_5",    label: "Suno V4.5",      badge: "Popular" },
  { id: "V4_5PLUS",label: "Suno V4.5+",     badge: "New" },
  { id: "V4_5ALL", label: "Suno V4.5 All",  badge: null },
  { id: "V5",      label: "Suno V5",        badge: null },
  { id: "V5_5",    label: "Suno V5.5",      badge: "Best" },
  { id: "V4",      label: "Suno V4",        badge: null },
];

const STYLE_PRESETS = ["Pop", "Hip-Hop", "Lo-fi", "Cinematic", "Jazz", "Rock", "Electronic", "Acoustic"];

interface Track {
  id: string;
  audioUrl: string;
  imageUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
}

type GenStatus = "idle" | "pending" | "partial" | "done" | "failed";

export default function GenerateAudioPage() {
  const [activeModel, setActiveModel] = useState("V4_5");
  const generationCost = useMemo(() => calculateCost(activeModel), [activeModel]);
  const [prompt, setPrompt] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<"m" | "f" | null>(null);
  const [negativeTags, setNegativeTags] = useState("");
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5);
  const [audioWeight, setAudioWeight] = useState(0.5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
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
    const MAX_TICKS = 60; // ~5min @ 5s
    const interval = setInterval(async () => {
      if (++ticks > MAX_TICKS) {
        clearInterval(interval);
        setError("Tempo limite excedido");
        setGenStatus("failed");
        return;
      }
      try {
        const res = await fetch(`/api/generate/music/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();

        if (data.status === "SUCCESS") {
          clearInterval(interval);
          setTracks(data.tracks ?? []);
          setGenStatus("done");
          // Auto-save tracks to gallery
          for (const track of (data.tracks ?? [])) {
            if (track.audioUrl) {
              fetch("/api/gallery/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "audio",
                  prompt: promptRef.current,
                  model: modelRef.current,
                  externalUrl: track.audioUrl,
                  metadata: { title: track.title, tags: track.tags, duration: track.duration, imageUrl: track.imageUrl },
                }),
              }).catch((e) => console.error("[gallery/save]", e));
            }
          }
        } else if (data.status === "FIRST_SUCCESS" && data.tracks?.length) {
          setTracks(data.tracks);
          setGenStatus("partial");
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setError(data.error ?? "Falha na geração");
          setGenStatus("failed");
        }
      } catch {
        clearInterval(interval);
        setError("Erro de rede");
        setGenStatus("failed");
      }
    }, 5000);

    pollingRef.current = interval;
  }, []);

  async function handleEnhancePrompt() {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "audio" }),
      });
      const data = await res.json();
      if (data.enhanced) setPrompt(data.enhanced);
    } finally {
      setIsEnhancing(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim() || genStatus === "pending") return;
    setError(null);
    setTracks([]);
    setGenStatus("pending");
    if (pollingRef.current) clearInterval(pollingRef.current);

    try {
      const res = await fetch("/api/generate/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model: activeModel,
          customMode,
          style,
          title,
          instrumental,
          vocalGender: !instrumental && vocalGender ? vocalGender : undefined,
          negativeTags: negativeTags.trim() || undefined,
          styleWeight,
          weirdnessConstraint,
          audioWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskId) {
        setError(data.error ?? "Falha ao iniciar geração");
        setGenStatus("failed");
        return;
      }

      pollTask(data.taskId);
    } catch {
      setError("Erro de rede. Tente novamente.");
      setGenStatus("failed");
    }
  }

  function togglePlay(track: Track) {
    const audio = audioRefs.current[track.id];
    if (!audio) return;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      // pause any other playing track
      Object.entries(audioRefs.current).forEach(([id, el]) => {
        if (id !== track.id) el.pause();
      });
      audio.play();
      setPlayingId(track.id);
    }
  }

  function formatDuration(s?: number) {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const isPending = genStatus === "pending" || genStatus === "partial";

  return (
    <>
      <Topbar title="Gerar Áudio" />

      <div className="flex flex-1 overflow-hidden">
        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-b1">
          {/* Canvas */}
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
            {tracks.length === 0 && genStatus === "idle" && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                  <Music size={28} className="text-t4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#d0d0d0] mb-1">Nenhuma faixa ainda</p>
                  <p className="text-[13px] text-t3">Descreva uma música e clique em Gerar</p>
                </div>
              </div>
            )}

            {isPending && tracks.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-b2" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-y border-t-transparent animate-spin" />
                </div>
                <p className="text-[13px] text-t3">Compondo sua faixa...</p>
                <p className="text-[11.5px] text-t4">Geralmente leva 30–90 segundos</p>
              </div>
            )}

            {genStatus === "failed" && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-red-400">
                <AlertCircle size={32} />
                <p className="text-[13px]">{error ?? "Falha na geração"}</p>
              </div>
            )}

            {tracks.length > 0 && (
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                {isPending && (
                  <div className="flex items-center gap-2 text-[12.5px] text-t3 mb-2">
                    <Loader2 size={12} className="animate-spin text-y" />
                    Gerando faixas restantes...
                  </div>
                )}
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 bg-card border border-b1 rounded-[16px] p-4 hover:border-b2 transition-colors"
                  >
                    {/* Cover */}
                    <div className="w-[64px] h-[64px] rounded-[10px] overflow-hidden shrink-0 bg-card2 border border-b1 flex items-center justify-center">
                      {track.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={track.imageUrl} alt={track.title ?? "cover"} className="w-full h-full object-cover" />
                      ) : (
                        <Music size={22} className="text-t4" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate mb-0.5">
                        {track.title ?? "Faixa Sem Título"}
                      </p>
                      {track.tags && (
                        <p className="text-[11.5px] text-t3 truncate mb-1">{track.tags}</p>
                      )}
                      {track.duration && (
                        <p className="text-[11px] text-t4">{formatDuration(track.duration)}</p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => togglePlay(track)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#1a0e00] transition-all hover:scale-105"
                        style={{ background: "#FBBF24", boxShadow: "0 2px 12px #FBBF2430" }}
                      >
                        {playingId === track.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
                      </button>
                      <a
                        href={track.audioUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 bg-card2 border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
                      >
                        <Download size={14} />
                      </a>
                    </div>

                    {/* Hidden audio element */}
                    <audio
                      ref={(el) => { if (el) audioRefs.current[track.id] = el; }}
                      src={track.audioUrl}
                      onEnded={() => setPlayingId(null)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom status bar */}
          {isPending && tracks.length > 0 && (
            <div className="flex items-center justify-center px-6 py-3 border-t border-b1 shrink-0">
              <span className="flex items-center gap-2 text-[13px] text-t3">
                <Loader2 size={13} className="animate-spin text-y" />
                Gerando mais faixas...
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
          <div className="bg-card border border-b1 rounded-xl p-3.5 mb-4">
            <p className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">
              {customMode ? "Letra / Descrição" : "Descrição da Música"}
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={customMode
                ? "Escreva a letra da sua música aqui..."
                : "Uma balada melancólica de piano sobre sentir falta de alguém à noite..."}
              rows={5}
              maxLength={3000}
              className="w-full bg-transparent text-[12.5px] leading-[1.6] text-[#c0c0c0] placeholder-t4 outline-none resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-t3">{prompt.length} / 3000</span>
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

          {/* Custom mode */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-[#d8d8d8]">Modo Personalizado</span>
              <button
                onClick={() => setCustomMode(!customMode)}
                className={`w-10 h-5 rounded-full transition-colors relative ${customMode ? "bg-y" : "bg-card2 border border-b1"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${customMode ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            {customMode && (
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-[11px] text-t3 mb-1">Estilo</p>
                  <input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="ex: Dark pop, cinemático"
                    className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {STYLE_PRESETS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          style === s ? "bg-[#1f1608] border-y text-y" : "bg-card border-b1 text-t3 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-t3 mb-1">Título</p>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título da música"
                    maxLength={80}
                    className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instrumental toggle */}
          <div className="bg-card border border-b1 rounded-[11px] px-3.5 py-3 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {instrumental ? <MicOff size={14} className="text-t2" /> : <Mic size={14} className="text-t2" />}
                <span className="text-[13px] font-medium text-[#d8d8d8]">Apenas instrumental</span>
              </div>
              <button
                onClick={() => setInstrumental(!instrumental)}
                className={`w-10 h-5 rounded-full transition-colors relative ${instrumental ? "bg-y" : "bg-card2 border border-b1"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${instrumental ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            {/* Vocal gender (only when not instrumental) */}
            {!instrumental && (
              <div className="mt-3 pt-3 border-t border-b1">
                <p className="text-[11px] text-t3 mb-2">Gênero Vocal</p>
                <div className="flex gap-2">
                  {[
                    { v: null, label: "Qualquer" },
                    { v: "m" as const, label: "Masculino" },
                    { v: "f" as const, label: "Feminino" },
                  ].map(({ v, label }) => (
                    <button
                      key={label}
                      onClick={() => setVocalGender(v)}
                      className={`flex-1 py-1.5 rounded-[8px] text-[11.5px] font-medium border transition-all ${
                        vocalGender === v
                          ? "bg-[#1f1608] border-y text-y"
                          : "bg-card2 border-b1 text-t3 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Negative tags */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <p className="text-[11px] font-semibold text-t3 uppercase tracking-wider mb-2">Excluir Estilos</p>
            <input
              value={negativeTags}
              onChange={(e) => setNegativeTags(e.target.value)}
              placeholder="ex: heavy metal, distorção, grito"
              className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-[#c0c0c0] placeholder-t4 outline-none focus:border-b2"
            />
          </div>

          {/* Advanced controls */}
          <div className="bg-card border border-b1 rounded-[11px] mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-3.5 py-3 text-[13px] font-semibold text-[#d8d8d8]"
            >
              Avançado
              {showAdvanced ? <ChevronUp size={14} className="text-t3" /> : <ChevronDown size={14} className="text-t3" />}
            </button>

            {showAdvanced && (
              <div className="px-3.5 pb-3.5 flex flex-col gap-4 border-t border-b1 pt-3">
                {[
                  { label: "Peso do Estilo", value: styleWeight, set: setStyleWeight, hint: "Aderência ao estilo do prompt" },
                  { label: "Estranheza", value: weirdnessConstraint, set: setWeirdnessConstraint, hint: "Menor = convencional, maior = experimental" },
                  { label: "Peso do Áudio", value: audioWeight, set: setAudioWeight, hint: "Equilíbrio entre qualidade e criatividade" },
                ].map(({ label, value, set, hint }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11.5px] font-medium text-t2">{label}</p>
                      <span className="text-[11px] text-t3">{value.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0} max={1} step={0.01}
                      value={value}
                      onChange={(e) => set(parseFloat(e.target.value))}
                      className="w-full h-1 accent-y cursor-pointer"
                    />
                    <p className="text-[10.5px] text-t4 mt-1">{hint}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
              <Zap size={14} className="text-t2" />
              Modelo
            </div>
            <div className="flex flex-col gap-1.5">
              {MODELS.map(({ id, label, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveModel(id)}
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

          {/* Error */}
          {error && genStatus === "failed" && (
            <div className="flex items-center gap-2 text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3.5 py-2.5 mb-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            className="w-full rounded-xl py-3.5 text-[14.5px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Compondo...</>
            ) : (
              <>
                <Zap size={14} fill="currentColor" />
                Gerar
                <span className="ml-1 px-2 py-0.5 rounded-md bg-[#1a0e00]/15 text-[12px] font-bold tabular-nums">
                  −{generationCost} VBC
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
