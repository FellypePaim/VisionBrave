"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home, Image, Video, Music, LayoutGrid, Sparkles, CreditCard,
  MessageSquare, Star, Archive, Zap, Search, ChevronUp, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navMain = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/dashboard/images", icon: Image, label: "Imagens" },
  { href: "/dashboard/videos", icon: Video, label: "Vídeos" },
  { href: "/dashboard/audio", icon: Music, label: "Áudio" },
  { href: "/dashboard/gallery", icon: LayoutGrid, label: "Galeria" },
  { href: "/dashboard/templates", icon: Sparkles, label: "Templates" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Cobrança" },
];

const navChat = [
  { href: "/dashboard/chat", icon: MessageSquare, label: "Hoje", count: 3 },
  { href: "/dashboard/favorites", icon: Star, label: "Favoritos", count: 7 },
  { href: "/dashboard/archived", icon: Archive, label: "Arquivados", count: 24 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null);
      }
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      style={{ background: "#0A0A0A" }}
      className="hidden lg:flex border-r border-b1 flex-col py-4 overflow-y-auto shrink-0 relative w-[232px] min-w-[232px]"
    >
      {/* Toast */}
      {toast && (
        <div className="absolute bottom-20 left-3 right-3 z-50 px-3.5 py-2.5 rounded-[10px] text-[12.5px] font-medium text-white bg-[#1a1a1a] border border-white/10 shadow-xl text-center">
          {toast}
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center justify-center px-[18px] pb-4 border-b border-b1 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/logo-no-bg.png" alt="VisionBrave" className="h-20 w-auto object-contain" />
      </div>

      {/* Search */}
      <Link
        href="/dashboard/gallery"
        className="mx-3 mb-3.5 bg-card border border-b1 rounded-[10px] px-3 py-2.5 flex items-center gap-2.5 hover:border-b2 transition-colors"
      >
        <Search size={14} className="text-t4 shrink-0" />
        <span className="text-[13px] text-t4 flex-1">Buscar...</span>
        <span className="text-[11px] text-t4">⌘K</span>
      </Link>

      {/* Main nav */}
      {navMain.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-[11px] mx-2.5 my-px px-[11px] py-[9px] rounded-[9px] text-[13.5px] relative transition-colors ${
              active
                ? "bg-[#1f1608] text-y font-medium"
                : "text-t2 hover:bg-white/5 hover:text-[#ddd]"
            }`}
          >
            {active && (
              <span className="absolute -left-2.5 top-2 bottom-2 w-[3px] bg-y rounded-r-[3px]" />
            )}
            <Icon size={17} className="shrink-0 opacity-85" />
            {label}
          </Link>
        );
      })}

      {/* Chat section */}
      <div className="flex items-center justify-between px-[22px] pt-4 pb-2">
        <span className="text-[10.5px] font-semibold tracking-[1px] text-t4 uppercase">Conversas</span>
        <span className="text-sm text-t4 cursor-pointer hover:text-white transition-colors">+</span>
      </div>

      {navChat.map(({ href, icon: Icon, label, count }) => {
        const active = pathname === href;
        return (
          <button
            key={href}
            onClick={() => showToast(`${label} — em breve`)}
            className={`flex items-center gap-[11px] mx-2.5 my-px px-[11px] py-[9px] rounded-[9px] text-[13.5px] relative transition-colors text-left w-full ${
              active
                ? "bg-[#1f1608] text-y font-medium"
                : "text-t2 hover:bg-white/5 hover:text-[#ddd]"
            }`}
          >
            <Icon size={17} className="shrink-0 opacity-85" />
            {label}
            <span className="ml-auto text-[11px] text-t3 font-medium">{count}</span>
          </button>
        );
      })}

      {/* Footer */}
      <div className="mt-auto px-3 pt-3">
        {/* Upgrade card */}
        <div
          className="rounded-[13px] p-3.5 mb-2.5"
          style={{
            background: "linear-gradient(145deg, #1a1208 0%, #0f0904 100%)",
            border: "1px solid #2a1f08",
          }}
        >
          <div
            className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center mb-2.5"
            style={{ background: "#FBBF24", boxShadow: "0 2px 12px #FBBF2440" }}
          >
            <Zap size={14} className="text-[#1a0e00]" fill="currentColor" />
          </div>
          <div className="text-[13.5px] font-bold text-white mb-1">Upgrade para Pro</div>
          <div className="text-[12px] text-t3 leading-[1.4] mb-3">
            Desbloqueie mais recursos com ferramentas de IA avançadas.
          </div>
          <button
            onClick={() => showToast("Planos Pro em breve!")}
            className="w-full rounded-[9px] py-[9px] text-[13px] font-bold text-[#1a0e00] cursor-pointer transition-colors hover:bg-[#FCD34D]"
            style={{ background: "#FBBF24", boxShadow: "0 2px 14px #FBBF2440" }}
          >
            Fazer Upgrade
          </button>
        </div>

        {/* User row */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold text-[#1a0e00]"
              style={{ background: "linear-gradient(135deg, #d4a574 30%, #8b5e3c 100%)" }}
            >
              {userName?.slice(0, 2).toUpperCase() ?? userEmail?.slice(0, 2).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 overflow-hidden text-left">
              <div className="text-[13px] font-semibold text-[#e0e0e0] truncate">{userName ?? "Usuário"}</div>
              <div className="text-[11.5px] text-t3 truncate">{userEmail ?? ""}</div>
            </div>
            <ChevronUp size={14} className={`text-t4 transition-transform ${userMenuOpen ? "" : "rotate-180"}`} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute bottom-[calc(100%+4px)] left-0 right-0 rounded-[10px] border border-b1 overflow-hidden"
              style={{ background: "#0f0f0f", boxShadow: "0 -8px 24px #00000070" }}
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
