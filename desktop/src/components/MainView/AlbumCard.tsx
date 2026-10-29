import React, { useState, useEffect } from "react";
import { Play, Pause, Disc3, Pin } from "lucide-react";
import { Album } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { triggerCollectionContextMenu } from "../ContextMenu/CollectionContextMenu";

export type GridDensity = "comfortable" | "compact";

interface AlbumCardProps {
  album: Album;
  onSelect: (album: Album) => void;
  onPlay?: (album: Album, e: React.MouseEvent) => void;
  isPinned?: boolean;
  onTogglePin?: (albumId: string, e: React.MouseEvent) => void;
  isActivePlaying?: boolean;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  density?: GridDensity;
}

const SubtleWaveIndicator = React.memo(function SubtleWaveIndicator({
  isPlaying,
}: {
  isPlaying: boolean;
}) {
  return (
    <div
      className="flex items-end justify-center gap-[2px] h-3.5 w-4 px-0.5 shrink-0"
      aria-hidden="true"
      title={isPlaying ? "Reproduzindo este álbum" : "Álbum pausado"}
    >
      {[
        { dur: "1.4s", delay: "0s" },
        { dur: "1.6s", delay: "0.35s" },
        { dur: "1.3s", delay: "0.7s" },
      ].map((b, i) => (
        <span
          key={i}
          className="w-[2px] h-full rounded-full bg-[var(--accent)] shadow-[0_0_5px_var(--accent-glow)] will-change-transform"
          style={{
            transformOrigin: "bottom",
            animation: isPlaying
              ? `subtle-equalizer-wave ${b.dur} ease-in-out infinite alternate`
              : "none",
            animationDelay: isPlaying ? b.delay : undefined,
            transform: isPlaying ? undefined : "scaleY(0.28)",
          }}
        />
      ))}
    </div>
  );
});

export const AlbumCard = React.memo(function AlbumCard({
  album,
  onSelect,
  onPlay,
  isPinned = false,
  onTogglePin,
  isActivePlaying = false,
  isPlaying = false,
  onTogglePlayPause,
  density = "comfortable",
}: AlbumCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    setHasImageError(false);
    setIsImageLoaded(false);
  }, [album.id, album.artwork_url]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActivePlaying && onTogglePlayPause) {
      onTogglePlayPause();
      return;
    }
    if (onPlay) {
      onPlay(album, e);
    } else {
      onSelect(album);
    }
  };

  const isSpecialType = album.album_type === "ep" || album.album_type === "single";
  const isCompact = density === "compact";

  return (
    <div
      onClick={() => onSelect(album)}
      onContextMenu={(e) =>
        triggerCollectionContextMenu(e, {
          kind: "album",
          album,
          isPinned,
        })
      }
      data-testid="album-card"
      className={`group flex flex-col ${
        isCompact ? "p-2.5 rounded-xl" : "p-3 rounded-2xl"
      } bg-[#11131b]/60 hover:bg-[#181b26] border transition-all duration-200 cursor-pointer select-none shadow-sm hover:shadow-xl hover:shadow-[var(--accent-glow)]/10 ${
        isActivePlaying
          ? "border-[var(--accent)] ring-1 ring-[var(--accent-glow)]/40 bg-[#161926]"
          : isPinned
          ? "border-[var(--accent-border)] ring-1 ring-[var(--accent-subtle)]"
          : "border-[#1d212e] hover:border-[var(--accent-border)]"
      }`}
    >
      {/* Capa com Proporção 1:1 e Botão de Play Flutuante */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#161822] border border-white/5 shrink-0 shadow-md">
        {album.artwork_url && !hasImageError ? (
          <img
            src={upgradeArtworkQuality(album.artwork_url, undefined, "card")}
            alt={album.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setHasImageError(true)}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1c1f2e] to-[#12141d] text-[#63697e]">
            <Disc3 className={isCompact ? "w-9 h-9" : "w-12 h-12"} />
          </div>
        )}

        {/* Badge de EP / SINGLE */}
        {isSpecialType && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 text-zinc-300 backdrop-blur-md border border-white/10 shadow-sm">
            {album.album_type}
          </span>
        )}

        {/* Indicador de Onda Sonora quando o álbum está ativo */}
        {isActivePlaying && (
          <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-[var(--accent-border)] flex items-center gap-1.5 shadow-md">
            <SubtleWaveIndicator isPlaying={isPlaying} />
            {!isCompact && (
              <span className="text-[10px] font-bold text-[var(--accent-text)]">
                {isPlaying ? "Tocando" : "Pausado"}
              </span>
            )}
          </div>
        )}

        {/* Botão de Fixar no Topo (Pin) */}
        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(album.id, e);
            }}
            title={isPinned ? "Desafixar álbum do topo" : "Fixar álbum no topo"}
            aria-label={isPinned ? `Desafixar ${album.title}` : `Fixar ${album.title}`}
            className={`absolute top-2 right-2 z-10 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
              isPinned
                ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] opacity-100"
                : "bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100"
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
          </button>
        )}

        {/* Overlay escuro sutil no hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Botão de Play/Pause Rápido Flutuante */}
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={
            isActivePlaying && isPlaying
              ? `Pausar álbum ${album.title}`
              : `Reproduzir álbum ${album.title}`
          }
          className={`absolute bottom-2.5 right-2.5 ${
            isCompact ? "w-8 h-8" : "w-10 h-10"
          } rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer ${
            isActivePlaying
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          {isActivePlaying && isPlaying ? (
            <Pause key="album-pause" className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill-current animate-icon-pop`} />
          ) : (
            <Play key="album-play" className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill-current ml-0.5 animate-icon-pop`} />
          )}
        </button>
      </div>

      {/* Metadados do Álbum */}
      <div className={`${isCompact ? "mt-2" : "mt-3"} flex flex-col min-w-0`}>
        <h3
          title={album.title}
          className={`${
            isCompact ? "text-xs" : "text-xs sm:text-sm"
          } font-bold truncate transition-colors ${
            isActivePlaying
              ? "text-[var(--accent-text)]"
              : "text-white group-hover:text-[var(--accent-text)]"
          }`}
        >
          {album.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          {isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-text)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded shrink-0">
              <Pin className="w-2.5 h-2.5 fill-current" />
              {!isCompact && "Fixado"}
            </span>
          )}
          <p
            title={album.artist}
            className="text-[11px] text-[#8c91a4] truncate font-medium"
          >
            {album.artist}
          </p>
        </div>
        {!isCompact && (
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#63697e] font-mono">
            {album.year && <span>{album.year}</span>}
            {album.year && album.track_count && <span>•</span>}
            {album.track_count && <span>{album.track_count} faixas</span>}
          </div>
        )}
      </div>
    </div>
  );
});
