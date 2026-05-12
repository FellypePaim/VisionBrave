import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

interface HealthChecks {
  supabaseOk: boolean;
  serviceRoleConfigured: boolean;
  kieKeyConfigured: boolean;
  kieMonthlyCapConfigured: boolean;
  siteUrlConfigured: boolean;
}

interface Props {
  health: HealthChecks;
}

const CHECK_LABELS: Record<keyof HealthChecks, string> = {
  supabaseOk:              "Supabase",
  serviceRoleConfigured:   "Service Role Key",
  kieKeyConfigured:        "KIE_AI_API_KEY",
  kieMonthlyCapConfigured: "KIE_MONTHLY_CAP_BRL",
  siteUrlConfigured:       "NEXT_PUBLIC_SITE_URL",
};

export function HealthCard({ health }: Props) {
  const entries = Object.entries(health) as [keyof HealthChecks, boolean][];
  const failing = entries.filter(([, ok]) => !ok);
  const allOk = failing.length === 0;

  return (
    <div
      className={`rounded-[12px] p-4 border ${
        allOk
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-red-500/5 border-red-500/20"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${
            allOk ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}
        >
          <ShieldCheck size={18} className={allOk ? "text-emerald-400" : "text-red-400"} />
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-white">Saúde do Sistema</div>
          <div className="text-[12px] text-t3">
            {allOk
              ? "Todos os serviços operacionais"
              : `${failing.length} ${failing.length === 1 ? "item precisa" : "itens precisam"} de atenção`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {entries.map(([key, ok]) => (
          <div
            key={key}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-[8px] border ${
              ok
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            }`}
          >
            {ok ? (
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={12} className="text-red-400 shrink-0" />
            )}
            <span className={`text-[11.5px] truncate ${ok ? "text-t2" : "text-red-300"}`}>
              {CHECK_LABELS[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
