import React from "react";
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
import { formatTime } from "../../hooks/useLyrics";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

export function PlayerBar() {
  const {
    currentTrack,
    activeQueue,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    isAutoplayRadio,
    toggleAutoplayRadio,
    toggleMiniPlayer,
    isNowPlayingOpen,
    nowPlayingTab,
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

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    handleSeekTo(parseFloat(e.target.value));
  }

  return (
    <footer className="h-20 shrink-0 border-t border-[#1f232e] bg-[#0e1017]/95 backdrop-blur-md px-6 flex items-center justify-between gap-6 z-40">
      {/* Faixa Atual e Botão da Gaveta de Reprodução */}
      <div className="flex items-center gap-3 w-1/4 min-w-[220px]">
        {/* Seta na Barra de Baixo para Abrir a Gaveta */}
        <button
          onClick={toggleNowPlaying}
          aria-label={isNowPlayingOpen ? "Recolher gaveta de reprodução" : "Abrir gaveta de reprodução"}
          title={isNowPlayingOpen ? "Recolher gaveta [Shift+Up / Esc]" : "Abrir gaveta de reprodução (Fila & Letras) [Shift+Up]"}
          className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
            isNowPlayingOpen
              ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/60"
              : "bg-[#171a24] text-[#8c91a4] hover:text-white hover:bg-[#202534] border-[#252a3a]"
          }`}
        >
          {isNowPlayingOpen ? (
            <ChevronDown className="w-4 h-4 transition-transform" />
          ) : (
            <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          )}
        </button>

        <div
          onClick={toggleNowPlaying}
          className="w-12 h-12 rounded-lg bg-[#171a24] border border-[#232733] overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group relative shadow-md"
          title="Abrir gaveta de reprodução"
        >
          {currentTrack?.artwork_url || currentTrack?.id ? (
            <img
              src={upgradeArtworkQuality(currentTrack?.artwork_url, currentTrack?.id)}
              alt={currentTrack?.title || "Capa do álbum"}
              referrerPolicy="no-referrer"
              onError={(e) => handleArtworkError(e, currentTrack?.id)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <Music className="w-5 h-5 text-[#5e6479]" />
          )}
        </div>

        <div
          onClick={toggleNowPlaying}
          className="min-w-0 overflow-hidden cursor-pointer"
          title="Abrir gaveta de reprodução"
        >
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-white truncate hover:text-red-400 transition-colors">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </p>
          </div>
          <p className="text-[11px] text-[#8c91a4] truncate">
            {currentTrack?.artist || "Escolha uma playlist para tocar"}
          </p>
        </div>
      </div>

      {/* Controles Centrais e Scrubber */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          {/* Modo Aleatório (Shuffle) */}
          <button
            onClick={toggleShuffle}
            aria-label="Modo aleatório"
            aria-pressed={isShuffle}
            title={`Modo Aleatório [S] (${isShuffle ? "Ativado" : "Desativado"})`}
            className={`p-2 rounded-lg transition-all cursor-pointer relative ${
              isShuffle
                ? "text-red-400 bg-red-950/40 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="w-1 h-1 rounded-full bg-red-400 absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* Faixa Anterior */}
          <button
            onClick={handlePrevTrack}
            disabled={activeQueue.length === 0}
            aria-label="Faixa anterior"
            title="Faixa Anterior [Media / J]"
            className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Pausar música" : "Reproduzir música"}
            title="Reproduzir / Pausar [Espaço / Media]"
            className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center shadow-lg shadow-white/10 transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Próxima Faixa */}
          <button
            onClick={handleNextTrack}
            disabled={activeQueue.length === 0}
            aria-label="Próxima faixa"
            title="Próxima Faixa [Media / K]"
            className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer"
          >
            <SkipForward className="w-4 h-4 fill-current" />
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
            className={`p-2 rounded-lg transition-all cursor-pointer relative ${
              repeatMode !== "off"
                ? "text-red-400 bg-red-950/40 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== "off" && (
              <span className="w-1 h-1 rounded-full bg-red-400 absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>

          {/* Autoplay Infinito & Rádio Contínua (Sugestão 2.6) */}
          <button
            onClick={toggleAutoplayRadio}
            aria-label="Autoplay Infinito / Rádio Contínua"
            aria-pressed={isAutoplayRadio}
            title={`Autoplay Infinito / Rádio Contínua (${isAutoplayRadio ? "Ativado" : "Desativado"})`}
            className={`p-2 rounded-lg transition-all cursor-pointer relative ${
              isAutoplayRadio
                ? "text-red-400 bg-red-950/40 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Radio className="w-4 h-4" />
            {isAutoplayRadio && (
              <span className="w-1 h-1 rounded-full bg-red-400 absolute bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </button>
        </div>

        {/* Scrubber Timeline */}
        <div className="w-full flex items-center gap-3 text-[10px] text-[#71778c] font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={onSeek}
            disabled={!currentTrack}
            aria-label="Posição da música na linha do tempo"
            className="flex-1 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer disabled:cursor-not-allowed"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume, Fila, Letras & Mini Player */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[220px]">
        {/* Botão Mini Player (Sugestão 2.1) */}
        <button
          onClick={toggleMiniPlayer}
          title="Modo Mini Player Flutuante (Always-on-Top / PiP)"
          aria-label="Modo Mini Player"
          className="p-2 rounded-xl text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] border border-transparent hover:border-[#252a3a] transition-all cursor-pointer"
        >
          <Tv className="w-4 h-4" />
        </button>

        {/* Botão Fila de Reprodução */}
        <button
          onClick={toggleShowQueue}
          disabled={!currentTrack}
          aria-label="Exibir fila de reprodução"
          aria-pressed={isNowPlayingOpen && nowPlayingTab === "queue"}
          title="Fila de Reprodução [Q]"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-30 ${
            isNowPlayingOpen && nowPlayingTab === "queue"
              ? "bg-red-600 text-white shadow-lg shadow-red-950/50 border border-red-500"
              : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span className="hidden md:inline">Fila</span>
        </button>

        {/* Botão Letras */}
        <button
          onClick={toggleShowLyrics}
          disabled={!currentTrack}
          aria-label="Exibir letras sincronizadas"
          aria-pressed={isNowPlayingOpen && nowPlayingTab === "lyrics"}
          title="Letras Sincronizadas [L]"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-30 ${
            isNowPlayingOpen && nowPlayingTab === "lyrics"
              ? "bg-red-600 text-white shadow-lg shadow-red-950/50 border border-red-500"
              : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
          }`}
        >
          <Mic2 className="w-4 h-4" />
          <span className="hidden md:inline">Letras</span>
        </button>

        {/* Visualizador de Áudio Mini & Status Badge (Sugestão 3.2) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#141724] border border-[#212638]">
          <SpectrumVisualizer isPlaying={isPlaying} variant="mini" barCount={4} />
          <span className="text-[10px] font-mono text-emerald-400">
            {isPlaying ? "Tocando" : "Pausa"}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Desativar mudo" : "Ativar mudo"}
            title="Mudo [M]"
            className="text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
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
            className="w-18 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer"
          />
        </div>
      </div>
    </footer>
  );
}
