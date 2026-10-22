import React from "react";
import { Music, Play, Pause, Loader2 } from "lucide-react";
import { Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoadingThis: boolean;
  onPlay: () => void;
  onTogglePlayPause?: () => void;
}

export const TrackRow = React.memo(function TrackRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLoadingThis,
  onPlay,
  onTogglePlayPause,
}: TrackRowProps) {
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
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
        isCurrent
          ? "bg-[#1c202d] border-red-500/50"
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
              src={upgradeArtworkQuality(track.artwork_url, track.id)}
              alt={track.title}
              referrerPolicy="no-referrer"
              onError={(e) => handleArtworkError(e, track.id)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-4 h-4 text-[#5e6479]" />
          )}
          {isLoadingThis && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-red-400" : "text-white"}`}>
            {track.title}
          </p>
          <p className="text-xs text-[#8c91a4] truncate">
            {track.artist} {track.album ? `• ${track.album}` : ""}
          </p>
        </div>
      </div>

      {/* Duration & Play/Pause Button */}
      <div className="flex items-center gap-4 shrink-0 pl-3">
        {track.duration && (
          <span className="text-xs text-[#71778c] font-mono">{track.duration}</span>
        )}
        <button
          onClick={handleClick}
          aria-label={isCurrent && isPlaying ? `Pausar ${track.title}` : `Tocar ${track.title}`}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isCurrent && isPlaying
              ? "bg-red-600 text-white shadow-md shadow-red-950/60"
              : "bg-[#1a1d28] text-white group-hover:bg-red-600"
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
