import { Sparkles, Mic2, Loader2 } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useLyrics } from "../../hooks/useLyrics";

export function LyricsView() {
  const { currentTrack, currentTime, isNowPlayingOpen, nowPlayingTab, showLyrics, handleSeekTo } = usePlayer();

  const {
    lyricsData,
    parsedLyrics,
    isLoadingLyrics,
    lyricsError,
    activeLyricIndex,
    isUserScrolledAway,
    lyricsContainerRef,
    activeLyricRef,
    handleLyricsContainerScroll,
    handleRecenterLyrics,
  } = useLyrics({
    currentTrack,
    currentTime,
    isNowPlayingOpen,
    nowPlayingTab,
    showLyrics,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative p-6">
      {/* Header de Status das Letras */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1f232e] shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Letra da Música
        </span>
        {lyricsData?.synced ? (
          <span className="flex items-center gap-1.5 text-xs bg-red-950/70 text-red-300 border border-red-800/60 px-3 py-0.5 rounded-full font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
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
        className="flex-1 overflow-y-auto px-4 py-8 space-y-4 text-center custom-scrollbar relative"
      >
        {isLoadingLyrics ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
          <div className="py-16 space-y-4">
            {parsedLyrics.map((line, idx) => {
              const isActive = idx === activeLyricIndex;
              const isPast = idx < activeLyricIndex;
              return (
                <div
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLyricRef : null}
                  onClick={() => handleSeekTo(line.time)}
                  className={`py-2 px-4 rounded-xl transition-[transform,opacity,color] duration-200 ease-out will-change-transform cursor-pointer select-none ${
                    isActive
                      ? "text-2xl md:text-3xl font-bold text-white scale-[1.03] [text-shadow:0_0_20px_rgba(255,255,255,0.45)]"
                      : isPast
                      ? "text-lg md:text-xl text-[#51576d] hover:text-[#9ea5bc] font-medium opacity-60 scale-100"
                      : "text-lg md:text-xl text-[#787f95] hover:text-white font-medium opacity-85 scale-100"
                  }`}
                >
                  {line.text}
                </div>
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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/95 hover:bg-red-500 text-white text-xs font-semibold shadow-xl shadow-red-950/70 border border-red-400/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-200" />
            <span>Sincronizar com o áudio</span>
          </button>
        </div>
      )}
    </div>
  );
}
