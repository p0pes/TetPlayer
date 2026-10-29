import React, { useState, useEffect, useMemo, useRef } from "react";
import { ListPlus, X, Search, Loader2, Music, Plus, Check } from "lucide-react";
import { Playlist, Track } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

interface AddToPlaylistModalProps {
  isOpen: boolean;
  track: Track | null;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlist: Playlist, track: Track) => Promise<void>;
  onCreateNewPlaylist: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  track,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreateNewPlaylist,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [addedToId, setAddedToId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setAddingToId(null);
      setAddedToId(null);
      setError(null);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !addingToId) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, addingToId, onClose]);

  // Filtra playlists excluindo VLLM e aplicando busca
  const filteredPlaylists = useMemo(() => {
    const available = playlists.filter((p) => p.id !== "VLLM");
    if (!searchQuery.trim()) return available;
    const q = searchQuery.trim().toLowerCase();
    return available.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, searchQuery]);

  if (!isOpen || !track) return null;

  const handleSelectPlaylist = async (playlist: Playlist) => {
    if (addingToId) return;
    try {
      setAddingToId(playlist.id);
      setError(null);
      await onAddToPlaylist(playlist, track);
      setAddedToId(playlist.id);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(String(err) || "Falha ao adicionar música à playlist.");
      setAddingToId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-playlist-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !addingToId) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#12141f]/95 border border-[#272c3f] rounded-2xl p-6 shadow-2xl relative cursor-default space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212638] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)]">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="add-to-playlist-title" className="text-base font-bold text-white">
                Adicionar à Playlist
              </h2>
              <p className="text-xs text-[#8c91a4]">
                Escolha o destino no YouTube Music
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!addingToId}
            className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prévia da Música Selecionada */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#181c28] border border-[#272d40] shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#212638] overflow-hidden shrink-0">
            {track.artwork_url || track.id ? (
              <img
                src={upgradeArtworkQuality(track.artwork_url, track.id, "thumb")}
                alt={track.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#6c7287]">
                <Music className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-[#8c91a4] truncate">{track.artist}</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs shrink-0">
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
              onCreateNewPlaylist();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] hover:opacity-90 text-xs font-semibold shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Nova</span>
          </button>
        </div>

        {/* Lista de Playlists */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar min-h-[160px]">
          {filteredPlaylists.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-center text-[#71778c]">
              <Music className="w-6 h-6 text-[#343a4e]" />
              <p className="text-xs">
                {searchQuery.trim()
                  ? `Nenhuma playlist encontrada para "${searchQuery}".`
                  : "Nenhuma playlist pessoal encontrada."}
              </p>
            </div>
          ) : (
            filteredPlaylists.map((playlist) => {
              const isAdding = addingToId === playlist.id;
              const isAdded = addedToId === playlist.id;

              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => handleSelectPlaylist(playlist)}
                  disabled={!!addingToId}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer group ${
                    isAdded
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-[#181c28]/60 border-[#222738] hover:bg-[#1f2434] hover:border-[#32394e] text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[#272c3f] overflow-hidden shrink-0 flex items-center justify-center">
                      {playlist.artwork_url ? (
                        <img
                          src={upgradeArtworkQuality(playlist.artwork_url)}
                          alt={playlist.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-[#8c91a4]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate group-hover:text-[var(--accent-text)] transition-colors">
                        {playlist.title}
                      </p>
                      {playlist.track_count && (
                        <p className="text-[10px] text-[#71778c] truncate">
                          {playlist.track_count}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    ) : isAdded ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#6c7287] group-hover:text-white transition-colors" />
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
