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
  Music,
  ChevronsRight,
  PinOff,
  Heart,
} from "lucide-react";
import { usePlayer, usePlaybackProgress } from "../../context/PlayerContext";
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
  const [isDrawerOpenVisual, setIsDrawerOpenVisual] = useState(false);
  const [isDrawerFastOut, setIsDrawerFastOut] = useState(false);

  // V1 Volume: popover horizontal ao clicar + badge ao usar scroll sobre o ícone
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [volumeBadge, setVolumeBadge] = useState<number | null>(null);
  const volumeBadgeTimerRef = useRef<number | null>(null);
  const volumeContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingVolumeRef = useRef(false);
  const volumeLeftWhileDraggingRef = useRef(false);

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
  const isCollapsingRef = useRef(false);
  const isManualCollapsingRef = useRef(false);

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
    if (isManualCollapsingRef.current) return;
    pendingCloseAfterPointerUpRef.current = false;
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (collapseFinishTimerRef.current !== null) {
      window.clearTimeout(collapseFinishTimerRef.current);
      collapseFinishTimerRef.current = null;
      isCollapsingRef.current = false;
      setIsDrawerFastOut(false);
      setIsDrawerOpenVisual(true);
    }
  }, []);

  const collapseDockedDrawerNow = useCallback(
    (sideOverride?: "left" | "right", instant = false, isManual = false) => {
      const side = sideOverride || isDockedRef.current;
      if (!side) return;
      if (isCollapsingRef.current) return;
      clearAllDrawerTimers();
      isCollapsingRef.current = true;
      isManualCollapsingRef.current = isManual;
      isPointerDownInsideRef.current = false;
      pendingCloseAfterPointerUpRef.current = false;
      setIsDrawerFastOut(instant);
      setIsDrawerOpenVisual(false);

      const animDuration = instant ? 90 : 170;
      collapseFinishTimerRef.current = window.setTimeout(async () => {
        collapseFinishTimerRef.current = null;
        isCollapsingRef.current = false;
        isManualCollapsingRef.current = false;
        const activeSide = sideOverride || isDockedRef.current;
        if (!activeSide) return;
        collapseCooldownUntilRef.current = performance.now() + 240;
        setIsVolumeOpen(false);
        isDrawerExpandedRef.current = false;
        try {
          // Redimensiona o HWND para 36x68 enquanto o card ainda está fora da tela (translate3d ±102%)
          await invoke("dock_mini_player", { side: activeSide });
        } catch (err) {
          console.error("Erro ao recolher gaveta auto-slide:", err);
        }
        setIsDrawerFastOut(false);
        setIsDrawerExpanded(false);
      }, animDuration);
    },
    [clearAllDrawerTimers]
  );

  const scheduleAutoCollapse = useCallback(
    (delayMs = 80) => {
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
      isCollapsingRef.current = false;
      isManualCollapsingRef.current = false;
      pendingCloseAfterPointerUpRef.current = false;
      setIsDrawerFastOut(false);
      setIsDrawerOpenVisual(false);
      try {
        // Expande o HWND transparente primeiro para que a transição CSS 102% -> 0% rode sem tranco
        await invoke("peek_docked_mini_player", { side });
      } catch (err) {
        console.error("Erro ao deslizar gaveta do mini player:", err);
      }
      if (!isDockedRef.current) return;
      expandTimestampRef.current = performance.now();
      setIsDrawerExpanded(true);
      isDrawerExpandedRef.current = true;
    },
    [clearAllDrawerTimers]
  );

  // Dispara a transição contínua de entrada via duplo rAF após montar a gaveta
  useEffect(() => {
    if (!isDocked || !isDrawerExpanded) {
      setIsDrawerOpenVisual(false);
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (isDockedRef.current && isDrawerExpandedRef.current && !isCollapsingRef.current) {
          setIsDrawerOpenVisual(true);
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [isDocked, isDrawerExpanded]);

  useEffect(() => {
    let unlistenDocked: (() => void) | undefined;
    let unlistenAutoCollapse: (() => void) | undefined;

    listen<string>("mini-player-docked", (event) => {
      if (event.payload === "left" || event.payload === "right") {
        isDockedRef.current = event.payload;
        isDrawerExpandedRef.current = false;
        setIsDocked(event.payload);
        setIsDrawerExpanded(false);
        setIsDrawerOpenVisual(false);
      }
    })
      .then((fn) => {
        unlistenDocked = fn;
      })
      .catch(console.error);

    listen<string>("mini-player-auto-collapse", (event) => {
      if (
        isDockedRef.current &&
        isDrawerExpandedRef.current &&
        !isDraggingWindowRef.current
      ) {
        const isOutsideClick = event.payload === "outside-click";
        collapseDockedDrawerNow(undefined, isOutsideClick);
      }
    })
      .then((fn) => {
        unlistenAutoCollapse = fn;
      })
      .catch(console.error);

    const handleGlobalPointerUp = () => {
      if (isPointerDownInsideRef.current) {
        isPointerDownInsideRef.current = false;
        if (pendingCloseAfterPointerUpRef.current) {
          pendingCloseAfterPointerUpRef.current = false;
          scheduleAutoCollapse(60);
        }
      }
    };

    const handleWindowBlur = () => {
      isPointerDownInsideRef.current = false;
      pendingCloseAfterPointerUpRef.current = false;
      if (
        isDockedRef.current &&
        isDrawerExpandedRef.current &&
        !isDraggingWindowRef.current
      ) {
        collapseDockedDrawerNow(undefined, true);
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("mouseup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      if (unlistenDocked) unlistenDocked();
      if (unlistenAutoCollapse) unlistenAutoCollapse();
      clearAllDrawerTimers();
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("mouseup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [clearAllDrawerTimers, collapseDockedDrawerNow, scheduleAutoCollapse]);

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
          setIsDrawerOpenVisual(false);
        } else {
          isDockedRef.current = null;
          isDrawerExpandedRef.current = false;
          setIsDocked(null);
          setIsDrawerExpanded(false);
          setIsDrawerOpenVisual(false);
        }
      } catch (err) {
        console.error("Erro ao arrastar janela:", err);
      } finally {
        isDraggingWindowRef.current = false;
      }
    }
  }

  // Fecha o popover de volume ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isVolumeOpen) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (
        volumeContainerRef.current &&
        !volumeContainerRef.current.contains(e.target as Node)
      ) {
        setIsVolumeOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVolumeOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDownOutside, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVolumeOpen]);

  useEffect(() => {
    return () => {
      if (volumeBadgeTimerRef.current !== null) {
        window.clearTimeout(volumeBadgeTimerRef.current);
      }
    };
  }, []);

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
        setIsDrawerOpenVisual(false);
      } else {
        const side = await invoke<string>("dock_mini_player", { side: "right" });
        const validSide = (side === "left" ? "left" : "right") as "left" | "right";
        isDockedRef.current = validSide;
        isDrawerExpandedRef.current = false;
        setIsDocked(validSide);
        setIsDrawerExpanded(false);
        setIsDrawerOpenVisual(false);
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
      setIsDrawerOpenVisual(false);
      await invoke("undock_mini_player", { side: currentSide });
    } catch (err) {
      console.error("Erro ao desencaixar mini player:", err);
    }
  }

  // Controle de volume rápido via scroll do mouse (alça, card ou ícone de áudio)
  function applyWheelVolume(e: React.WheelEvent, showBadge = false) {
    const step = e.deltaY < 0 ? 0.05 : -0.05;
    const baseVol = isMuted ? 0 : volume;
    const nextVol = Math.min(1, Math.max(0, Number((baseVol + step).toFixed(2))));
    setVolume(nextVol);
    if (showBadge) {
      setVolumeBadge(Math.round(nextVol * 100));
      if (volumeBadgeTimerRef.current !== null) {
        window.clearTimeout(volumeBadgeTimerRef.current);
      }
      volumeBadgeTimerRef.current = window.setTimeout(() => {
        volumeBadgeTimerRef.current = null;
        setVolumeBadge(null);
      }, 1100);
    }
  }

  function handleWheelVolume(e: React.WheelEvent) {
    applyWheelVolume(e, false);
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
        className={`w-full h-full bg-transparent flex items-center select-none ${activeDockSide === "left" ? "justify-start" : "justify-end"
          }`}
      >
        <div
          onMouseEnter={handleTabMouseEnter}
          onMouseMove={handleTabMouseEnter}
          onMouseLeave={handleTabMouseLeave}
          onPointerDown={handleTabPointerDown}
          onPointerMove={handleTabPointerMove}
          onPointerUp={handleTabPointerUp}
          onPointerCancel={() => {
            isDraggingTabRef.current = false;
          }}
          onWheel={handleWheelVolume}
          title="TetPlayer Auto-Slide — Encoste o mouse para abrir, gire o scroll para volume ou arraste verticalmente"
          className={`w-[10px] h-[64px] bg-[#0c0e17]/95 hover:bg-[#141826] border border-[#2b3042] hover:border-[var(--accent)]/80 flex items-center justify-center overflow-hidden cursor-pointer group transition-[background-color,border-color,transform] duration-150 ease-out hover:scale-y-[1.08] origin-center select-none relative ${activeDockSide === "left"
            ? "border-l-0 rounded-r-full"
            : "border-r-0 rounded-l-full"
            }`}
        >
          {/* Indicador vertical lateral mais espesso (sem seta) */}
          <div
            className={`w-[4.5px] h-[44px] rounded-full transition-[background-color,box-shadow,transform] duration-150 group-hover:scale-y-[1.06] ${isPlaying
              ? "bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]"
              : "bg-[#606884] group-hover:bg-[var(--accent)]"
              }`}
          />
        </div>
      </div>
    );
  }

  // Transição contínua GPU (permite reverter suavemente se o mouse voltar no meio do fechamento)
  const drawerTransitionStyle: React.CSSProperties = isDocked
    ? {
      transform: isDrawerOpenVisual
        ? "translate3d(0, 0, 0)"
        : activeDockSide === "left"
          ? "translate3d(-102%, 0, 0)"
          : "translate3d(102%, 0, 0)",
      opacity: isDrawerOpenVisual ? 1 : 0.35,
      transitionProperty: "transform, opacity",
      transitionDuration: isDrawerFastOut ? "90ms" : isDrawerOpenVisual ? "210ms" : "170ms",
      transitionTimingFunction: isDrawerOpenVisual
        ? "cubic-bezier(0.22, 1, 0.36, 1)"
        : "cubic-bezier(0.4, 0, 0.2, 1)",
      willChange: "transform, opacity",
    }
    : {};

  const containerShapeClass = isDocked
    ? activeDockSide === "left"
      ? "border-l-0 rounded-r-2xl"
      : "border-r-0 rounded-l-2xl"
    : "rounded-2xl";

  // Visualização Expandida (Gaveta Auto-Slide na borda ou Mini Player Flutuante)
  // Wrapper externo estático para hit-testing estável e LED fixo na borda do monitor (sem piscar)
  return (
    <div
      data-testid="miniplayer-expanded-root"
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === "INPUT" || target.closest('[role="slider"]'))
        ) {
          isPointerDownInsideRef.current = true;
        }
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
          const elapsed = performance.now() - expandTimestampRef.current;
          if (elapsed < 260) {
            return;
          }
          scheduleAutoCollapse(70);
        }
      }}
      onWheel={handleWheelVolume}
      className="w-full h-full bg-transparent overflow-hidden select-none relative"
    >
      {/* Filete luminoso fixo na borda do monitor (não viaja com o card, evitando piscar) */}
      {isDocked && (
        <div
          className={`absolute top-3 bottom-3 w-[2.5px] rounded-full z-40 pointer-events-none ${activeDockSide === "left" ? "left-0" : "right-0"
            } ${isPlaying
              ? "bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]"
              : "bg-[#343b52]"
            }`}
        />
      )}

      <div
        style={drawerTransitionStyle}
        className={`w-full h-full bg-[#0c0e17] border border-[#262b3d] flex flex-col justify-between overflow-hidden relative ${containerShapeClass}`}
      >

        {/* Glow Aurora de fundo sutil */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none rounded-[inherit]"
          style={{
            background:
              "radial-gradient(circle at 20% 50%, var(--aurora-1-glow) 0%, transparent 60%)",
          }}
        />

        {/* Ações discretas de janela no canto superior direito (sem barra de título dedicada) */}
        <div
          data-no-drag
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1.5 flex items-center gap-0.5 z-30 opacity-60 hover:opacity-100 transition-opacity"
        >
          {isDocked ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUndock();
              }}
              title="Desafixar da borda (Manter sempre aberto)"
              className="p-1 rounded text-[var(--accent)] hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
            >
              <PinOff className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
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

          <button
            type="button"
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

          <button
            type="button"
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

        {/* Faixa superior invisível para arrastar a janela com cursor de mãozinha */}
        <div
          aria-hidden="true"
          data-drag-handle
          onMouseDown={handleStartDrag}
          className="absolute top-0 inset-x-0 h-3 cursor-grab active:cursor-grabbing z-20"
        />

        {/* Conteúdo Compacto: Capa, Título/Artista e Controles */}
        <div className="flex-1 px-3 pt-3 pb-2.5 flex items-center justify-between gap-2.5 min-h-0 z-10 cursor-default">
          {/* Capa e Informações da Faixa */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-[#1a1d28] border border-[#232738] overflow-hidden shrink-0 flex items-center justify-center relative shadow-md group/cover">
              {currentTrack?.artwork_url || currentTrack?.id ? (
                <img
                  src={upgradeArtworkQuality(currentTrack?.artwork_url, currentTrack?.id)}
                  alt={currentTrack?.title || "Capa do álbum"}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleArtworkError(e, currentTrack?.id)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-4 h-4 text-[#5e6479]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentTrack?.title || "Nenhuma faixa tocando"}
              </p>
              <p className="text-[11px] text-[#8c91a4] truncate">
                {currentTrack?.artist || "TetPlayer"}
              </p>
            </div>
          </div>

          {/* Controles de Reprodução */}
          <div className="flex items-center gap-0.5 shrink-0">
            {currentTrack && (
              <button
                type="button"
                onClick={toggleLike}
                title={isLiked ? "Remover dos favoritos (Descurtir)" : "Adicionar às Músicas Curtidas"}
                aria-label={isLiked ? "Descurtir" : "Curtir"}
                className={`p-1 rounded-lg transition-all cursor-pointer ${isLiked
                  ? "text-[var(--accent)] drop-shadow-[0_0_6px_var(--accent-glow)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
                  }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
              </button>
            )}
            <button
              type="button"
              onClick={handlePrevTrack}
              title="Faixa Anterior"
              aria-label="Faixa anterior"
              className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={!currentTrack}
              title={isPlaying ? "Pausar" : "Tocar"}
              aria-label={isPlaying ? "Pausar" : "Tocar"}
              className="w-7 h-7 mx-0.5 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center shadow-md shadow-[var(--accent-glow)] transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNextTrack}
              title="Próxima Faixa"
              aria-label="Próxima faixa"
              className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Volume V1: Scroll no ícone altera volume com badge; clique abre slider horizontal */}
            <div
              ref={volumeContainerRef}
              data-no-drag
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.stopPropagation();
                applyWheelVolume(e, true);
              }}
              className="relative flex items-center"
            >
              <button
                type="button"
                onClick={() => setIsVolumeOpen((prev) => !prev)}
                title="Volume (role para ajustar ou clique para abrir o slider)"
                aria-label="Controle de volume"
                aria-expanded={isVolumeOpen}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${isVolumeOpen
                  ? "text-white bg-[#202536]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
                  }`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Badge rápido de porcentagem ao usar scroll sem clicar */}
              {volumeBadge !== null && !isVolumeOpen && (
                <span
                  role="status"
                  aria-label={`Volume ${volumeBadge}%`}
                  className="absolute -top-6 right-0 px-1.5 py-0.5 rounded bg-[#121522]/95 border border-[#2c334a] text-[9px] font-mono font-semibold text-white shadow-lg pointer-events-none whitespace-nowrap z-40"
                >
                  {volumeBadge}%
                </span>
              )}

              {/* Popover horizontal de volume ao clicar no ícone (centralizado na linha de controles, fecha ao sair com o mouse) */}
              {isVolumeOpen && (
                <div
                  role="dialog"
                  aria-label="Ajuste de volume"
                  onMouseEnter={() => {
                    volumeLeftWhileDraggingRef.current = false;
                  }}
                  onMouseLeave={() => {
                    if (isDraggingVolumeRef.current) {
                      volumeLeftWhileDraggingRef.current = true;
                      return;
                    }
                    setIsVolumeOpen(false);
                  }}
                  className="absolute top-1/2 -translate-y-1/2 right-0 px-2.5 py-1.5 rounded-xl bg-[#1b2032] border border-[#3a4362] shadow-[0_6px_20px_rgba(0,0,0,0.85)] flex items-center gap-1.5 z-40 whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? "Desativar Mudo" : "Silenciar"}
                    aria-label={isMuted ? "Desativar Mudo" : "Silenciar"}
                    className="p-0.5 rounded text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    onPointerDown={() => {
                      isDraggingVolumeRef.current = true;
                      volumeLeftWhileDraggingRef.current = false;
                    }}
                    onPointerUp={() => {
                      isDraggingVolumeRef.current = false;
                      if (volumeLeftWhileDraggingRef.current) {
                        volumeLeftWhileDraggingRef.current = false;
                        setIsVolumeOpen(false);
                      }
                    }}
                    aria-label="Volume no Mini Player"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={isMuted ? 0 : volume}
                    className="w-20 h-1 bg-[#2a3147] rounded-full accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-[#c2c7d6] w-7 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edge Line de 3px integrada à borda inferior (isolada de re-renders via PlaybackProgressContext) */}
        <MiniPlayerScrubber disabled={!currentTrack} onSeek={handleSeekTo} />
      </div>
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
  const isSeekingRef = useRef(false);
  const safeDuration = duration > 0 ? duration : 0;
  const progress = safeDuration > 0 ? Math.min(1, Math.max(0, currentTime / safeDuration)) : 0;

  const seekFromClientX = (el: HTMLDivElement, clientX: number) => {
    if (disabled || safeDuration <= 0) return;
    const rect = el.getBoundingClientRect();
    const width = rect.width || 1;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / width));
    onSeek(ratio * safeDuration);
  };

  return (
    <div
      data-no-drag
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Linha do tempo"
      aria-valuemin={0}
      aria-valuemax={safeDuration || 100}
      aria-valuenow={currentTime}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (disabled || e.button !== 0) return;
        isSeekingRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        seekFromClientX(e.currentTarget, e.clientX);
      }}
      onPointerMove={(e) => {
        if (!isSeekingRef.current) return;
        seekFromClientX(e.currentTarget, e.clientX);
      }}
      onKeyDown={(e) => {
        if (disabled || safeDuration <= 0) return;
        const step = 5;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onSeek(Math.max(0, currentTime - step));
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onSeek(Math.min(safeDuration, currentTime + step));
        } else if (e.key === "Home") {
          e.preventDefault();
          onSeek(0);
        } else if (e.key === "End") {
          e.preventDefault();
          onSeek(safeDuration);
        }
      }}
      onPointerUp={(e) => {
        if (!isSeekingRef.current) return;
        isSeekingRef.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerCancel={(e) => {
        isSeekingRef.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      className={`absolute bottom-0 inset-x-0 h-2.5 flex items-end z-30 group/scrubber ${disabled ? "pointer-events-none opacity-40" : "cursor-pointer"
        }`}
    >
      <div className="w-full h-[3px] bg-[#1c2030] relative overflow-hidden origin-bottom transition-transform duration-150 group-hover/scrubber:scale-y-[1.67]">
        <div
          className="h-full w-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
});
