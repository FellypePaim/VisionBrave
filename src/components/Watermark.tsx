/**
 * Marca d'água visual aplicada sobre conteúdo gerado por usuários do plano Free.
 *
 * NOTA: este watermark é apenas visual no display — o arquivo no Storage permanece
 * sem marca. Para watermark "real" (gravado no asset), integrar `sharp` (imgs) e
 * `ffmpeg` (vídeos) server-side no /api/gallery/save antes do upload.
 */
export function Watermark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const fontSize = size === "sm" ? "9px" : size === "lg" ? "14px" : "11px";
  const padding = size === "sm" ? "2px 6px" : size === "lg" ? "5px 12px" : "3px 8px";

  return (
    <div
      className="absolute bottom-2 right-2 pointer-events-none select-none rounded-[6px] font-bold tracking-wider z-10"
      style={{
        fontSize,
        padding,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        color: "rgba(251, 191, 36, 0.9)",
        border: "1px solid rgba(251, 191, 36, 0.25)",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
      }}
    >
      VisionBrave
    </div>
  );
}

/**
 * Verifica se um item de galeria/geração precisa receber watermark
 * com base no metadata.
 */
export function needsWatermark(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  return metadata.watermarked === true;
}
