"use client";

import { useState, useTransition } from "react";
import { FoxIcon } from "@/components/FoxIcon";
import { Eye, EyeOff, Image, Video, Music, Sparkles, Loader2 } from "lucide-react";
import { signIn, signUp } from "./actions";

const features = [
  { icon: Image, title: "AI Image Generation", sub: "Create stunning visuals" },
  { icon: Video, title: "AI Video Creator", sub: "Generate cinematic videos" },
  { icon: Music, title: "AI Audio Studio", sub: "Compose original soundtracks" },
  { icon: Sparkles, title: "Smart Editing", sub: "Enhance with one click" },
];

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = tab === "signup" ? await signUp(formData) : await signIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <div
        className="flex-1 m-6 grid overflow-hidden rounded-3xl"
        style={{ gridTemplateColumns: "1fr 1fr", background: "#0A0A0A", border: "1px solid #1F1F1F" }}
      >
        {/* Left - visual side */}
        <div
          className="relative flex flex-col p-8 overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 50%, #1a1208 0%, #050202 60%, #000 100%)" }}
        >
          <div className="absolute inset-0 z-0 opacity-30">
            <svg viewBox="0 0 600 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="tigerOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFC845" />
                  <stop offset="50%" stopColor="#FF8C00" />
                  <stop offset="100%" stopColor="#D4500A" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <ellipse cx="300" cy="400" rx="250" ry="200" fill="#FF8C00" opacity=".08" />
              <path d="M150 320 Q200 260 300 270 Q400 280 430 340 Q440 400 400 420 Q300 440 220 420 Q150 400 150 320 Z" fill="#15100c" />
              <g filter="url(#glow)" opacity=".8">
                <path d="M180 290 Q185 360 190 420" stroke="url(#tigerOrange)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M210 282 Q215 355 220 425" stroke="url(#tigerOrange)" strokeWidth="7" fill="none" strokeLinecap="round" />
                <path d="M240 278 Q245 355 248 425" stroke="url(#tigerOrange)" strokeWidth="7" fill="none" strokeLinecap="round" />
                <path d="M270 280 Q274 355 278 425" stroke="url(#tigerOrange)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M300 284 Q305 355 310 422" stroke="url(#tigerOrange)" strokeWidth="7" fill="none" strokeLinecap="round" />
              </g>
              <defs>
                <radialGradient id="eyeG" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FF4400" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="255" cy="300" rx="16" ry="11" fill="url(#eyeG)" filter="url(#glow)" />
              <ellipse cx="315" cy="300" rx="16" ry="11" fill="url(#eyeG)" filter="url(#glow)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-auto">
              <FoxIcon size={36} />
              <span className="text-[19px] font-bold text-white tracking-tight">VisionBrave</span>
            </div>

            <div className="mt-auto">
              <div className="text-[12.5px] font-bold text-y tracking-[2px] uppercase mb-3.5">AI Creative Studio</div>
              <h2 className="text-[50px] font-bold text-white leading-[1.05] tracking-tight mb-4">
                Create Without<br />Limits.
              </h2>
              <p className="text-[14.5px] leading-[1.6] text-[#999] max-w-[440px] mb-9">
                Your all-in-one AI creative studio for generating stunning images, videos, and audio. Join 50,000+ creators worldwide.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-[440px]">
                {features.map(({ icon: Icon, title, sub }) => (
                  <div key={title} className="flex items-center gap-3">
                    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "#1a1408", border: "1px solid #2a1f08" }}>
                      <Icon size={17} className="text-y" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-white">{title}</div>
                      <div className="text-[12px] text-t3">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right - form side */}
        <div className="flex flex-col items-center overflow-y-auto px-14 pt-14 pb-10" style={{ background: "#0A0A0A" }}>
          <div className="w-full max-w-[420px]">
            {/* Tabs */}
            <div className="flex bg-card border border-b1 rounded-xl p-1 mb-8">
              {(["signup", "login"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className={`flex-1 py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${tab === t ? "bg-y text-[#1a0e00]" : "text-t2 hover:text-white"}`}
                >
                  {t === "signup" ? "Sign Up" : "Log In"}
                </button>
              ))}
            </div>

            <h3 className="text-[26px] font-bold text-white tracking-tight mb-1.5">
              {tab === "signup" ? "Create your account" : "Welcome back"}
            </h3>
            <p className="text-[14px] text-t3 mb-8">
              {tab === "signup" ? "Start creating with AI today. Free forever." : "Sign in to continue creating."}
            </p>

            {/* Google button */}
            <button className="w-full flex items-center justify-center gap-3 bg-card border border-b2 rounded-[11px] py-3 mb-5 text-[14px] font-semibold text-white hover:border-[#4a4a4a] hover:bg-[#1a1a1a] transition-colors">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" />
                <path fill="#FBBC05" d="M24 46c5.8 0 10.8-1.9 14.8-5.2l-6.8-5.6C29.8 36.7 27 37.5 24 37.5c-5.8 0-10.7-3.9-12.4-9.2l-7.1 5.5C8.1 41.5 15.4 46 24 46z" />
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 3-3 5.4-5.8 7l6.8 5.6C41.3 37 44.5 30.9 44.5 24c0-1.3-.2-2.7-.5-4z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-b1" />
              <span className="text-[12px] text-t4">or</span>
              <div className="flex-1 h-px bg-b1" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {tab === "signup" && (
                <div>
                  <label className="block text-[13px] font-medium text-[#c0c0c0] mb-2">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Your name"
                    required
                    className="w-full bg-card border border-b1 rounded-[11px] px-4 py-3 text-[14px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#c0c0c0] mb-2">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="you@email.com"
                  required
                  className="w-full bg-card border border-b1 rounded-[11px] px-4 py-3 text-[14px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#c0c0c0] mb-2">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full bg-card border border-b1 rounded-[11px] px-4 py-3 text-[14px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors pr-12"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {tab === "login" && (
                <div className="flex justify-end -mt-1">
                  <span className="text-[13px] text-y cursor-pointer hover:underline">Forgot password?</span>
                </div>
              )}

              {error && (
                <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-[11px] py-3.5 text-[14.5px] font-bold text-[#1a0e00] mt-1.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
              >
                {isPending && <Loader2 size={16} className="animate-spin" />}
                {isPending ? "Please wait..." : tab === "signup" ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="text-[13px] text-t3 text-center mt-6">
              {tab === "signup" ? "Already have an account? " : "Don't have an account? "}
              <button onClick={() => { setTab(tab === "signup" ? "login" : "signup"); setError(null); }} className="text-y hover:underline font-medium">
                {tab === "signup" ? "Log In" : "Sign Up"}
              </button>
            </p>

            {tab === "signup" && (
              <p className="text-[12px] text-t4 text-center mt-4 leading-[1.5]">
                By creating an account, you agree to our{" "}
                <span className="text-t3 hover:text-t2 cursor-pointer">Terms of Service</span>{" "}
                and{" "}
                <span className="text-t3 hover:text-t2 cursor-pointer">Privacy Policy</span>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
