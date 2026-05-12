"use client";

import { useEffect, useState } from "react";
import {
  Cog, Loader2, AlertCircle, CheckCircle2, AlertTriangle,
  Power, Image, Video, Music, UserPlus, Info,
} from "lucide-react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

interface Setting {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

interface ToggleConfig {
  key: string;
  label: string;
  description: string;
  icon: typeof Image;
  invertVisual?: boolean;     // se true, "true" = bom (verde) e "false" = ruim (vermelho)
  destructive?: boolean;       // se true, ativar EXIGE confirmação dupla
  destructiveText?: string;    // texto que precisa ser digitado pra confirmar
}

const TOGGLES: ToggleConfig[] = [
  {
    key: "maintenance_mode",
    label: "Modo manutenção (global)",
    description: "Bloqueia TODAS as APIs de geração (imagem, vídeo, áudio). Apenas leitura permanece. Use em emergência.",
    icon: Power,
    destructive: true,
    destructiveText: "ATIVAR MANUTENCAO",
  },
  {
    key: "image_generation_enabled",
    label: "Geração de imagem",
    description: "Liga/desliga endpoint /api/generate/image (Nano Banana, Flux, GPT Image 2).",
    icon: Image,
    invertVisual: true,
  },
  {
    key: "video_generation_enabled",
    label: "Geração de vídeo",
    description: "Liga/desliga endpoint /api/generate/video (Seedance, Veo 3, Kling).",
    icon: Video,
    invertVisual: true,
  },
  {
    key: "audio_generation_enabled",
    label: "Geração de áudio",
    description: "Liga/desliga endpoint /api/generate/music (Suno V4–V5.5).",
    icon: Music,
    invertVisual: true,
  },
  {
    key: "new_signups_enabled",
    label: "Novos cadastros",
    description: "Quando desligado, bloqueia /login signup. (Aplicação manual em código — toggle aqui é informativo por ora.)",
    icon: UserPlus,
    invertVisual: true,
  },
];

const MAINT_MESSAGE_KEY = "maintenance_message";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [maintMessage, setMaintMessage] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);

  const [destructiveTarget, setDestructiveTarget] = useState<ToggleConfig | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        const errData = await res.json();
        setError(errData?.error?.message ?? "Erro ao carregar configurações");
        return;
      }
      const json = await res.json();
      const map: Record<string, unknown> = {};
      for (const s of json.settings as Setting[]) {
        map[s.key] = s.value;
      }
      setSettings(map);
      setMaintMessage(typeof map[MAINT_MESSAGE_KEY] === "string"
        ? (map[MAINT_MESSAGE_KEY] as string)
        : ""
      );
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function update(key: string, value: unknown, reasonOverride?: string) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, reason: reasonOverride }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Erro ao salvar");
        return false;
      }
      await load();
      setSuccess(`${key} atualizado`);
      setTimeout(() => setSuccess(null), 2500);
      return true;
    } catch {
      setError("Erro de rede");
      return false;
    }
  }

  async function toggleSetting(t: ToggleConfig) {
    const current = settings[t.key] === true;
    const newValue = !current;

    // Pra "ativar" (true) num toggle destructive (ex: maintenance_mode), exige confirmação dupla
    if (t.destructive && newValue) {
      setDestructiveTarget(t);
      setReason("");
      return;
    }

    await update(t.key, newValue);
  }

  async function applyDestructive() {
    if (!destructiveTarget) return;
    if (reason.trim().length < 10) {
      setError("Motivo precisa ter ao menos 10 caracteres");
      return;
    }
    const ok = await update(destructiveTarget.key, true, reason.trim());
    if (ok) {
      setDestructiveTarget(null);
      setReason("");
    }
  }

  async function saveMaintMessage() {
    setSavingMessage(true);
    await update(MAINT_MESSAGE_KEY, maintMessage);
    setSavingMessage(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="text-y animate-spin mr-2" />
        <span className="text-[13px] text-t3">Carregando...</span>
      </div>
    );
  }

  const isMaintenance = settings.maintenance_mode === true;
  const messageChanged = maintMessage !== (settings[MAINT_MESSAGE_KEY] ?? "");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-white mb-1 flex items-center gap-2">
          <Cog size={20} className="text-y" />
          Configurações
        </h1>
        <p className="text-[13px] text-t3">
          Kill switches operacionais + modo manutenção. Toda mudança gera audit log.
        </p>
      </div>

      {/* Banner de status crítico */}
      {isMaintenance && (
        <div className="flex items-start gap-2.5 p-4 rounded-[12px] bg-red-500/10 border border-red-500/30 mb-5">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-bold text-red-300 mb-1">
              ⚠️ Modo manutenção ATIVO
            </div>
            <div className="text-[12px] text-red-300 leading-relaxed">
              Todas as APIs de geração (imagem, vídeo, áudio) estão bloqueadas e retornam 503.
              Os usuários veem a mensagem: <em>&ldquo;{typeof settings[MAINT_MESSAGE_KEY] === "string" ? settings[MAINT_MESSAGE_KEY] as string : ""}&rdquo;</em>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-[10px] bg-red-500/10 border border-red-500/20 mb-4">
          <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-emerald-300">{success}</p>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-3 mb-6">
        {TOGGLES.map((t) => {
          const value = settings[t.key] === true;
          const Icon = t.icon;
          // invertVisual: true = bom (verde); false = ruim (laranja)
          const isGood = t.invertVisual ? value : !value;
          return (
            <div
              key={t.key}
              className={`bg-card border rounded-[12px] p-4 transition-colors ${
                isGood ? "border-b1" : "border-orange-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                  isGood
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-orange-500/10 text-orange-400"
                }`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white mb-0.5">{t.label}</div>
                  <p className="text-[12px] text-t3 leading-relaxed">{t.description}</p>
                </div>
                <button
                  onClick={() => toggleSetting(t)}
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    value ? "bg-emerald-500" : "bg-card2 border border-b1"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
                      value ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mensagem de manutenção */}
      <div className="bg-card border border-b1 rounded-[12px] p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-y" />
          <h3 className="text-[13px] font-semibold text-white">Mensagem de manutenção</h3>
        </div>
        <p className="text-[12px] text-t3 mb-3 leading-relaxed">
          Texto exibido aos usuários quando o modo manutenção estiver ativo ou quando uma API de geração estiver desabilitada.
        </p>
        <textarea
          value={maintMessage}
          onChange={(e) => setMaintMessage(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Estamos em manutenção temporária. Voltamos em breve."
          className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[13px] text-white placeholder-t4 outline-none focus:border-b2 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10.5px] text-t4">{maintMessage.length}/500</span>
          <button
            onClick={saveMaintMessage}
            disabled={!messageChanged || savingMessage}
            className="px-3 py-1.5 rounded-[8px] bg-y text-[#1a0e00] font-semibold text-[12px] hover:bg-[#FCD34D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {savingMessage && <Loader2 size={11} className="animate-spin" />}
            Salvar mensagem
          </button>
        </div>
      </div>

      <p className="text-[11px] text-t4 text-center mt-4">
        Toda mudança aqui gera linha em <code className="text-y">admin_audit_logs</code> com action <code className="text-y">settings.update</code>.
      </p>

      {/* Modal de confirmação destrutiva (modo manutenção) */}
      <AdminConfirmDialog
        open={!!destructiveTarget}
        onClose={() => { setDestructiveTarget(null); setReason(""); }}
        onConfirm={applyDestructive}
        title={`Ativar: ${destructiveTarget?.label ?? ""}`}
        tone="danger"
        confirmLabel="Ativar"
        requireTypedConfirmation={destructiveTarget?.destructiveText}
        requireTypedLabel="Digite exatamente para confirmar"
        description={
          <div className="space-y-3 mt-2">
            <p className="text-[12.5px] text-red-300 leading-relaxed">
              Esta ação <strong>bloqueia todas as gerações de imagem, vídeo e áudio</strong> imediatamente.
              Os usuários verão erro 503 ao tentar gerar.
            </p>
            <div>
              <label className="block text-[11.5px] font-semibold text-t3 uppercase tracking-wider mb-1.5">
                Motivo <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: investigação de bug crítico, abuso em massa, problema no provedor..."
                rows={3}
                className="w-full bg-card2 border border-b1 rounded-[8px] px-3 py-2 text-[12.5px] text-white placeholder-t4 outline-none focus:border-b2 resize-none"
              />
              <p className="mt-1 text-[10.5px] text-t4">{reason.length}/500 · mínimo 10 chars</p>
            </div>
          </div>
        }
      />
    </div>
  );
}
