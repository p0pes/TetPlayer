import React, { useEffect } from "react";
import { Sparkles, Download, X, ExternalLink, ArrowRight } from "lucide-react";
import { UpdateInfo, openReleasePage } from "../../services/updater";

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const handleUpdateClick = async () => {
    await openReleasePage(updateInfo.releaseUrl);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden text-[#e0e2ec] cursor-default"
      >
        {/* Glow de destaque no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-indigo-500/25 via-purple-500/10 to-transparent blur-xl pointer-events-none" />

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors z-10"
          title="Fechar"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="p-6 relative z-10">
          {/* Cabeçalho com Ícone */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Nova Atualização Disponível!
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                <span className="text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  v{updateInfo.currentVersion}
                </span>
                <ArrowRight size={12} className="text-indigo-400" />
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-semibold">
                  v{updateInfo.latestVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Texto descritivo */}
          <p className="text-xs text-zinc-300 leading-relaxed mb-4">
            Uma nova versão do <strong>TetPlayer</strong> está disponível na branch principal do GitHub.
            Deseja atualizar agora para aproveitar as melhorias e correções mais recentes?
          </p>

          {/* Notas da Versão (se houver) */}
          {updateInfo.releaseNotes && (
            <div className="mb-5 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-zinc-400 max-h-32 overflow-y-auto custom-scrollbar">
              <div className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider mb-1">
                Novidades:
              </div>
              <div className="whitespace-pre-line text-zinc-300 leading-snug">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Lembrar mais tarde
            </button>
            <button
              onClick={handleUpdateClick}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 hover:from-indigo-600 to-purple-600 hover:to-purple-700 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Atualizar Agora</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
