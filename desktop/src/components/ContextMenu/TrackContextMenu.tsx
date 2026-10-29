import { useState, useEffect, useRef } from "react";
import {
  ListPlus,
  ListMusic,
  Radio,
  Link2,
  Copy,
  Search,
  Check,
  Disc3,
  FolderPlus,
  FolderMinus,
} from "lucide-react";
import { Track } from "../../types";
import { usePlayer } from "../../context/PlayerContext";
import { upgradeArtworkQuality } from "../../utils/artwork";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface TrackContextMenuProps {
  track: Track | null;
  position: ContextMenuPosition | null;
  contextPlaylistId?: string | null;
  onClose: () => void;
}

export function TrackContextMenu({
  track,
  position,
  contextPlaylistId,
  onClose,
}: TrackContextMenuProps) {
  const { handlePlayNext, handleAddToQueue, handleStartRadio, searchArtist } =
    usePlayer();
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

  if (!track || !position) return null;

  // Ajuste inteligente para evitar que o menu transborde a tela
  const isCustomPlaylist = !!contextPlaylistId && contextPlaylistId !== "VLLM";
  const menuWidth = 240;
  const menuHeight = isCustomPlaylist ? 350 : 310;
  const safeX = Math.min(position.x, window.innerWidth - menuWidth - 16);
  const safeY = Math.min(position.y, window.innerHeight - menuHeight - 16);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 900);
  }

  function onPlayNext() {
    if (!track) return;
    handlePlayNext(track);
    showToast("Adicionada para tocar a seguir!");
  }

  function onAddToQueue() {
    if (!track) return;
    handleAddToQueue(track);
    showToast("Adicionada ao fim da fila!");
  }

  function onAddToPlaylist() {
    if (!track) return;
    window.dispatchEvent(
      new CustomEvent("tetplayer:open-add-to-playlist", {
        detail: { track },
      })
    );
    onClose();
  }

  function onRemoveFromPlaylist() {
    if (!track || !contextPlaylistId) return;
    window.dispatchEvent(
      new CustomEvent("tetplayer:remove-from-playlist", {
        detail: { track, playlistId: contextPlaylistId },
      })
    );
    onClose();
  }

  function onStartRadio() {
    if (!track) return;
    handleStartRadio(track);
    onClose();
  }

  async function onCopyLink() {
    if (!track) return;
    const url = `https://www.youtube.com/watch?v=${track.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link do YouTube copiado!");
    } catch {
      showToast("Erro ao copiar link");
    }
  }

  async function onCopyInfo() {
    if (!track) return;
    const text = `${track.title} - ${track.artist}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Título e artista copiados!");
    } catch {
      showToast("Erro ao copiar informações");
    }
  }

  function onSearchMoreArtist() {
    if (!track) return;
    searchArtist(track.artist);
    onClose();
  }

  function onOpenAlbum() {
    if (!track) return;
    window.dispatchEvent(
      new CustomEvent("tetplayer:open-album", {
        detail: {
          albumId: track.album_id,
          albumTitle: track.album,
          artist: track.artist,
          artworkUrl: track.artwork_url,
        },
      })
    );
    onClose();
  }

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Ações para ${track.title}`}
        style={{
          top: `${Math.max(10, safeY)}px`,
          left: `${Math.max(10, safeX)}px`,
        }}
        className="fixed z-50 w-60 bg-[#12141f]/95 backdrop-blur-2xl border border-[#272c3f] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Cabeçalho do Menu com Prévia da Faixa */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-[#212638] mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#181b28] overflow-hidden shrink-0 border border-[#2c3248]">
            <img
              src={upgradeArtworkQuality(track.artwork_url, track.id)}
              alt={track.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-[#8c91a4] truncate">{track.artist}</p>
          </div>
        </div>

        {/* Opção 1: Tocar a Seguir */}
        <button
          type="button"
          role="menuitem"
          onClick={onPlayNext}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[var(--accent-subtle)] hover:border-[var(--accent-border)] border border-transparent transition-all cursor-pointer group text-left"
        >
          <ListPlus className="w-4 h-4 text-[var(--accent-text)] shrink-0 group-hover:scale-110 transition-transform" />
          <span>Tocar a Seguir</span>
        </button>

        {/* Opção 2: Adicionar ao Fim da Fila */}
        <button
          type="button"
          role="menuitem"
          onClick={onAddToQueue}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <ListMusic className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0 group-hover:scale-110 transition-transform" />
          <span>Adicionar ao Fim da Fila</span>
        </button>

        {/* Opção 3: Iniciar Rádio a partir desta música */}
        <button
          type="button"
          role="menuitem"
          onClick={onStartRadio}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Radio className="w-4 h-4 text-[#8c91a4] group-hover:text-[var(--accent-text)] shrink-0 group-hover:scale-110 transition-transform" />
          <span>Iniciar Rádio desta música</span>
        </button>

        {/* Opção 3.5: Ver Álbum Completo */}
        {(track.album || track.album_id) && (
          <button
            type="button"
            role="menuitem"
            onClick={onOpenAlbum}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[var(--accent-subtle)] hover:border-[var(--accent-border)] border border-transparent transition-all cursor-pointer group text-left"
          >
            <Disc3 className="w-4 h-4 text-[var(--accent-text)] shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">Ver Álbum {track.album ? `(${track.album})` : ""}</span>
          </button>
        )}

        {/* Opção 3.6: Adicionar à Playlist */}
        <button
          type="button"
          role="menuitem"
          onClick={onAddToPlaylist}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[var(--accent-subtle)] hover:border-[var(--accent-border)] border border-transparent transition-all cursor-pointer group text-left"
        >
          <FolderPlus className="w-4 h-4 text-[var(--accent-text)] shrink-0 group-hover:scale-110 transition-transform" />
          <span>Adicionar à Playlist...</span>
        </button>

        {/* Opção 3.7: Remover desta Playlist (se estiver dentro de uma playlist pessoal) */}
        {isCustomPlaylist && (
          <button
            type="button"
            role="menuitem"
            onClick={onRemoveFromPlaylist}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent transition-all cursor-pointer group text-left"
          >
            <FolderMinus className="w-4 h-4 text-rose-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span>Remover desta playlist</span>
          </button>
        )}

        <div className="h-px bg-[#212638] my-1" />

        {/* Opção 4: Copiar Link do YouTube */}
        <button
          type="button"
          role="menuitem"
          onClick={onCopyLink}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Link2 className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span>Copiar Link do YouTube</span>
        </button>

        {/* Opção 5: Copiar Nome / Artista */}
        <button
          type="button"
          role="menuitem"
          onClick={onCopyInfo}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Copy className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span>Copiar Nome e Artista</span>
        </button>

        {/* Opção 6: Buscar mais músicas deste artista */}
        <button
          type="button"
          role="menuitem"
          onClick={onSearchMoreArtist}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#c4c8d8] hover:text-white hover:bg-[#1a1e2e] transition-all cursor-pointer group text-left"
        >
          <Search className="w-4 h-4 text-[#8c91a4] group-hover:text-white shrink-0" />
          <span className="truncate">Buscar mais de {track.artist}</span>
        </button>
      </div>

      {/* Toast Feedback Temporário */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-2xl shadow-[var(--accent-glow)] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
