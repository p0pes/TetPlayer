import React from "react";
import { ArrowLeft, Music, Play, Loader2 } from "lucide-react";
import { Playlist, Track } from "../../types";
import { VirtualizedTrackList } from "./VirtualizedTrackList";
import { upgradeArtworkQuality } from "../../utils/artwork";

interface PlaylistDetailViewProps {
  playlist: Playlist;
  tracks: Track[];
  isLoadingTracks: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onBack: () => void;
  onPlayPlaylist: () => void;
  onPlayTrack: (track: Track, index: number) => void;
  onTogglePlayPause?: () => void;
  scrollRef: React.RefObject<HTMLElement | null>;
}

export function PlaylistDetailView({
  playlist,
  tracks,
  isLoadingTracks,
  currentTrack,
  isPlaying,
  loadingTrackId,
  onBack,
  onPlayPlaylist,
  onPlayTrack,
  onTogglePlayPause,
  scrollRef,
}: PlaylistDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para todas as playlists
      </button>

      {/* Header da Playlist */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gradient-to-r from-red-950/40 via-[#1c1826] to-[#12141c] p-6 rounded-2xl border border-red-900/30">
        <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 overflow-hidden shrink-0 shadow-2xl flex items-center justify-center">
          {playlist.artwork_url ? (
            <img
              src={upgradeArtworkQuality(playlist.artwork_url)}
              alt={playlist.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-14 h-14 text-white/50" />
          )}
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider bg-red-950/80 px-2.5 py-1 rounded-md border border-red-800/40">
            Playlist
          </span>
          <h2 className="text-2xl font-extrabold text-white">
            {playlist.title}
          </h2>
          {playlist.subtitle && (
            <p className="text-xs text-[#8c91a4]">
              {playlist.subtitle}
            </p>
          )}
          <p className="text-xs text-[#71778c]">
            {tracks.length} músicas carregadas
          </p>

          <div className="pt-2">
            <button
              onClick={onPlayPlaylist}
              disabled={tracks.length === 0}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              Tocar Playlist
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Faixas com Virtualização */}
      <div className="space-y-2">
        {isLoadingTracks && tracks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <p className="text-xs">Carregando músicas da playlist...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
            <Music className="w-6 h-6 text-[#343a4e]" />
            <p className="text-xs">Nenhuma faixa encontrada nesta playlist.</p>
          </div>
        ) : (
          <VirtualizedTrackList
            tracks={tracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            loadingTrackId={loadingTrackId}
            onPlayTrack={onPlayTrack}
            onTogglePlayPause={onTogglePlayPause}
            parentRef={scrollRef}
          />
        )}
      </div>
    </div>
  );
}
