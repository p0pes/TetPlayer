import React from "react";
import { Music, Play, Pause, Loader2, MoreVertical } from "lucide-react";
import { Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { usePlayer } from "../../context/PlayerContext";

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoadingThis: boolean;
  playlistId?: string;
  onPlay: () => void;
  onTogglePlayPause?: () => void;
  onContextMenu?: (e: React.MouseEvent, track: Track) => void;
}

export const TrackRow = React.memo(function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLoadingThis,
  playlistId,
  onPlay,
  onTogglePlayPause,
  onContextMenu,
}: TrackRowProps) {
  const { openContextMenu } = usePlayer();

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, track);
    } else {
      openContextMenu(e, track, playlistId);
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (isCurrent && onTogglePlayPause) {
      e.stopPropagation();
      onTogglePlayPause();
    } else {
      onPlay();
    }
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${isCurrent
          ? "bg-[#1c202d] border-[var(--accent)]"
          : "bg-[#12141c] border-[#1f232e] hover:bg-[#171a24] hover:border-[#2b3040]"
        }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="w-6 text-center text-xs font-mono text-[#5e6479] shrink-0">
          {index + 1}
        </span>

        {/* Artwork */}
        <div className="w-11 h-11 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center relative">
          {track.artwork_url || track.id ? (
            <img
              src={upgradeArtworkQuality(track.artwork_url, track.id, "thumb")}
              alt={track.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => handleArtworkError(e, track.id)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-4 h-4 text-[#5e6479]" />
          )}
          {isLoadingThis && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-[var(--accent-text)]" : "text-white"}`}>
            {track.title}
          </p>
          <p className="text-xs text-[#8c91a4] truncate">
            {track.artist} {track.album ? `• ${track.album}` : ""}
          </p>
        </div>
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center gap-2.5 shrink-0 pl-3">
        {track.duration && (
          <span className="text-xs text-[#71778c] font-mono mr-1">{track.duration}</span>
        )}

        {/* Botão de Contexto / Mais Opções */}
        <button
          type="button"
          onClick={handleContextMenu}
          title="Mais opções da música"
          aria-label="Mais opções"
          className="p-1.5 rounded-lg text-[#71778c] hover:text-white hover:bg-[#202535] opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={handleClick}
          aria-label={isCurrent && isPlaying ? `Pausar ${track.title}` : `Tocar ${track.title}`}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${isCurrent && isPlaying
              ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]"
              : "bg-[#1a1d28] text-white group-hover:bg-[var(--accent)]"
            }`}
        >
          {isLoadingThis ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isCurrent && isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
});
