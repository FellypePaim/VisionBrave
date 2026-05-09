"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import {
  Image, Video, Music, Trash2, Download, Loader2, LayoutGrid,
  X, ChevronLeft, ChevronRight, Play, Pause,
} from "lucide-react";

type ItemType = "all" | "image" | "video" | "audio";

interface GalleryItem {
  id: string;
  type: "image" | "video" | "audio";
  prompt: string;
  model: string;
  public_url: string | null;
  external_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const TYPE_TABS: { key: ItemType; label: string; icon: React.ElementType }[] = [
  { key: "all",   label: "Todos",   icon: LayoutGrid },
  { key: "image", label: "Imagens", icon: Image },
  { key: "video", label: "Vídeos",  icon: Video },
  { key: "audio", label: "Áudio",   icon: Music },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function Lightbox({
  item,
  items,
  onClose,
  onNav,
  onDelete,
  deletingId,
}: {
  item: GalleryItem;
  items: GalleryItem[];
  onClose: () => void;
  onNav: (item: GalleryItem) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const idx = items.findIndex((i) => i.id === item.id);
  const hasPrev = idx > 0;
  const hasNext = idx < items.length - 1;
  const url = item.public_url ?? item.external_url ?? "";
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNav(items[idx - 1]);
      if (e.key === "ArrowRight" && hasNext) onNav(items[idx + 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav, hasPrev, hasNext, idx, items]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      {/* Main container */}
      <div
        className="relative flex max-w-[90vw] max-h-[90vh] w-full"
        style={{ gap: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media panel */}
        <div className="flex-1 flex items-center justify-center min-w-0 relative">
          {/* Prev */}
          {hasPrev && (
            <button
              onClick={() => onNav(items[idx - 1])}
              className="absolute left-3 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {item.type === "image" && url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt={item.prompt}
              className="max-w-full max-h-[85vh] rounded-[16px] object-contain"
              style={{ boxShadow: "0 32px 80px #000000cc" }}
            />
          )}

          {item.type === "video" && url && (
            <div className="relative">
              <video
                src={url}
                className="max-w-full max-h-[85vh] rounded-[16px] object-contain"
                style={{ boxShadow: "0 32px 80px #000000cc" }}
                controls
                autoPlay
                loop
              />
            </div>
          )}

          {item.type === "audio" && (
            <div
              className="w-64 h-64 rounded-[24px] flex flex-col items-center justify-center gap-5"
              style={{ background: "linear-gradient(135deg, #1a1208, #050505)", border: "1px solid #2a1f10", boxShadow: "0 32px 80px #000000cc" }}
            >
              <Music size={48} className="text-y opacity-70" />
              <p className="text-[13px] text-t3 text-center px-6 line-clamp-3">{item.prompt}</p>
              {url && (
                <audio
                  src={url}
                  autoPlay
                  controls
                  className="w-48"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
              )}
            </div>
          )}

          {/* Next */}
          {hasNext && (
            <button
              onClick={() => onNav(items[idx + 1])}
              className="absolute right-3 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Info sidebar */}
        <div
          className="flex flex-col shrink-0 rounded-r-[16px] p-5"
          style={{ width: 260, background: "#0A0A0A", borderLeft: "1px solid #1F1F1F" }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="self-end w-8 h-8 rounded-[8px] bg-card border border-b1 flex items-center justify-center text-t2 hover:text-white hover:border-b2 transition-colors mb-4"
          >
            <X size={14} />
          </button>

          {/* Type badge */}
          <span className="inline-flex self-start items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-card border border-b1 text-t2 capitalize mb-3">
            {item.type === "image" && <Image size={10} />}
            {item.type === "video" && <Video size={10} />}
            {item.type === "audio" && <Music size={10} />}
            {item.type}
          </span>

          <p className="text-[13px] font-semibold text-white leading-[1.5] mb-3">{item.prompt}</p>

          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-t4">Modelo</span>
              <span className="text-t2 font-medium">{item.model}</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-t4">Criado</span>
              <span className="text-t2">{timeAgo(item.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-t4">Índice</span>
              <span className="text-t2">{idx + 1} / {items.length}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold text-[#1a0e00] transition-colors hover:bg-[#FCD34D]"
              style={{ background: "#FBBF24" }}
            >
              <Download size={13} />
              Baixar
            </a>
            <button
              onClick={() => onDelete(item.id)}
              disabled={deletingId === item.id}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {deletingId === item.id
                ? <Loader2 size={13} className="animate-spin" />
                : <Trash2 size={13} />}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 24;

export default function GalleryPage() {
  const [activeType, setActiveType] = useState<ItemType>("all");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const fetchItems = useCallback(async (reset = true) => {
    const currentOffset = reset ? 0 : offset;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(currentOffset) });
      if (activeType !== "all") params.set("type", activeType);
      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();
      const newItems: GalleryItem[] = data.items ?? [];
      setItems((prev) => reset ? newItems : [...prev, ...newItems]);
      setHasMore(data.hasMore ?? false);
      setOffset(currentOffset + newItems.length);
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  }, [activeType, offset]);

  useEffect(() => { fetchItems(true); }, [activeType]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (lightboxItem?.id === id) setLightboxItem(null);
    } finally {
      setDeletingId(null);
    }
  }

  const displayUrl = (item: GalleryItem) => item.public_url ?? item.external_url ?? "";

  const imageItems = items.filter((i) => i.type === "image");
  const videoItems = items.filter((i) => i.type === "video");
  const audioItems = items.filter((i) => i.type === "audio");
  const shownItems = activeType === "all" ? items : items.filter((i) => i.type === activeType);

  return (
    <>
      <Topbar title="Gallery" />

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          items={shownItems}
          onClose={() => setLightboxItem(null)}
          onNav={setLightboxItem}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      <div className="flex flex-1 overflow-hidden flex-col">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-6 py-3.5 border-b border-b1 shrink-0">
          {TYPE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium border transition-all ${
                activeType === key
                  ? "bg-[#1f1608] border-y text-y"
                  : "bg-card border-b1 text-t2 hover:text-white hover:border-b2"
              }`}
            >
              <Icon size={12} />
              {label}
              {key !== "all" && (
                <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full ${
                  activeType === key ? "bg-y/20 text-y" : "bg-card2 text-t4"
                }`}>
                  {key === "image" ? imageItems.length : key === "video" ? videoItems.length : audioItems.length}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-[12px] text-t4">{items.length} {items.length !== 1 ? "itens" : "item"}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-t3">
              <Loader2 size={18} className="animate-spin text-y" />
              Carregando galeria...
            </div>
          ) : shownItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <div className="w-14 h-14 bg-card border border-b1 rounded-2xl flex items-center justify-center">
                <LayoutGrid size={24} className="text-t4" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#d0d0d0] mb-1">Nenhum {activeType === "all" ? "item" : activeType === "image" ? "imagem" : activeType === "video" ? "vídeo" : "áudio"} ainda</p>
                <p className="text-[12.5px] text-t3">Gere algo e ele aparecerá aqui automaticamente</p>
              </div>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
              {shownItems.map((item) => (
                <div
                  key={item.id}
                  className="break-inside-avoid group relative rounded-[14px] overflow-hidden border border-b1 bg-card hover:border-b2 transition-colors cursor-pointer"
                  onClick={() => setLightboxItem(item)}
                >
                  {/* Media */}
                  {item.type === "image" && displayUrl(item) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={displayUrl(item)}
                      alt={item.prompt}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  )}

                  {item.type === "video" && displayUrl(item) && (
                    <video
                      src={displayUrl(item)}
                      className="w-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLVideoElement).pause();
                        (e.currentTarget as HTMLVideoElement).currentTime = 0;
                      }}
                    />
                  )}

                  {item.type === "audio" && (
                    <div className="w-full aspect-square bg-gradient-to-br from-[#1a1208] to-[#050505] flex items-center justify-center">
                      <Music size={32} className="text-y opacity-60" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-[11px] text-white/90 line-clamp-2 mb-2 leading-[1.4]">{item.prompt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50">{timeAgo(item.created_at)}</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={displayUrl(item)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 bg-white/10 backdrop-blur-sm rounded-[7px] flex items-center justify-center hover:bg-white/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={12} className="text-white" />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          disabled={deletingId === item.id}
                          className="w-7 h-7 bg-red-500/20 backdrop-blur-sm rounded-[7px] flex items-center justify-center hover:bg-red-500/40 transition-colors"
                        >
                          {deletingId === item.id
                            ? <Loader2 size={11} className="animate-spin text-red-400" />
                            : <Trash2 size={11} className="text-red-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white/70 capitalize">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && !loading && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchItems(false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-card border border-b1 text-[13px] font-medium text-t2 hover:text-white hover:border-b2 transition-colors disabled:opacity-50"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin text-y" /> : null}
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
