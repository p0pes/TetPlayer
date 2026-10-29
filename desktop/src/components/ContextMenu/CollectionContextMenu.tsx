import { useState, useEffect, useRef } from "react";
import {
  Play,
  Shuffle,
  ListPlus,
  Pin,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Disc3,
  ListMusic,
  Flame,
} from "lucide-react";
import { Playlist, Album } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

export type CollectionContextItem =
  | { kind: "playlist"; playlist: Playlist; isPinned: boolean }
  | { kind: "album"; album: Album; isPinned: boolean };

export interface CollectionContextMenuProps {
  item: CollectionContextItem | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onPlay: (item: CollectionContextItem, shuffle?: boolean) => void;
  onAddToQueue: (item: CollectionContextItem) => void;
  onTogglePin: (item: CollectionContextItem) => void;
  onAddAlbumToPlaylist?: (album: Album) => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onDeletePlaylist?: (playlist: Playlist) => void;
}

export function triggerCollectionContextMenu(
  e: React.MouseEvent,
  item: CollectionContextItem
) {
  e.preventDefault();
  e.stopPropagation();
  window.dispatchEvent(
    new CustomEvent("tetplayer:collection-context-menu", {
      detail: {
        x: e.clientX,
        y: e.clientY,
        item,
      },
    })
  );
}

export function CollectionContextMenu({
  item,
  position,
  onClose,
  onPlay,
  onAddToQueue,
  onTogglePin,
  onAddAlbumToPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
}: CollectionContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fecha o menu ao clicar fora ou pressionar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  if (!item || !position) return null;

  const isPlaylist = item.kind === "playlist";
  const playlist = isPlaylist ? item.playlist : null;
  const album = !isPlaylist ? item.album : null;
  const isVllm = playlist?.id === "VLLM";

  // Dimensões dinâmicas para clamp na viewport
  const menuWidth = 240;
  const menuHeight = isPlaylist ? (isVllm ? 240 : 310) : 280;
  const safeX = Math.min(position.x, window.innerWidth - menuWidth - 16);
  const safeY = Math.min(position.y, window.innerHeight - menuHeight - 16);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 900);
  }

  function handlePlayAction(shuffle = false) {
    onPlay(item!, shuffle);
    onClose();
  }

  function handleQueueAction() {
    onAddToQueue(item!);
    showToast(isPlaylist ? "Playlist adicionada à fila!" : "Álbum adicionado à fila!");
  }

  function handlePinAction() {
    onTogglePin(item!);
    showToast(item!.isPinned ? "Desafixado do topo" : "Fixado no topo!");
  }

  function handleAddAlbumToPlaylistAction() {
    if (album && onAddAlbumToPlaylist) {
      onAddAlbumToPlaylist(album);
    }
    onClose();
  }

  function handleEditAction() {
    if (playlist && onEditPlaylist) {
      onEditPlaylist(playlist);
    }
    onClose();
  }

  function handleDeleteAction() {
    if (playlist && onDeletePlaylist) {
      onDeletePlaylist(playlist);
    }
    onClose();
  }

  function handleCopyLink() {
    const url = isPlaylist
      ? `https://music.youtube.com/playlist?list=${playlist?.id}`
      : `https://music.youtube.com/browse/${album?.id}`;

    navigator.clipboard?.writeText(url).then(() => {
      showToast("Link copiado!");
    });
  }

  const title = isPlaylist ? playlist?.title || "Playlist" : album?.title || "Álbum";
  const subtitle = isPlaylist
    ? playlist?.subtitle || playlist?.track_count || "Playlist"
    : album?.artist || "Álbum";
  const artworkUrl = isPlaylist ? playlist?.artwork_url : album?.artwork_url;

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Ações para ${title}`}
        style={{
          top: `${Math.max(10, safeY)}px`,
          left: `${Math.max(10, safeX)}px`,
        }}
        className="fixed z-50 w-60 bg-[#12141f]/95 backdrop-blur-2xl border border-[#272c3f] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Cabeçalho do Menu com Miniatura e Título */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-[#212638] mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#181b28] overflow-hidden shrink-0 border border-[#2c3248] flex items-center justify-center">
            {artworkUrl ? (
              <img
                src={upgradeArtworkQuality(artworkUrl, undefined, "thumb")}
                alt={title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : isVllm ? (
              <Flame className="w-4 h-4 text-orange-400" />
            ) : isPlaylist ? (
              <ListMusic className="w-4 h-4 text-[#8c91a4]" />
            ) : (
              <Disc3 className="w-4 h-4 text-[var(--accent-text)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{title}</p>
            <p className="text-[11px] text-[#8c91a4] truncate flex items-center gap-1">
              <span className="uppercase text-[9px] font-bold text-[var(--accent-text)]">
                {isPlaylist ? "Playlist" : "Álbum"}
              </span>
              <span>•</span>
              <span className="truncate">{subtitle}</span>
            </p>
          </div>
        </div>

        {/* Opção 1: Reproduzir */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlayAction(false)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[var(--accent-subtle)] hover:border-[var(--accent-border)] border border-transparent transition-all cursor-pointer group text-left"
        >
          <Play className="w-4 h-4 text-[var(--accent-text)] shrink-0 fill-current ml-0.5" />
          <span>{isPlaylist ? "Tocar Playlist" : "Tocar Álbum"}</span>
        </button>

        {/* Opção 2: Tocar Aleatório */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handlePlayAction(true)}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Shuffle className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span>Tocar Aleatório</span>
        </button>

        {/* Opção 3: Adicionar à Fila */}
        <button
          type="button"
          role="menuitem"
          onClick={handleQueueAction}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <ListPlus className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span>Adicionar à Fila</span>
        </button>

        {/* Opção 4: Fixar / Desafixar */}
        <button
          type="button"
          role="menuitem"
          onClick={handlePinAction}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Pin className={`w-4 h-4 shrink-0 ${item.isPinned ? "fill-current text-[var(--accent-text)]" : "text-[#8c91a4] group-hover:text-white"}`} />
          <span>{item.isPinned ? "Desafixar do Topo" : "Fixar no Topo"}</span>
        </button>

        {/* Opção 5 (Álbuns): Adicionar Álbum à Playlist */}
        {!isPlaylist && (
          <button
            type="button"
            role="menuitem"
            onClick={handleAddAlbumToPlaylistAction}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[var(--accent-subtle)] hover:border-[var(--accent-border)] border border-transparent transition-all cursor-pointer group text-left"
          >
            <FolderPlus className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
            <span>Adicionar Álbum à Playlist...</span>
          </button>
        )}

        {/* Opção 6 (Playlists, exceto VLLM): Editar Metadados */}
        {isPlaylist && !isVllm && (
          <button
            type="button"
            role="menuitem"
            onClick={handleEditAction}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
          >
            <Pencil className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
            <span>Editar Playlist</span>
          </button>
        )}

        {/* Divisor antes de Ações Externas / Destrutivas */}
        <div className="h-px bg-[#212638] my-1" />

        {/* Opção 7: Copiar Link */}
        <button
          type="button"
          role="menuitem"
          onClick={handleCopyLink}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Copy className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span>Copiar Link</span>
        </button>

        {/* Opção 8 (Playlists, exceto VLLM): Excluir Playlist */}
        {isPlaylist && !isVllm && (
          <button
            type="button"
            role="menuitem"
            onClick={handleDeleteAction}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 transition-all cursor-pointer group text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-rose-200 shrink-0" />
            <span>Excluir Playlist</span>
          </button>
        )}
      </div>

      {/* Toast Feedback Temporário */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12141f] border border-[var(--accent)] text-white text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
