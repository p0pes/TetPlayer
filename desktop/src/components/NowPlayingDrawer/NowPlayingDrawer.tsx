import {
  ListMusic,
  Mic2,
  Sliders,
} from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { QueueView } from "../QueueView/QueueView";
import { LyricsView } from "../LyricsView/LyricsView";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { MotionCover } from "./MotionCover";

export function NowPlayingDrawer() {
  const {
    currentTrack,
    nowPlayingTab,
    setNowPlayingTab,
    activeQueue,
    crossfadeSeconds,
    cycleCrossfade,
    isPlaying,
    isDrawerClosing,
  } = usePlayer();

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col min-h-0 overflow-hidden bg-[#0b0c10] ${
        isDrawerClosing ? "animate-drawer-out pointer-events-none" : "animate-drawer-in"
      }`}
    >
      {/* Header Minimalista da Gaveta: Tabs (Fila / Letras) Centralizadas + Crossfade */}
      <div className="h-14 px-3 sm:px-4 md:px-6 border-b border-white/[0.06] flex items-center justify-between gap-2 sm:gap-4 shrink-0 bg-[#0d0f16]/85 backdrop-blur-md z-20">
        {/* Esquerda: Espaçador simétrico (Evita triplicar título/artista na mesma tela) */}
        <div className="w-[28%] min-w-0 max-w-[260px] hidden sm:block" />

        {/* Centro: Tabs com Semântica WAI-ARIA & Indicador Deslizante 144 FPS (translate3d) */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
          <div
            role="tablist"
            aria-label="Visualização da gaveta de reprodução"
            className="relative grid grid-cols-2 items-center bg-[#131622] p-1 h-9 rounded-xl border border-white/[0.06] shadow-inner shrink-0 overflow-hidden"
          >
            {/* Indicador Deslizante (Pill) 100% Acelerado por GPU */}
            <div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[9px] bg-[var(--accent)] shadow-md shadow-[var(--accent-glow)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none will-change-transform"
              style={{
                transform:
                  nowPlayingTab === "queue"
                    ? "translate3d(0%, 0, 0)"
                    : "translate3d(100%, 0, 0)",
              }}
            />

            <button
              type="button"
              role="tab"
              aria-selected={nowPlayingTab === "queue"}
              aria-label="Fila de reprodução"
              onClick={() => setNowPlayingTab("queue")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 h-full rounded-[9px] text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                nowPlayingTab === "queue"
                  ? "text-white"
                  : "text-[#8c91a4] hover:text-white"
              }`}
            >
              <ListMusic className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden xl:inline">Fila de Reprodução</span>
                <span className="xl:hidden">Fila</span>
              </span>
              {activeQueue.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 transition-colors ${
                  nowPlayingTab === "queue" ? "bg-black/30 text-white" : "bg-white/[0.08] text-zinc-300"
                }`}>
                  {activeQueue.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={nowPlayingTab === "lyrics"}
              aria-label="Letras sincronizadas"
              onClick={() => setNowPlayingTab("lyrics")}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-3.5 h-full rounded-[9px] text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                nowPlayingTab === "lyrics"
                  ? "text-white"
                  : "text-[#8c91a4] hover:text-white"
              }`}
            >
              <Mic2 className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Letras</span>
            </button>
          </div>
        </div>

        {/* Direita: Configuração de Crossfade (Mesma altura e proporção h-8 rounded-xl) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-[28%] min-w-0 max-w-[260px]">
          <button
            type="button"
            onClick={cycleCrossfade}
            title="Alternar Transição Suave (Crossfade: Desligado / 2s / 3s / 5s / 8s / 12s)"
            className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              crossfadeSeconds > 0
                ? "bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] shadow-sm"
                : "bg-[#141722] border-[#232735] text-[#8c91a4] hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
            <span className="hidden lg:inline">Crossfade:</span>
            <span className="font-mono">{crossfadeSeconds > 0 ? `${crossfadeSeconds}s` : "Off"}</span>
          </button>
        </div>
      </div>

      {/* Corpo Dividido: Lado Esquerdo (Capa Fluida) & Lado Direito (Fila ou Letras) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LADO ESQUERDO: Capa com limite vertical máx. [32vh] para não quebrar em resoluções menores */}
        <div className="w-full lg:w-[42%] xl:w-[38%] p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1f232e] shrink-0 bg-gradient-to-b from-[#10121a]/80 to-[#0a0b10]/95">
          {/* Camadas Radiantes de Aurora */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full aurora-cover-aura-1 blur-[60px] opacity-90 scale-110 pointer-events-none" />
            <div className="w-[450px] h-[450px] rounded-full aurora-cover-aura-2 blur-[90px] opacity-80 scale-125 pointer-events-none" />
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                background: "radial-gradient(circle at center, var(--aurora-1-glow) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Capa Animada Motion Cover estilo Apple Music com 3D Tilt & Specular Light Sweep (Sugestão 3.5) */}
          <MotionCover track={currentTrack} isPlaying={isPlaying} />

          {/* Metadados da Faixa Atual */}
          <div key={currentTrack?.id || "empty-drawer-meta"} className="relative z-10 mt-6 text-center max-w-sm w-full px-2 animate-view-fade">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </h2>
            <p
              onClick={() => {
                if (currentTrack?.artist) {
                  window.dispatchEvent(
                    new CustomEvent("tetplayer:search-artist", {
                      detail: {
                        query: currentTrack.artist,
                        artistId: currentTrack.artist_id,
                      },
                    })
                  );
                }
              }}
              title={currentTrack?.artist ? `Ir para o artista ${currentTrack.artist}` : undefined}
              className={`text-sm font-semibold text-[var(--accent-text)] mt-1 truncate ${
                currentTrack?.artist ? "hover:underline cursor-pointer transition-colors" : ""
              }`}
            >
              {currentTrack?.artist || "TetPlayer"}
            </p>
            {currentTrack?.album && (
              <p
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("tetplayer:open-album", {
                      detail: {
                        albumId: currentTrack.album_id,
                        albumTitle: currentTrack.album,
                        artist: currentTrack.artist,
                        artworkUrl: currentTrack.artwork_url,
                      },
                    })
                  );
                }}
                title={`Ver álbum ${currentTrack.album}`}
                className="text-xs text-[#8c91a4] hover:text-[var(--accent-text)] hover:underline mt-0.5 truncate font-medium cursor-pointer transition-colors"
              >
                {currentTrack.album}
              </p>
            )}

            {/* Visualizador de Espectro Dinâmico */}
            <div className="mt-5 w-full max-w-[280px] mx-auto">
              <SpectrumVisualizer isPlaying={isPlaying} track={currentTrack} variant="full" barCount={16} />
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Fila ou Letras baseado unicamente em nowPlayingTab com transição fluida */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <div
            key={nowPlayingTab}
            className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200 slide-in-from-right-2"
          >
            {nowPlayingTab === "queue" ? <QueueView /> : <LyricsView />}
          </div>
        </div>
      </div>
    </div>
  );
}
