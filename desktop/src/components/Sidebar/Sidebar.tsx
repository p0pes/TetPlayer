import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Library,
  Search,
  BarChart3,
  ListMusic,
  Disc3,
  RefreshCw,
  Loader2,
  Flame,
  Settings,
  Pin,
  GripVertical,
  Plus,
  Play,
  Pause,
  X,
} from "lucide-react";
import { Playlist, Album, AuthSession, ActiveTab } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { triggerCollectionContextMenu } from "../ContextMenu/CollectionContextMenu";

export type SidebarFilterMode = "all" | "playlists" | "albums";

export interface SidebarCollectionItem {
  kind: "playlist" | "album";
  id: string;
  title: string;
  subtitle: string;
  artworkUrl?: string | null;
  playlist?: Playlist;
  album?: Album;
}

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  onRefreshPlaylists: () => void;
  onCreatePlaylist?: () => void;
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (pl: Playlist) => void;
  albums?: Album[];
  isLoadingAlbums?: boolean;
  onRefreshAlbums?: () => void;
  selectedAlbum?: Album | null;
  onSelectAlbum?: (album: Album) => void;
  onPlayPlaylistQuick?: (pl: Playlist, e: React.MouseEvent) => void;
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
  activeCollectionId?: string | null;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  auth: AuthSession | null;
  isCheckingAuth: boolean;
  onRefreshAuth: () => void;
  onGoogleLogin?: () => void;
  onOpenSettings?: () => void;
  playlistHistory: Record<string, number>;
  pinnedPlaylistIds: string[];
  setPinnedPlaylistIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const SubtleWaveIndicator = React.memo(function SubtleWaveIndicator({
  isPlaying,
}: {
  isPlaying: boolean;
}) {
  return (
    <div
      className="flex items-end justify-center gap-[2px] h-3 w-4 px-0.5 shrink-0"
      aria-hidden="true"
      title={isPlaying ? "Reproduzindo agora" : "Coleção pausada"}
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

const SidebarItemThumbnail = React.memo(function SidebarItemThumbnail({
  item,
  isSelected,
  isActivePlaying,
  isPlaying,
  onQuickPlay,
}: {
  item: SidebarCollectionItem;
  isSelected: boolean;
  isActivePlaying: boolean;
  isPlaying: boolean;
  onQuickPlay?: (e: React.MouseEvent) => void;
}) {
  const [hasImgError, setHasImgError] = useState(false);

  useEffect(() => {
    setHasImgError(false);
  }, [item.id, item.artworkUrl]);

  const thumbUrl = item.artworkUrl
    ? upgradeArtworkQuality(item.artworkUrl, undefined, "thumb")
    : null;

  const isAlbum = item.kind === "album";
  const isLikedAuto = item.id === "VLLM";

  return (
    <div className="relative w-[34px] h-8 shrink-0 flex items-center">
      {/* Borda de disco de vinil saindo pela direita para Álbuns */}
      {isAlbum && (
        <div
          aria-hidden="true"
          className="absolute right-0 w-7 h-7 rounded-full bg-gradient-to-tr from-[#07080c] via-[#252a3d] to-[#090a10] border border-white/25 shadow-sm flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 pointer-events-none"
        >
          <div className="w-2 h-2 rounded-full bg-[var(--accent)]/85 border border-black/70" />
        </div>
      )}

      {/* Mini-capa 30x30px com largura de coluna padronizada para alinhamento vertical perfeito */}
      <div
        className={`relative z-10 w-[30px] h-[30px] rounded-md overflow-hidden flex items-center justify-center shrink-0 transition-colors shadow-sm ${
          isSelected
            ? "bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)]"
            : "bg-[#161925] border border-white/10 text-[#6e7488]"
        }`}
      >
        {thumbUrl && !hasImgError ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : isLikedAuto ? (
          <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        ) : isAlbum ? (
          <Disc3 className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ListMusic className="w-3.5 h-3.5 shrink-0" />
        )}

        {/* Overlay de Play Rápido no Hover sobre a Mini-Capa */}
        {onQuickPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickPlay(e);
            }}
            title={
              isActivePlaying && isPlaying
                ? `Pausar ${item.title}`
                : `Tocar ${item.title} agora`
            }
            aria-label={
              isActivePlaying && isPlaying
                ? `Pausar ${item.title}`
                : `Reproduzir ${item.title} rapidamente`
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
          >
            {isActivePlaying && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current text-[var(--accent-text)]" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
});

export const Sidebar = React.memo(function Sidebar({
  activeTab,
  setActiveTab,
  playlists,
  isLoadingPlaylists,
  onRefreshPlaylists,
  onCreatePlaylist,
  selectedPlaylist,
  onSelectPlaylist,
  albums = [],
  isLoadingAlbums = false,
  onRefreshAlbums,
  selectedAlbum = null,
  onSelectAlbum,
  onPlayPlaylistQuick,
  onPlayAlbumQuick,
  activeCollectionId = null,
  isPlaying = false,
  onTogglePlayPause,
  auth,
  isCheckingAuth,
  onRefreshAuth,
  onGoogleLogin,
  onOpenSettings,
  playlistHistory,
  pinnedPlaylistIds,
  setPinnedPlaylistIds,
}: SidebarProps) {
  // Filtro rápido por tipo: Tudo | Playlists | Álbuns
  const [filterMode, setFilterMode] = useState<SidebarFilterMode>("all");

  // Lupa compacta de busca rápida na coleção
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Estado de Drag & Drop determinístico baseado em Pointer Events para itens fixados
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    index: number;
    position: "before" | "after";
  } | null>(null);
  const [dragGhostY, setDragGhostY] = useState<number>(0);

  const pinnedListRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pointerYRef = useRef<number>(0);
  const dragItemOffsetYRef = useRef<number>(0);
  const autoScrollFrameRef = useRef<number | null>(null);
  const pinnedPlaylistsRef = useRef<SidebarCollectionItem[]>([]);

  const pinnedSet = useMemo(() => new Set(pinnedPlaylistIds), [pinnedPlaylistIds]);

  // Constrói itens unificados de Playlists + Álbuns
  const allCollectionItems = useMemo<SidebarCollectionItem[]>(() => {
    const playlistItems: SidebarCollectionItem[] = playlists.map((pl) => ({
      kind: "playlist",
      id: pl.id,
      title: pl.title,
      subtitle:
        pl.id === "VLLM"
          ? "Auto-playlist"
          : pl.track_count
          ? /^\d+$/.test(String(pl.track_count).trim())
            ? `${pl.track_count} músicas`
            : pl.track_count
          : pl.subtitle || "Playlist",
      artworkUrl: pl.artwork_url,
      playlist: pl,
    }));

    const albumItems: SidebarCollectionItem[] = albums.map((al) => ({
      kind: "album",
      id: al.id,
      title: al.title,
      subtitle: al.artist ? `${al.artist}` : "Álbum",
      artworkUrl: al.artwork_url,
      album: al,
    }));

    return [...playlistItems, ...albumItems];
  }, [playlists, albums]);

  const itemMap = useMemo(() => {
    const map = new Map<string, SidebarCollectionItem>();
    for (const item of allCollectionItems) {
      map.set(item.id, item);
    }
    return map;
  }, [allCollectionItems]);

  const matchesFilterAndSearch = useCallback(
    (item: SidebarCollectionItem) => {
      if (filterMode === "playlists" && item.kind !== "playlist") return false;
      if (filterMode === "albums" && item.kind !== "album") return false;
      const q = sidebarSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    },
    [filterMode, sidebarSearch]
  );

  // Itens fixados na ordem customizada do usuário
  const pinnedItems = useMemo(() => {
    return pinnedPlaylistIds
      .map((id) => itemMap.get(id))
      .filter((item): item is SidebarCollectionItem => !!item && matchesFilterAndSearch(item));
  }, [pinnedPlaylistIds, itemMap, matchesFilterAndSearch]);

  pinnedPlaylistsRef.current = pinnedItems;

  // Itens não fixados ordenados pelos ouvidos mais recentemente
  const unpinnedItems = useMemo(() => {
    return allCollectionItems
      .filter((item) => !pinnedSet.has(item.id) && matchesFilterAndSearch(item))
      .sort((a, b) => {
        const timeA = playlistHistory[a.id] || 0;
        const timeB = playlistHistory[b.id] || 0;
        return timeB - timeA;
      });
  }, [allCollectionItems, pinnedSet, matchesFilterAndSearch, playlistHistory]);

  function togglePinItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPinnedPlaylistIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const computeDropTarget = useCallback(
    (clientY: number): { index: number; position: "before" | "after" } | null => {
      const container = pinnedListRef.current;
      if (!container) return null;
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-pinned-row-index]")
      );
      if (rows.length === 0) return null;

      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) {
          return { index: i, position: "before" };
        }
      }

      return { index: rows.length - 1, position: "after" };
    },
    []
  );

  useEffect(() => {
    if (draggingIdx === null) return;

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    const updateTargetFromPointer = () => {
      const target = computeDropTarget(pointerYRef.current);
      setDropTarget((prev) => {
        if (!target && !prev) return null;
        if (
          target &&
          prev &&
          target.index === prev.index &&
          target.position === prev.position
        ) {
          return prev;
        }
        return target;
      });
    };

    const tickAutoScroll = () => {
      const scrollEl = scrollContainerRef.current;
      if (scrollEl) {
        const rect = scrollEl.getBoundingClientRect();
        const y = pointerYRef.current;
        const edgeThreshold = 42;
        const maxSpeed = 8;

        if (y < rect.top + edgeThreshold) {
          const intensity = Math.min(
            1,
            (rect.top + edgeThreshold - y) / edgeThreshold
          );
          scrollEl.scrollTop -= Math.ceil(intensity * maxSpeed);
          updateTargetFromPointer();
        } else if (y > rect.bottom - edgeThreshold) {
          const intensity = Math.min(
            1,
            (y - (rect.bottom - edgeThreshold)) / edgeThreshold
          );
          scrollEl.scrollTop += Math.ceil(intensity * maxSpeed);
          updateTargetFromPointer();
        }
      }
      autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointerYRef.current = e.clientY;
      setDragGhostY(e.clientY - dragItemOffsetYRef.current);
      updateTargetFromPointer();
    };

    const finishDrag = () => {
      const finalTarget = computeDropTarget(pointerYRef.current);
      const visiblePinned = pinnedPlaylistsRef.current;
      if (
        finalTarget &&
        visiblePinned[draggingIdx] &&
        visiblePinned[finalTarget.index]
      ) {
        const draggedId = visiblePinned[draggingIdx].id;
        const targetId = visiblePinned[finalTarget.index].id;

        if (draggedId !== targetId) {
          setPinnedPlaylistIds((prev) => {
            const fromRealIdx = prev.indexOf(draggedId);
            const targetRealIdx = prev.indexOf(targetId);
            if (fromRealIdx === -1 || targetRealIdx === -1) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromRealIdx, 1);
            const newTargetIdx = next.indexOf(targetId);
            const insertAt =
              finalTarget.position === "after" ? newTargetIdx + 1 : newTargetIdx;
            next.splice(insertAt, 0, moved);
            return next;
          });
        }
      }
      setDraggingIdx(null);
      setDropTarget(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    autoScrollFrameRef.current = requestAnimationFrame(tickAutoScroll);

    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      if (autoScrollFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, [draggingIdx, computeDropTarget, setPinnedPlaylistIds]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSidebarSearch("");
      } else {
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      return next;
    });
  };

  const handleRefreshCollection = () => {
    onRefreshPlaylists();
    if (onRefreshAlbums) {
      onRefreshAlbums();
    }
  };

  const handleSelectItem = (item: SidebarCollectionItem) => {
    if (item.kind === "playlist" && item.playlist) {
      onSelectPlaylist(item.playlist);
    } else if (item.kind === "album" && item.album && onSelectAlbum) {
      onSelectAlbum(item.album);
    }
  };

  const handleQuickPlayItem = (item: SidebarCollectionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCollectionId === item.id && onTogglePlayPause) {
      onTogglePlayPause();
      return;
    }
    if (item.kind === "playlist" && item.playlist) {
      if (onPlayPlaylistQuick) {
        onPlayPlaylistQuick(item.playlist, e);
      } else {
        onSelectPlaylist(item.playlist);
      }
    } else if (item.kind === "album" && item.album) {
      if (onPlayAlbumQuick) {
        onPlayAlbumQuick(item.album, e);
      } else if (onSelectAlbum) {
        onSelectAlbum(item.album);
      }
    }
  };

  const isItemSelected = (item: SidebarCollectionItem) => {
    if (activeTab !== "library") return false;
    if (item.kind === "playlist") {
      return selectedPlaylist?.id === item.id;
    }
    return selectedAlbum?.id === item.id;
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: SidebarCollectionItem) => {
    const isPinned = pinnedSet.has(item.id);
    if (item.kind === "playlist" && item.playlist) {
      triggerCollectionContextMenu(e, {
        kind: "playlist",
        playlist: item.playlist,
        isPinned,
      });
    } else if (item.kind === "album" && item.album) {
      triggerCollectionContextMenu(e, {
        kind: "album",
        album: item.album,
        isPinned,
      });
    }
  };

  const filterIndex =
    filterMode === "all" ? 0 : filterMode === "playlists" ? 1 : 2;

  const isCollectionLoading = isLoadingPlaylists || isLoadingAlbums;

  return (
    <aside className="w-64 bg-[#0e1017]/90 border-r border-[#1f232e] flex flex-col justify-between p-4 select-none shrink-0">
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Menu de Navegação Principal */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("library")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "library"
                ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] shadow-sm"
                : "text-[#8c91a4] hover:text-white hover:bg-white/5"
            }`}
          >
            <Library className="w-4 h-4" />
            Biblioteca
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "search"
                ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] shadow-sm"
                : "text-[#8c91a4] hover:text-white hover:bg-white/5"
            }`}
          >
            <Search className="w-4 h-4" />
            Buscar no YT Music
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === "stats"
                ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] shadow-sm"
                : "text-[#8c91a4] hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Estatísticas
          </button>
        </nav>

        {/* Seção Unificada: Sua Coleção (Playlists + Álbuns) */}
        <div className="pt-3.5 border-t border-[#1f232e] flex-1 flex flex-col min-h-0">
          {/* Linha 1: Título "Sua Coleção" à esquerda + Ações Rápidas à direita */}
          <div className="flex items-center justify-between px-1.5 mb-2.5 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c91a4]">
              Sua Coleção
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToggleSearch}
                title="Filtrar itens da coleção"
                aria-label="Filtrar coleção na barra lateral"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSearchOpen || sidebarSearch
                    ? "text-[var(--accent-text)] bg-[var(--accent-subtle)]"
                    : "text-[#71778c] hover:text-white hover:bg-white/5"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              {onCreatePlaylist && (
                <button
                  type="button"
                  onClick={onCreatePlaylist}
                  title="Criar nova playlist"
                  aria-label="Criar nova playlist"
                  className="text-[#71778c] hover:text-[var(--accent-text)] transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleRefreshCollection}
                disabled={isCollectionLoading}
                title="Atualizar coleção"
                aria-label="Atualizar coleção"
                className="text-[#71778c] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isCollectionLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Linha 2: Pílulas de Filtro Rápido [Tudo] [Playlists] [Álbuns] */}
          <div className="px-1 mb-2.5 shrink-0">
            <div
              role="tablist"
              aria-label="Filtrar coleção por tipo"
              className="relative grid grid-cols-3 p-0.5 bg-[#0a0c12] border border-[#1d2130] rounded-xl select-none"
            >
              <div
                className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] transition-transform duration-200 ease-out pointer-events-none"
                style={{
                  transform: `translate3d(${filterIndex * 100}%, 0, 0)`,
                }}
              />
              {(
                [
                  { id: "all", label: "Tudo" },
                  { id: "playlists", label: "Playlists" },
                  { id: "albums", label: "Álbuns" },
                ] as const
              ).map((pill) => {
                const isActive = filterMode === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFilterMode(pill.id)}
                    className={`relative z-10 py-1.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-[var(--accent-text)] font-bold"
                        : "text-[#7b8196] hover:text-white"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input de Busca Rápida Inline (Lupa Compacta) */}
          {(isSearchOpen || sidebarSearch) && (
            <div className="px-1 mb-2.5 shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative">
                <Search className="w-3 h-3 text-[#63697e] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSidebarSearch("");
                      setIsSearchOpen(false);
                    }
                  }}
                  placeholder="Filtrar coleção..."
                  aria-label="Filtrar coleção"
                  className="w-full bg-[#131622] border border-[#252a3d] focus:border-[var(--accent)] rounded-lg pl-7 pr-6 py-1.5 text-[11px] text-white placeholder-[#63697e] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSidebarSearch("");
                    setIsSearchOpen(false);
                  }}
                  title="Limpar busca"
                  aria-label="Limpar filtro da coleção"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#63697e] hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Lista Rolável de Fixados + Ouvidos Recentes */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar"
          >
            {isCollectionLoading && allCollectionItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[#71778c] text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </div>
            ) : pinnedItems.length === 0 && unpinnedItems.length === 0 ? (
              <div className="px-2 py-6 text-center text-[11px] text-[#63697e]">
                {sidebarSearch
                  ? `Nenhum item para "${sidebarSearch}".`
                  : filterMode === "albums"
                  ? "Nenhum álbum encontrado."
                  : "Nenhum item na coleção."}
              </div>
            ) : (
              <>
                {/* Seção de Itens Fixados (Playlists + Álbuns com Drag & Drop Livre) */}
                {pinnedItems.length > 0 && (
                  <div ref={pinnedListRef} className="space-y-1 mb-2 relative">
                    <div className="px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Pin className="w-2.5 h-2.5 fill-current" />
                        <span>Fixados</span>
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] leading-tight">
                        {pinnedItems.length}
                      </span>
                    </div>

                    {pinnedItems.map((item, idx) => {
                      const isSelected = isItemSelected(item);
                      const isActivePlaying = activeCollectionId === item.id;
                      const isDraggingThis = draggingIdx === idx;
                      const showDropBefore =
                        dropTarget?.index === idx &&
                        dropTarget.position === "before" &&
                        draggingIdx !== idx &&
                        !(draggingIdx !== null && draggingIdx === idx - 1);
                      const showDropAfter =
                        dropTarget?.index === idx &&
                        dropTarget.position === "after" &&
                        draggingIdx !== idx &&
                        !(draggingIdx !== null && draggingIdx === idx + 1);

                      return (
                        <div
                          key={`${item.kind}-${item.id}`}
                          data-pinned-row-index={idx}
                          onClick={() => handleSelectItem(item)}
                          onContextMenu={(e) => handleItemContextMenu(e, item)}
                          className={`w-full flex items-center justify-between gap-1.5 px-1.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer group relative ${
                            isDraggingThis ? "opacity-35 scale-[0.98] " : ""
                          }${
                            isSelected
                              ? "bg-[#1a1d28] text-white font-semibold border border-[var(--accent-border)]"
                              : "text-[#c4c8d8] hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          {showDropBefore && (
                            <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full pointer-events-none z-20 shadow-[0_0_8px_var(--accent)]" />
                          )}
                          {showDropAfter && (
                            <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full pointer-events-none z-20 shadow-[0_0_8px_var(--accent)]" />
                          )}

                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Grip Handle para Reordenação Drag & Drop */}
                            <div
                              onPointerDown={(e) => {
                                if (e.button !== 0) return;
                                e.preventDefault();
                                e.stopPropagation();
                                const rowEl = e.currentTarget.closest(
                                  "[data-pinned-row-index]"
                                ) as HTMLElement | null;
                                const rect = rowEl?.getBoundingClientRect();
                                dragItemOffsetYRef.current = rect
                                  ? e.clientY - rect.top
                                  : 16;
                                pointerYRef.current = e.clientY;
                                setDragGhostY(
                                  e.clientY - dragItemOffsetYRef.current
                                );
                                setDraggingIdx(idx);
                                setDropTarget({ index: idx, position: "before" });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title="Segure e arraste para reordenar"
                              className="p-0.5 -ml-0.5 rounded text-[#4a5064] group-hover:text-[#8c91a4] hover:text-white cursor-grab active:cursor-grabbing shrink-0 touch-none transition-colors"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>

                            {/* Mini-Capa 30x30px com Borda de Vinil p/ Álbuns e Play Rápido */}
                            <SidebarItemThumbnail
                              item={item}
                              isSelected={isSelected}
                              isActivePlaying={isActivePlaying}
                              isPlaying={isPlaying}
                              onQuickPlay={(e) => handleQuickPlayItem(item, e)}
                            />

                            {/* Título + Subtítulo alinhados verticalmente */}
                            <div className="min-w-0 flex-1">
                              <p
                                title={item.title}
                                className={`truncate text-xs leading-tight ${
                                  isActivePlaying
                                    ? "text-[var(--accent-text)] font-bold"
                                    : isSelected
                                    ? "text-white font-semibold"
                                    : "text-[#d5d9e8] font-medium group-hover:text-white"
                                }`}
                              >
                                {item.title}
                              </p>
                              <p className="text-[10px] text-[#6c7288] truncate leading-tight flex items-center gap-1 mt-0.5">
                                {item.kind === "album" && (
                                  <Disc3 className="w-2.5 h-2.5 text-[var(--accent-text)] shrink-0 inline" />
                                )}
                                <span className="truncate">{item.subtitle}</span>
                              </p>
                            </div>
                          </div>

                          {/* Indicador de Onda Sutil + Botão de Desafixar no Hover */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isActivePlaying && (
                              <SubtleWaveIndicator isPlaying={isPlaying} />
                            )}
                            <button
                              type="button"
                              onClick={(e) => togglePinItem(item.id, e)}
                              title="Desafixar do topo"
                              aria-label={`Desafixar ${item.title}`}
                              className="p-1 rounded text-[var(--accent-text)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/10 transition-all cursor-pointer"
                            >
                              <Pin className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Card Flutuante (Ghost) acompanhando o cursor durante o Drag */}
                    {draggingIdx !== null && pinnedItems[draggingIdx] && (
                      <div
                        className="fixed left-4 w-56 z-50 pointer-events-none flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#181b26]/95 backdrop-blur-xl text-white border border-[var(--accent)] shadow-[0_12px_30px_rgba(0,0,0,0.75)] ring-1 ring-[var(--accent-glow)] scale-[1.02]"
                        style={{
                          top: `${dragGhostY}px`,
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GripVertical className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                          <SidebarItemThumbnail
                            item={pinnedItems[draggingIdx]}
                            isSelected={true}
                            isActivePlaying={false}
                            isPlaying={false}
                          />
                          <span className="truncate">
                            {pinnedItems[draggingIdx].title}
                          </span>
                        </div>
                        <Pin className="w-3 h-3 text-[var(--accent-text)] fill-current shrink-0" />
                      </div>
                    )}

                    {unpinnedItems.length > 0 && (
                      <div className="pt-2.5 pb-1 px-1.5 text-[10px] font-bold uppercase tracking-wider text-[#52586c] border-t border-[#1f232e]/60">
                        Ouvidos Recentes
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de Itens Não Fixados (Ordenados pelos Ouvidos Mais Recentes) */}
                {unpinnedItems.map((item) => {
                  const isSelected = isItemSelected(item);
                  const isActivePlaying = activeCollectionId === item.id;

                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      onClick={() => handleSelectItem(item)}
                      onContextMenu={(e) => handleItemContextMenu(e, item)}
                      className={`w-full flex items-center justify-between gap-1.5 px-1.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-[#1a1d28] text-white font-semibold border border-[var(--accent-border)]"
                          : "text-[#8c91a4] hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <SidebarItemThumbnail
                          item={item}
                          isSelected={isSelected}
                          isActivePlaying={isActivePlaying}
                          isPlaying={isPlaying}
                          onQuickPlay={(e) => handleQuickPlayItem(item, e)}
                        />

                        <div className="min-w-0 flex-1">
                          <p
                            title={item.title}
                            className={`truncate text-xs leading-tight ${
                              isActivePlaying
                                ? "text-[var(--accent-text)] font-bold"
                                : isSelected
                                ? "text-white font-semibold"
                                : "text-[#c4c8d8] font-medium group-hover:text-white"
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[10px] text-[#63697e] truncate leading-tight flex items-center gap-1 mt-0.5">
                            {item.kind === "album" && (
                              <Disc3 className="w-2.5 h-2.5 text-[var(--accent-text)] shrink-0 inline" />
                            )}
                            <span className="truncate">{item.subtitle}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isActivePlaying && (
                          <SubtleWaveIndicator isPlaying={isPlaying} />
                        )}
                        <button
                          type="button"
                          onClick={(e) => togglePinItem(item.id, e)}
                          title="Fixar no topo"
                          aria-label={`Fixar ${item.title}`}
                          className="p-1 rounded text-[#71778c] hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/10 transition-all cursor-pointer shrink-0"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status de Autenticação / Sessão */}
      <div className="pt-4 border-t border-[#1f232e] space-y-2 shrink-0">
        <div className="bg-[#141722] rounded-xl p-3 border border-[#222738] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {auth?.is_authenticated && auth.avatar_url ? (
                <img
                  src={upgradeArtworkQuality(auth.avatar_url, undefined, "thumb")}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-emerald-500/40 shrink-0"
                />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    auth?.is_authenticated
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-amber-400"
                  }`}
                />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-zinc-200 truncate">
                  {auth?.is_authenticated
                    ? auth.user_name || "Conectado via Google"
                    : "Modo Anônimo"}
                </p>
                {auth?.is_authenticated && auth.email && (
                  <p className="text-[10px] text-[#71778c] truncate">
                    {auth.email}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  title="Configurações do TetPlayer"
                  aria-label="Abrir configurações"
                  className="text-[#71778c] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onRefreshAuth}
                disabled={isCheckingAuth}
                title="Revalidar sessão"
                aria-label="Revalidar sessão"
                className="text-[#71778c] hover:text-white transition-colors p-1 rounded-md hover:bg-white/5 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isCheckingAuth ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {!auth?.is_authenticated && onGoogleLogin && (
            <button
              onClick={onGoogleLogin}
              disabled={isCheckingAuth}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[var(--accent)] hover:opacity-90 active:scale-[0.99] text-white text-[11px] font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              Conectar Conta Google
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});
