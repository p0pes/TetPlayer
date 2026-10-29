import React, { useMemo, useState, useEffect } from "react";
import {
  Play,
  Pause,
  Pin,
  Disc3,
  ListMusic,
  Flame,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Playlist, Album } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { GridDensity } from "./AlbumCard";
import { PlaylistGridView, LibrarySortOption } from "./PlaylistGridView";
import { AlbumGridView } from "./AlbumGridView";

interface QuickAccessItem {
  kind: "playlist" | "album";
  id: string;
  title: string;
  subtitle: string;
  artworkUrl?: string;
  isPinned: boolean;
  lastPlayedAt: number;
  playlist?: Playlist;
  album?: Album;
}

interface LibraryOverviewProps {
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  albums: Album[];
  isLoadingAlbums: boolean;
  onRefreshAlbums: () => void;
  pinnedIds: string[];
  playlistHistory: Record<string, number>;
  activeCollectionId: string | null;
  isPlaying: boolean;
  onSelectPlaylist: (pl: Playlist) => void;
  onSelectAlbum: (al: Album) => void;
  onPlayPlaylistQuick: (pl: Playlist, e: React.MouseEvent) => void;
  onPlayAlbumQuick: (al: Album, e: React.MouseEvent) => void;
  onTogglePin: (id: string, e?: React.MouseEvent) => void;
  onTogglePlayPause: () => void;
  onCreatePlaylist: () => void;
  onSwitchSection: (section: "playlists" | "albums") => void;
  searchQuery: string;
  sortBy: LibrarySortOption;
  density: GridDensity;
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

const QuickAccessCard = React.memo(function QuickAccessCard({
  item,
  isActivePlaying,
  isPlaying,
  onSelect,
  onQuickPlay,
}: {
  item: QuickAccessItem;
  isActivePlaying: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onQuickPlay: (e: React.MouseEvent) => void;
}) {
  const [hasImgError, setHasImgError] = useState(false);

  useEffect(() => {
    setHasImgError(false);
  }, [item.id, item.artworkUrl]);

  const isAlbum = item.kind === "album";
  const isLiked = item.id === "VLLM";

  return (
    <div
      onClick={onSelect}
      data-testid="quick-access-card"
      className={`group relative flex items-center justify-between gap-3 p-2 pr-3 rounded-2xl bg-[#121520]/80 hover:bg-[#191d2b] border transition-all duration-200 cursor-pointer select-none shadow-sm hover:shadow-lg ${
        isActivePlaying
          ? "border-[var(--accent)] ring-1 ring-[var(--accent-glow)]/35 bg-[#171b29]"
          : item.isPinned
          ? "border-[var(--accent-border)]/70 hover:border-[var(--accent-border)]"
          : "border-[#1f2434] hover:border-[var(--accent-border)]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Miniatura 48x48px com borda de vinil sutil para Álbuns */}
        <div className="relative w-[54px] h-12 shrink-0 flex items-center">
          {isAlbum && (
            <div
              aria-hidden="true"
              className="absolute right-0 w-11 h-11 rounded-full bg-gradient-to-tr from-[#07080c] via-[#262b3f] to-[#090a10] border border-white/20 shadow-md flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 pointer-events-none"
            >
              <div className="w-3 h-3 rounded-full bg-[var(--accent)]/85 border border-black/70" />
            </div>
          )}

          <div className="relative z-10 w-12 h-12 rounded-xl overflow-hidden bg-[#181b28] border border-white/10 shadow-md flex items-center justify-center shrink-0">
            {item.artworkUrl && !hasImgError ? (
              <img
                src={upgradeArtworkQuality(item.artworkUrl, undefined, "thumb")}
                alt={item.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setHasImgError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : isLiked ? (
              <Flame className="w-5 h-5 text-orange-400" />
            ) : isAlbum ? (
              <Disc3 className="w-5 h-5 text-[#787f98]" />
            ) : (
              <ListMusic className="w-5 h-5 text-[#787f98]" />
            )}
          </div>
        </div>

        {/* Título e Metadados */}
        <div className="min-w-0 flex-1">
          <p
            title={item.title}
            className={`text-xs sm:text-sm font-bold truncate transition-colors ${
              isActivePlaying
                ? "text-[var(--accent-text)]"
                : "text-white group-hover:text-[var(--accent-text)]"
            }`}
          >
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#848a9e] truncate mt-0.5">
            {item.isPinned && (
              <Pin className="w-3 h-3 text-[var(--accent-text)] fill-current shrink-0" />
            )}
            {isAlbum ? (
              <Disc3 className="w-3 h-3 text-[var(--accent-text)] shrink-0" />
            ) : (
              <ListMusic className="w-3 h-3 text-[#63697e] shrink-0" />
            )}
            <span className="truncate">{item.subtitle}</span>
          </div>
        </div>
      </div>

      {/* Indicador de Onda + Botão de Play Rápido */}
      <div className="flex items-center gap-2 shrink-0">
        {isActivePlaying && (
          <div className="group-hover:hidden">
            <SubtleWaveIndicator isPlaying={isPlaying} />
          </div>
        )}
        <button
          type="button"
          onClick={onQuickPlay}
          title={
            isActivePlaying && isPlaying
              ? `Pausar ${item.title}`
              : `Tocar ${item.title} agora`
          }
          aria-label={
            isActivePlaying && isPlaying
              ? `Pausar ${item.title}`
              : `Reproduzir ${item.title} no acesso rápido`
          }
          className={`w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg shadow-black/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            isActivePlaying
              ? "opacity-100 scale-100"
              : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
          }`}
        >
          {isActivePlaying && isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
});

export const LibraryOverview = React.memo(function LibraryOverview({
  playlists,
  isLoadingPlaylists,
  albums,
  isLoadingAlbums,
  onRefreshAlbums,
  pinnedIds,
  playlistHistory,
  activeCollectionId,
  isPlaying,
  onSelectPlaylist,
  onSelectAlbum,
  onPlayPlaylistQuick,
  onPlayAlbumQuick,
  onTogglePin,
  onTogglePlayPause,
  onCreatePlaylist,
  onSwitchSection,
  searchQuery,
  sortBy,
  density,
}: LibraryOverviewProps) {
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  // Constrói até 8 itens de Acesso Rápido (Fixados na ordem do usuário + Ouvidos Recentemente)
  const quickAccessItems = useMemo<QuickAccessItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    const allItems: QuickAccessItem[] = [
      ...playlists.map((pl) => ({
        kind: "playlist" as const,
        id: pl.id,
        title: pl.title,
        subtitle:
          pl.id === "VLLM"
            ? "Auto-playlist"
            : pl.track_count || pl.subtitle || "Playlist",
        artworkUrl: pl.artwork_url,
        isPinned: pinnedSet.has(pl.id),
        lastPlayedAt: playlistHistory[pl.id] || 0,
        playlist: pl,
      })),
      ...albums.map((al) => ({
        kind: "album" as const,
        id: al.id,
        title: al.title,
        subtitle: al.artist ? `Álbum • ${al.artist}` : "Álbum",
        artworkUrl: al.artwork_url,
        isPinned: pinnedSet.has(al.id),
        lastPlayedAt: playlistHistory[al.id] || 0,
        album: al,
      })),
    ];

    const filtered = query
      ? allItems.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query)
        )
      : allItems;

    const itemById = new Map(filtered.map((item) => [item.id, item]));

    const pinnedOrdered = pinnedIds
      .map((id) => itemById.get(id))
      .filter((item): item is QuickAccessItem => !!item);

    const recentUnpinned = filtered
      .filter((item) => !pinnedSet.has(item.id) && item.lastPlayedAt > 0)
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

    const combined = [...pinnedOrdered, ...recentUnpinned];

    // Se ainda houver espaço em Acesso Rápido (< 4 itens) e sem busca ativa, completa com primeiros itens
    if (combined.length < 4 && !query) {
      for (const item of filtered) {
        if (combined.length >= 8) break;
        if (!combined.some((c) => c.id === item.id)) {
          combined.push(item);
        }
      }
    }

    return combined.slice(0, 8);
  }, [playlists, albums, pinnedIds, pinnedSet, playlistHistory, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Seção 1: Acesso Rápido (Fixados & Ouvidos Recentemente) */}
      {quickAccessItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#9ca2b8] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Acesso Rápido — Fixados & Recentes</span>
            </h2>
            <span className="text-[11px] text-[#63697e]">
              1 clique na capa/botão para tocar direto
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {quickAccessItems.map((item) => {
              const isActivePlaying = activeCollectionId === item.id;
              return (
                <QuickAccessCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  isActivePlaying={isActivePlaying}
                  isPlaying={isPlaying}
                  onSelect={() => {
                    if (item.kind === "playlist" && item.playlist) {
                      onSelectPlaylist(item.playlist);
                    } else if (item.kind === "album" && item.album) {
                      onSelectAlbum(item.album);
                    }
                  }}
                  onQuickPlay={(e) => {
                    e.stopPropagation();
                    if (isActivePlaying) {
                      onTogglePlayPause();
                      return;
                    }
                    if (item.kind === "playlist" && item.playlist) {
                      onPlayPlaylistQuick(item.playlist, e);
                    } else if (item.kind === "album" && item.album) {
                      onPlayAlbumQuick(item.album, e);
                    }
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Seção 2: Suas Playlists */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Suas Playlists
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-[#8c91a4] border border-white/5">
              {playlists.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchSection("playlists")}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#8c91a4] hover:text-[var(--accent-text)] transition-colors cursor-pointer group"
          >
            <span>Ver apenas playlists</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <PlaylistGridView
          playlists={playlists}
          isLoadingPlaylists={isLoadingPlaylists}
          pinnedPlaylistIds={pinnedIds}
          onSelectPlaylist={onSelectPlaylist}
          onTogglePinPlaylist={onTogglePin}
          onCreatePlaylist={onCreatePlaylist}
          onPlayPlaylistQuick={onPlayPlaylistQuick}
          activeCollectionId={activeCollectionId}
          isPlaying={isPlaying}
          onTogglePlayPause={onTogglePlayPause}
          playlistHistory={playlistHistory}
          searchQuery={searchQuery}
          sortBy={sortBy}
          density={density}
          hideHeader={true}
        />
      </section>

      {/* Seção 3: Seus Álbuns */}
      <section className="space-y-3.5 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Disc3 className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Seus Álbuns
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-[#8c91a4] border border-white/5">
              {albums.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSwitchSection("albums")}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#8c91a4] hover:text-[var(--accent-text)] transition-colors cursor-pointer group"
          >
            <span>Ver apenas álbuns</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <AlbumGridView
          albums={albums}
          isLoading={isLoadingAlbums}
          onRefresh={onRefreshAlbums}
          onSelectAlbum={onSelectAlbum}
          onPlayAlbumQuick={onPlayAlbumQuick}
          pinnedAlbumIds={pinnedIds}
          onTogglePinAlbum={onTogglePin}
          activeCollectionId={activeCollectionId}
          isPlaying={isPlaying}
          onTogglePlayPause={onTogglePlayPause}
          playlistHistory={playlistHistory}
          externalSearchQuery={searchQuery}
          externalSortBy={sortBy}
          density={density}
          hideToolbar={true}
        />
      </section>
    </div>
  );
});

