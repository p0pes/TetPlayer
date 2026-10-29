import React, { useState, useEffect } from "react";
import { Sparkles, Download, X, ExternalLink, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  UpdateInfo,
  UpdateProgress,
  downloadAndInstallInAppUpdate,
  downloadAndInstallUpdate,
  formatBytes,
  openReleasePage,
} from "../../services/updater";
import { useModalAnimation } from "../../hooks/useModalAnimation";

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const [installProgress, setInstallProgress] = useState<UpdateProgress | null>(null);

  const { shouldRender, requestClose, backdropClassName, modalClassName } =
    useModalAnimation(true, onClose, 140);

  const isUpdating =
    installProgress?.status === "downloading" ||
    installProgress?.status === "installing" ||
    installProgress?.status === "ready";

  const handleUpdateClick = async () => {
    if (updateInfo.isNativeUpdater) {
      setInstallProgress({
        status: "downloading",
        percent: 0,
        downloadedBytes: 0,
      });

      await downloadAndInstallInAppUpdate(updateInfo, (prog) => {
        setInstallProgress(prog);
      });
    } else {
      await downloadAndInstallUpdate(updateInfo);
      requestClose();
    }
  };

  const handleOpenReleasePage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openReleasePage(updateInfo.releaseUrl);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia fechar acidentalmente com Esc se o download já estiver em progresso
      if (e.key === "Escape" && !installProgress) {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, installProgress]);

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) requestClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md select-none cursor-pointer ${backdropClassName}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden text-[#e0e2ec] cursor-default ${modalClassName}`}
      >
        {/* Glow de destaque no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-indigo-500/25 via-purple-500/10 to-transparent blur-xl pointer-events-none" />

        {/* Botão fechar (oculto durante instalação) */}
        {!isUpdating && (
          <button
            onClick={requestClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors z-10 cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        )}

        <div className="p-6 relative z-10">
          {/* Cabeçalho com Ícone */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              {isUpdating ? (
                <Loader2 size={22} className="animate-spin text-white" />
              ) : (
                <Sparkles size={22} className="animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                {isUpdating ? "Atualizando TetPlayer..." : "Nova Atualização Disponível!"}
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

          {/* Se estiver no processo de instalação In-App */}
          {installProgress && (
            <div className="mb-4 space-y-3 bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  {installProgress.status === "downloading" && "Baixando atualização..."}
                  {installProgress.status === "installing" && "Instalando pacote silenciosamente..."}
                  {installProgress.status === "ready" && "Pronto para reiniciar!"}
                  {installProgress.status === "error" && "Erro durante a atualização"}
                </span>
                <span className="font-mono text-zinc-400">
                  {installProgress.percent}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    installProgress.status === "error"
                      ? "bg-rose-500"
                      : installProgress.status === "ready"
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500"
                  }`}
                  style={{ width: `${Math.max(5, installProgress.percent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                {installProgress.totalBytes ? (
                  <span>
                    {formatBytes(installProgress.downloadedBytes)} de {formatBytes(installProgress.totalBytes)}
                  </span>
                ) : (
                  <span>{formatBytes(installProgress.downloadedBytes)} baixados</span>
                )}
                {installProgress.status === "ready" && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Reiniciando...
                  </span>
                )}
              </div>

              {installProgress.error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>{installProgress.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Notas de Lançamento */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              O que há de novo:
            </h3>
            <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 max-h-40 overflow-y-auto text-xs text-zinc-300 space-y-1.5 leading-relaxed font-sans custom-scrollbar select-text">
              {updateInfo.releaseNotes ? (
                <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
              ) : (
                <p className="italic text-zinc-500">
                  Melhorias de desempenho, correções de bugs e estabilidade de reprodução.
                </p>
              )}
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleOpenReleasePage}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer group"
            >
              <span>Ver no GitHub</span>
              <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            {!isUpdating && installProgress?.status !== "error" ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  >
                    Depois
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateClick}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 hover:from-indigo-600 to-purple-600 hover:to-purple-700 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Atualizar Agora</span>
                  </button>
                </div>
              </>
            ) : installProgress?.status === "error" ? (
              <div className="flex items-center justify-end w-full gap-2">
                <button
                  type="button"
                  onClick={() => downloadAndInstallUpdate(updateInfo)}
                  className="px-3.5 py-2 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-900/60 rounded-xl transition-colors cursor-pointer"
                >
                  Baixar pelo Navegador
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-indigo-400" />
                <span>Não feche o aplicativo enquanto o update é concluído</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
