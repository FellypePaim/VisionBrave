import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const TONE_STYLES = {
  default: { iconBg: "bg-card2 border-b1", iconColor: "text-y" },
  success: { iconBg: "bg-emerald-500/10 border-emerald-500/20", iconColor: "text-emerald-400" },
  warning: { iconBg: "bg-orange-500/10 border-orange-500/20", iconColor: "text-orange-400" },
  danger:  { iconBg: "bg-red-500/10 border-red-500/20",         iconColor: "text-red-400" },
};

export function AdminStatCard({ icon: Icon, label, value, hint, tone = "default" }: Props) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="bg-card border border-b1 rounded-[12px] p-4 hover:border-b2 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11.5px] font-semibold text-t3 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-[8px] border flex items-center justify-center ${styles.iconBg}`}>
          <Icon size={14} className={styles.iconColor} />
        </div>
      </div>
      <div className="text-[22px] font-bold text-white tabular-nums leading-tight">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {hint && (
        <div className="mt-1 text-[11.5px] text-t3">{hint}</div>
      )}
    </div>
  );
}
