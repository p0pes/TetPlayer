import { memo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Music,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  ListMusic,
  Mic2,
  Volume2,
  VolumeX,
  Radio,
  Tv,
} from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { TimelineScrubber } from "./TimelineScrubber";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

export const PlayerBar = memo(function PlayerBar() {
  const {
    currentTrack,
    activeQueue,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isAutoplayRadio,
    toggleAutoplayRadio,
    toggleMiniPlayer,
    isNowPlayingOpen,
    nowPlayingTab,
    showLyrics,
    toggleNowPlaying,
    toggleShuffle,
    cycleRepeatMode,
    handlePrevTrack,
    handleNextTrack,
    togglePlayPause,
    handleSeekTo,
    handleVolumeChange,
    toggleMute,
    toggleShowQueue,
    toggleShowLyrics,
  } = usePlayer();

  const isDrawerOpen = isNowPlayingOpen || showLyrics;

  return (
    <footer className="h-20 shrink-0 border-t border-[#1f232e] bg-[#0e1017]/95 backdrop-blur-md px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sm:gap-4 md:gap-6 z-40">
      {/* Faixa Atual e Mini Player Isolado na Extrema Esquerda */}
      <div className="flex items-center gap-2 sm:gap-3 w-[28%] min-w-0 max-w-[280px]">
        {/* Botão Mini Player Isolado em Destaque na Extrema Esquerda */}
        <button
          onClick={toggleMiniPlayer}
          title="Modo Mini Player Flutuante (Always-on-Top / PiP)"
          aria-label="Modo Mini Player"
          className="p-1.5 sm:p-2 rounded-xl text-[#9da3b7] hover:text-white bg-[#151824] hover:bg-[#1f2436] border border-[#23283a] hover:border-[var(--accent-border)] transition-all cursor-pointer shrink-0 shadow-sm hover:shadow-[0_0_12px_var(--accent-glow)] group mr-0.5 sm:mr-1"
        >
          <Tv className="w-4 h-4 group-hover:scale-105 group-hover:text-[var(--accent-text)] transition-all" />
        </button>

        <div
          onClick={toggleNowPlaying}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#171a24] border border-[#232733] overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group relative shadow-md"
          title={isDrawerOpen ? "Recolher gaveta de reprodução" : "Abrir gaveta de reprodução"}
        >
          {currentTrack?.artwork_url || currentTrack?.id ? (
            <img
              key={currentTrack?.id || "empty-art"}
              src={upgradeArtworkQuality(currentTrack?.artwork_url, currentTrack?.id)}
              alt={currentTrack?.title || "Capa do álbum"}
              referrerPolicy="no-referrer"
              onError={(e) => handleArtworkError(e, currentTrack?.id)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform animate-view-fade"
            />
          ) : (
            <Music className="w-5 h-5 text-[#5e6479]" />
          )}
        </div>

        <div
          onClick={toggleNowPlaying}
          className="min-w-0 flex-1 overflow-hidden cursor-pointer"
          title={isDrawerOpen ? "Recolher gaveta de reprodução" : "Abrir gaveta de reprodução"}
        >
          <div key={currentTrack?.id || "empty-meta"} className="animate-view-fade">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-white truncate hover:text-[var(--accent-text)] transition-colors">
                {currentTrack?.title || "Nenhuma faixa selecionada"}
              </p>
            </div>
            <p className="text-[11px] text-[#8c91a4] truncate">
              <span
                onClick={(e) => {
                  if (currentTrack?.artist) {
                    e.stopPropagation();
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
                className={
                  currentTrack?.artist
                    ? "hover:text-white hover:underline cursor-pointer transition-colors"
                    : ""
                }
              >
                {currentTrack?.artist || "Escolha uma playlist para tocar"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Controles Centrais e Scrubber */}
      <div className="flex-1 min-w-0 max-w-xl flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3">
          {/* Modo Aleatório (Shuffle) */}
          <button
            onClick={toggleShuffle}
            aria-label="Modo aleatório"
            aria-pressed={isShuffle}
            title={`Modo Aleatório [S] (${isShuffle ? "Ativado" : "Desativado"})`}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer relative shrink-0 ${
              isShuffle
                ? "text-[var(--accent-text)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] shadow-[0_0_10px_var(--accent-glow)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isShuffle && (
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* Faixa Anterior */}
          <button
            onClick={handlePrevTrack}
            disabled={activeQueue.length === 0}
            aria-label="Faixa anterior"
            title="Faixa Anterior [Media / J]"
            className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-1.5 sm:p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer shrink-0"
          >
            <SkipBack className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pausar música" : "Reproduzir música"}
            title="Reproduzir / Pausar [Espaço / Media]"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center shadow-lg shadow-white/10 transition-transform cursor-pointer shrink-0"
          >
            {isPlaying ? (
              <Pause key="pause-icon" className="w-4 h-4 fill-current animate-icon-pop" />
            ) : (
              <Play key="play-icon" className="w-4 h-4 fill-current ml-0.5 animate-icon-pop" />
            )}
          </button>

          {/* Próxima Faixa */}
          <button
            onClick={handleNextTrack}
            disabled={activeQueue.length === 0}
            aria-label="Próxima faixa"
            title="Próxima Faixa [Media / K]"
            className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-1.5 sm:p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer shrink-0"
          >
            <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          </button>

          {/* Modo Repetição (Repeat) */}
          <button
            onClick={cycleRepeatMode}
            aria-label={`Modo de repetição: ${
              repeatMode === "off"
                ? "desativada"
                : repeatMode === "all"
                ? "toda a fila"
                : "música atual"
            }`}
            aria-pressed={repeatMode !== "off"}
            title={`Repetição [R]: ${
              repeatMode === "off"
                ? "Desativada"
                : repeatMode === "all"
                ? "Repetir Toda a Fila"
                : "Repetir Música Atual"
            }`}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer relative shrink-0 ${
              repeatMode !== "off"
                ? "text-[var(--accent-text)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] shadow-[0_0_10px_var(--accent-glow)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {repeatMode !== "off" && (
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* Autoplay Infinito & Rádio Contínua (Sugestão 2.6) */}
          <button
            onClick={toggleAutoplayRadio}
            aria-label="Autoplay Infinito / Rádio Contínua"
            aria-pressed={isAutoplayRadio}
            title={`Autoplay Infinito / Rádio Contínua (${isAutoplayRadio ? "Ativado" : "Desativado"})`}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer relative shrink-0 ${
              isAutoplayRadio
                ? "text-[var(--accent-text)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] shadow-[0_0_10px_var(--accent-glow)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isAutoplayRadio && (
              <span className="w-1 h-1 rounded-full bg-[var(--accent)] absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>
        </div>

        {/* Scrubber Timeline Isolado (Sugestão 1.2 e 1.4) */}
        <TimelineScrubber
          disabled={!currentTrack}
          onSeek={handleSeekTo}
          currentTrack={currentTrack}
        />
      </div>

      {/* Volume, Fila, Letras & Botão da Gaveta na Extrema Direita */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-2.5 w-[28%] min-w-0 max-w-[310px]">
        {/* Botão Fila de Reprodução */}
        <button
          onClick={toggleShowQueue}
          disabled={!currentTrack}
          aria-label="Exibir fila de reprodução"
          aria-pressed={isDrawerOpen && nowPlayingTab === "queue"}
          title="Fila de Reprodução [Q]"
          className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-30 shrink-0 ${
            isDrawerOpen && nowPlayingTab === "queue"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] border border-[var(--accent-border)]"
              : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
          }`}
        >
          <ListMusic className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Fila</span>
        </button>

        {/* Botão Letras */}
        <button
          onClick={toggleShowLyrics}
          disabled={!currentTrack}
          aria-label="Exibir letras sincronizadas"
          aria-pressed={isDrawerOpen && nowPlayingTab === "lyrics"}
          title="Letras Sincronizadas [L]"
          className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-30 shrink-0 ${
            isDrawerOpen && nowPlayingTab === "lyrics"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] border border-[var(--accent-border)]"
              : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
          }`}
        >
          <Mic2 className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Letras</span>
        </button>

        {/* Visualizador de Áudio Mini & Status Badge (Sugestão 3.2) */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#141724] border border-[#212638] shrink-0">
          <SpectrumVisualizer isPlaying={isPlaying} variant="mini" barCount={4} />
          <span className="text-[10px] font-mono text-emerald-400">
            {isPlaying ? "Tocando" : "Pausa"}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Desativar mudo" : "Ativar mudo"}
            title="Mudo [M]"
            className="p-1 text-[#8c91a4] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume de reprodução"
            className="w-14 sm:w-16 md:w-20 h-1 bg-[#232733] rounded-full accent-[var(--accent)] cursor-pointer"
          />
        </div>

        {/* Seta para Abrir / Recolher a Gaveta na Extrema Direita */}
        <button
          onClick={toggleNowPlaying}
          aria-label={isDrawerOpen ? "Recolher gaveta de reprodução" : "Abrir gaveta de reprodução"}
          title={isDrawerOpen ? "Recolher gaveta [Shift+Up / Esc]" : "Abrir gaveta de reprodução (Fila & Letras) [Shift+Up]"}
          className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 ml-0.5 sm:ml-1 ${
            isDrawerOpen
              ? "bg-[var(--accent)] text-white border-[var(--accent-border)] shadow-lg shadow-[var(--accent-glow)]"
              : "bg-[#171a24] text-[#8c91a4] hover:text-white hover:bg-[#202534] border-[#252a3a]"
          }`}
        >
          {isDrawerOpen ? (
            <ChevronDown className="w-4 h-4 transition-transform" />
          ) : (
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          )}
        </button>
      </div>
    </footer>
  );
});
