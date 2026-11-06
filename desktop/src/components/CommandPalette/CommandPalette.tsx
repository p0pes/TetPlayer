import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  ListMusic,
  Disc3,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Minimize2,
  Mic2,
  Settings,
  Plus,
  Sparkles,
  CornerDownLeft,
  X,
} from "lucide-react";
import { Playlist, Album } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  albums: Album[];
  isPlaying: boolean;
  isShuffle: boolean;
  onSelectPlaylist: (pl: Playlist) => void;
  onPlayPlaylistQuick: (pl: Playlist, e: React.MouseEvent) => void;
  onSelectAlbum: (al: Album) => void;
  onPlayAlbumQuick: (al: Album, e: React.MouseEvent) => void;
  onSearchCatalog: (query: string) => void;
  onTogglePlayPause: () => void;
  onNextTrack: () => void;
  onToggleShuffle: () => void;
  onToggleMiniPlayer: () => void;
  onOpenQueue: () => void;
  onOpenLyrics: () => void;
  onCreatePlaylist: () => void;
  onOpenSettings: () => void;
}

type CommandEntry =
  | {
      id: string;
      kind: "search-ytm";
      title: string;
      subtitle: string;
      query: string;
    }
  | {
      id: string;
      kind: "playlist";
      title: string;
      subtitle: string;
      artworkUrl?: string;
      playlist: Playlist;
    }
  | {
      id: string;
      kind: "album";
      title: string;
      subtitle: string;
      artworkUrl?: string;
      album: Album;
    }
  | {
      id: string;
      kind: "action";
      title: string;
      subtitle: string;
      shortcut?: string;
      icon: React.ReactNode;
      action: () => void;
    };

