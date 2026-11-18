import React, { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
  PinOff,
  Heart,
} from "lucide-react";
import { usePlayer, usePlaybackProgress } from "../../context/PlayerContext";
import { formatTime } from "../../hooks/useLyrics";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { useLikedTrack } from "../../services/likes";
import { SettingsService } from "../../services/settings";

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
    setVolume,
    toggleMute,
    toggleMiniPlayer,
  } = usePlayer();
  const { isLiked, toggleLike } = useLikedTrack(currentTrack);

  // Estado de ancoragem na borda ('left' | 'right' | null) e expansão da Gaveta Auto-Slide
  const [isDocked, setIsDocked] = useState<"left" | "right" | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isDrawerAnimatingOut, setIsDrawerAnimatingOut] = useState(false);

  const isDockedRef = useRef<"left" | "right" | null>(null);
  const isDrawerExpandedRef = useRef(false);

  const hoverOpenTimerRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const collapseFinishTimerRef = useRef<number | null>(null);
  const expandTimestampRef = useRef<number>(0);
  const collapseCooldownUntilRef = useRef<number>(0);

  const isPointerDownInsideRef = useRef(false);
  const pendingCloseAfterPointerUpRef = useRef(false);
  const isDraggingWindowRef = useRef(false);

  // Controle de arrasto vertical da alça recolhida na borda
  const isDraggingTabRef = useRef(false);
  const dragStartYRef = useRef(0);
  const grabOffsetYRef = useRef(0);
  const hasMovedRef = useRef(false);

  const clearAllDrawerTimers = useCallback(() => {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (collapseFinishTimerRef.current !== null) {
      window.clearTimeout(collapseFinishTimerRef.current);
      collapseFinishTimerRef.current = null;
    }
  }, []);

  const cancelAutoCollapse = useCallback(() => {
    pendingCloseAfterPointerUpRef.current = false;
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (collapseFinishTimerRef.current !== null) {
      window.clearTimeout(collapseFinishTimerRef.current);
      collapseFinishTimerRef.current = null;
      setIsDrawerAnimatingOut(false);
    }
  }, []);

  const collapseDockedDrawerNow = useCallback(
    (sideOverride?: "left" | "right") => {
      const side = sideOverride || isDockedRef.current;
      if (!side) return;
      clearAllDrawerTimers();
      setIsDrawerAnimatingOut(true);

      collapseFinishTimerRef.current = window.setTimeout(async () => {
        collapseFinishTimerRef.current = null;
        const activeSide = sideOverride || isDockedRef.current;
        if (!activeSide) return;
        collapseCooldownUntilRef.current = performance.now() + 280;
        setIsDrawerAnimatingOut(false);
        setIsDrawerExpanded(false);
        isDrawerExpandedRef.current = false;
        try {
          await invoke("dock_mini_player", { side: activeSide });
        } catch (err) {
          console.error("Erro ao recolher gaveta auto-slide:", err);
        }
      }, 115);
    },
    [clearAllDrawerTimers]
  );

  const scheduleAutoCollapse = useCallback(
    (delayMs = 210) => {
      if (!isDockedRef.current || !isDrawerExpandedRef.current) return;
      if (autoCloseTimerRef.current !== null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = window.setTimeout(() => {
        autoCloseTimerRef.current = null;
        if (
          !isDockedRef.current ||
          !isDrawerExpandedRef.current ||
          isDraggingWindowRef.current
        ) {
          return;
        }
        if (isPointerDownInsideRef.current) {
          pendingCloseAfterPointerUpRef.current = true;
          return;
        }
        collapseDockedDrawerNow();
      }, delayMs);
    },
    [collapseDockedDrawerNow]
  );

  const openDockedDrawer = useCallback(
    async (sideOverride?: "left" | "right") => {
      const side = sideOverride || isDockedRef.current || "right";
      clearAllDrawerTimers();
      pendingCloseAfterPointerUpRef.current = false;
      expandTimestampRef.current = performance.now();
      setIsDrawerAnimatingOut(false);
      setIsDrawerExpanded(true);
      isDrawerExpandedRef.current = true;
      try {
        await invoke("peek_docked_mini_player", { side });
      } catch (err) {
        console.error("Erro ao deslizar gaveta do mini player:", err);
      }
    },
    [clearAllDrawerTimers]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("mini-player-docked", (event) => {
      if (event.payload === "left" || event.payload === "right") {
        isDockedRef.current = event.payload;
        isDrawerExpandedRef.current = false;
        setIsDocked(event.payload);
        setIsDrawerExpanded(false);
        setIsDrawerAnimatingOut(false);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(console.error);

    const handleGlobalPointerUp = () => {
      if (isPointerDownInsideRef.current) {
        isPointerDownInsideRef.current = false;
        if (pendingCloseAfterPointerUpRef.current) {
          pendingCloseAfterPointerUpRef.current = false;
          scheduleAutoCollapse(160);
        }
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("mouseup", handleGlobalPointerUp);

    return () => {
      if (unlisten) unlisten();
      clearAllDrawerTimers();
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("mouseup", handleGlobalPointerUp);
    };
  }, [clearAllDrawerTimers, scheduleAutoCollapse]);

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
      cancelAutoCollapse();
      isDraggingWindowRef.current = true;
      try {
        const snapped = await invoke<string | null>("start_drag_and_snap");
        if (snapped === "left" || snapped === "right") {
          collapseCooldownUntilRef.current = performance.now() + 320;
          isDockedRef.current = snapped;
          isDrawerExpandedRef.current = false;
          setIsDocked(snapped);
          setIsDrawerExpanded(false);
          setIsDrawerAnimatingOut(false);
        } else {
          isDockedRef.current = null;
          isDrawerExpandedRef.current = false;
          setIsDocked(null);
          setIsDrawerExpanded(false);
          setIsDrawerAnimatingOut(false);
        }
      } catch (err) {
        console.error("Erro ao arrastar janela:", err);
      } finally {
        isDraggingWindowRef.current = false;
      }
    }
  }

  function handleMinimize(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    invoke("minimize_window").catch(console.error);
  }

  async function handleClose(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      const closeAction = SettingsService.getSetting("closeAction");
      if (closeAction === "tray") {
        await invoke("hide_to_tray");
      } else {
        await invoke("close_window");
      }
    } catch (err) {
      console.error("Erro ao fechar/ocultar Mini Player:", err);
      try {
        await invoke("close_window");
      } catch {
        // ignore
      }
    }
  }

  async function handleManualDock() {
    clearAllDrawerTimers();
    try {
      collapseCooldownUntilRef.current = performance.now() + 350;
      const autoSnapped = await invoke<string | null>("check_and_snap_mini_player");
      if (autoSnapped === "left" || autoSnapped === "right") {
        isDockedRef.current = autoSnapped;
        isDrawerExpandedRef.current = false;
        setIsDocked(autoSnapped);
        setIsDrawerExpanded(false);
        setIsDrawerAnimatingOut(false);
      } else {
        const side = await invoke<string>("dock_mini_player", { side: "right" });
        const validSide = (side === "left" ? "left" : "right") as "left" | "right";
        isDockedRef.current = validSide;
        isDrawerExpandedRef.current = false;
        setIsDocked(validSide);
        setIsDrawerExpanded(false);
        setIsDrawerAnimatingOut(false);
      }
    } catch (err) {
      console.error("Erro ao recolher mini player:", err);
    }
  }

  async function handleUndock() {
    clearAllDrawerTimers();
    try {
      const currentSide = isDockedRef.current;
      isDockedRef.current = null;
      isDrawerExpandedRef.current = false;
      setIsDocked(null);
      setIsDrawerExpanded(false);
      setIsDrawerAnimatingOut(false);
      await invoke("undock_mini_player", { side: currentSide });
    } catch (err) {
      console.error("Erro ao desencaixar mini player:", err);
    }
  }

  // Controle de volume rápido via scroll do mouse (tanto na alça quanto na gaveta)
  function handleWheelVolume(e: React.WheelEvent) {
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    const baseVol = isMuted ? 0 : volume;
    const nextVol = Math.min(1, Math.max(0, Number((baseVol + step).toFixed(2))));
    setVolume(nextVol);
  }

  // Hover na alça recolhida para abrir automaticamente (Auto-Slide 0 cliques)
  function handleTabMouseEnter() {
    if (isDraggingTabRef.current || !isDockedRef.current || isDrawerExpandedRef.current) {
      return;
    }
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
    }
    const remainingCooldown = Math.max(
      0,
      collapseCooldownUntilRef.current - performance.now()
    );
    const delay = remainingCooldown > 0 ? remainingCooldown + 60 : 65;

    hoverOpenTimerRef.current = window.setTimeout(() => {
      hoverOpenTimerRef.current = null;
      if (!isDraggingTabRef.current && isDockedRef.current && !isDrawerExpandedRef.current) {
        openDockedDrawer();
      }
    }, delay);
  }

  function handleTabMouseLeave() {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }

  // Manipulação de pointer na alça recolhida (arrasto vertical na borda ou clique imediato)
  function handleTabPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingTabRef.current = true;
    dragStartYRef.current = e.screenY;
    grabOffsetYRef.current = e.clientY;
    hasMovedRef.current = false;
  }

  function handleTabPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingTabRef.current || !isDockedRef.current) return;
    const deltaY = Math.abs(e.screenY - dragStartYRef.current);
    if (deltaY > 4) {
      hasMovedRef.current = true;
      if (hoverOpenTimerRef.current !== null) {
        window.clearTimeout(hoverOpenTimerRef.current);
        hoverOpenTimerRef.current = null;
      }
      invoke("move_docked_tab", {
        side: isDockedRef.current,
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

    // Se clicou sem arrastar verticalmente, abre a gaveta imediatamente
    if (!hasMovedRef.current) {
      await openDockedDrawer();
    }
  }

  // Visualização Recolhida da Gaveta Auto-Slide (Alça minimalista simétrica na borda da tela)
  const isCompactMode = Boolean(
    (isDocked && !isDrawerExpanded) ||
      (!isDrawerExpanded && typeof window !== "undefined" && window.innerWidth < 150)
  );
  const activeDockSide = isDocked || "right";

  if (isCompactMode) {
    return (
      <div
        className={`w-full h-full bg-transparent flex items-center select-none ${
          activeDockSide === "left" ? "justify-start" : "justify-end"
        }`}
      >
        <div
          onMouseEnter={handleTabMouseEnter}
          onMouseLeave={handleTabMouseLeave}
          onPointerDown={handleTabPointerDown}
          onPointerMove={handleTabPointerMove}
          onPointerUp={handleTabPointerUp}
          onPointerCancel={() => {
            isDraggingTabRef.current = false;
          }}
          onWheel={handleWheelVolume}
          title="TetPlayer Auto-Slide — Encoste o mouse para abrir, gire o scroll para volume ou arraste verticalmente"
          className={`w-[18px] h-[56px] bg-[#0c0e17]/95 hover:bg-[#141826] border border-[#2b3042] hover:border-[var(--accent)]/60 flex items-center justify-center overflow-hidden cursor-pointer group transition-colors duration-150 select-none relative ${
            activeDockSide === "left"
              ? "border-l-0 rounded-r-full"
              : "border-r-0 rounded-l-full"
          }`}
        >
          {/* Glow Aurora sutil na alça */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none rounded-[inherit]"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--aurora-1-glow) 0%, transparent 80%)",
            }}
          />

          {/* Filete luminoso de estado na moldura do monitor */}
          <div
            className={`absolute top-3.5 bottom-3.5 w-[2.5px] rounded-full transition-colors duration-200 ${
              activeDockSide === "left" ? "left-0" : "right-0"
            } ${
              isPlaying
                ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] animate-pulse"
                : "bg-[#3e4560] group-hover:bg-[var(--accent)]/80"
            }`}
          />

          {/* Micro-seta simétrica centralizada */}
          <div
            className={`flex items-center justify-center z-10 pointer-events-none transition-colors duration-200 ${
              isPlaying
                ? "text-[var(--accent)] drop-shadow-[0_0_6px_var(--accent-glow)]"
                : "text-[#7a829c] opacity-85 group-hover:opacity-100 group-hover:text-white"
            }`}
          >
            {activeDockSide === "left" ? (
              <ChevronRight
                className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150"
                strokeWidth={2.5}
              />
            ) : (
              <ChevronLeft
                className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150"
                strokeWidth={2.5}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Classes de animação e formato para Gaveta Auto-Slide vs Flutuante Livre
  const drawerAnimationClass = isDocked
    ? isDrawerAnimatingOut
      ? activeDockSide === "left"
        ? "animate-drawer-out-left"
        : "animate-drawer-out-right"
      : activeDockSide === "left"
        ? "animate-drawer-in-left"
        : "animate-drawer-in-right"
    : "";

  const containerShapeClass = isDocked
    ? activeDockSide === "left"
      ? "border-l-0 rounded-r-2xl"
      : "border-r-0 rounded-l-2xl"
    : "rounded-2xl";

  // Visualização Expandida (Gaveta Auto-Slide na borda ou Mini Player Flutuante)
  return (
    <div
      onMouseDown={handleStartDrag}
      onPointerDownCapture={() => {
        isPointerDownInsideRef.current = true;
        cancelAutoCollapse();
      }}
      onMouseEnter={() => {
        if (isDockedRef.current) {
          cancelAutoCollapse();
        }
      }}
      onMouseMove={() => {
        if (isDockedRef.current) {
          cancelAutoCollapse();
        }
      }}
      onMouseLeave={() => {
        if (isDockedRef.current && isDrawerExpandedRef.current) {
          if (performance.now() - expandTimestampRef.current < 240) {
            return;
          }
          scheduleAutoCollapse(210);
        }
      }}
      onWheel={handleWheelVolume}
      className={`w-full h-full bg-[#0c0e17] border border-[#262b3d] flex flex-col justify-between overflow-hidden relative select-none ${containerShapeClass} ${drawerAnimationClass}`}
    >
      {/* Filete luminoso lateral quando ancorado como Gaveta Auto-Slide */}
      {isDocked && (
        <div
          className={`absolute top-3 bottom-3 w-[2.5px] rounded-full z-30 pointer-events-none ${
            activeDockSide === "left" ? "left-0" : "right-0"
          } ${
            isPlaying
              ? "bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]"
              : "bg-[#343b52]"
          }`}
        />
      )}

      {/* Glow Aurora de fundo sutil */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none rounded-[inherit]"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, var(--aurora-1-glow) 0%, transparent 60%)",
        }}
      />

      {/* Header com Drag e Controles de Janela */}
      <div className="h-7 px-2.5 bg-[#121522] border-b border-[#1c2030] flex items-center justify-between cursor-move shrink-0 z-20">
        <div className="flex items-center gap-1.5 pointer-events-none select-none">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[10px] font-bold text-[#8c91a4] tracking-wider uppercase">
            {isDocked ? "Mini Player • Auto" : "Mini Player"}
          </span>
        </div>

        <div
          data-no-drag
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1 z-30"
        >
          {isDocked ? (
            <>
              {/* Desafixar da borda para manter sempre aberto como janela flutuante */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUndock();
                }}
                title="Desafixar da borda (Manter sempre aberto)"
                className="p-1 rounded text-[var(--accent)] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
              >
                <PinOff className="w-3 h-3" />
              </button>

              {/* Recolher imediatamente para a borda */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  collapseDockedDrawerNow();
                }}
                title="Esconder gaveta agora"
                className="p-1 rounded text-[#71778c] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
              >
                {activeDockSide === "left" ? (
                  <ChevronLeft className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            </>
          ) : (
            /* Recolher na borda da tela (Ativar Gaveta Auto-Slide) */
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                handleManualDock();
              }}
              title="Ancorar na borda (Gaveta Auto-Slide ao passar o mouse)"
              className="p-1 rounded text-[#71778c] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-3 h-3" />
            </button>
          )}

          {/* Restaurar para janela normal */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              clearAllDrawerTimers();
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
            className="p-1 rounded text-[#71778c] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)] transition-colors cursor-pointer"
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
              <SpectrumVisualizer isPlaying={isPlaying} track={currentTrack} variant="mini" barCount={4} />
            </div>
            <p className="text-[11px] text-[#8c91a4] truncate">
              {currentTrack?.artist || "TetPlayer"}
            </p>
          </div>
        </div>

        {/* Controles de Reprodução */}
        <div className="flex items-center gap-1 shrink-0">
          {currentTrack && (
            <button
              onClick={toggleLike}
              title={isLiked ? "Remover dos favoritos (Descurtir)" : "Adicionar às Músicas Curtidas"}
              aria-label={isLiked ? "Descurtir" : "Curtir"}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isLiked
                  ? "text-[var(--accent)] drop-shadow-[0_0_6px_var(--accent-glow)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
            </button>
          )}
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
            className="w-8 h-8 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center shadow-md shadow-[var(--accent-glow)] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
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
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={isMuted ? 0 : volume}
              className="w-12 h-1 bg-[#232733] rounded-full accent-[var(--accent)] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

      {/* Mini Scrubber isolado para evitar re-render de 80ms no container (Mandamento #3) */}
      <MiniPlayerScrubber disabled={!currentTrack} onSeek={handleSeekTo} />
    </div>
  );
}


interface MiniPlayerScrubberProps {
  disabled: boolean;
  onSeek: (seconds: number) => void;
}

const MiniPlayerScrubber = React.memo(function MiniPlayerScrubber({
  disabled,
  onSeek,
}: MiniPlayerScrubberProps) {
  const { currentTime, duration } = usePlaybackProgress();

  return (
    <div className="px-3 pb-1.5 flex items-center gap-2 text-[9px] text-[#71778c] font-mono z-10">
      <span>{formatTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        disabled={disabled}
        aria-label="Linha do tempo"
        aria-valuemin={0}
        aria-valuemax={duration || 100}
        aria-valuenow={currentTime}
        className="flex-1 h-1 bg-[#232733] rounded-full accent-[var(--accent)] cursor-pointer"
      />
      <span>{formatTime(duration)}</span>
    </div>
  );
});
