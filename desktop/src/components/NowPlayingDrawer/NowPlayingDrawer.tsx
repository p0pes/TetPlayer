import {
  ListMusic,
  Mic2,
  Sliders,
  ChevronDown,
  Music,
} from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { QueueView } from "../QueueView/QueueView";
import { LyricsView } from "../LyricsView/LyricsView";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

export function NowPlayingDrawer() {
  const {
    currentTrack,
    nowPlayingTab,
    setNowPlayingTab,
    closeNowPlaying,
    activeQueue,
    crossfadeSeconds,
    cycleCrossfade,
    isPlaying,
  } = usePlayer();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#0b0c10]/95 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Header da Gaveta: Tabs (Fila / Letras), Crossfade e Fechar */}
      <div className="h-14 px-6 border-b border-[#1f232e] flex items-center justify-between shrink-0 bg-[#0e1017]/80 backdrop-blur-md z-20">
        {/* Esquerda: Identificador da faixa atual */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-950/80 border border-red-800/40 px-2 py-0.5 rounded-md hidden sm:inline-block">
            Reproduzindo Agora
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </p>
            <p className="text-[11px] text-[#8c91a4] truncate max-w-[200px] sm:max-w-xs">
              {currentTrack?.artist || "TetPlayer"}
            </p>
          </div>
        </div>

        {/* Centro: Tabs com Semântica WAI-ARIA */}
        <div
          role="tablist"
          aria-label="Visualização da gaveta de reprodução"
          className="flex items-center bg-[#141722] p-1 rounded-xl border border-[#232735] shadow-inner shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={nowPlayingTab === "queue"}
            aria-label="Fila de reprodução"
            onClick={() => setNowPlayingTab("queue")}
            className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              nowPlayingTab === "queue"
                ? "bg-red-600 text-white shadow-md shadow-red-950/70"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1e2c]"
            }`}
          >
            <ListMusic className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden xl:inline">Fila de Reprodução</span>
              <span className="xl:hidden">Fila</span>
            </span>
            {activeQueue.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono shrink-0">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              nowPlayingTab === "lyrics"
                ? "bg-red-600 text-white shadow-md shadow-red-950/70"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1e2c]"
            }`}
          >
            <Mic2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Letras</span>
          </button>
        </div>

        {/* Direita: Configuração de Crossfade e Fechar Gaveta */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={cycleCrossfade}
            title="Alternar Transição Suave (Crossfade: Desligado / 2s / 3s / 5s)"
            className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              crossfadeSeconds > 0
                ? "bg-red-950/60 border-red-800/60 text-red-300 shadow-sm"
                : "bg-[#141722] border-[#232735] text-[#8c91a4] hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="hidden sm:inline">Crossfade:</span>
            <span className="font-mono">{crossfadeSeconds > 0 ? `${crossfadeSeconds}s` : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={closeNowPlaying}
            title="Recolher Gaveta [Esc]"
            aria-label="Recolher gaveta"
            className="p-1.5 h-8 w-8 flex items-center justify-center rounded-xl text-[#8c91a4] hover:text-white hover:bg-[#1f2433] border border-[#232735] transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corpo Dividido: Lado Esquerdo (Capa Fluida) & Lado Direito (Fila ou Letras) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LADO ESQUERDO: Capa com limite vertical máx. [32vh] para não quebrar em resoluções menores (Item #4) */}
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

          {/* Capa com Escalonamento Fluido e max-h-[32vh] em Alta Resolução */}
          <div className="relative group/cover z-10 w-44 h-44 sm:w-60 sm:h-60 lg:w-72 lg:h-72 max-h-[32vh] aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/15 shrink-0 bg-[#141724]">
            {currentTrack?.artwork_url || currentTrack?.id ? (
              <img
                src={upgradeArtworkQuality(currentTrack?.artwork_url, currentTrack?.id)}
                alt={currentTrack?.title || "Capa do álbum"}
                referrerPolicy="no-referrer"
                onError={(e) => handleArtworkError(e, currentTrack?.id)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-[#5e6479]" />
              </div>
            )}
          </div>

          {/* Metadados da Faixa Atual */}
          <div className="relative z-10 mt-6 text-center max-w-sm w-full px-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </h2>
            <p className="text-sm font-semibold text-red-400 mt-1 truncate">
              {currentTrack?.artist || "TetPlayer"}
            </p>
            {currentTrack?.album && (
              <p className="text-xs text-[#8c91a4] mt-0.5 truncate font-medium">
                {currentTrack.album}
              </p>
            )}

            {/* Badges de Qualidade e Crossfade */}
            <div className="mt-3.5 flex items-center justify-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#c4c8d8]">
                {currentTrack?.duration || "Streaming HD"}
              </span>
              {crossfadeSeconds > 0 && (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-950/70 border border-red-800/40 text-red-300">
                  Crossfade {crossfadeSeconds}s
                </span>
              )}
            </div>

            {/* Visualizador de Espectro Dinâmico (Sugestão 3.2) */}
            <div className="mt-4 w-full max-w-[280px] mx-auto">
              <SpectrumVisualizer isPlaying={isPlaying} variant="full" barCount={16} />
            </div>
          </div>
        </div>

        {/* LADO DIREITO: Fila ou Letras baseado unicamente em nowPlayingTab (Item #1) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {nowPlayingTab === "queue" ? <QueueView /> : <LyricsView />}
        </div>
      </div>
    </div>
  );
}
