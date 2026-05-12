import { Construction } from "lucide-react";

interface Props {
  title: string;
  phase?: string;
  description?: string;
}

export function ComingSoon({ title, phase, description }: Props) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-white mb-1">{title}</h1>
        {phase && (
          <p className="text-[13px] text-t3">Será implementado na {phase}</p>
        )}
      </div>

      <div className="bg-card border border-b1 rounded-[12px] p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-[12px] bg-y/10 border border-y/20 flex items-center justify-center mb-4">
          <Construction size={22} className="text-y" />
        </div>
        <div className="text-[15px] font-semibold text-white mb-1">Em construção</div>
        <p className="text-[13px] text-t3 max-w-md leading-relaxed">
          {description ?? "Esta área será habilitada nas próximas fases da implementação do painel admin."}
        </p>
      </div>
    </div>
  );
}