export const CommandPalette = React.memo(function CommandPalette({
  isOpen,
  onClose,
  playlists,
  albums,
  isPlaying,
  isShuffle,
  onSelectPlaylist,
  onPlayPlaylistQuick,
  onSelectAlbum,
  onPlayAlbumQuick,
  onSearchCatalog,
  onTogglePlayPause,
  onNextTrack,
  onToggleShuffle,
  onToggleMiniPlayer,
  onOpenQueue,
  onOpenLyrics,
  onCreatePlaylist,
  onOpenSettings,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const entries = useMemo<CommandEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const list: CommandEntry[] = [];

    if (q.length > 0) {
      list.push({
        id: `ytm-search-${q}`,
        kind: "search-ytm",
        title: `Buscar "${query.trim()}" no YouTube Music`,
        subtitle: "Pesquisar músicas, artistas e álbuns no catálogo global",
        query: query.trim(),
      });
    }

    const matchedPlaylists = (
      q
        ? playlists.filter(
            (pl) =>
              pl.title.toLowerCase().includes(q) ||
              (pl.subtitle && pl.subtitle.toLowerCase().includes(q))
          )
        : playlists.slice(0, 5)
    ).slice(0, 6);

    for (const pl of matchedPlaylists) {
      list.push({
        id: `pl-${pl.id}`,
        kind: "playlist",
        title: pl.title,
        subtitle: pl.track_count || pl.subtitle || "Playlist",
        artworkUrl: pl.artwork_url,
        playlist: pl,
      });
    }

    const matchedAlbums = (
      q
        ? albums.filter(
            (al) =>
              al.title.toLowerCase().includes(q) ||
              (al.artist && al.artist.toLowerCase().includes(q))
          )
        : albums.slice(0, 4)
    ).slice(0, 6);

    for (const al of matchedAlbums) {
      list.push({
        id: `al-${al.id}`,
        kind: "album",
        title: al.title,
        subtitle: al.artist ? `Álbum • ${al.artist}` : "Álbum",
        artworkUrl: al.artwork_url,
        album: al,
      });
    }

    const quickActions: CommandEntry[] = [
      {
        id: "act-play-pause",
        kind: "action",
        title: isPlaying ? "Pausar Reprodução" : "Retomar Reprodução",
        subtitle: "Controle rápido do player",
        shortcut: "Espaço",
        icon: isPlaying ? (
          <Pause className="w-4 h-4 text-[var(--accent-text)]" />
        ) : (
          <Play className="w-4 h-4 text-[var(--accent-text)]" />
        ),
        action: onTogglePlayPause,
      },
      {
        id: "act-next",
        kind: "action",
        title: "Próxima Faixa",
        subtitle: "Avançar na fila de reprodução",
        shortcut: "N",
        icon: <SkipForward className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onNextTrack,
      },
      {
        id: "act-shuffle",
        kind: "action",
        title: isShuffle ? "Desativar Modo Aleatório" : "Ativar Modo Aleatório",
        subtitle: "Embaralhar fila atual",
        shortcut: "S",
        icon: <Shuffle className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onToggleShuffle,
      },
      {
        id: "act-queue",
        kind: "action",
        title: "Abrir Fila de Reprodução",
        subtitle: "Ver próximas faixas e histórico recente",
        shortcut: "Q",
        icon: <ListMusic className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onOpenQueue,
      },
      {
        id: "act-lyrics",
        kind: "action",
        title: "Abrir Letras Sincronizadas",
        subtitle: "Acompanhar letra da música atual",
        shortcut: "L",
        icon: <Mic2 className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onOpenLyrics,
      },
      {
        id: "act-miniplayer",
        kind: "action",
        title: "Alternar Mini Player Flutuante",
        subtitle: "Modo compacto Always-on-Top",
        shortcut: "M",
        icon: <Minimize2 className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onToggleMiniPlayer,
      },
      {
        id: "act-new-playlist",
        kind: "action",
        title: "Criar Nova Playlist",
        subtitle: "Adicionar nova coleção à sua biblioteca",
        icon: <Plus className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onCreatePlaylist,
      },
      {
        id: "act-settings",
        kind: "action",
        title: "Abrir Configurações & Equalizador",
        subtitle: "Ajustes de áudio, aparência Aurora e conta",
        icon: <Settings className="w-4 h-4 text-[var(--accent-text)]" />,
        action: onOpenSettings,
      },
    ];

    const matchedActions = q
      ? quickActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q)
        )
      : quickActions;

    list.push(...matchedActions);
    return list;
  }, [
    query,
    playlists,
    albums,
    isPlaying,
    isShuffle,
    onTogglePlayPause,
    onNextTrack,
    onToggleShuffle,
    onOpenQueue,
    onOpenLyrics,
    onToggleMiniPlayer,
    onCreatePlaylist,
    onOpenSettings,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeEntry = (entry: CommandEntry) => {
    onClose();
    if (entry.kind === "search-ytm") {
      onSearchCatalog(entry.query);
    } else if (entry.kind === "playlist") {
      onSelectPlaylist(entry.playlist);
    } else if (entry.kind === "album") {
      onSelectAlbum(entry.album);
    } else if (entry.kind === "action") {
      entry.action();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (entries.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % entries.length;
        const el = listRef.current?.querySelector(`[data-cmd-idx="${next}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + entries.length) % entries.length;
        const el = listRef.current?.querySelector(`[data-cmd-idx="${next}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = entries[selectedIndex] || entries[0];
      if (target) {
        executeEntry(target);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de Comandos Rápidos"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#111420]/95 backdrop-blur-2xl border border-[#272c3f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[72vh]"
      >
        {/* Barra de Pesquisa Spotlight */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1f2436]">
          <Search className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir para playlist, álbum, buscar no YouTube Music ou executar ação..."
            aria-label="Digite um comando ou busca"
            className="flex-1 bg-transparent text-sm text-white placeholder-[#63697e] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="p-1 rounded-lg text-[#63697e] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#71778c] bg-[#181c2b] border border-[#272c3f] rounded-md">
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados e Comandos */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
        >
          {entries.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#71778c]">
              Nenhum comando ou coleção encontrada.
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={entry.id}
                  data-cmd-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => executeEntry(entry)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-white"
                      : "border border-transparent text-[#c4c8d8] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {entry.kind === "playlist" || entry.kind === "album" ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#181b28] border border-white/10 shrink-0 flex items-center justify-center">
                        {entry.artworkUrl ? (
                          <img
                            src={upgradeArtworkQuality(entry.artworkUrl, undefined, "thumb")}
                            alt={entry.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : entry.kind === "album" ? (
                          <Disc3 className="w-4 h-4 text-[var(--accent-text)]" />
                        ) : (
                          <ListMusic className="w-4 h-4 text-[#787f98]" />
                        )}
                      </div>
                    ) : entry.kind === "search-ytm" ? (
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/20 border border-[var(--accent-border)] shrink-0 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-[#171a28] border border-[#252a3d] shrink-0 flex items-center justify-center">
                        {entry.icon}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-[#848a9e] truncate">
                        {entry.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(entry.kind === "playlist" || entry.kind === "album") && (
                      <button
                        type="button"
                        title={`Tocar ${entry.title} agora`}
                        aria-label={`Tocar ${entry.title} agora`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          if (entry.kind === "playlist") {
                            onPlayPlaylistQuick(entry.playlist, e);
                          } else {
                            onPlayAlbumQuick(entry.album, e);
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </button>
                    )}

                    {entry.kind === "action" && entry.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#8c91a4] bg-[#161926] border border-[#272c3f] rounded">
                        {entry.shortcut}
                      </kbd>
                    )}

                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé de Dicas */}
        <div className="px-4 py-2 bg-[#0d0f18] border-t border-[#1f2436] flex items-center justify-between text-[11px] text-[#63697e]">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-[#8c91a4]">↑↓</strong> navegar
            </span>
            <span>
              <strong className="text-[#8c91a4]">Enter</strong> abrir / executar
            </span>
          </div>
          <span className="font-mono text-[10px]">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
});

