"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Wand2,
  Download,
  RefreshCw,
  Crop,
  Layers,
  Sparkles,
  Sliders,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Zap,
} from "lucide-react";

const TAGS = ["All", "Realistic", "Cinematic", "Anime", "3D Render", "Oil Paint", "Sketch", "Neon"];
const COUNTS = [1, 2, 3, 4];

export default function GenerateImagesPage() {
  const [activeTag, setActiveTag] = useState("Cinematic");
  const [activeCount, setActiveCount] = useState(4);

  return (
    <>
      <Topbar title="Generate Images" />

      <div className="flex flex-1 overflow-hidden">
        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-b1">
          {/* Tags bar */}
          <div className="flex items-center gap-2 px-6 py-3.5 shrink-0">
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
            <button className="ml-auto w-9 h-8 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 text-base hover:text-white transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </div>

          {/* Prompt overlay */}
          <div className="flex items-start gap-3 px-6 pb-3.5 shrink-0">
            <div className="w-[30px] h-[30px] bg-card border border-b1 rounded-[8px] flex items-center justify-center cursor-pointer shrink-0">
              <Wand2 size={13} className="text-t2" />
            </div>
            <p className="text-[13px] text-t2 leading-[1.55] pt-1">
              A majestic black panther with glowing golden eyes, surrounded by neon vines and dark jungle at night, cinematic lighting, ultra-detailed
            </p>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden px-5 min-h-0">
            <div className="relative" style={{ width: 640, height: 380 }}>
              {/* Card 1 - left back */}
              <div
                className="absolute rounded-[18px] overflow-hidden cursor-pointer"
                style={{
                  width: 230, height: 270,
                  top: 30, left: 30,
                  transform: "rotate(-9deg)",
                  zIndex: 1,
                  boxShadow: "0 30px 80px #000000bb, 0 0 0 1px #ffffff05",
                  background: "radial-gradient(ellipse at 40% 40%, #2a1a40 0%, #050208 80%)",
                }}
              >
                <svg viewBox="0 0 230 270" width="100%" height="100%">
                  <defs>
                    <radialGradient id="rg1" cx="40%" cy="40%">
                      <stop offset="0%" stopColor="#9060e0" />
                      <stop offset="100%" stopColor="#050208" />
                    </radialGradient>
                  </defs>
                  <rect width="230" height="270" fill="url(#rg1)" opacity=".5" />
                  <ellipse cx="115" cy="100" rx="40" ry="50" fill="#6040a0" opacity=".5" />
                  <path d="M80 80 L115 40 L150 80 Z" fill="#c090ff" opacity=".6" />
                  <ellipse cx="100" cy="90" rx="4" ry="5" fill="#000" />
                  <ellipse cx="130" cy="90" rx="4" ry="5" fill="#000" />
                  <ellipse cx="101" cy="88" rx="1.5" ry="2" fill="#fff" />
                  <ellipse cx="131" cy="88" rx="1.5" ry="2" fill="#fff" />
                </svg>
                <div className="absolute bottom-3.5 left-3.5 text-[12px] font-medium text-white/85 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-[7px]">
                  Variant 1
                </div>
              </div>

              {/* Card 2 - right back */}
              <div
                className="absolute rounded-[18px] overflow-hidden cursor-pointer"
                style={{
                  width: 240, height: 270,
                  top: 30, right: 30,
                  transform: "rotate(8deg)",
                  zIndex: 2,
                  boxShadow: "0 30px 80px #000000bb, 0 0 0 1px #ffffff05",
                  background: "radial-gradient(ellipse at 60% 40%, #1a2a40 0%, #020508 80%)",
                }}
              >
                <svg viewBox="0 0 240 270" width="100%" height="100%">
                  <defs>
                    <radialGradient id="rg2" cx="60%" cy="40%">
                      <stop offset="0%" stopColor="#4080c0" />
                      <stop offset="100%" stopColor="#020508" />
                    </radialGradient>
                  </defs>
                  <rect width="240" height="270" fill="url(#rg2)" opacity=".5" />
                  <ellipse cx="120" cy="110" rx="55" ry="60" fill="#2060a0" opacity=".4" />
                  <path d="M85 80 L120 55 L155 80 L150 95 L120 75 L90 95 Z" fill="#80c0ff" opacity=".5" />
                  <ellipse cx="104" cy="100" rx="4" ry="5" fill="#000" />
                  <ellipse cx="136" cy="100" rx="4" ry="5" fill="#000" />
                </svg>
                <div className="absolute bottom-3.5 left-3.5 text-[12px] font-medium text-white/85 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-[7px]">
                  Variant 2
                </div>
              </div>

              {/* Card 3 - front center (main) */}
              <div
                className="absolute rounded-[18px] overflow-hidden cursor-pointer"
                style={{
                  width: 280, height: 320,
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%) rotate(-2deg)",
                  zIndex: 3,
                  boxShadow: "0 30px 80px #000000cc, 0 0 0 1px #ffffff08",
                  background: "radial-gradient(ellipse at 50% 40%, #1a1408 0%, #050202 80%)",
                }}
              >
                <svg viewBox="0 0 280 320" width="100%" height="100%">
                  <defs>
                    <radialGradient id="rg3" cx="50%" cy="40%">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity=".3" />
                      <stop offset="100%" stopColor="#050202" />
                    </radialGradient>
                    <radialGradient id="eyeGlow3" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#FF8800" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="280" height="320" fill="url(#rg3)" />
                  <ellipse cx="140" cy="160" rx="70" ry="90" fill="#0a0806" />
                  <ellipse cx="140" cy="140" rx="55" ry="65" fill="#141008" />
                  <ellipse cx="115" cy="130" rx="14" ry="10" fill="url(#eyeGlow3)" opacity=".9" />
                  <ellipse cx="165" cy="130" rx="14" ry="10" fill="url(#eyeGlow3)" opacity=".9" />
                  <ellipse cx="115" cy="130" rx="6" ry="7" fill="#FBBF24" />
                  <ellipse cx="165" cy="130" rx="6" ry="7" fill="#FBBF24" />
                  <ellipse cx="115" cy="128" rx="2" ry="4" fill="#000" />
                  <ellipse cx="165" cy="128" rx="2" ry="4" fill="#000" />
                  <path d="M100 290 Q140 240 180 290" stroke="#3a8040" strokeWidth="2" fill="none" opacity=".7" />
                  <path d="M60 280 Q100 250 120 270" stroke="#3a8040" strokeWidth="1.5" fill="none" opacity=".5" />
                  <path d="M160 270 Q190 250 220 280" stroke="#3a8040" strokeWidth="1.5" fill="none" opacity=".5" />
                </svg>
                <button className="absolute top-3 right-3 w-8 h-8 bg-black/55 backdrop-blur-sm rounded-[9px] flex items-center justify-center z-10">
                  <Download size={14} className="text-white" />
                </button>
                <div className="absolute bottom-3.5 left-3.5 text-[12px] font-medium text-white/85 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-[7px]">
                  Neon Panther
                </div>
                <div className="absolute bottom-3.5 right-3.5 bg-y text-[#1a0e00] text-[11px] font-bold px-2 py-1 rounded-[6px] z-10">
                  v4
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar row */}
          <div className="flex justify-center gap-1.5 px-6 pb-4 shrink-0 pt-4">
            {[
              { icon: RefreshCw, label: "Regenerate" },
              { icon: Crop, label: "Crop" },
              { icon: Layers, label: "Variations" },
              { icon: Sparkles, label: "Enhance" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={label}
                className="w-[38px] h-[38px] bg-card border border-b1 rounded-[10px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center px-6 py-3.5 border-t border-b1 shrink-0">
            <button className="flex items-center gap-2 px-[18px] py-2 bg-card border border-b1 rounded-full text-[13px] font-medium text-[#d0d0d0] cursor-pointer mx-auto hover:border-y hover:text-y transition-colors">
              <Plus size={13} className="text-y" />
              Generate More
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div
          className="flex flex-col overflow-y-auto p-[18px] shrink-0"
          style={{ width: 320, minWidth: 320, background: "#0A0A0A" }}
        >
          {/* Prompt */}
          <div className="bg-card border border-b1 rounded-xl p-3.5 mb-4">
            <p className="text-[12.5px] leading-[1.6] text-[#c0c0c0] mb-3.5">
              A majestic black panther with glowing golden eyes, surrounded by neon vines and dark jungle at night, cinematic lighting, ultra-detailed
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-t3">243 / 500</span>
              <button
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center cursor-pointer text-y"
                style={{ background: "#1a1208", border: "1px solid #2a1f08" }}
              >
                <Wand2 size={13} />
              </button>
            </div>
          </div>

          {/* Style */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-2 cursor-pointer hover:border-b2 transition-colors">
            <div
              className="w-8 h-8 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center text-base overflow-hidden"
              style={{ background: "linear-gradient(135deg, #5a3520, #2a1410)" }}
            >
              🎨
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Style</span>
            <span className="text-[12.5px] text-t2 mr-2">Cinematic</span>
            <ChevronRight size={13} className="text-t3" />
          </div>

          {/* Model */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-2 cursor-pointer hover:border-b2 transition-colors">
            <div className="w-8 h-8 bg-card2 border border-b1 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center">
              <Zap size={14} className="text-t2" />
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Model</span>
            <span className="text-[12.5px] text-t2 mr-2">Flux Pro</span>
            <ChevronRight size={13} className="text-t3" />
          </div>

          {/* Effects */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-2 cursor-pointer hover:border-b2 transition-colors">
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

          {/* Aspect Ratio */}
          <div className="bg-card border border-b1 rounded-[11px] flex items-center px-3.5 py-3 mb-4 cursor-pointer hover:border-b2 transition-colors">
            <div className="w-8 h-8 bg-card2 border border-b1 rounded-[8px] mr-2.5 shrink-0 flex items-center justify-center">
              <Crop size={14} className="text-t2" />
            </div>
            <span className="flex-1 text-[13px] font-medium text-[#d8d8d8]">Aspect</span>
            <span className="text-[12.5px] text-t2 mr-2">2:3</span>
            <ChevronRight size={13} className="text-t3" />
          </div>

          {/* Detail level slider */}
          <div className="bg-card border border-b1 rounded-[11px] p-3.5 mb-2">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#d8d8d8] mb-3.5">
              <Sliders size={14} className="text-t2" />
              Detail Level
            </div>
            <div className="relative h-1.5 bg-[#2a2a2a] rounded-full mb-2">
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{ width: "72%", background: "linear-gradient(90deg, #D49B16, #FBBF24)" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-y border-[2.5px] border-white rounded-full"
                style={{ left: "72%", transform: "translate(-50%, -50%)", boxShadow: "0 2px 10px #FBBF2440" }}
              />
            </div>
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

          {/* Generate button */}
          <button
            className="w-full rounded-xl py-3.5 text-[14.5px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 transition-colors"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            <Zap size={14} fill="currentColor" />
            Generate
          </button>
        </div>
      </div>
    </>
  );
}
