import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Track } from "../../types";
import { TrackRow } from "./TrackRow";

interface VirtualizedTrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  playlistId?: string;
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
  onPlayTrack,
  onTogglePlayPause,
  parentRef,
}: VirtualizedTrackListProps) {
  // Para listas pequenas, renderiza diretamente
  if (tracks.length <= 40) {
    return (
      <div className="space-y-2">
        {tracks.map((track, idx) => {
          const isCurrent = currentTrack?.id === track.id;
          const isLoadingThis = loadingTrackId === track.id;

          return (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={track}
              index={idx}
              isCurrent={isCurrent}
              isPlaying={isPlaying}
              isLoadingThis={isLoadingThis}
              playlistId={playlistId}
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
      onPlayTrack={onPlayTrack}
      onTogglePlayPause={onTogglePlayPause}
      parentRef={parentRef}
    />
  );
}

function VirtualContainer({
  tracks,
  currentTrack,
  isPlaying,
  loadingTrackId,
  playlistId,
  onPlayTrack,
  onTogglePlayPause,
  parentRef,
}: VirtualizedTrackListProps) {
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
    getItemKey: (index) => tracks[index]?.id ?? index,
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
            key={`${track.id}-${virtualRow.index}`}
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
              onPlay={() => onPlayTrack(track, virtualRow.index)}
              onTogglePlayPause={onTogglePlayPause}
            />
          </div>
        );
      })}
    </div>
  );
}
