import React, { useState } from "react";
import { Play, Disc3 } from "lucide-react";
import { Album } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

interface AlbumCardProps {
  album: Album;
  onSelect: (album: Album) => void;
  onPlay?: (album: Album, e: React.MouseEvent) => void;
}

export const AlbumCard = React.memo(function AlbumCard({
  album,
  onSelect,
  onPlay,
}: AlbumCardProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(album, e);
    } else {
      onSelect(album);
    }
  };

  const isSpecialType = album.album_type === "ep" || album.album_type === "single";

  return (
    <div
      onClick={() => onSelect(album)}
      data-testid="album-card"
      className="group flex flex-col p-3 rounded-2xl bg-[#11131b]/60 hover:bg-[#181b26] border border-[#1d212e] hover:border-[var(--accent-border)] transition-all duration-200 cursor-pointer select-none shadow-sm hover:shadow-xl hover:shadow-[var(--accent-glow)]/10"
    >
      {/* Capa com Proporção 1:1 e Botão de Play Flutuante */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#161822] border border-white/5 shrink-0 shadow-md">
        {album.artwork_url && !hasImageError ? (
          <img
            src={upgradeArtworkQuality(album.artwork_url, album.id, "thumb")}
            alt={album.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1c1f2e] to-[#12141d] text-[#63697e]">
            <Disc3 className="w-12 h-12" />
          </div>
        )}

        {/* Badge de EP / SINGLE */}
        {isSpecialType && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/75 text-zinc-300 backdrop-blur-md border border-white/10 shadow-sm">
            {album.album_type}
          </span>
        )}

        {/* Overlay escuro sutil no hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Botão de Play Rápido Flutuante (Emerge suavemente no hover) */}
        <button
          onClick={handlePlayClick}
          aria-label={`Reproduzir álbum ${album.title}`}
          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-black/50 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200 z-10 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      </div>

      {/* Metadados do Álbum */}
      <div className="mt-3 flex flex-col min-w-0">
        <h3
          title={album.title}
          className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[var(--accent-text)] transition-colors"
        >
          {album.title}
        </h3>
        <p
          title={album.artist}
          className="text-[11px] text-[#8c91a4] truncate mt-0.5 font-medium"
        >
          {album.artist}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#63697e] font-mono">
          {album.year && <span>{album.year}</span>}
          {album.year && album.track_count && <span>•</span>}
          {album.track_count && <span>{album.track_count} faixas</span>}
        </div>
      </div>
    </div>
  );
});
