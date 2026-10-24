import React from "react";
import { Loader2, Flame, ListMusic, Pin, Play } from "lucide-react";
import { Playlist } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";

interface PlaylistGridViewProps {
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  pinnedPlaylistIds: string[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onTogglePinPlaylist: (playlistId: string, e?: React.MouseEvent) => void;
}

export const PlaylistGridView = React.memo(function PlaylistGridView({
  playlists,
  isLoadingPlaylists,
  pinnedPlaylistIds,
  onSelectPlaylist,
  onTogglePinPlaylist,
}: PlaylistGridViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white">Sua Biblioteca</h2>
        <p className="text-xs text-[#8c91a4] mt-1">
          Playlists sincronizadas com a sua conta do YouTube Music
        </p>
      </div>

      {isLoadingPlaylists && playlists.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#71778c]">
          <Loader2 className="w-7 h-7 animate-spin text-red-500" />
          <p className="text-xs">Carregando suas playlists...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    <Flame className="w-14 h-14 text-red-400" />
                  ) : (
                    <ListMusic className="w-12 h-12 text-white/50" />
                  )}

                  {/* Botão de Fixar / Desafixar no Card */}
                  <button
                    onClick={(e) => onTogglePinPlaylist(pl.id, e)}
                    title={isPinned ? "Desafixar playlist" : "Fixar playlist no topo"}
                    className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isPinned
                        ? "bg-red-600 text-white"
                        : "bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current rotate-45" : ""}`} />
                  </button>

                  <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    {isPinned && (
                      <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider shrink-0 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800/40">
                        Fixada
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
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
