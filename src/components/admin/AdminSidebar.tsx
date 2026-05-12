"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Coins, ArrowLeftRight,
  ServerCog, Cog, Shield, ArrowLeft,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin/types";

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Operação",
    items: [
      { href: "/admin",         icon: LayoutDashboard, label: "Visão Geral" },
      { href: "/admin/users",   icon: Users,           label: "Usuários" },
      { href: "/admin/audit",   icon: FileText,        label: "Auditoria" },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/credits",      icon: Coins,         label: "Créditos" },
      { href: "/admin/transactions", icon: ArrowLeftRight, label: "Transações" },
      { href: "/admin/kie",          icon: ServerCog,     label: "KIE Global" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/settings", icon: Cog, label: "Configurações" },
    ],
  },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  return (
    <aside
      style={{ background: "#0A0A0A" }}
      className="hidden lg:flex border-r border-b1 flex-col py-4 overflow-y-auto shrink-0 w-[232px] min-w-[232px]"
    >
      {/* Logo + Admin badge */}
      <div className="flex items-center gap-2 px-4 pb-4 border-b border-b1 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero/logo-no-bg.png" alt="VisionBrave" className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1f1608] border border-y/30">
          <Shield size={11} className="text-y" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-y">Admin</span>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-[9px] bg-card border border-b1">
          <span className="text-[10.5px] text-t3 uppercase tracking-wider">Sua role</span>
          <span className="text-[11px] font-bold text-y uppercase">{role}</span>
        </div>
      </div>

      {/* Navigation groups */}
      {navGroups.map((group) => (
        <div key={group.title} className="mb-2">
          <div className="px-[22px] pt-3 pb-1.5">
            <span className="text-[10.5px] font-semibold tracking-[1px] text-t4 uppercase">
              {group.title}
            </span>
          </div>
          {group.items.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
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
                <Icon size={16} className="shrink-0 opacity-85" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Voltar ao dashboard */}
      <div className="mt-auto px-3 pt-3 border-t border-b1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] text-t3 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={14} />
          Voltar ao Dashboard
        </Link>
      </div>
    </aside>
  );
}
