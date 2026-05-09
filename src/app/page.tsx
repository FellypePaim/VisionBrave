import Link from "next/link";
import { FoxIcon } from "@/components/FoxIcon";
import { Image, Video, Layers, Star, ChevronRight, Zap, CheckCircle, Globe } from "lucide-react";

const features = [
  {
    icon: Image,
    title: "Images",
    desc: "Generate ultra-detailed AI images in any style you imagine.",
    link: "Explore Images",
  },
  {
    icon: Video,
    title: "Videos",
    desc: "Create cinematic videos from text or images with AI magic.",
    link: "Explore Videos",
  },
  {
    icon: Layers,
    title: "Animation",
    desc: "Animate your ideas with stunning motion and style.",
    link: "Explore Animation",
  },
  {
    icon: Star,
    title: "AI Editing",
    desc: "Edit, enhance, and transform with powerful AI tools.",
    link: "Explore AI Tools",
  },
];

const stats = [
  { value: "50K+", label: "Active Creators" },
  { value: "1M+", label: "AI Creations" },
  { value: "4.9/5", label: "User Rating" },
  { value: "100+", label: "Countries" },
];

const navLinks = ["Features", "Use Cases", "How It Works", "Pricing", "Resources"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="max-w-[1440px] mx-auto px-7 py-5">

        {/* Nav */}
        <nav
          className="flex items-center gap-4 px-5 py-3.5 rounded-[18px] mb-4"
          style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
        >
          <div className="flex items-center gap-2.5 mr-5">
            <FoxIcon size={32} />
            <span className="text-[18px] font-bold text-white tracking-tight">VisionBrave</span>
          </div>

          <div className="flex items-center gap-1 flex-1">
            {navLinks.map((l) => (
              <span
                key={l}
                className="px-4 py-2 text-[14px] font-medium text-t2 cursor-pointer rounded-[8px] hover:text-white hover:bg-white/5 transition-colors"
              >
                {l}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 text-[13.5px] font-semibold text-white border border-b2 rounded-[10px] hover:border-[#4a4a4a] hover:bg-white/5 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-[13.5px] font-bold text-[#1a0e00] rounded-[10px] transition-colors hover:bg-[#FCD34D]"
              style={{ background: "#FBBF24", boxShadow: "0 2px 16px #FBBF2440" }}
            >
              Start Creating
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section
          className="rounded-[22px] px-14 py-12 relative overflow-hidden mb-4"
          style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
        >
          <div className="grid gap-12 items-center" style={{ gridTemplateColumns: "1.05fr 1fr" }}>
            {/* Tiger image */}
            <div
              className="relative rounded-[18px] overflow-hidden"
              style={{
                aspectRatio: "1/1",
                maxWidth: 540,
                background: "radial-gradient(ellipse at 50% 60%, #1a1208 0%, #050202 80%)",
              }}
            >
              <svg viewBox="0 0 540 540" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="bgRad" cx="50%" cy="60%" r="80%">
                    <stop offset="0%" stopColor="#1a1208" />
                    <stop offset="60%" stopColor="#0a0604" />
                    <stop offset="100%" stopColor="#000" />
                  </radialGradient>
                  <linearGradient id="orange" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFC845" />
                    <stop offset="50%" stopColor="#FF8C00" />
                    <stop offset="100%" stopColor="#D4500A" />
                  </linearGradient>
                  <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                    <stop offset="100%" stopColor="#FF4400" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect width="540" height="540" fill="url(#bgRad)" />
                <ellipse cx="200" cy="280" rx="220" ry="160" fill="url(#orange)" opacity=".06" />
                <ellipse cx="270" cy="490" rx="200" ry="20" fill="#FF8C00" opacity=".15" />
                <path d="M150 290 Q200 240 290 250 Q380 260 420 310 Q430 360 380 380 Q280 400 200 380 Q140 360 150 290 Z" fill="#15100c" stroke="#2a1f10" strokeWidth="2" />
                <g filter="url(#glowF)" opacity=".9">
                  <path d="M180 260 Q190 320 195 380" stroke="url(#orange)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d="M215 252 Q225 320 230 385" stroke="url(#orange)" strokeWidth="7" fill="none" strokeLinecap="round" />
                  <path d="M250 250 Q258 320 262 388" stroke="url(#orange)" strokeWidth="7" fill="none" strokeLinecap="round" />
                  <path d="M285 252 Q290 320 295 388" stroke="url(#orange)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d="M320 258 Q325 320 330 385" stroke="url(#orange)" strokeWidth="7" fill="none" strokeLinecap="round" />
                </g>
                <path d="M50 230 Q60 170 110 160 Q160 165 175 210 Q175 260 145 280 Q90 285 60 270 Q35 255 50 230 Z" fill="#1a1410" stroke="#2a1f10" strokeWidth="2" />
                <g filter="url(#glowF)" opacity=".9">
                  <path d="M65 195 Q70 220 75 255" stroke="url(#orange)" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <path d="M88 185 Q92 215 95 260" stroke="url(#orange)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M115 180 Q118 215 120 262" stroke="url(#orange)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M142 185 Q140 215 138 258" stroke="url(#orange)" strokeWidth="4" fill="none" strokeLinecap="round" />
                </g>
                <ellipse cx="85" cy="220" rx="14" ry="10" fill="url(#eyeGlow)" filter="url(#glowF)" />
                <ellipse cx="135" cy="220" rx="14" ry="10" fill="url(#eyeGlow)" filter="url(#glowF)" />
                <ellipse cx="85" cy="220" rx="6" ry="7" fill="#FFE066" />
                <ellipse cx="135" cy="220" rx="6" ry="7" fill="#FFE066" />
                <ellipse cx="85" cy="218" rx="2" ry="4" fill="#000" />
                <ellipse cx="135" cy="218" rx="2" ry="4" fill="#000" />
              </svg>

              {/* Badge */}
              <div
                className="absolute bottom-4 left-4 flex items-center gap-2.5 px-3.5 py-2 rounded-[10px]"
                style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(10px)", border: "1px solid #ffffff10" }}
              >
                <FoxIcon size={24} />
                <div className="flex flex-col text-[11px] leading-[1.3]">
                  <span className="text-[#888]">
                    Generated in <b className="text-y font-semibold">VisionBrave</b>
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
                Next-Gen AI Creative Studio
              </div>

              <h1 className="text-[60px] font-bold leading-[1.05] tracking-[-2px] text-white mb-5">
                Create Without<br />
                Limits.<br />
                Powered by <span className="text-y">AI.</span>
              </h1>

              <p className="text-[16.5px] leading-[1.55] text-[#999] max-w-[520px] mb-7">
                VisionBrave is your all-in-one AI creative studio for generating stunning images, videos, and audio. Unlock your imagination with powerful tools built for creators.
              </p>

              <div className="flex items-center gap-3 mb-8">
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 px-7 py-4 rounded-[13px] text-[15.5px] font-bold text-[#1a0e00] transition-all hover:-translate-y-px"
                  style={{ background: "#FBBF24", boxShadow: "0 4px 28px #FBBF2440" }}
                >
                  Start Creating
                  <Star size={16} fill="currentColor" />
                </Link>
                <button className="flex items-center gap-3 px-7 py-4 rounded-[13px] text-[15.5px] font-semibold text-white border border-b2 bg-card hover:border-[#4a4a4a] hover:bg-[#1a1a1a] transition-colors">
                  <span
                    className="w-7 h-7 rounded-full border-[1.5px] border-white flex items-center justify-center"
                    style={{ paddingLeft: 2 }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="white"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                  </span>
                  See Demo
                </button>
              </div>

              <div className="flex items-center gap-7">
                {[
                  { icon: CheckCircle, title: "No Credit Card", sub: "Get started for free" },
                  { icon: Zap, title: "Lightning Fast", sub: "Generate in seconds" },
                  { icon: Globe, title: "Commercial Use", sub: "Your creations, your rights" },
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
        <div className="grid grid-cols-4 gap-4 mb-4">
          {features.map(({ icon: Icon, title, desc, link }) => (
            <div
              key={title}
              className="group rounded-[18px] p-5 pb-0 flex flex-col min-h-[240px] overflow-hidden cursor-pointer hover:border-[#FBBF2440] hover:bg-[#0F0B05] hover:-translate-y-0.5 transition-all"
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
              <div className="mt-auto -mx-5 h-[90px] rounded-none overflow-hidden"
                style={{ background: "linear-gradient(135deg, #2a1510, #100504)" }}
              />
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div
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
                Trusted by 50,000+ creators<br />worldwide
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
