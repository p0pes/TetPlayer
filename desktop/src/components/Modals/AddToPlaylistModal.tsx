import React, { useState, useEffect, useMemo, useRef } from "react";
import { ListPlus, X, Search, Loader2, Music, Plus, Check, Disc3 } from "lucide-react";
import { Playlist, Track } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { useModalAnimation } from "../../hooks/useModalAnimation";
import { humanizeApiError } from "../../utils/errors";

interface AddToPlaylistModalProps {
  isOpen: boolean;
  track?: Track | null;
  tracks?: Track[] | null;
  sourceAlbumTitle?: string;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlist: Playlist, track: Track) => Promise<void>;
  onCreateNewPlaylist: (suggestedTitle?: string, albumTracks?: Track[]) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  track,
  tracks,
  sourceAlbumTitle,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreateNewPlaylist,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addedToId, setAddedToId] = useState<string | null>(null);
  const [addProgress, setAddProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { shouldRender, requestClose, backdropClassName, modalClassName } =
    useModalAnimation(isOpen, onClose, 140);

  const targetTracks = useMemo(() => {
    if (tracks && tracks.length > 0) return tracks;
    if (track) return [track];
    return [];
  }, [tracks, track]);

  const isMultiple = targetTracks.length > 1;

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setAddingToId(null);
      setAddedToId(null);
      setAddProgress(null);
      setError(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !addingToId) {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, addingToId, requestClose]);

  // Filtra playlists excluindo VLLM e aplicando busca
  const filteredPlaylists = useMemo(() => {
    const available = playlists.filter((p) => p.id !== "VLLM");
    if (!searchQuery.trim()) return available;
    const q = searchQuery.trim().toLowerCase();
    return available.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  if (!shouldRender || targetTracks.length === 0) return null;

  const handleSelectPlaylist = async (playlist: Playlist) => {
    if (addingToId) return;
    try {
      setAddingToId(playlist.id);
      setError(null);
      if (isMultiple) {
        for (let i = 0; i < targetTracks.length; i++) {
          setAddProgress({ current: i + 1, total: targetTracks.length });
          await onAddToPlaylist(playlist, targetTracks[i]);
        }
      } else {
        await onAddToPlaylist(playlist, targetTracks[0]);
      }
      setAddedToId(playlist.id);
      setAddProgress(null);
      setTimeout(() => {
        requestClose();
      }, 700);
    } catch (err) {
      setError(humanizeApiError(err, "Falha ao adicionar música(s) à playlist."));
      setAddingToId(null);
      setAddProgress(null);
    }
  };

  const previewTrack = targetTracks[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !addingToId) requestClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none cursor-pointer ${backdropClassName}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md bg-[#12141f]/95 border border-[#272c3f] rounded-2xl p-6 shadow-2xl relative cursor-default space-y-4 flex flex-col max-h-[85vh] ${modalClassName}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212638] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)]">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="add-to-playlist-title" className="text-base font-bold text-white">
                {isMultiple ? "Adicionar Álbum à Playlist" : "Adicionar à Playlist"}
              </h2>
              <p className="text-xs text-[#8c91a4]">
                {isMultiple
                  ? `Importar ${targetTracks.length} faixas para o YouTube Music`
                  : "Escolha o destino no YouTube Music"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={!!addingToId}
            className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prévia da Música ou do Álbum Selecionado */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#181c28] border border-[#272d40] shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#212638] overflow-hidden shrink-0 flex items-center justify-center">
            {previewTrack.artwork_url || previewTrack.id ? (
              <img
                src={upgradeArtworkQuality(previewTrack.artwork_url, previewTrack.id, "thumb")}
                alt={isMultiple ? sourceAlbumTitle || previewTrack.title : previewTrack.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : isMultiple ? (
              <Disc3 className="w-4 h-4 text-[var(--accent-text)]" />
            ) : (
              <Music className="w-4 h-4 text-[#6c7287]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {isMultiple ? sourceAlbumTitle || "Álbum Completo" : previewTrack.title}
            </p>
            <p className="text-[11px] text-[#8c91a4] truncate">
              {isMultiple
                ? `${targetTracks.length} faixas • ${previewTrack.artist || "Vários Artistas"}`
                : previewTrack.artist}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs shrink-0 animate-view-fade">
            {error}
          </div>
        )}

        {/* Barra de Busca e Botão Nova Playlist */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6c7287] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar playlist..."
              className="w-full bg-[#181c28] text-xs text-white placeholder-[#6c7287] pl-8 pr-3 py-2 rounded-xl border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateNewPlaylist(sourceAlbumTitle, isMultiple ? targetTracks : undefined);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] hover:opacity-90 text-xs font-semibold shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMultiple ? "Criar do Álbum" : "Criar Nova"}</span>
          </button>
        </div>

        {/* Lista de Playlists */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar min-h-[160px]">
          {filteredPlaylists.length === 0 ? (
            <div className="py-8 text-center text-[#71778c] text-xs">
              {searchQuery ? "Nenhuma playlist encontrada." : "Você ainda não possui playlists criadas."}
            </div>
          ) : (
            filteredPlaylists.map((pl) => {
              const isSelected = addingToId === pl.id;
              const isDone = addedToId === pl.id;

              return (
                <button
                  key={pl.id}
                  type="button"
                  disabled={!!addingToId}
                  onClick={() => handleSelectPlaylist(pl)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isDone
                      ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-300"
                      : isSelected
                      ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white"
                      : "bg-[#141724]/70 border-[#202538] hover:border-[#323952] hover:bg-[#1a1f30] text-[#c4c8d8] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[#212638] overflow-hidden shrink-0 flex items-center justify-center">
                      {pl.artwork_url ? (
                        <img
                          src={upgradeArtworkQuality(pl.artwork_url, undefined, "thumb")}
                          alt={pl.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-[#6c7287]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{pl.title}</p>
                      {pl.track_count && (
                        <p className="text-[10px] text-[#71778c] truncate">
                          {pl.track_count}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isDone ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : isSelected ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-text)] font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {addProgress && isMultiple && (
                          <span>
                            {addProgress.current}/{addProgress.total}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Plus className="w-4 h-4 text-[#71778c] hover:text-white" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
