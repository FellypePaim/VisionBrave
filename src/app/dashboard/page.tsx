import { Topbar } from "@/components/layout/Topbar";
import { Image, Video, Music, ChevronRight, Plus } from "lucide-react";

const tools = [
  {
    icon: Image,
    name: "Image Generator",
    desc: "Create and transform images with next-gen AI models.",
    badge: "Popular",
    badgeNew: false,
    stat: "2.4M",
    href: "/dashboard/images",
  },
  {
    icon: Video,
    name: "Video Generator",
    desc: "Create and edit videos end-to-end with generative AI.",
    badge: "New",
    badgeNew: true,
    stat: "840K",
    href: "/dashboard/videos",
  },
  {
    icon: Music,
    name: "Audio Generator",
    desc: "Add sound, voice, and soundtrack to your project with AI.",
    badge: null,
    badgeNew: false,
    stat: "310K",
    href: "/dashboard/audio",
  },
];

const recentProjects = [
  { name: "Summer Campaign", meta: "2 days ago", type: "Image", color: "#FF8800" },
  { name: "Product X Reels", meta: "4 days ago", type: "Video", color: "#3dff7a" },
  { name: "Podcast Soundtrack", meta: "1 wk ago", type: "Audio", color: "#FBBF24" },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Home" />
      <div className="flex-1 overflow-y-auto p-8">
        {/* Hero */}
        <div className="mb-9">
          <h1 className="text-[32px] font-extrabold text-white tracking-tight mb-1.5">
            Good morning, <span className="text-y">start creating!</span> ✦
          </h1>
          <p className="text-[14.5px] text-t3 mb-6">
            What would you like to create today with VisionBrave?
          </p>
          <div
            className="max-w-[720px] bg-card border border-b1 rounded-[13px] px-5 py-[15px] flex items-center gap-3.5 cursor-text hover:border-b2 transition-colors"
          >
            <svg className="w-4 h-4 text-t3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-[14px] text-t4">Search projects, assets, and more</span>
            <span className="text-[11.5px] text-t3 bg-card2 border border-b1 rounded-[6px] px-2 py-0.5 font-mono">
              Ctrl K
            </span>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white tracking-tight">Tools</h2>
          <span className="flex items-center gap-1 text-[13px] text-y font-medium cursor-pointer">
            View all <ChevronRight size={13} />
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-9">
          {tools.map(({ icon: Icon, name, desc, badge, badgeNew, stat, href }) => (
            <a
              key={name}
              href={href}
              className="group bg-card border border-b1 rounded-2xl p-[22px] cursor-pointer relative overflow-hidden hover:border-[#FBBF2440] hover:bg-[#0F0B05] hover:-translate-y-0.5 transition-all block"
            >
              {/* Glow */}
              <div className="absolute -top-10 -right-10 w-[130px] h-[130px] rounded-full bg-[radial-gradient(circle,#FBBF2440,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between mb-[18px]">
                <div className="w-[46px] h-[46px] bg-[#1a1408] border border-[#2a1f08] rounded-xl flex items-center justify-center">
                  <Icon size={21} className="text-y" />
                </div>
                {badge && (
                  <span
                    className={`text-[10.5px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full border ${
                      badgeNew
                        ? "bg-[#0d2218] text-[#3dff7a] border-[#1a3a28]"
                        : "bg-[#1f1608] text-y border-[#2a1f08]"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>

              <div className="text-base font-bold text-white mb-1.5 tracking-tight">{name}</div>
              <div className="text-[13px] text-t3 leading-[1.55]">{desc}</div>

              <div className="mt-[18px] pt-4 border-t border-b1 flex items-center justify-between">
                <span className="text-[12px] text-t3">
                  Over <span className="text-[#d0d0d0] font-semibold">{stat}</span> creations
                </span>
                <div className="w-[30px] h-[30px] bg-card2 rounded-[8px] flex items-center justify-center group-hover:bg-y transition-colors">
                  <ChevronRight size={13} className="text-t2 group-hover:text-[#1a0e00] transition-colors" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Recent Projects */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white tracking-tight">Recent Projects</h2>
          <span className="flex items-center gap-1 text-[13px] text-y font-medium cursor-pointer">
            View all <ChevronRight size={13} />
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3.5">
          {recentProjects.map(({ name, meta, type, color }) => (
            <div
              key={name}
              className="bg-card border border-b1 rounded-[14px] overflow-hidden cursor-pointer hover:border-[#FBBF2440] hover:-translate-y-0.5 transition-all"
            >
              <div
                className="h-[110px] flex items-center justify-center"
                style={{ background: `radial-gradient(ellipse at 50% 50%, ${color}33 0%, #050202 80%)` }}
              >
                <div
                  className="w-12 h-12 rounded-full opacity-60"
                  style={{ background: color }}
                />
              </div>
              <div className="px-3.5 py-3">
                <div className="text-[13.5px] font-semibold text-white mb-1">{name}</div>
                <div className="text-[12px] text-t3 flex items-center gap-1.5">
                  {meta}
                  <span className="w-[3px] h-[3px] rounded-full bg-t4 inline-block" />
                  {type}
                </div>
              </div>
            </div>
          ))}

          {/* New project */}
          <div className="border-[1.5px] border-dashed border-b1 rounded-[14px] flex flex-col items-center justify-center gap-2.5 cursor-pointer min-h-[165px] group hover:border-[#FBBF2455] hover:bg-[#FBBF2408] transition-all">
            <div className="w-[38px] h-[38px] bg-card border border-b1 rounded-full flex items-center justify-center group-hover:bg-[#1f1608] group-hover:border-y transition-all" style={{ boxShadow: undefined }}>
              <Plus size={16} className="text-t3 group-hover:text-y transition-colors" />
            </div>
            <span className="text-[13px] text-t3 group-hover:text-y transition-colors">New project</span>
          </div>
        </div>
      </div>
    </>
  );
}
