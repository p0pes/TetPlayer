import React, { useState } from "react";
import {
  Music,
  Play,
  Pause,
  Loader2,
  MoreVertical,
  GripVertical,
  Heart,
  CheckCircle2,
  ListPlus,
  Check,
} from "lucide-react";
import { Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { triggerTrackContextMenu, triggerPlayNext } from "../../context/PlayerContext";
import { useLikedTrack } from "../../services/likes";
import { useTrackDownload } from "../../services/downloads";
import { useNetworkStatus } from "../../services/network";

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoadingThis: boolean;
  playlistId?: string;
  canReorder?: boolean;
  isDraggingThis?: boolean;
  dropPosition?: "before" | "after" | null;
  onDragStart?: (e: React.PointerEvent, index: number) => void;
  shouldSuppressClick?: () => boolean;
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
  canReorder = false,
  isDraggingThis = false,
  dropPosition = null,
  onDragStart,
  shouldSuppressClick,
  onPlay,
  onTogglePlayPause,
  onContextMenu,
}: TrackRowProps) {
  const { isLiked, toggleLike } = useLikedTrack(track);
  const { isDownloaded } = useTrackDownload(track);
  const { isOnline } = useNetworkStatus();
  const [addedNextFeedback, setAddedNextFeedback] = useState(false);
  const isPlayable = isOnline || isDownloaded;

  function handlePlayNextClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    triggerPlayNext?.(track);
    setAddedNextFeedback(true);
    setTimeout(() => setAddedNextFeedback(false), 1200);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, track);
    } else {
      triggerTrackContextMenu(e, track, playlistId);
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (shouldSuppressClick?.()) {
      e.preventDefault();
      return;
    }
    if (isCurrent && onTogglePlayPause) {
      onTogglePlayPause();
    } else {
      onPlay();
    }
  }

  return (
    <div
      data-track-index={index}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
        !isPlayable ? "opacity-40 hover:opacity-60" : ""
      } ${
        isDraggingThis
          ? "opacity-25 scale-[0.99] bg-[#0e1017] border-dashed border-[var(--accent)]/60"
          : isCurrent
          ? "bg-[#1c202d] border-[var(--accent)]"
          : "bg-[#12141c] border-[#1f232e] hover:bg-[#171a24] hover:border-[#2b3040]"
      }`}
    >
      {/* Indicador de destino do Drag-and-Drop (antes ou depois do item) */}
      {dropPosition === "before" && (
        <div className="pointer-events-none absolute -top-1.5 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent)] z-20" />
      )}
      {dropPosition === "after" && (
        <div className="pointer-events-none absolute -bottom-1.5 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent)] z-20" />
      )}

      {/* Área esquerda arrastável (índice + play integrado, capa, título e artista) */}
      <div
        onPointerDown={(e) => {
          if (canReorder && e.button === 0) {
            onDragStart?.(e, index);
          }
        }}
        className={`flex items-center gap-3.5 min-w-0 flex-1 ${
          canReorder ? "cursor-grab active:cursor-grabbing select-none" : ""
        }`}
      >
        <div className="w-7 flex items-center justify-center shrink-0 relative">
          {canReorder && (
            <GripVertical
              aria-hidden="true"
              className="w-3 h-3 text-[#63697e] opacity-0 group-hover:opacity-100 transition-opacity absolute -left-2.5"
            />
          )}
          {isLoadingThis ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          ) : isCurrent ? (
            <button
              type="button"
              onClick={handleClick}
              aria-label={isPlaying ? `Pausar ${track.title}` : `Tocar ${track.title}`}
              className="w-6 h-6 flex items-center justify-center text-[var(--accent-text)] cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
          ) : (
            <>
              <span className="text-center text-xs font-mono text-[#5e6479] group-hover:opacity-0 transition-opacity">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={handleClick}
                aria-label={`Tocar ${track.title}`}
                className="w-6 h-6 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity absolute cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>
            </>
          )}
        </div>

        {/* Artwork */}
        <div className="w-11 h-11 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center relative">
          {track.artwork_url || track.id ? (
            <img
              src={upgradeArtworkQuality(track.artwork_url, track.id, "thumb")}
              alt={track.title}
              loading="lazy"
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={(e) => handleArtworkError(e, track.id)}
              className="w-full h-full object-cover pointer-events-none"
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
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm font-semibold truncate flex-1 min-w-0 ${
                isCurrent ? "text-[var(--accent-text)]" : "text-white"
              }`}
            >
              {track.title}
            </span>
            {isDownloaded && (
              <span
                title="Disponível offline no disco"
                className="shrink-0 text-emerald-400 inline-flex items-center"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <p className="text-xs text-[#8c91a4] truncate">
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (track.artist) {
                  window.dispatchEvent(
                    new CustomEvent("tetplayer:search-artist", {
                      detail: { query: track.artist, artistId: track.artist_id },
                    })
                  );
                }
              }}
              className="hover:text-white hover:underline cursor-pointer transition-colors"
              title={`Ir para o artista ${track.artist}`}
            >
              {track.artist}
            </span>
            {track.album && (
              <>
                <span className="mx-1 text-[#4a5063] select-none">•</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent("tetplayer:open-album", {
                        detail: {
                          albumId: (track as any).album_id || undefined,
                          albumTitle: track.album,
                          artist: track.artist,
                          artworkUrl: track.artwork_url,
                        },
                      })
                    );
                  }}
                  className="hover:text-white hover:underline cursor-pointer transition-colors"
                  title={`Ver álbum ${track.album}`}
                >
                  {track.album}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Duração & Ações Rápidas de 1 Clique no Hover */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3">
        {/* Botão de Curtir Música (1 Clique) */}
        <button
          type="button"
          onClick={toggleLike}
          title={isLiked ? "Remover dos favoritos (Descurtir)" : "Adicionar às Músicas Curtidas"}
          aria-label={isLiked ? "Descurtir música" : "Curtir música"}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isLiked
              ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent-glow)] opacity-100"
              : "text-[#71778c] hover:text-white hover:bg-[#202535] opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isLiked ? "fill-current scale-105" : ""}`} />
        </button>

        {/* Botão Tocar a Seguir na Fila (1 Clique) */}
        <button
          type="button"
          onClick={handlePlayNextClick}
          title={addedNextFeedback ? "Adicionada para tocar a seguir!" : "Tocar a seguir na fila"}
          aria-label="Tocar a seguir"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            addedNextFeedback
              ? "text-emerald-400 opacity-100"
              : "text-[#71778c] hover:text-white hover:bg-[#202535] opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          {addedNextFeedback ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <ListPlus className="w-4 h-4" />
          )}
        </button>

        {track.duration && (
          <span className="text-xs text-[#71778c] font-mono min-w-[36px] text-right">
            {track.duration}
          </span>
        )}

        {/* Botão de Contexto / Mais Opções (Revelado no Hover) */}
        <button
          type="button"
          onClick={handleContextMenu}
          title="Mais opções da música"
          aria-label="Mais opções"
          className="p-1.5 rounded-lg text-[#71778c] hover:text-white hover:bg-[#202535] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
