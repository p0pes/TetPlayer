import React, { useState, useRef, useMemo } from "react";
import {
  Library,
  Search,
  RefreshCw,
  Loader2,
  ListMusic,
  Flame,
  Pin,
  ChevronUp,
  ChevronDown,
  GripVertical,
  BarChart2,
  Settings,
} from "lucide-react";
import { Playlist, AuthSession, ActiveTab } from "../../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  onRefreshPlaylists: () => void;
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (playlist: Playlist) => void;
  auth: AuthSession | null;
  isCheckingAuth: boolean;
  onRefreshAuth: () => void;
  onOpenSettings?: () => void;
  playlistHistory: Record<string, number>;
  pinnedPlaylistIds: string[];
  setPinnedPlaylistIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Sidebar = React.memo(function Sidebar({
  activeTab,
  setActiveTab,
  playlists,
  isLoadingPlaylists,
  onRefreshPlaylists,
  selectedPlaylist,
  onSelectPlaylist,
  auth,
  isCheckingAuth,
  onRefreshAuth,
  onOpenSettings,
  playlistHistory,
  pinnedPlaylistIds,
  setPinnedPlaylistIds,
}: SidebarProps) {
  // Drag and drop reordering para playlists fixadas
  const [activeDragPinnedId, setActiveDragPinnedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragSourceIdRef = useRef<string | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  dragOverIndexRef.current = dragOverIndex;

  function togglePinPlaylist(playlistId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setPinnedPlaylistIds((prev) => {
      let updated: string[];
      if (prev.includes(playlistId)) {
        updated = prev.filter((id) => id !== playlistId);
      } else {
        updated = [...prev, playlistId];
      }
      try {
        localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  function movePinnedPlaylist(playlistId: string, direction: "up" | "down", e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setPinnedPlaylistIds((prev) => {
      const idx = prev.indexOf(playlistId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      try {
        localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function handleGripPointerDown(e: React.PointerEvent, id: string, index: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragSourceIdRef.current = id;
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = false;
    dragOverIndexRef.current = index;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setActiveDragPinnedId(id);
    setDragOverIndex(index);
  }

  function handleGripPointerMove(e: React.PointerEvent) {
    if (!dragSourceIdRef.current) return;

    if (Math.abs(e.clientY - dragStartYRef.current) > 3) {
      isDraggingRef.current = true;
    }

    if (!isDraggingRef.current) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pinnedRow = el?.closest("[data-pinned-index]");
    if (pinnedRow) {
      const idxAttr = pinnedRow.getAttribute("data-pinned-index");
      if (idxAttr !== null) {
        const targetIdx = parseInt(idxAttr, 10);
        if (!isNaN(targetIdx) && targetIdx !== dragOverIndexRef.current) {
          dragOverIndexRef.current = targetIdx;
          setDragOverIndex(targetIdx);
        }
      }
    }
  }

  function handleGripPointerUp(e: React.PointerEvent) {
    const sourceId = dragSourceIdRef.current;
    const targetIdx = dragOverIndexRef.current;
    const wasDragging = isDraggingRef.current;

    dragSourceIdRef.current = null;
    isDraggingRef.current = false;
    dragOverIndexRef.current = null;
    setActiveDragPinnedId(null);
    setDragOverIndex(null);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (wasDragging && sourceId && targetIdx !== null && targetIdx >= 0) {
      setPinnedPlaylistIds((prev) => {
        const sourceIdx = prev.indexOf(sourceId);
        if (sourceIdx === -1 || sourceIdx === targetIdx) return prev;
        const next = [...prev];
        const [item] = next.splice(sourceIdx, 1);
        next.splice(targetIdx, 0, item);
        try {
          localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }

  const pinnedPlaylists = useMemo(() => {
    const map = new Map(playlists.map((p) => [p.id, p]));
    const list: Playlist[] = [];
    for (const id of pinnedPlaylistIds) {
      const pl = map.get(id);
      if (pl) list.push(pl);
    }
    return list;
  }, [playlists, pinnedPlaylistIds]);

  const unpinnedPlaylists = useMemo(() => {
    const pinnedSet = new Set(pinnedPlaylistIds);
    const list = playlists.filter((p) => !pinnedSet.has(p.id));
    return list.sort((a, b) => {
      const timeA = playlistHistory[a.id] || 0;
      const timeB = playlistHistory[b.id] || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return 0;
    });
  }, [playlists, pinnedPlaylistIds, playlistHistory]);

  const sortedPlaylists = useMemo(() => {
    return [...pinnedPlaylists, ...unpinnedPlaylists];
  }, [pinnedPlaylists, unpinnedPlaylists]);

  return (
    <aside className="w-64 bg-[#0f1118]/90 backdrop-blur-md border-r border-[#1f232e] p-4 flex flex-col justify-between shrink-0 h-full z-10">
      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        {/* Navegação Principal */}
        <nav className="space-y-1">
          <button
            onClick={() => {
              setActiveTab("library");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              activeTab === "library"
                ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Library className="w-4 h-4" />
            Biblioteca
          </button>

          <button
            onClick={() => {
              setActiveTab("search");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "search"
                ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>

          <button
            onClick={() => {
              setActiveTab("stats");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "stats"
                ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Estatísticas
          </button>
        </nav>

        {/* Seção de Playlists com Reordenação */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-[#1f232e]">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-[#555a6d] uppercase tracking-wider">
                Suas Playlists
              </p>
              {pinnedPlaylists.length > 0 && (
                <span className="text-[10px] bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] px-1.5 py-0.2 rounded-full font-mono">
                  {pinnedPlaylists.length} fixada{pinnedPlaylists.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={onRefreshPlaylists}
              title="Recarregar playlists"
              className="text-[#555a6d] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPlaylists ? "animate-spin text-[var(--accent)]" : ""}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {isLoadingPlaylists && playlists.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#555a6d]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                Carregando playlists...
              </div>
            ) : sortedPlaylists.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[#555a6d]">
                Nenhuma playlist encontrada.
              </div>
            ) : (
              <>
                {/* 1. PLAYLISTS FIXADAS */}
                {pinnedPlaylists.map((pl, idx) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  const isLiked = pl.id === "VLLM";
                  const isBeingDragged = activeDragPinnedId === pl.id;
                  const isTargetOfDrop = dragOverIndex === idx && activeDragPinnedId !== null && !isBeingDragged;

                  return (
                    <div
                      key={`pinned-${pl.id}`}
                      data-pinned-index={idx}
                      className={`group relative px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-1.5 select-none ${
                        isSelected
                          ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] font-semibold"
                          : "text-[#9da3b7] hover:bg-[#1a1d28] hover:text-white"
                      } ${isBeingDragged ? "opacity-40 scale-[0.98] ring-1 ring-[var(--accent)] bg-[#221722]" : ""} ${
                        isTargetOfDrop ? "border-t-2 border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[0_-2px_8px_var(--accent-glow)]" : ""
                      }`}
                    >
                      {/* Grip Handle para Arrastar */}
                      <div
                        onPointerDown={(e) => handleGripPointerDown(e, pl.id, idx)}
                        onPointerMove={handleGripPointerMove}
                        onPointerUp={handleGripPointerUp}
                        title="Clique e arraste para reordenar"
                        className="p-1 -ml-1 rounded hover:bg-[#252b3b] text-[#555a6d] hover:text-white cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none flex items-center justify-center"
                      >
                        <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
                      </div>

                      {/* Conteúdo da Playlist */}
                      <div
                        onClick={() => onSelectPlaylist(pl)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        {isLiked ? (
                          <Flame className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 pointer-events-none" />
                        ) : (
                          <ListMusic className="w-3.5 h-3.5 text-[#5e6479] shrink-0 pointer-events-none" />
                        )}
                        <span className="truncate flex-1 pointer-events-none">{pl.title}</span>
                      </div>

                      {/* Ações da Playlist Fixada */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <div className="flex items-center gap-0.5">
                          {idx > 0 && (
                            <button
                              onClick={(e) => movePinnedPlaylist(pl.id, "up", e)}
                              title="Mover para cima"
                              className="p-0.5 rounded text-[#71778c] hover:text-white hover:bg-[#282d3d] transition-colors cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < pinnedPlaylists.length - 1 && (
                            <button
                              onClick={(e) => movePinnedPlaylist(pl.id, "down", e)}
                              title="Mover para baixo"
                              className="p-0.5 rounded text-[#71778c] hover:text-white hover:bg-[#282d3d] transition-colors cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={(e) => togglePinPlaylist(pl.id, e)}
                          title="Desafixar playlist"
                          className="p-1 rounded text-[var(--accent-text)] hover:text-white hover:bg-[var(--accent-subtle)] transition-colors cursor-pointer"
                        >
                          <Pin className="w-3 h-3 fill-current rotate-45" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Divisor Visual */}
                {pinnedPlaylists.length > 0 && unpinnedPlaylists.length > 0 && (
                  <div className="pt-2 pb-1 px-2 flex items-center justify-between border-t border-[#1a1d27] my-1">
                    <span className="text-[10px] font-semibold text-[#484e62] uppercase tracking-wider">
                      Ouvidas Recentes
                    </span>
                  </div>
                )}

                {/* 2. PLAYLISTS NÃO FIXADAS */}
                {unpinnedPlaylists.map((pl) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  const isLiked = pl.id === "VLLM";

                  return (
                    <div
                      key={`unpinned-${pl.id}`}
                      onClick={() => onSelectPlaylist(pl)}
                      className={`group px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                        isSelected
                          ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] font-semibold"
                          : "text-[#9da3b7] hover:bg-[#1a1d28] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isLiked ? (
                          <Flame className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        ) : (
                          <ListMusic className="w-3.5 h-3.5 text-[#5e6479] shrink-0" />
                        )}
                        <span className="truncate flex-1">{pl.title}</span>
                      </div>

                      <div className="flex items-center shrink-0">
                        <button
                          onClick={(e) => togglePinPlaylist(pl.id, e)}
                          title="Fixar playlist no topo"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#555a6d] hover:text-[var(--accent-text)] hover:bg-[#232838] transition-all cursor-pointer"
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

      {/* Card da Conta / Perfil no Rodapé */}
      <div className="pt-3 border-t border-[#1f232e]">
        <div className="bg-[#171a24] p-2.5 rounded-xl border border-[#232836] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center font-bold text-xs text-white shrink-0">
              P
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {auth?.is_authenticated ? auth.browser : "Modo Visitante"}
              </p>
              <p className="text-[10px] text-emerald-400 font-mono truncate">
                {auth?.is_authenticated ? "Premium Ativo" : "Sem login"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Configurações do TetPlayer [Ctrl+,]"
                aria-label="Abrir configurações"
                className="p-1 rounded-lg hover:bg-[#232836] text-[#8c91a4] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshAuth}
              disabled={isCheckingAuth}
              title="Recarregar sessão de cookies"
              aria-label="Recarregar sessão de cookies"
              className="p-1 rounded-lg hover:bg-[#232836] text-[#8c91a4] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAuth ? "animate-spin text-[var(--accent)]" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});
