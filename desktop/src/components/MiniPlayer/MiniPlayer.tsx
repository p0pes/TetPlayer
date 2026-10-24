import React, { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  Minus,
  Music,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { usePlayer, usePlaybackProgress } from "../../context/PlayerContext";
import { formatTime } from "../../hooks/useLyrics";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    handlePrevTrack,
    handleNextTrack,
    togglePlayPause,
    handleSeekTo,
    handleVolumeChange,
    toggleMute,
    toggleMiniPlayer,
  } = usePlayer();

  const { currentTime, duration } = usePlaybackProgress();

  // Estado de ancoragem / docking na borda ('left' | 'right' | null)
  const [isDocked, setIsDocked] = useState<"left" | "right" | null>(null);

  // Controle de arrasto vertical do tab recolhido estilo PiP Android
  const isDraggingTabRef = useRef(false);
  const dragStartYRef = useRef(0);
  const grabOffsetYRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Arrasto da janela do Mini Player Completo com snap automático ao soltar
  async function handleStartDrag(e: React.MouseEvent) {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("[data-no-drag]")
      ) {
        return;
      }
      try {
        const snapped = await invoke<string | null>("start_drag_and_snap");
        if (snapped === "left" || snapped === "right") {
          setIsDocked(snapped);
        }
      } catch (err) {
        console.error("Erro ao arrastar janela:", err);
      }
    }
  }

  function handleMinimize(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    invoke("minimize_window").catch(console.error);
  }

  function handleClose(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    invoke("close_window").catch(console.error);
  }

  async function handleManualDock() {
    try {
      const autoSnapped = await invoke<string | null>("check_and_snap_mini_player");
      if (autoSnapped === "left" || autoSnapped === "right") {
        setIsDocked(autoSnapped);
      } else {
        const side = await invoke<string>("dock_mini_player", { side: "right" });
        setIsDocked(side as "left" | "right");
      }
    } catch (err) {
      console.error("Erro ao recolher mini player:", err);
    }
  }

  async function handleUndock() {
    try {
      await invoke("undock_mini_player", { side: isDocked });
      setIsDocked(null);
    } catch (err) {
      console.error("Erro ao desencaixar mini player:", err);
    }
  }

  // Manipulação de pointer para o Tab Recolhido (estilo PiP do YouTube no Android)
  function handleTabPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingTabRef.current = true;
    dragStartYRef.current = e.screenY;
    grabOffsetYRef.current = e.clientY;
    hasMovedRef.current = false;
  }

  function handleTabPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingTabRef.current || !isDocked) return;
    const deltaY = Math.abs(e.screenY - dragStartYRef.current);
    if (deltaY > 3) {
      hasMovedRef.current = true;
      invoke("move_docked_tab", {
        side: isDocked,
        screenYLogical: e.screenY,
        grabOffsetYLogical: grabOffsetYRef.current,
      }).catch(console.error);
    }
  }

  async function handleTabPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingTabRef.current) return;
    isDraggingTabRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Se o usuário apenas clicou (sem arrastar verticalmente), expande o Mini Player
    if (!hasMovedRef.current) {
      await handleUndock();
    }
    // Se arrastou verticalmente, NÃO expande! Fica ancorado na nova posição vertical
  }

  // Visualização recolhida / ancorada na borda da tela
  if (isDocked) {
    return (
      <div
        onPointerDown={handleTabPointerDown}
        onPointerMove={handleTabPointerMove}
        onPointerUp={handleTabPointerUp}
        onPointerCancel={() => {
          isDraggingTabRef.current = false;
        }}
        title="TetPlayer Mini - Clique para expandir ou arraste para cima/baixo"
        className={`w-full h-full bg-[#0c0e17] hover:bg-[#151928] border border-[#2b3042] hover:border-red-500/60 flex flex-col items-center justify-between py-2.5 shadow-2xl cursor-pointer group transition-colors select-none relative ${
          isDocked === "left"
            ? "border-l-0"
            : "border-r-0"
        }`}
      >
        {/* Glow Aurora de fundo sutil */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, var(--aurora-1-glow) 0%, transparent 70%)",
          }}
        />

        {/* Indicador de reprodução (topo) */}
        <div className="flex items-center justify-center z-10 pt-0.5 pointer-events-none">
          {isPlaying ? (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-[#5e6479]" />
          )}
        </div>

        {/* Setinha sutil (centro) apontando para dentro da tela */}
        <div className="flex items-center justify-center text-[#8c91a4] group-hover:text-white transition-colors z-10 pointer-events-none">
          {isDocked === "left" ? (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          )}
        </div>

        {/* Mini barra de espectro de áudio / nota musical (base) */}
        <div className="flex items-center justify-center text-[#71778c] group-hover:text-red-400 transition-colors z-10 pb-0.5 pointer-events-none">
          {isPlaying ? (
            <SpectrumVisualizer isPlaying={isPlaying} variant="mini" barCount={3} />
          ) : (
            <Music className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    );
  }

  // Visualização Completa do Mini Player Flutuante (Solid Edge-to-Edge Frame)
  return (
    <div className="w-full h-full bg-[#0c0e17] border border-[#232738] flex flex-col justify-between overflow-hidden shadow-2xl relative select-none">
      {/* Glow Aurora de fundo sutil */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, var(--aurora-1-glow) 0%, transparent 60%)",
        }}
      />

      {/* Header com Drag e Controles de Janela */}
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="h-7 px-2.5 bg-[#121522] border-b border-[#1c2030] flex items-center justify-between cursor-move shrink-0 z-20"
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-1.5 pointer-events-none select-none"
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-[#8c91a4] tracking-wider uppercase">
            Mini Player
          </span>
        </div>

        <div
          data-no-drag
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1 z-30"
        >
          {/* Recolher na borda da tela (Dock) */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleManualDock();
            }}
            title="Recolher na borda da tela (Dock)"
            className="p-1 rounded text-[#71778c] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-3 h-3" />
          </button>

          {/* Restaurar para janela normal */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMiniPlayer();
            }}
            title="Expandir para o Player Completo"
            className="p-1 rounded text-[#71778c] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Minimizar */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize(e);
            }}
            title="Minimizar"
            className="p-1 rounded text-[#71778c] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Fechar */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleClose(e);
            }}
            title="Fechar"
            className="p-1 rounded text-[#71778c] hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Conteúdo Central: Capa, Título e Controles */}
      <div className="flex-1 px-3 py-1 flex items-center justify-between gap-3 min-h-0 z-10">
        {/* Capa e Informações da Faixa */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-[#1a1d28] border border-[#232738] overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
            {currentTrack?.artwork_url || currentTrack?.id ? (
              <img
                src={upgradeArtworkQuality(currentTrack?.artwork_url, currentTrack?.id)}
                alt={currentTrack?.title || "Capa do álbum"}
                referrerPolicy="no-referrer"
                onError={(e) => handleArtworkError(e, currentTrack?.id)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-[#5e6479]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-white truncate">
                {currentTrack?.title || "Nenhuma faixa tocando"}
              </p>
              <SpectrumVisualizer isPlaying={isPlaying} variant="mini" barCount={4} />
            </div>
            <p className="text-[11px] text-[#8c91a4] truncate">
              {currentTrack?.artist || "TetPlayer"}
            </p>
          </div>
        </div>

        {/* Controles de Reprodução */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePrevTrack}
            title="Faixa Anterior"
            aria-label="Faixa anterior"
            className="p-1.5 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            title={isPlaying ? "Pausar" : "Tocar"}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-950/70 transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNextTrack}
            title="Próxima Faixa"
            aria-label="Próxima faixa"
            className="p-1.5 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Mute & Mini Volume Slider */}
          <div className="flex items-center gap-1 group/vol">
            <button
              onClick={toggleMute}
              title={isMuted ? "Desativar Mudo" : "Silenciar"}
              className="p-1.5 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume no Mini Player"
              className="w-12 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

      {/* Mini Scrubber na base com tempo decorrido */}
      <div className="px-3 pb-1.5 flex items-center gap-2 text-[9px] text-[#71778c] font-mono z-10">
        <span>{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => handleSeekTo(parseFloat(e.target.value))}
          disabled={!currentTrack}
          aria-label="Linha do tempo"
          className="flex-1 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer"
        />
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
