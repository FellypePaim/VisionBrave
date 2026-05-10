"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/client";
import {
  User, Mail, Lock, LogOut, Loader2, Check, AlertCircle, Trash2, Camera,
} from "lucide-react";

type Tab = "profile" | "security" | "danger";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      const fullName = user.user_metadata?.full_name ?? "";
      setName(fullName);
      setOriginalName(fullName);
    });
  }, [router]);

  async function handleSaveProfile() {
    if (savingProfile || name === originalName) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) {
        setProfileMsg({ type: "err", text: error.message });
      } else {
        setOriginalName(name);
        setProfileMsg({ type: "ok", text: "Perfil atualizado com sucesso" });
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (savingPass) return;
    setPassMsg(null);
    if (newPass.length < 8) {
      setPassMsg({ type: "err", text: "A nova senha precisa ter pelo menos 8 caracteres" });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: "err", text: "As senhas não coincidem" });
      return;
    }
    setSavingPass(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        setPassMsg({ type: "err", text: error.message });
      } else {
        setPassMsg({ type: "ok", text: "Senha atualizada com sucesso" });
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      }
    } finally {
      setSavingPass(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Tem certeza? Esta ação é permanente e excluirá todos os seus dados.")) return;
    if (!window.confirm("Confirme novamente: todas suas gerações, créditos e dados serão perdidos.")) return;
    setDeleting(true);
    try {
      // Note: requer endpoint /api/account/delete que faz a deleção do user via service role
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
      } else {
        alert("Falha ao excluir conta. Entre em contato com o suporte.");
      }
    } finally {
      setDeleting(false);
    }
  }

  const initials = name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase();

  return (
    <>
      <Topbar title="Configurações" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-1 bg-card border border-b1 rounded-xl p-1 mb-6 w-fit">
            {([
              { id: "profile",  label: "Perfil",     icon: User },
              { id: "security", label: "Segurança",  icon: Lock },
              { id: "danger",   label: "Conta",       icon: Trash2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-all ${
                  tab === id ? "bg-y text-[#1a0e00]" : "text-t2 hover:text-white"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Profile */}
          {tab === "profile" && (
            <div className="bg-card border border-b1 rounded-2xl p-7">
              <h2 className="text-[18px] font-bold text-white mb-1.5">Perfil</h2>
              <p className="text-[13px] text-t3 mb-6">Atualize suas informações públicas.</p>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-7 pb-7 border-b border-b1">
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[22px] font-bold text-[#1a0e00] shrink-0"
                  style={{ background: "linear-gradient(135deg, #d4a574 30%, #8b5e3c 100%)" }}
                >
                  {initials || "?"}
                </div>
                <div>
                  <button
                    disabled
                    className="flex items-center gap-2 px-3.5 py-2 bg-card2 border border-b1 rounded-[9px] text-[12.5px] text-t3 cursor-not-allowed opacity-60"
                  >
                    <Camera size={13} />
                    Trocar foto (em breve)
                  </button>
                  <p className="text-[11.5px] text-t4 mt-1.5">PNG, JPG até 2MB</p>
                </div>
              </div>

              {/* Name */}
              <div className="mb-5">
                <label className="block text-[12.5px] font-medium text-[#c0c0c0] mb-2">Nome</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={80}
                    className="w-full bg-card2 border border-b1 rounded-[10px] pl-10 pr-4 py-2.5 text-[13.5px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a] transition-colors"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="mb-6">
                <label className="block text-[12.5px] font-medium text-[#c0c0c0] mb-2">E-mail</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3" />
                  <input
                    value={email}
                    disabled
                    className="w-full bg-card2 border border-b1 rounded-[10px] pl-10 pr-4 py-2.5 text-[13.5px] text-t3 outline-none cursor-not-allowed"
                  />
                </div>
                <p className="text-[11.5px] text-t4 mt-1.5">Para alterar o e-mail, contate o suporte.</p>
              </div>

              {profileMsg && (
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[12.5px] mb-4 ${
                  profileMsg.type === "ok"
                    ? "text-[#3dff7a] bg-[#0d2218] border border-[#1a3a28]"
                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                }`}>
                  {profileMsg.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
                  {profileMsg.text}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile || name === originalName}
                className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-bold text-[#1a0e00] flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#FBBF24" }}
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar alterações
              </button>
            </div>
          )}

          {/* Security */}
          {tab === "security" && (
            <div className="bg-card border border-b1 rounded-2xl p-7">
              <h2 className="text-[18px] font-bold text-white mb-1.5">Segurança</h2>
              <p className="text-[13px] text-t3 mb-6">Mantenha sua conta protegida com uma senha forte.</p>

              <div className="flex flex-col gap-4 max-w-md">
                <div>
                  <label className="block text-[12.5px] font-medium text-[#c0c0c0] mb-2">Senha atual</label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-card2 border border-b1 rounded-[10px] px-4 py-2.5 text-[13.5px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-[#c0c0c0] mb-2">Nova senha</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mín. 8 caracteres"
                    minLength={8}
                    className="w-full bg-card2 border border-b1 rounded-[10px] px-4 py-2.5 text-[13.5px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-[#c0c0c0] mb-2">Confirme a nova senha</label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-card2 border border-b1 rounded-[10px] px-4 py-2.5 text-[13.5px] text-white placeholder-t4 outline-none focus:border-[#3a3a3a]"
                  />
                </div>

                {passMsg && (
                  <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[12.5px] ${
                    passMsg.type === "ok"
                      ? "text-[#3dff7a] bg-[#0d2218] border border-[#1a3a28]"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
                  }`}>
                    {passMsg.type === "ok" ? <Check size={14} /> : <AlertCircle size={14} />}
                    {passMsg.text}
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={savingPass || !newPass || !confirmPass}
                  className="px-5 py-2.5 rounded-[10px] text-[13.5px] font-bold text-[#1a0e00] flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start"
                  style={{ background: "#FBBF24" }}
                >
                  {savingPass ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Atualizar senha
                </button>
              </div>
            </div>
          )}

          {/* Danger zone */}
          {tab === "danger" && (
            <div className="flex flex-col gap-4">
              {/* Logout card */}
              <div className="bg-card border border-b1 rounded-2xl p-7">
                <h2 className="text-[18px] font-bold text-white mb-1.5">Encerrar sessão</h2>
                <p className="text-[13px] text-t3 mb-5">
                  Sair da sua conta neste dispositivo. Você pode entrar novamente a qualquer momento.
                </p>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-2.5 bg-card2 border border-b1 rounded-[10px] text-[13.5px] font-semibold text-white hover:border-b2 transition-colors"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>

              {/* Delete account */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-7">
                <h2 className="text-[18px] font-bold text-red-400 mb-1.5">Excluir conta</h2>
                <p className="text-[13px] text-t3 mb-5 leading-relaxed">
                  Esta ação é permanente. Todos os seus dados, gerações, créditos e histórico
                  serão removidos definitivamente. Não há como recuperar depois.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !userId}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-[10px] text-[13.5px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Excluir minha conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
