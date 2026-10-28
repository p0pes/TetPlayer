import React, { useCallback } from "react";
import { Sparkles, Mic2, Loader2 } from "lucide-react";
import { usePlayer, usePlaybackProgress } from "../../context/PlayerContext";
import { useLyrics } from "../../hooks/useLyrics";
import { LyricLine } from "../../types";

interface LyricLineRowProps {
  line: LyricLine;
  isActive: boolean;
  distance: number;
  isPast: boolean;
  isFastScrolling: boolean;
  activeLyricRef?: React.RefObject<HTMLDivElement | null>;
  onClick: () => void;
}

// Componente memoizado para evitar re-renderização de todas as estrofes a cada 80ms (Item 70)
const LyricLineRow = React.memo(
  function LyricLineRow({
    line,
    isActive,
    distance,
    isPast,
    isFastScrolling,
    activeLyricRef,
    onClick,
  }: LyricLineRowProps) {
    // Transição de Tipografia e Profundidade de Campo com Efeito Bounce (Item 3.3)
    let depthStyle = "";
    if (isActive) {
      depthStyle =
        "text-xl sm:text-2xl md:text-[1.85rem] lg:text-[2rem] font-extrabold text-white scale-[1.015] opacity-100 drop-shadow-[0_0_20px_var(--accent-glow)] [text-shadow:0_0_24px_rgba(255,255,255,0.7)] animate-lyric-bounce";
    } else if (distance === 1) {
      depthStyle = isPast
        ? "text-base sm:text-lg md:text-xl font-semibold text-[#cbd5e1] opacity-70 scale-100 hover:text-white hover:opacity-100"
        : "text-base sm:text-lg md:text-xl font-semibold text-[#e2e8f0] opacity-80 scale-100 hover:text-white hover:opacity-100";
    } else if (distance <= 3) {
      depthStyle = isPast
        ? "text-sm sm:text-base md:text-lg font-medium text-[#64748b] opacity-40 scale-[0.99] hover:text-[#94a3b8] hover:opacity-80"
        : "text-sm sm:text-base md:text-lg font-medium text-[#94a3b8] opacity-50 scale-[0.99] hover:text-white hover:opacity-85";
    } else {
      depthStyle = isPast
        ? "text-xs sm:text-sm md:text-base font-medium text-[#475569] opacity-20 scale-[0.98] hover:text-[#64748b] hover:opacity-60"
        : "text-xs sm:text-sm md:text-base font-medium text-[#475569] opacity-25 scale-[0.98] hover:text-[#94a3b8] hover:opacity-60";
    }

    const blurStyle = isFastScrolling && !isActive ? "blur-[1.5px]" : "blur-0";

    return (
      <div
        data-lyric-time={line.time}
        ref={isActive ? activeLyricRef : null}
        onClick={onClick}
        className={`py-2 px-4 rounded-xl cursor-pointer select-none will-change-transform max-w-full text-balance leading-relaxed transition-[transform,opacity,filter,color] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${depthStyle} ${blurStyle}`}
      >
        {line.text}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.distance === next.distance &&
      prev.isPast === next.isPast &&
      prev.isFastScrolling === next.isFastScrolling &&
      prev.line.time === next.line.time &&
      prev.line.text === next.line.text
    );
  }
);

export function LyricsView() {
  const { currentTrack, isNowPlayingOpen, nowPlayingTab, showLyrics, handleSeekTo } = usePlayer();
  const { currentTime } = usePlaybackProgress();

  const {
    lyricsData,
    parsedLyrics,
    isLoadingLyrics,
    lyricsError,
    activeLyricIndex,
    isUserScrolledAway,
    isFastScrolling,
    lyricsContainerRef,
    activeLyricRef,
    handleLyricsContainerScroll,
    handleRecenterLyrics,
    handleLyricClick,
  } = useLyrics({
    currentTrack,
    currentTime,
    isNowPlayingOpen,
    nowPlayingTab,
    showLyrics,
  });

  const onLyricClick = useCallback(
    (time: number) => {
      handleLyricClick(time, handleSeekTo);
    },
    [handleLyricClick, handleSeekTo]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative p-6">
      {/* Header de Status das Letras */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1f232e] shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Letra da Música
        </span>
        {lyricsData?.synced ? (
          <span className="flex items-center gap-1.5 text-xs bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] px-3 py-0.5 rounded-full font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)] animate-pulse" />
            Sincronizada ({lyricsData.source})
          </span>
        ) : lyricsData?.plain ? (
          <span className="text-xs bg-[#1a1d28] text-[#8c91a4] border border-[#232733] px-3 py-0.5 rounded-full font-medium">
            Estática ({lyricsData.source})
          </span>
        ) : null}
      </div>

      {/* Container com Scroll das Letras */}
      <div
        ref={lyricsContainerRef}
        onScroll={handleLyricsContainerScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-8 space-y-4 text-center relative scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {isLoadingLyrics ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <p className="text-sm font-medium">Buscando letra sincronizada...</p>
          </div>
        ) : lyricsError || (!lyricsData?.synced && !lyricsData?.plain) ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
            <div className="w-14 h-14 rounded-2xl bg-[#141722] border border-[#212638] flex items-center justify-center">
              <Mic2 className="w-7 h-7 text-[#4e556e]" />
            </div>
            <p className="text-sm font-semibold text-white">Nenhuma letra encontrada</p>
            <p className="text-xs text-[#71778c] max-w-sm">
              Não encontramos a letra desta faixa no LRCLIB ou no YouTube Music.
            </p>
          </div>
        ) : parsedLyrics.length > 0 ? (
          <div className="py-16 space-y-5 max-w-2xl mx-auto w-full px-2 sm:px-4">
            {parsedLyrics.map((line, idx) => {
              const isActive = idx === activeLyricIndex;
              const distance = activeLyricIndex !== -1 ? Math.abs(idx - activeLyricIndex) : 999;
              const isPast = idx < activeLyricIndex;

              return (
                <LyricLineRow
                  key={`${line.time}-${idx}`}
                  line={line}
                  isActive={isActive}
                  distance={distance}
                  isPast={isPast}
                  isFastScrolling={isFastScrolling}
                  activeLyricRef={isActive ? activeLyricRef : undefined}
                  onClick={() => onLyricClick(line.time)}
                />
              );
            })}
          </div>
        ) : lyricsData?.plain ? (
          <div className="py-8 max-w-xl mx-auto whitespace-pre-line text-base text-[#c4c8d8] leading-relaxed font-sans">
            {lyricsData.plain}
          </div>
        ) : null}
      </div>

      {/* Botão Flutuante de Sincronização ao Rolar Manualmente */}
      {isUserScrolledAway && parsedLyrics.length > 0 && activeLyricIndex !== -1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleRecenterLyrics}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)] hover:opacity-90 text-white text-xs font-semibold shadow-xl shadow-[var(--accent-glow)] border border-[var(--accent-border)] backdrop-blur-md transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Sincronizar com o áudio</span>
          </button>
        </div>
      )}
    </div>
  );
}
