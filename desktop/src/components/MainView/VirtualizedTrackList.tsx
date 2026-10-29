import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GripVertical, Music, MoreVertical, Play, Pause } from "lucide-react";
import { Track } from "../../types";
import { TrackRow } from "./TrackRow";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

interface VirtualizedTrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  playlistId?: string;
  canReorder?: boolean;
  onReorderTrack?: (fromIndex: number, toIndex: number) => void;
  onPlayTrack: (track: Track, index: number) => void;
  onTogglePlayPause?: () => void;
  parentRef: React.RefObject<HTMLElement | null>;
}

export function VirtualizedTrackList({
  tracks,
  currentTrack,
  isPlaying,
  loadingTrackId,
  playlistId,
  canReorder = false,
  onReorderTrack,
  onPlayTrack,
  onTogglePlayPause,
  parentRef,
}: VirtualizedTrackListProps) {
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragGhostBox, setDragGhostBox] = useState<{
    left: number;
    width: number;
    initialY: number;
    track: Track;
  } | null>(null);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const onReorderRef = useRef(onReorderTrack);
  onReorderRef.current = onReorderTrack;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const dragStateRef = useRef<{
    active: boolean;
    sourceIndex: number;
    overIndex: number;
    startY: number;
    clientX: number;
    clientY: number;
    rowLeft: number;
    rowWidth: number;
    offsetY: number;
    rafId: number | null;
  } | null>(null);

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  // Sincroniza a posição inicial do ghost no exato frame de montagem
  useLayoutEffect(() => {
    if (ghostRef.current && dragStateRef.current) {
      const y = dragStateRef.current.clientY - dragStateRef.current.offsetY;
      ghostRef.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.015)`;
    }
  }, [dragGhostBox]);

  const handleDragStart = useCallback(
    (e: React.PointerEvent, index: number) => {
      if (!canReorder) return;

      const rowEl = (e.currentTarget as HTMLElement).closest("[data-track-index]") as HTMLElement | null;
      const rowRect = rowEl ? rowEl.getBoundingClientRect() : null;

      dragStateRef.current = {
        active: false,
        sourceIndex: index,
        overIndex: index,
        startY: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
        rowLeft: rowRect ? rowRect.left : e.clientX - 120,
        rowWidth: rowRect ? rowRect.width : 560,
        offsetY: rowRect ? e.clientY - rowRect.top : 34,
        rafId: null,
      };

      const updateTargetFromPoint = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y);
        const targetRow = el?.closest("[data-track-index]") as HTMLElement | null;
        if (!targetRow || !dragStateRef.current) return;
        const idx = Number(targetRow.getAttribute("data-track-index"));
        if (!Number.isNaN(idx) && idx !== dragStateRef.current.overIndex) {
          dragStateRef.current.overIndex = idx;
          setDragOverIndex(idx);
        }
      };

      const autoScrollTick = () => {
        const state = dragStateRef.current;
        if (!state || !state.active) return;

        const scrollEl = parentRef.current;
        if (scrollEl) {
          const rect = scrollEl.getBoundingClientRect();
          const edgeZone = 65;
          const maxSpeed = 14;

          if (state.clientY < rect.top + edgeZone) {
            const ratio = Math.min(1, (rect.top + edgeZone - state.clientY) / edgeZone);
            scrollEl.scrollTop -= Math.ceil(ratio * maxSpeed);
            updateTargetFromPoint(state.clientX, state.clientY);
          } else if (state.clientY > rect.bottom - edgeZone) {
            const ratio = Math.min(1, (state.clientY - (rect.bottom - edgeZone)) / edgeZone);
            scrollEl.scrollTop += Math.ceil(ratio * maxSpeed);
            updateTargetFromPoint(state.clientX, state.clientY);
          }
        }

        state.rafId = requestAnimationFrame(autoScrollTick);
      };

      const handlePointerMove = (ev: PointerEvent) => {
        const state = dragStateRef.current;
        if (!state) return;

        state.clientX = ev.clientX;
        state.clientY = ev.clientY;

        if (!state.active) {
          if (Math.abs(ev.clientY - state.startY) < 5) return;
          state.active = true;
          suppressClickRef.current = true;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "grabbing";

          const draggedTrack = tracksRef.current[state.sourceIndex];
          if (draggedTrack) {
            setDragGhostBox({
              left: state.rowLeft,
              width: state.rowWidth,
              initialY: ev.clientY - state.offsetY,
              track: draggedTrack,
            });
          }

          setDragSourceIndex(state.sourceIndex);
          setDragOverIndex(state.sourceIndex);
          state.rafId = requestAnimationFrame(autoScrollTick);
        }

        if (ghostRef.current) {
          const y = ev.clientY - state.offsetY;
          ghostRef.current.style.transform = `translate3d(0, ${y}px, 0) scale(1.015)`;
        }

        updateTargetFromPoint(ev.clientX, ev.clientY);
      };

      const cleanupDrag = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);

        const state = dragStateRef.current;
        if (state?.rafId) {
          cancelAnimationFrame(state.rafId);
        }

        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        if (state?.active) {
          const { sourceIndex, overIndex } = state;
          setDragSourceIndex(null);
          setDragOverIndex(null);
          setDragGhostBox(null);
          if (sourceIndex !== overIndex) {
            onReorderRef.current?.(sourceIndex, overIndex);
          }
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 80);
        }

        dragStateRef.current = null;
      };

      const handlePointerUp = () => {
        cleanupDrag();
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [canReorder, parentRef]
  );

  useEffect(() => {
    return () => {
      if (dragStateRef.current?.rafId) {
        cancelAnimationFrame(dragStateRef.current.rafId);
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  const getDropPosition = (idx: number): "before" | "after" | null => {
    if (dragSourceIndex === null || dragOverIndex === null || dragSourceIndex === dragOverIndex) {
      return null;
    }
    if (idx !== dragOverIndex) return null;
    return dragSourceIndex > idx ? "before" : "after";
  };

  // Elemento flutuante (Ghost Preview) a 144 FPS que acompanha o ponteiro como no YouTube Music
  const floatingGhost =
    dragSourceIndex !== null &&
    dragGhostBox &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={ghostRef}
            style={{
              position: "fixed",
              top: 0,
              left: `${dragGhostBox.left}px`,
              width: `${dragGhostBox.width}px`,
              transform: `translate3d(0, ${dragGhostBox.initialY}px, 0) scale(1.015)`,
              pointerEvents: "none",
              zIndex: 9999,
              willChange: "transform",
            }}
          >
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--accent)] bg-[#181c2b]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_24px_var(--accent-glow)]">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <GripVertical className="w-4 h-4 text-[var(--accent-text)]" />
                </div>

                <div className="w-11 h-11 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center">
                  {dragGhostBox.track.artwork_url || dragGhostBox.track.id ? (
                    <img
                      src={upgradeArtworkQuality(
                        dragGhostBox.track.artwork_url,
                        dragGhostBox.track.id,
                        "thumb"
                      )}
                      alt={dragGhostBox.track.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleArtworkError(e, dragGhostBox.track.id)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-4 h-4 text-[#5e6479]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-white">
                    {dragGhostBox.track.title}
                  </p>
                  <p className="text-xs text-[#8c91a4] truncate">
                    {dragGhostBox.track.artist}{" "}
                    {dragGhostBox.track.album ? `• ${dragGhostBox.track.album}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pl-3">
                {dragGhostBox.track.duration && (
                  <span className="text-xs text-[#8c91a4] font-mono mr-1">
                    {dragGhostBox.track.duration}
                  </span>
                )}
                <div className="p-1.5 rounded-lg text-[#71778c]">
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentTrack?.id === dragGhostBox.track.id && isPlaying
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[#1a1d28] text-white"
                  }`}
                >
                  {currentTrack?.id === dragGhostBox.track.id && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  // Para listas pequenas, renderiza diretamente
  if (tracks.length <= 40) {
    return (
      <>
        {floatingGhost}
        <div className="space-y-2">
          {tracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLoadingThis = loadingTrackId === track.id;

            return (
              <TrackRow
                key={track.set_video_id || `${track.id}-${idx}`}
                track={track}
                index={idx}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                isLoadingThis={isLoadingThis}
                playlistId={playlistId}
                canReorder={canReorder}
                isDraggingThis={dragSourceIndex === idx}
                dropPosition={getDropPosition(idx)}
                onDragStart={handleDragStart}
                shouldSuppressClick={shouldSuppressClick}
                onPlay={() => onPlayTrack(track, idx)}
                onTogglePlayPause={onTogglePlayPause}
              />
            );
          })}
        </div>
      </>
    );
  }

  // Para listas longas (300 a 2.000 faixas), usa virtualização com TanStack Virtual
  return (
    <>
      {floatingGhost}
      <VirtualContainer
        tracks={tracks}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        loadingTrackId={loadingTrackId}
        playlistId={playlistId}
        canReorder={canReorder}
        dragSourceIndex={dragSourceIndex}
        getDropPosition={getDropPosition}
        onDragStart={handleDragStart}
        shouldSuppressClick={shouldSuppressClick}
        onPlayTrack={onPlayTrack}
        onTogglePlayPause={onTogglePlayPause}
        parentRef={parentRef}
      />
    </>
  );
}

interface VirtualContainerProps extends VirtualizedTrackListProps {
  dragSourceIndex: number | null;
  getDropPosition: (idx: number) => "before" | "after" | null;
  onDragStart: (e: React.PointerEvent, index: number) => void;
  shouldSuppressClick: () => boolean;
}

function VirtualContainer({
  tracks,
  currentTrack,
  isPlaying,
  loadingTrackId,
  playlistId,
  canReorder,
  dragSourceIndex,
  getDropPosition,
  onDragStart,
  shouldSuppressClick,
  onPlayTrack,
  onTogglePlayPause,
  parentRef,
}: VirtualContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = React.useState(0);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setScrollMargin(containerRef.current.offsetTop);
    }
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 6,
    scrollMargin,
    getItemKey: (index) => tracks[index]?.set_video_id || `${tracks[index]?.id ?? index}-${index}`,
  });

  return (
    <div
      ref={containerRef}
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const track = tracks[virtualRow.index];
        const isCurrent = currentTrack?.id === track.id;
        const isLoadingThis = loadingTrackId === track.id;

        return (
          <div
            key={track.set_video_id || `${track.id}-${virtualRow.index}`}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translate3d(0, ${virtualRow.start - scrollMargin}px, 0)`,
              paddingBottom: "8px",
            }}
          >
            <TrackRow
              track={track}
              index={virtualRow.index}
              isCurrent={isCurrent}
              isPlaying={isPlaying}
              isLoadingThis={isLoadingThis}
              playlistId={playlistId}
              canReorder={canReorder}
              isDraggingThis={dragSourceIndex === virtualRow.index}
              dropPosition={getDropPosition(virtualRow.index)}
              onDragStart={onDragStart}
              shouldSuppressClick={shouldSuppressClick}
              onPlay={() => onPlayTrack(track, virtualRow.index)}
              onTogglePlayPause={onTogglePlayPause}
            />
          </div>
        );
      })}
    </div>
  );
}
