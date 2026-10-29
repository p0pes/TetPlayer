import React, { useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Track } from "../../types";
import { TrackRow } from "./TrackRow";

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
  const suppressClickRef = useRef(false);
  const onReorderRef = useRef(onReorderTrack);
  onReorderRef.current = onReorderTrack;

  const dragStateRef = useRef<{
    active: boolean;
    sourceIndex: number;
    overIndex: number;
    startY: number;
    clientX: number;
    clientY: number;
    rafId: number | null;
  } | null>(null);

  const shouldSuppressClick = useCallback(() => suppressClickRef.current, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent, index: number) => {
      if (!canReorder) return;

      dragStateRef.current = {
        active: false,
        sourceIndex: index,
        overIndex: index,
        startY: e.clientY,
        clientX: e.clientX,
        clientY: e.clientY,
        rafId: null,
      };

      const updateTargetFromPoint = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y);
        const rowEl = el?.closest("[data-track-index]") as HTMLElement | null;
        if (!rowEl || !dragStateRef.current) return;
        const idx = Number(rowEl.getAttribute("data-track-index"));
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
          setDragSourceIndex(state.sourceIndex);
          setDragOverIndex(state.sourceIndex);
          state.rafId = requestAnimationFrame(autoScrollTick);
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

  // Para listas pequenas, renderiza diretamente
  if (tracks.length <= 40) {
    return (
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
    );
  }

  // Para listas longas (300 a 2.000 faixas), usa virtualização com TanStack Virtual
  return (
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
