"use client";

import { useState, useTransition } from "react";
import {
  Eye, EyeOff, Image as ImageIcon, Video, Box, Scissors,
  Loader2, X, Sparkles, Mail, Lock, User, Check,
} from "lucide-react";
import { signIn, signUp, resetPassword } from "./actions";

const features = [
  { icon: ImageIcon, title: "Texto para Imagem", sub: "Dê vida às palavras" },
  { icon: Box,       title: "Renderização 3D",   sub: "Visuais de alta fidelidade" },
  { icon: Video,     title: "Vídeo com IA",      sub: "Criações cinematográficas" },
  { icon: Scissors,  title: "Ferramentas",        sub: "Feitas para criadores" },
];

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [forgotError, setForgotError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (tab === "signup") {
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;
      if (password !== confirmPassword) {
        setError("As senhas não coincidem");
        return;
      }
      if (!agreeTerms) {
        setError("Você precisa concordar com os Termos de Serviço");
        return;
      }
      const firstName = (formData.get("firstName") as string) ?? "";
      const lastName = (formData.get("lastName") as string) ?? "";
      formData.set("name", `${firstName} ${lastName}`.trim());
    }

    startTransition(async () => {
      const result = tab === "signup" ? await signUp(formData) : await signIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotStatus("pending");
    setForgotError(null);
    const fd = new FormData();
    fd.append("email", forgotEmail);
    const result = await resetPassword(fd);
    if (result?.error) { setForgotError(result.error); setForgotStatus("error"); }
    else setForgotStatus("done");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <div
        className="flex-1 m-6 grid overflow-hidden rounded-[28px]"
        style={{ gridTemplateColumns: "1fr 1fr", background: "#0A0A0A", border: "1px solid #1F1F1F" }}
      >
        {/* ───── LEFT: visual ───── */}
        <div className="relative flex flex-col p-10">
          {/* Wolf background — bleeds into panel without box edge */}
          <div
            className="absolute z-0 pointer-events-none"
            style={{
              top: "0%",
              left: "0%",
              right: "-12%",
              bottom: "0%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/cyber-wolf.png"
              alt="Cyber Wolf"
              className="w-full h-full object-cover saturate-[1.05] contrast-105"
              style={{
                objectPosition: "52% center",
                maskImage:
                  "linear-gradient(to right, black 0%, black 60%, rgba(0,0,0,0.55) 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 4%, black 10%, black 90%, rgba(0,0,0,0.4) 96%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 60%, rgba(0,0,0,0.55) 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 4%, black 10%, black 90%, rgba(0,0,0,0.4) 96%, transparent 100%)",
                maskComposite: "intersect",
                WebkitMaskComposite: "source-in",
              }}
            />
          </div>
          {/* Soft bridge overlay — softens any panel boundary line */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 100% at 100% 50%, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.4) 40%, transparent 70%)",
            }}
          />

          {/* Top: Logo */}
          <div className="relative z-10 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero/logo-no-bg.png" alt="VisionBrave" className="h-32 w-auto object-contain" />
          </div>

          {/* Bottom: Content */}
          <div className="relative z-10 mt-auto">
            <div className="text-[12.5px] font-bold text-y tracking-[2.5px] uppercase mb-4">
              Estúdio Criativo com IA
            </div>
            <h2 className="text-[50px] font-bold text-white leading-[1.05] tracking-tight mb-5">
              Crie Sem Limites
            </h2>
            <p className="text-[14.5px] leading-[1.6] text-[#cfcfcf] max-w-[460px] mb-8">
              Gere imagens, vídeos e renders 3D impressionantes com IA.<br />
              Sua imaginação. Nossa inteligência.
            </p>

            <div className="grid grid-cols-4 gap-2.5 max-w-[600px]">
              {features.map(({ icon: Icon, title, sub }) => (
                <div
                  key={title}
                  className="flex flex-col gap-2 p-3 rounded-[12px]"
                  style={{
                    background: "rgba(15,10,5,0.55)",
                    border: "1px solid rgba(42,31,8,0.5)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center"
                    style={{ background: "#1a1408", border: "1px solid #2a1f08" }}
                  >
                    <Icon size={16} className="text-y" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-white leading-tight">{title}</div>
                    <div className="text-[11px] text-t3 leading-tight mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ───── RIGHT: form ───── */}
        <div
          className="relative flex flex-col items-center overflow-y-auto px-12 pt-10 pb-8"
          style={{ background: "#0A0A0A" }}
        >
          <div className="w-full max-w-[440px]">
            {/* Tabs */}
            <div className="flex bg-card border border-b1 rounded-xl p-1 mb-8">
              {(["signup", "login"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className={`flex-1 py-2.5 rounded-[9px] text-[13.5px] font-semibold transition-all ${
                    tab === t
                      ? "border border-y text-y bg-[#1f1608]"
                      : "text-t2 hover:text-white border border-transparent"
                  }`}
                >
                  {t === "signup" ? "Cadastrar" : "Entrar"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <h3 className="text-[28px] font-bold text-white tracking-tight mb-2 text-center">
              {tab === "signup" ? "Crie sua conta" : "Bem-vindo de volta"}
            </h3>
            <p className="text-[14px] text-t3 mb-7 text-center">
              {tab === "signup"
                ? "Junte-se ao VisionBrave e comece a criar com o poder da IA."
                : "Entre para continuar criando."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* First + Last name (signup) */}
              {tab === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <IconInput name="firstName" type="text" placeholder="Nome" icon={<User size={15} />} required />
                  <IconInput name="lastName" type="text" placeholder="Sobrenome" icon={<User size={15} />} required />
                </div>
              )}

              {/* Email */}
              <IconInput name="email" type="email" placeholder="Digite seu e-mail" icon={<Mail size={15} />} required />

              {/* Password */}
              <IconInput
                name="password"
                type={showPass ? "text" : "password"}
                placeholder={tab === "signup" ? "Crie uma senha" : "Senha"}
                icon={<Lock size={15} />}
                required
                minLength={8}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-t3 hover:text-t2 transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {/* Confirm password (signup) */}
              {tab === "signup" && (
                <IconInput
                  name="confirmPassword"
                  type={showConfirmPass ? "text" : "password"}
                  placeholder="Confirme sua senha"
                  icon={<Lock size={15} />}
                  required
                  minLength={8}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="text-t3 hover:text-t2 transition-colors"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              )}

              {/* Forgot password (login) */}
              {tab === "login" && (
                <div className="flex justify-end -mt-0.5">
                  <button
                    type="button"
                    onClick={() => { setForgotOpen(true); setForgotStatus("idle"); setForgotError(null); setForgotEmail(""); }}
                    className="text-[13px] text-y cursor-pointer hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {/* Terms checkbox (signup) */}
              {tab === "signup" && (
                <div className="flex items-start gap-2.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setAgreeTerms(!agreeTerms)}
                    className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-all ${
                      agreeTerms ? "bg-y border border-y" : "bg-card border border-b2 hover:border-[#4a4a4a]"
                    }`}
                  >
                    {agreeTerms && <Check size={12} className="text-[#1a0e00]" strokeWidth={3} />}
                  </button>
                  <p
                    onClick={() => setAgreeTerms(!agreeTerms)}
                    className="text-[12.5px] text-t3 leading-[1.5] cursor-pointer select-none"
                  >
                    Concordo com os{" "}
                    <span className="text-y hover:underline">Termos de Serviço</span> e{" "}
                    <span className="text-y hover:underline">Política de Privacidade</span>
                  </p>
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
                className="w-full rounded-[12px] py-3.5 text-[14.5px] font-bold text-[#1a0e00] mt-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-[#FCD34D]"
                style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
              >
                {isPending
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Sparkles size={15} fill="currentColor" />}
                {isPending ? "Aguarde..." : tab === "signup" ? "Criar Conta" : "Entrar"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-b1" />
              <span className="text-[12px] text-t4">ou continue com</span>
              <div className="flex-1 h-px bg-b1" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <SocialButton provider="google" />
              <SocialButton provider="facebook" />
              <SocialButton provider="apple" />
            </div>

            {/* Footer */}
            <p className="text-[13px] text-t3 text-center mt-7">
              {tab === "signup" ? "Já tem uma conta? " : "Não tem uma conta? "}
              <button
                onClick={() => { setTab(tab === "signup" ? "login" : "signup"); setError(null); }}
                className="text-y hover:underline font-medium"
              >
                {tab === "signup" ? "Entrar" : "Cadastrar"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setForgotOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[18px] p-7 mx-4"
            style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", boxShadow: "0 32px 80px #000000cc" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-white">Redefinir senha</h3>
              <button
                onClick={() => setForgotOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-card border border-b1 flex items-center justify-center text-t2 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {forgotStatus === "done" ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-[#1a1208] border border-[#2a1f08] flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={24} className="text-y" />
                </div>
                <p className="text-[14px] font-semibold text-white mb-2">Verifique seu e-mail</p>
                <p className="text-[13px] text-t3">
                  Enviamos um link de redefinição para <span className="text-white">{forgotEmail}</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <p className="text-[13.5px] text-t3">
                  Insira seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  className="w-full bg-card border border-b1 rounded-[11px] px-4 py-3 text-[14px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors"
                />
                {forgotError && (
                  <p className="text-[12.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[9px] px-3.5 py-2">
                    {forgotError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={forgotStatus === "pending"}
                  className="w-full rounded-[11px] py-3 text-[14px] font-bold text-[#1a0e00] flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ background: "#FBBF24" }}
                >
                  {forgotStatus === "pending" && <Loader2 size={14} className="animate-spin" />}
                  {forgotStatus === "pending" ? "Enviando..." : "Enviar link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── helpers ─────────── */

interface IconInputProps {
  name: string;
  type: string;
  placeholder: string;
  icon: React.ReactNode;
  required?: boolean;
  minLength?: number;
  rightSlot?: React.ReactNode;
}

function IconInput({ name, type, placeholder, icon, required, minLength, rightSlot }: IconInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3 pointer-events-none">
        {icon}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`w-full bg-card border border-b1 rounded-[11px] py-3 text-[14px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors ${
          rightSlot ? "pl-10 pr-11" : "pl-10 pr-4"
        }`}
      />
      {rightSlot && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
}

function SocialButton({ provider }: { provider: "google" | "facebook" | "apple" }) {
  const labels = { google: "Google", facebook: "Facebook", apple: "Apple" };
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 bg-card border border-b1 rounded-[11px] py-2.5 text-[13px] font-semibold text-white hover:border-[#4a4a4a] hover:bg-[#1a1a1a] transition-colors"
    >
      {provider === "google" && (
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" />
          <path fill="#FBBC05" d="M24 46c5.8 0 10.8-1.9 14.8-5.2l-6.8-5.6C29.8 36.7 27 37.5 24 37.5c-5.8 0-10.7-3.9-12.4-9.2l-7.1 5.5C8.1 41.5 15.4 46 24 46z" />
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 3-3 5.4-5.8 7l6.8 5.6C41.3 37 44.5 30.9 44.5 24c0-1.3-.2-2.7-.5-4z" />
        </svg>
      )}
      {provider === "facebook" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {provider === "apple" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      )}
      {labels[provider]}
    </button>
  );
}
