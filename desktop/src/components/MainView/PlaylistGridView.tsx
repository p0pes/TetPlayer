import React, { useMemo } from "react";
import { Loader2, Flame, ListMusic, Pin, Play, Pause, Plus } from "lucide-react";
import { Playlist } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { GridDensity } from "./AlbumCard";

export type LibrarySortOption = "recent" | "title" | "artist" | "count_desc";

interface PlaylistGridViewProps {
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  pinnedPlaylistIds: string[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onTogglePinPlaylist: (playlistId: string, e?: React.MouseEvent) => void;
  onCreatePlaylist?: () => void;
  onPlayPlaylistQuick?: (playlist: Playlist, e: React.MouseEvent) => void;
  activeCollectionId?: string | null;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  playlistHistory?: Record<string, number>;
  searchQuery?: string;
  sortBy?: LibrarySortOption;
  density?: GridDensity;
  hideHeader?: boolean;
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
      title={isPlaying ? "Reproduzindo esta playlist" : "Playlist pausada"}
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

function parseTrackCount(pl: Playlist): number {
  const raw = pl.track_count || pl.subtitle || "";
  const match = String(raw).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export const PlaylistGridView = React.memo(function PlaylistGridView({
  playlists,
  isLoadingPlaylists,
  pinnedPlaylistIds,
  onSelectPlaylist,
  onTogglePinPlaylist,
  onCreatePlaylist,
  onPlayPlaylistQuick,
  activeCollectionId = null,
  isPlaying = false,
  onTogglePlayPause,
  playlistHistory = {},
  searchQuery = "",
  sortBy = "recent",
  density = "comfortable",
  hideHeader = false,
}: PlaylistGridViewProps) {
  const pinnedSet = useMemo(() => new Set(pinnedPlaylistIds), [pinnedPlaylistIds]);
  const isCompact = density === "compact";

  const filteredAndSortedPlaylists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = query
      ? playlists.filter(
          (pl) =>
            pl.title.toLowerCase().includes(query) ||
            (pl.subtitle && pl.subtitle.toLowerCase().includes(query)) ||
            (pl.description && pl.description.toLowerCase().includes(query))
        )
      : [...playlists];

    const sortList = (list: Playlist[]) =>
      [...list].sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        if (sortBy === "artist") {
          const subA = a.subtitle || "";
          const subB = b.subtitle || "";
          const cmp = subA.localeCompare(subB, "pt-BR", { sensitivity: "base" });
          return cmp !== 0
            ? cmp
            : a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        if (sortBy === "count_desc") {
          return (
            parseTrackCount(b) - parseTrackCount(a) ||
            a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
          );
        }
        // "recent" (padrão: ouvidos recentemente primeiro)
        const timeA = playlistHistory[a.id] || 0;
        const timeB = playlistHistory[b.id] || 0;
        return timeB - timeA;
      });

    const pinned = pinnedPlaylistIds
      .map((id) => matches.find((pl) => pl.id === id))
      .filter((pl): pl is Playlist => !!pl);
    const unpinned = sortList(matches.filter((pl) => !pinnedSet.has(pl.id)));

    return [...pinned, ...unpinned];
  }, [playlists, searchQuery, sortBy, pinnedPlaylistIds, pinnedSet, playlistHistory]);

  const gridClasses = isCompact
    ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5";

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
              <ListMusic className="w-5 h-5 text-[var(--accent)]" />
              <span>Suas Playlists</span>
            </h2>
            <p className="text-xs text-[#8c91a4] mt-1">
              Playlists sincronizadas com a sua conta do YouTube Music
            </p>
          </div>

          {onCreatePlaylist && (
            <button
              type="button"
              onClick={onCreatePlaylist}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] hover:opacity-90 text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-[var(--accent-glow)]"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Playlist</span>
            </button>
          )}
        </div>
      )}

      {isLoadingPlaylists && playlists.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#71778c]">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
          <p className="text-xs">Carregando suas playlists...</p>
        </div>
      ) : filteredAndSortedPlaylists.length === 0 && searchQuery ? (
        <div className="py-16 flex flex-col items-center justify-center text-center text-[#71778c] bg-[#10121a]/50 rounded-2xl border border-dashed border-[#1f232e] p-6">
          <ListMusic className="w-10 h-10 text-[#3b4154] mb-2.5" />
          <p className="text-sm font-bold text-white">Nenhuma playlist encontrada</p>
          <p className="text-xs text-[#71778c] max-w-sm mt-1">
            Nenhuma playlist corresponde ao termo &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <div className={gridClasses}>
          {/* Card Criar Nova Playlist (exibido quando não há filtro de busca ativo) */}
          {onCreatePlaylist && !searchQuery.trim() && (
            <div
              onClick={onCreatePlaylist}
              className={`bg-[#12141c]/50 hover:bg-[#171a24] ${
                isCompact ? "p-2.5 rounded-xl" : "p-3.5 rounded-2xl"
              } border border-dashed border-[#272d40] hover:border-[var(--accent)] transition-all group cursor-pointer flex flex-col justify-between`}
            >
              <div className="relative w-full aspect-square rounded-xl mb-2.5 flex flex-col items-center justify-center bg-white/[0.02] group-hover:bg-[var(--accent-subtle)] border border-white/5 transition-colors">
                <div
                  className={`${
                    isCompact ? "w-9 h-9" : "w-12 h-12"
                  } rounded-full bg-white/5 group-hover:bg-[var(--accent)] text-[#8c91a4] group-hover:text-white flex items-center justify-center transition-all group-hover:scale-110 shadow-lg`}
                >
                  <Plus className={isCompact ? "w-4 h-4" : "w-6 h-6"} />
                </div>
              </div>
              <div>
                <h4
                  className={`${
                    isCompact ? "text-xs" : "text-xs sm:text-sm"
                  } font-bold text-white group-hover:text-[var(--accent-text)] transition-colors truncate`}
                >
                  Nova Playlist
                </h4>
                {!isCompact && (
                  <p className="text-[11px] text-[#787f98] mt-0.5 truncate">
                    Criar no YouTube Music
                  </p>
                )}
              </div>
            </div>
          )}

          {filteredAndSortedPlaylists.map((pl) => {
            const isLiked = pl.id === "VLLM";
            const isPinned = pinnedSet.has(pl.id);
            const isActivePlaying = activeCollectionId === pl.id;

            const handlePlayClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isActivePlaying && onTogglePlayPause) {
                onTogglePlayPause();
                return;
              }
              if (onPlayPlaylistQuick) {
                onPlayPlaylistQuick(pl, e);
              } else {
                onSelectPlaylist(pl);
              }
            };

            return (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                data-testid="playlist-card"
                className={`bg-[#11131b]/75 hover:bg-[#181b26] ${
                  isCompact ? "p-2.5 rounded-xl" : "p-3 rounded-2xl"
                } border transition-all duration-200 group cursor-pointer flex flex-col justify-between relative shadow-sm hover:shadow-xl hover:shadow-[var(--accent-glow)]/10 ${
                  isActivePlaying
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent-glow)]/40 bg-[#161926]"
                    : isPinned
                    ? "border-[var(--accent-border)] ring-1 ring-[var(--accent-subtle)]"
                    : "border-[#1d212e] hover:border-[var(--accent-border)]"
                }`}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-700 border border-white/5">
                  {pl.artwork_url ? (
                    <img
                      src={upgradeArtworkQuality(pl.artwork_url, undefined, "thumb")}
                      alt={pl.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isLiked ? (
                    <Flame className={isCompact ? "w-10 h-10 text-[var(--accent-text)]" : "w-14 h-14 text-[var(--accent-text)]"} />
                  ) : (
                    <ListMusic className={isCompact ? "w-9 h-9 text-white/50" : "w-12 h-12 text-white/50"} />
                  )}

                  {/* Indicador de Onda Sonora quando a playlist está em reprodução */}
                  {isActivePlaying && (
                    <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-[var(--accent-border)] flex items-center gap-1.5 shadow-md">
                      <SubtleWaveIndicator isPlaying={isPlaying} />
                      {!isCompact && (
                        <span className="text-[10px] font-bold text-[var(--accent-text)]">
                          {isPlaying ? "Tocando" : "Pausada"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botão de Fixar / Desafixar no Card */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinPlaylist(pl.id, e);
                    }}
                    title={isPinned ? "Desafixar playlist do topo" : "Fixar playlist no topo"}
                    aria-label={isPinned ? `Desafixar ${pl.title}` : `Fixar ${pl.title}`}
                    className={`absolute top-2 right-2 z-10 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                      isPinned
                        ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)] opacity-100"
                        : "bg-black/60 text-zinc-300 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                  </button>

                  {/* Overlay escuro sutil no hover */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                  {/* Botão Interativo de Play/Pause Rápido Flutuante */}
                  <button
                    type="button"
                    onClick={handlePlayClick}
                    title={
                      isActivePlaying && isPlaying
                        ? `Pausar ${pl.title}`
                        : `Reproduzir ${pl.title} agora`
                    }
                    aria-label={
                      isActivePlaying && isPlaying
                        ? `Pausar playlist ${pl.title}`
                        : `Reproduzir playlist ${pl.title}`
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
                      <Pause className={isCompact ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current"} />
                    ) : (
                      <Play className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} fill-current ml-0.5`} />
                    )}
                  </button>
                </div>

                <div className={`${isCompact ? "mt-2" : "mt-3"} flex flex-col min-w-0`}>
                  <h4
                    title={pl.title}
                    className={`${
                      isCompact ? "text-xs" : "text-xs sm:text-sm"
                    } font-bold truncate transition-colors ${
                      isActivePlaying
                        ? "text-[var(--accent-text)]"
                        : "text-white group-hover:text-[var(--accent-text)]"
                    }`}
                  >
                    {pl.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-text)] bg-[var(--accent-subtle)] px-1.5 py-0.5 rounded shrink-0">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                        {!isCompact && "Fixada"}
                      </span>
                    )}
                    <p className="text-[11px] text-[#8c91a4] truncate font-medium">
                      {pl.subtitle || pl.track_count || "Playlist"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
