"use client";

import { useState, useRef, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Wand2, Download, RefreshCw, Crop, Layers, Sparkles,
  Sliders, ChevronRight, Plus, MoreHorizontal, Zap, Loader2, AlertCircle,
} from "lucide-react";

const TAGS = ["All", "Realistic", "Cinematic", "Anime", "3D Render", "Oil Paint", "Sketch", "Neon"];
const COUNTS = [1, 2, 3, 4];
const MODELS = ["Flux Pro", "Flux Dev", "Flux Schnell", "SDXL"];

interface GeneratedImage {
  taskId: string;
  state: "queued" | "running" | "success" | "fail";
  imageUrl?: string;
  error?: string;
}

export default function GenerateImagesPage() {
  const [activeTag, setActiveTag] = useState("Cinematic");
  const [activeCount, setActiveCount] = useState(1);
  const [activeModel, setActiveModel] = useState("Flux Pro");
  const [prompt, setPrompt] = useState("");
  const [detailLevel, setDetailLevel] = useState(72);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout[]>([]);

  const pollTask = useCallback((taskId: string, index: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();

        if (data.state === "success") {
          clearInterval(interval);
          setImages((prev) => prev.map((img, i) =>
            i === index ? { ...img, state: "success", imageUrl: data.imageUrl } : img
          ));
        } else if (data.state === "fail") {
          clearInterval(interval);
          setImages((prev) => prev.map((img, i) =>
            i === index ? { ...img, state: "fail", error: data.error } : img
          ));
        }
      } catch {
        clearInterval(interval);
        setImages((prev) => prev.map((img, i) =>
          i === index ? { ...img, state: "fail", error: "Network error" } : img
        ));
      }
    }, 3000);

    pollingRef.current.push(interval);
  }, []);

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
          style: activeTag !== "All" ? activeTag : undefined,
          count: activeCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.taskIds) {
        setError(data.error ?? "Failed to start generation");
        return;
      }

      const initial: GeneratedImage[] = data.taskIds.map((taskId: string) => ({
        taskId,
        state: "queued" as const,
      }));
      setImages(initial);
      initial.forEach((img, i) => pollTask(img.taskId, i));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  const pendingCount = images.filter((i) => i.state === "queued" || i.state === "running").length;

  return (
    <>
      <Topbar title="Generate Images" />

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
              /* Empty state */
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-t4" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#d0d0d0] mb-1">No images yet</p>
                  <p className="text-[13px] text-t3">Write a prompt and click Generate</p>
                </div>
              </div>
            ) : (
              /* Images grid / fan */
              <div className={`grid gap-4 w-full max-w-3xl ${activeCount === 1 ? "grid-cols-1 max-w-sm" : activeCount === 2 ? "grid-cols-2" : activeCount === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {images.map((img, i) => (
                  <div
                    key={img.taskId}
                    className="relative rounded-[18px] overflow-hidden border border-b1 bg-card aspect-[2/3]"
                    style={{ boxShadow: "0 20px 60px #000000aa" }}
                  >
                    {img.state === "success" && img.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt={`Generated ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <a
                          href={img.imageUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
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
                        <p className="text-[12px] text-center">{img.error ?? "Failed"}</p>
                      </div>
                    ) : (
                      /* Loading state */
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-b2" />
                          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-y border-t-transparent animate-spin" />
                        </div>
                        <p className="text-[12px] text-t3 capitalize">{img.state}...</p>
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
              { icon: RefreshCw, label: "Regenerate", action: handleGenerate },
              { icon: Crop, label: "Crop" },
              { icon: Layers, label: "Variations" },
              { icon: Sparkles, label: "Enhance" },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                title={label}
                onClick={action}
                className="w-[38px] h-[38px] bg-card border border-b1 rounded-[10px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Bottom bar */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-center px-6 py-3 border-t border-b1 shrink-0">
              <span className="flex items-center gap-2 text-[13px] text-t3">
                <Loader2 size={13} className="animate-spin text-y" />
                Generating {pendingCount} image{pendingCount > 1 ? "s" : ""}...
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
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image in detail..."
              rows={4}
              className="w-full bg-transparent text-[12.5px] leading-[1.6] text-[#c0c0c0] placeholder-t4 outline-none resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-t3">{prompt.length} / 500</span>
              <button
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-y"
                style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
                title="Enhance prompt"
              >
                <Wand2 size={13} />
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-2.5">
              <Zap size={14} className="text-t2" />
              Model
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`py-2 rounded-[8px] text-[12px] font-medium border transition-all ${
                    activeModel === m
                      ? "bg-[#1f1608] border-y text-y"
                      : "bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-2 cursor-pointer hover:border-b2 transition-colors">
            <div
              className="w-8 h-8 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center text-base"
              style={{ background: "linear-gradient(135deg, #5a3520, #2a1410)" }}
            >
              🎨
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Style</span>
            <span className="text-[12.5px] text-t2 mr-2">{activeTag}</span>
            <ChevronRight size={13} className="text-t3" />
          </div>

          {/* Effects */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-4 cursor-pointer hover:border-b2 transition-colors">
            <div className="w-8 h-8 bg-card2 border border-b1 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center">
              <Sparkles size={14} className="text-t2" />
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Effects</span>
            <span className="text-[12.5px] text-t2 mr-2">None</span>
            <ChevronRight size={13} className="text-t3" />
            <button
              className="w-6 h-6 rounded-[6px] flex items-center justify-center ml-1.5 text-y"
              style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Detail level slider */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-3.5">
              <Sliders size={14} className="text-t2" />
              Detail Level
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={detailLevel}
              onChange={(e) => setDetailLevel(Number(e.target.value))}
              className="w-full accent-y mb-2 cursor-pointer"
            />
            <div className="flex justify-between text-[11.5px] text-t3">
              <span>Draft</span>
              <span>Ultra HD</span>
            </div>
          </div>

          {/* Number of images */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-3.5">
              <Layers size={14} className="text-t2" />
              Number of Images
            </div>
            <div className="grid grid-cols-4 gap-[7px]">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setActiveCount(n)}
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

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3.5 py-2.5 mb-3">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full rounded-xl py-3.5 text-[14.5px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Starting...</>
            ) : (
              <><Zap size={14} fill="currentColor" /> Generate</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
