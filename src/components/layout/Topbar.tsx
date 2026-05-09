"use client";

import { Search, Bell, Settings } from "lucide-react";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="flex items-center gap-2.5 px-7 border-b border-b1 shrink-0"
      style={{ height: 60 }}
    >
      <span className="text-[22px] font-bold text-white tracking-tight">{title}</span>
      <div className="flex-1" />
      <button className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors">
        <Search size={15} />
      </button>
      <button className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors">
        <Bell size={15} />
      </button>
      <button className="w-9 h-9 bg-card border border-b1 rounded-[9px] flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors">
        <Settings size={15} />
      </button>
      <div
        className="w-9 h-9 rounded-full ml-1.5 shrink-0"
        style={{ background: "linear-gradient(135deg, #d4a574 30%, #8b5e3c 100%)" }}
      />
    </header>
  );
}
