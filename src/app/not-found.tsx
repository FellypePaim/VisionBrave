import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="text-center max-w-md">
        <div className="text-[120px] font-extrabold text-y leading-none tracking-tighter mb-4">
          404
        </div>
        <h1 className="text-[24px] font-bold text-white mb-3">Página não encontrada</h1>
        <p className="text-[14px] text-t3 mb-8 leading-relaxed">
          Parece que você se perdeu. A página que você procura pode ter sido movida ou não existe mais.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-card border border-b1 rounded-[10px] text-[13.5px] font-semibold text-white hover:border-b2 transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13.5px] font-bold text-[#1a0e00] transition-all hover:-translate-y-px"
            style={{ background: "#FBBF24", boxShadow: "0 4px 24px #FBBF2440" }}
          >
            <Home size={14} />
            Ir para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
