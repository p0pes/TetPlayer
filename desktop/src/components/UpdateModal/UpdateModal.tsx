import React, { useState, useEffect } from "react";
import { Sparkles, Download, X, ExternalLink, ArrowRight, PackageCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  UpdateInfo,
  UpdateProgress,
  downloadAndInstallInAppUpdate,
  downloadAndInstallUpdate,
  formatBytes,
  openReleasePage,
} from "../../services/updater";

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const [installProgress, setInstallProgress] = useState<UpdateProgress | null>(null);

  const handleUpdateClick = async () => {
    if (updateInfo.isNativeUpdater) {
      setInstallProgress({
        status: "downloading",
        percent: 0,
        downloadedBytes: 0,
      });

      const started = await downloadAndInstallInAppUpdate(updateInfo, (prog) => {
        setInstallProgress(prog);
      });

      if (!started) {
        // Fallback automático já executado dentro do serviço se nativo falhou
      }
    } else {
      await downloadAndInstallUpdate(updateInfo);
      onClose();
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
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, installProgress]);

  const isUpdating =
    installProgress?.status === "downloading" ||
    installProgress?.status === "installing" ||
    installProgress?.status === "ready";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#13151f] border border-white/10 rounded-2xl shadow-2xl shadow-indigo-950/30 overflow-hidden text-[#e0e2ec] cursor-default"
      >
        {/* Glow de destaque no topo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-indigo-500/25 via-purple-500/10 to-transparent blur-xl pointer-events-none" />

        {/* Botão fechar (oculto durante instalação) */}
        {!isUpdating && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors z-10"
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
                  {installProgress.status === "downloading" && "Baixando pacote oficial..."}
                  {installProgress.status === "installing" && "Instalando nova versão..."}
                  {installProgress.status === "ready" && "Pronto! Reiniciando o TetPlayer..."}
                  {installProgress.status === "error" && "Erro durante a atualização"}
                </span>
                <span className="font-mono text-indigo-400 font-bold">
                  {installProgress.percent}%
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out"
                  style={{ width: `${installProgress.percent}%` }}
                />
              </div>

              {/* Detalhes de Bytes */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>
                  {formatBytes(installProgress.downloadedBytes)}
                  {installProgress.totalBytes ? ` de ${formatBytes(installProgress.totalBytes)}` : ""}
                </span>
                {installProgress.status === "ready" && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Sucesso
                  </span>
                )}
              </div>

              {/* Mensagem de Erro com Fallback */}
              {installProgress.status === "error" && (
                <div className="pt-2 text-xs text-rose-400 flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {installProgress.error || "O download in-app falhou. Deseja baixar pelo navegador?"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Texto descritivo (quando ainda não clicou em atualizar) */}
          {!installProgress && (
            <>
              <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                Uma nova versão do <strong>TetPlayer</strong> está disponível.
                {updateInfo.isNativeUpdater ? (
                  <span> A atualização será baixada e instalada silenciosamente sem abrir o navegador.</span>
                ) : (
                  <span> Deseja atualizar agora para aproveitar as melhorias mais recentes?</span>
                )}
              </p>

              {/* Pacote detectado para download em 1 clique */}
              {updateInfo.downloadUrl && (
                <div className="mb-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between text-xs text-indigo-200">
                  <div className="flex items-center gap-2 truncate">
                    <PackageCheck size={16} className="text-indigo-400 shrink-0" />
                    <span className="font-mono truncate">{updateInfo.assetName || "Instalador do Windows"}</span>
                  </div>
                  {updateInfo.assetSize && (
                    <span className="font-mono text-[11px] text-zinc-400 shrink-0 ml-2">
                      {formatBytes(updateInfo.assetSize)}
                    </span>
                  )}
                </div>
              )}

              {/* Notas da Versão (se houver) */}
              {updateInfo.releaseNotes && (
                <div className="mb-4 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-zinc-400 max-h-32 overflow-y-auto custom-scrollbar">
                  <div className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider mb-1">
                    Novidades:
                  </div>
                  <div className="whitespace-pre-line text-zinc-300 leading-snug">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-2">
            {!isUpdating ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenReleasePage}
                  className="text-xs text-zinc-400 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver release no GitHub</span>
                  <ExternalLink size={12} />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
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
                  onClick={onClose}
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
