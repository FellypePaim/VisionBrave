"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, LogOut, User, X, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  title: string;
}

const SEARCH_LINKS = [
  { label: "Gerar Imagens", href: "/dashboard/images" },
  { label: "Gerar Vídeos",  href: "/dashboard/videos" },
  { label: "Gerar Áudio",   href: "/dashboard/audio" },
  { label: "Galeria",       href: "/dashboard/gallery" },
];

export function Topbar({ title }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen]     = useState(false);
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [userName, setUserName]       = useState<string | null>(null);
  const [credits, setCredits]         = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        setUserName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null);
      }
    });
    // Fetch credits balance
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.credits) setCredits(data.credits.balance); })
      .catch(() => {});
  }, []);

  // Refresh credits when window regains focus (catches credit updates after geração)
  useEffect(() => {
    function refresh() {
      fetch("/api/credits")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.credits) setCredits(data.credits.balance); })
        .catch(() => {});
    }
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 30_000); // a cada 30s
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (searchRef.current   && !searchRef.current.contains(e.target as Node))   setSearchOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target as Node))    setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setDropdownOpen(false); setNotifOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const filteredLinks = SEARCH_LINKS.filter((l) =>
    l.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initials = userName
    ? userName.slice(0, 2).toUpperCase()
    : userEmail?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <header
      className="flex items-center gap-2.5 px-7 border-b border-b1 shrink-0 relative z-40"
      style={{ height: 60 }}
    >
      <span className="text-[22px] font-bold text-white tracking-tight">{title}</span>
      <div className="flex-1" />

      {/* Credits balance */}
      <Link
        href="/dashboard/billing"
        className="flex items-center gap-2 px-3 h-9 bg-card border border-b1 rounded-[9px] text-[13px] font-semibold text-y hover:border-y/50 transition-colors"
        title="Saldo de créditos"
      >
        <Sparkles size={14} fill="currentColor" />
        {credits !== null ? credits.toLocaleString("pt-BR") : "—"}
        <span className="text-t3 text-[11.5px] font-normal">créditos</span>
      </Link>

      {/* Search */}
      <div className="relative" ref={searchRef}>
        <button
          onClick={() => setSearchOpen((o) => !o)}
          className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
          title="Pesquisar (Ctrl+K)"
        >
          <Search size={15} />
        </button>
        {searchOpen && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] w-[300px] rounded-[12px] border border-b1 overflow-hidden"
            style={{ background: "#0A0A0A", boxShadow: "0 16px 40px #00000090" }}
          >
            <div className="flex items-center gap-2 px-3.5 py-3 border-b border-b1">
              <Search size={14} className="text-t4 shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar páginas..."
                className="flex-1 bg-transparent text-[13px] text-white placeholder-t4 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}><X size={13} className="text-t4" /></button>
              )}
            </div>
            <div className="py-1">
              {filteredLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 text-[13px] text-t2 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {l.label}
                  <ChevronRight size={13} className="text-t4" />
                </Link>
              ))}
              {filteredLinks.length === 0 && (
                <p className="px-3.5 py-3 text-[13px] text-t4">Nenhum resultado encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
          title="Notificações"
        >
          <Bell size={15} />
        </button>
        {notifOpen && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] w-[280px] rounded-[12px] border border-b1 overflow-hidden"
            style={{ background: "#0A0A0A", boxShadow: "0 16px 40px #00000090" }}
          >
            <div className="px-3.5 py-3 border-b border-b1">
              <p className="text-[13px] font-semibold text-white">Notificações</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Bell size={22} className="text-t4" />
              <p className="text-[12.5px] text-t4">Sem novas notificações</p>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <Link
        href="/dashboard/settings"
        className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors"
        title="Configurações"
      >
        <Settings size={15} />
      </Link>

      {/* Avatar + dropdown */}
      <div className="relative ml-1.5" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-[#1a0e00] shrink-0 hover:ring-2 hover:ring-y/50 transition-all"
          style={{ background: "linear-gradient(135deg, #d4a574 30%, #8b5e3c 100%)" }}
        >
          {initials}
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] w-[200px] rounded-[12px] border border-b1 overflow-hidden z-50"
            style={{ background: "#0A0A0A", boxShadow: "0 16px 40px #00000090" }}
          >
            <div className="px-3.5 py-3 border-b border-b1">
              <p className="text-[13px] font-semibold text-white truncate">{userName ?? "Usuário"}</p>
              <p className="text-[11.5px] text-t3 truncate">{userEmail ?? ""}</p>
            </div>

            <div className="py-1">
              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-t2 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User size={14} />
                Perfil
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-t2 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings size={14} />
                Configurações
              </Link>
            </div>

            <div className="border-t border-b1 py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
