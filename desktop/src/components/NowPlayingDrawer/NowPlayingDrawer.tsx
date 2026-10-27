import { useRef, useState, useEffect } from "react";
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
  } = usePlayer();

  const queueBtnRef = useRef<HTMLButtonElement>(null);
  const lyricsBtnRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 2, width: 0 });

  useEffect(() => {
    const activeBtn = nowPlayingTab === "queue" ? queueBtnRef.current : lyricsBtnRef.current;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [nowPlayingTab, activeQueue.length]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#0b0c10]/95 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Header da Gaveta: Tabs (Fila / Letras), Crossfade */}
      <div className="h-14 px-3 sm:px-4 md:px-6 border-b border-[#1f232e] flex items-center justify-between gap-2 sm:gap-4 shrink-0 bg-[#0e1017]/80 backdrop-blur-md z-20">
        {/* Esquerda: Identificador da faixa atual */}
        <div className="flex items-center gap-2 sm:gap-3 w-[28%] min-w-0 max-w-[260px]">
          <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider bg-[var(--accent-subtle)] border border-[var(--accent-border)] px-2 py-0.5 rounded-md hidden xl:inline-block shrink-0">
            Reproduzindo Agora
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </p>
            <p className="text-[11px] text-[#8c91a4] truncate">
              {currentTrack?.artist || "TetPlayer"}
            </p>
          </div>
        </div>

        {/* Centro: Tabs com Semântica WAI-ARIA & Indicador Deslizante Fluido */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2">
          <div
            role="tablist"
            aria-label="Visualização da gaveta de reprodução"
            className="relative flex items-center bg-[#141722] p-0.5 h-8 rounded-xl border border-[#232735] shadow-inner shrink-0 gap-1 overflow-hidden"
          >
            {/* Indicador Deslizante (Pill) Acelerado por GPU */}
            {indicatorStyle.width > 0 && (
              <div
                className="absolute top-0.5 bottom-0.5 rounded-[10px] bg-[var(--accent)] shadow-md shadow-[var(--accent-glow)] transition-all duration-200 ease-out pointer-events-none"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            )}

            <button
              ref={queueBtnRef}
              type="button"
              role="tab"
              aria-selected={nowPlayingTab === "queue"}
              aria-label="Fila de reprodução"
              onClick={() => setNowPlayingTab("queue")}
              className={`relative z-10 flex items-center gap-1.5 px-3 h-full rounded-[10px] text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
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
                  nowPlayingTab === "queue" ? "bg-black/35 text-white" : "bg-white/10 text-zinc-300"
                }`}>
                  {activeQueue.length}
                </span>
              )}
            </button>

            <button
              ref={lyricsBtnRef}
              type="button"
              role="tab"
              aria-selected={nowPlayingTab === "lyrics"}
              aria-label="Letras sincronizadas"
              onClick={() => setNowPlayingTab("lyrics")}
              className={`relative z-10 flex items-center gap-1.5 px-3 h-full rounded-[10px] text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
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
          <div className="relative z-10 mt-6 text-center max-w-sm w-full px-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </h2>
            <p className="text-sm font-semibold text-[var(--accent-text)] mt-1 truncate">
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
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)]">
                  Crossfade {crossfadeSeconds}s
                </span>
              )}
            </div>

            {/* Visualizador de Espectro Dinâmico */}
            <div className="mt-4 w-full max-w-[280px] mx-auto">
              <SpectrumVisualizer isPlaying={isPlaying} variant="full" barCount={16} />
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
