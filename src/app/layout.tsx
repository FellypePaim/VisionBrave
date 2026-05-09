import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisionBrave — Crie Sem Limites",
  description: "Seu estúdio criativo com IA completo para gerar imagens, vídeos e áudio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
