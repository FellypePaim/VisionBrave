"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Image,
  Video,
  Music,
  LayoutGrid,
  MessageSquare,
  Star,
  Archive,
  Zap,
  Search,
  ChevronUp,
} from "lucide-react";
import { FoxIcon } from "@/components/FoxIcon";

const navMain = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/images", icon: Image, label: "Images" },
  { href: "/dashboard/videos", icon: Video, label: "Videos" },
  { href: "/dashboard/audio", icon: Music, label: "Audio" },
  { href: "/dashboard/gallery", icon: LayoutGrid, label: "Gallery" },
];

const navChat = [
  { href: "/dashboard/chat", icon: MessageSquare, label: "Today", count: 3 },
  { href: "/dashboard/favorites", icon: Star, label: "Favorites", count: 7 },
  { href: "/dashboard/archived", icon: Archive, label: "Archived", count: 24 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ width: 232, minWidth: 232, background: "#0A0A0A" }}
      className="border-r border-b1 flex flex-col py-4 overflow-y-auto shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-[18px] pb-4 border-b border-b1 mb-3">
        <FoxIcon size={32} />
        <span className="text-base font-bold text-white tracking-tight">VisionBrave</span>
      </div>

      {/* Search */}
      <div className="mx-3 mb-3.5 bg-card border border-b1 rounded-[10px] px-3 py-2.5 flex items-center gap-2.5 cursor-pointer">
        <Search size={14} className="text-t4 shrink-0" />
        <span className="text-[13px] text-t4 flex-1">Search anything...</span>
        <span className="text-[11px] text-t4">⌘K</span>
      </div>

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
        <span className="text-[10.5px] font-semibold tracking-[1px] text-t4 uppercase">Chat</span>
        <span className="text-sm text-t4 cursor-pointer">+</span>
      </div>

      {navChat.map(({ href, icon: Icon, label, count }) => {
        const active = pathname === href;
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
            <span className="ml-auto text-[11px] text-t3 font-medium">{count}</span>
          </Link>
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
          <div className="text-[13.5px] font-bold text-white mb-1">Upgrade to Pro</div>
          <div className="text-[12px] text-t3 leading-[1.4] mb-3">
            Unlock more power with advanced AI tools.
          </div>
          <button
            className="w-full rounded-[9px] py-[9px] text-[13px] font-bold text-[#1a0e00] cursor-pointer transition-colors"
            style={{ background: "#FBBF24", boxShadow: "0 2px 14px #FBBF2440" }}
          >
            Upgrade Now
          </button>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] cursor-pointer hover:bg-white/5">
          <div
            className="w-9 h-9 rounded-full shrink-0"
            style={{
              background: "linear-gradient(135deg, #d4a574 30%, #8b5e3c 100%)",
            }}
          />
          <div className="flex-1 overflow-hidden">
            <div className="text-[13px] font-semibold text-[#e0e0e0] truncate">Fellype Paim</div>
            <div className="text-[11.5px] text-t3 truncate">fellype@paim.cloud</div>
          </div>
          <ChevronUp size={14} className="text-t4" />
        </div>
      </div>
    </aside>
  );
}
