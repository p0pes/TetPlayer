import React from "react";
import { Loader2, Flame, ListMusic, Pin, Play, Plus } from "lucide-react";
import { Playlist } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

interface PlaylistGridViewProps {
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  pinnedPlaylistIds: string[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onTogglePinPlaylist: (playlistId: string, e?: React.MouseEvent) => void;
  onCreatePlaylist?: () => void;
}

export const PlaylistGridView = React.memo(function PlaylistGridView({
  playlists,
  isLoadingPlaylists,
  pinnedPlaylistIds,
  onSelectPlaylist,
  onTogglePinPlaylist,
  onCreatePlaylist,
}: PlaylistGridViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Sua Biblioteca</h2>
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

      {isLoadingPlaylists && playlists.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#71778c]">
          <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
          <p className="text-xs">Carregando suas playlists...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Card Criar Nova Playlist */}
          {onCreatePlaylist && (
            <div
              onClick={onCreatePlaylist}
              className="bg-[#12141c]/50 hover:bg-[#171a24] p-4 rounded-2xl border border-dashed border-[#272d40] hover:border-[var(--accent)] transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div className="relative w-full aspect-square rounded-xl mb-3.5 flex flex-col items-center justify-center bg-white/[0.02] group-hover:bg-[var(--accent-subtle)] border border-white/5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[var(--accent)] text-[#8c91a4] group-hover:text-white flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-[var(--accent-text)] transition-colors">
                  Nova Playlist
                </h4>
                <p className="text-xs text-[#787f98] mt-0.5">
                  Criar no YouTube Music
                </p>
              </div>
            </div>
          )}

          {playlists.map((pl) => {
            const isLiked = pl.id === "VLLM";
            const isPinned = pinnedPlaylistIds.includes(pl.id);

            return (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className="bg-[#12141c] hover:bg-[#171a24] p-4 rounded-2xl border border-[#1f232e] hover:border-[#2f3549] transition-all group cursor-pointer flex flex-col justify-between relative"
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3.5 shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-700">
                  {pl.artwork_url ? (
                    <img
                      src={upgradeArtworkQuality(pl.artwork_url)}
                      alt={pl.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : isLiked ? (
                    <Flame className="w-14 h-14 text-[var(--accent-text)]" />
                  ) : (
                    <ListMusic className="w-12 h-12 text-white/50" />
                  )}

                  {/* Botão de Fixar / Desafixar no Card */}
                  <button
                    onClick={(e) => onTogglePinPlaylist(pl.id, e)}
                    title={isPinned ? "Desafixar playlist" : "Fixar playlist no topo"}
                    className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isPinned
                        ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]"
                        : "bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current rotate-45" : ""}`} />
                  </button>

                  <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-xl shadow-[var(--accent-glow)] opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    {isPinned && (
                      <span className="text-[10px] text-[var(--accent-text)] font-bold uppercase tracking-wider shrink-0 bg-[var(--accent-subtle)] px-1.5 py-0.2 rounded border border-[var(--accent-border)]">
                        Fixada
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-[var(--accent-text)] transition-colors">
                      {pl.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#787f98] truncate mt-0.5">
                    {pl.subtitle || "Playlist do YouTube Music"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
