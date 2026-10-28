import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Disc3,
  Play,
  Pause,
  Shuffle,
  Loader2,
  Clock,
  MoreVertical,
  Check,
  Share2,
} from "lucide-react";
import { Album, AlbumDetail, Track } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { usePlayer } from "../../context/PlayerContext";
import { AlbumCard } from "./AlbumCard";

interface AlbumDetailViewProps {
  album: Album;
  albumDetail: AlbumDetail | null;
  isLoading: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onBack: () => void;
  onPlayAlbum: (tracks: Track[], startIndex?: number, shuffle?: boolean) => void;
  onPlayTrack: (track: Track, index: number, customQueue?: Track[]) => void;
  onTogglePlayPause?: () => void;
  onSelectRelatedAlbum?: (album: Album) => void;
}

export const AlbumDetailView = React.memo(function AlbumDetailView({
  album,
  albumDetail,
  isLoading,
  currentTrack,
  isPlaying,
  loadingTrackId,
  onBack,
  onPlayAlbum,
  onPlayTrack,
  onTogglePlayPause,
  onSelectRelatedAlbum,
}: AlbumDetailViewProps) {
  const { openContextMenu } = usePlayer();
  const [hasImageError, setHasImageError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const displayAlbum = albumDetail || album;
  const tracks = useMemo(() => albumDetail?.tracks || [], [albumDetail]);

  const isCurrentAlbumPlaying = useMemo(() => {
    if (!currentTrack || tracks.length === 0) return false;
    return tracks.some((t) => t.id === currentTrack.id);
  }, [currentTrack, tracks]);

  const handlePlayAlbumClick = () => {
    if (tracks.length === 0) return;
    if (isCurrentAlbumPlaying && onTogglePlayPause) {
      onTogglePlayPause();
    } else {
      onPlayAlbum(tracks, 0, false);
    }
  };

  const handleShuffleAlbumClick = () => {
    if (tracks.length === 0) return;
    onPlayAlbum(tracks, 0, true);
  };

  const handleCopyLink = () => {
    const url = `https://music.youtube.com/browse/${album.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  const artworkUrl = displayAlbum.artwork_url;
  const albumTypeLabel =
    displayAlbum.album_type === "ep"
      ? "EP"
      : displayAlbum.album_type === "single"
      ? "SINGLE"
      : "ÁLBUM";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-[#8c91a4] hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Voltar para todos os álbuns
      </button>

      {/* Header Cinematográfico do Álbum */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--accent-subtle)] via-[#151824] to-[#0e1017] p-6 sm:p-8 border border-[var(--accent-border)] shadow-2xl">
        {/* Glow dinâmico de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-glow)] opacity-20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Capa do Álbum em Alta Resolução */}
          <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-[#161824] border border-white/10 shrink-0 shadow-2xl group relative">
            {artworkUrl && !hasImageError ? (
              <img
                src={upgradeArtworkQuality(artworkUrl, album.id, "high")}
                alt={displayAlbum.title}
                referrerPolicy="no-referrer"
                onError={() => setHasImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1d2c] to-[#0f1118] text-[#63697e]">
                <Disc3 className="w-20 h-20" />
              </div>
            )}
          </div>

          {/* Metadados e Ações Principais */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
            <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-white/10 text-[var(--accent-text)] border border-white/10 shadow-sm inline-block">
              {albumTypeLabel}
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-2 text-balance leading-tight">
              {displayAlbum.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-[#8c91a4] mt-2.5 font-medium">
              <span className="text-white font-bold">{displayAlbum.artist}</span>
              {displayAlbum.year && <span>• {displayAlbum.year}</span>}
              {displayAlbum.track_count ? <span>• {displayAlbum.track_count} faixas</span> : null}
              {displayAlbum.duration_text && (
                <span className="font-mono text-[#71778c]">({displayAlbum.duration_text})</span>
              )}
            </div>

            {albumDetail?.description && (
              <p className="text-xs text-[#a0a5b8] mt-3 line-clamp-2 max-w-2xl leading-relaxed">
                {albumDetail.description}
              </p>
            )}

            {/* Barra de Ações do Álbum */}
            <div className="flex items-center gap-3 mt-6 flex-wrap justify-center md:justify-start">
              <button
                onClick={handlePlayAlbumClick}
                disabled={isLoading || tracks.length === 0}
                aria-label={
                  isCurrentAlbumPlaying && isPlaying
                    ? "Pausar álbum"
                    : "Reproduzir álbum na íntegra"
                }
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[var(--accent)] hover:opacity-90 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent-glow)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCurrentAlbumPlaying && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pausar Álbum
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    Reproduzir Álbum
                  </>
                )}
              </button>

              <button
                onClick={handleShuffleAlbumClick}
                disabled={isLoading || tracks.length === 0}
                title="Reproduzir álbum em ordem aleatória"
                aria-label="Reproduzir álbum aleatoriamente"
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Aleatório</span>
              </button>

              <button
                onClick={handleCopyLink}
                title="Copiar link do YouTube Music"
                aria-label="Copiar link do álbum"
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-[#8c91a4] hover:text-white transition-all cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Faixas do Álbum */}
      <div className="bg-[#0e1017]/80 rounded-2xl border border-[#1f232e] overflow-hidden p-4 sm:p-6 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f232e] text-[11px] font-bold text-[#63697e] uppercase tracking-wider px-3 select-none">
          <div className="flex items-center gap-4">
            <span className="w-6 text-center">#</span>
            <span>Título</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-3.5 h-3.5" />
            <span className="w-12 text-right">Duração</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#71778c]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <span className="text-xs font-medium">Carregando faixas do álbum...</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-12 text-center text-[#71778c] text-xs">
            Nenhuma faixa encontrada para este álbum.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03] mt-1">
            {tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLoadingThis = loadingTrackId === track.id;

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onPlayTrack(track, idx, tracks)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openContextMenu(e, track);
                  }}
                  className={`flex items-center justify-between py-3 px-3 rounded-xl transition-all cursor-pointer group ${
                    isCurrent
                      ? "bg-[#181b28] text-[var(--accent-text)]"
                      : "hover:bg-white/[0.04] text-zinc-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Numeração de Vinil / Indicador de Play */}
                    <div className="w-6 text-center text-xs font-mono shrink-0 text-[#63697e] group-hover:text-white flex items-center justify-center">
                      {isLoadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                      ) : isCurrent && isPlaying ? (
                        <span className="text-[var(--accent)] font-bold tracking-tighter text-sm animate-pulse">
                          ılı
                        </span>
                      ) : (
                        <>
                          <span className="group-hover:hidden">{idx + 1}</span>
                          <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block" />
                        </>
                      )}
                    </div>

                    {/* Título e Artistas */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? "text-[var(--accent-text)]" : "text-white"
                        }`}
                      >
                        {track.title}
                      </p>
                      {track.artist !== displayAlbum.artist && (
                        <p className="text-[11px] text-[#8c91a4] truncate">
                          {track.artist}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Duração e Menu de Contexto */}
                  <div className="flex items-center gap-3 shrink-0 pl-3">
                    <span className="text-xs font-mono text-[#71778c]">
                      {track.duration || "--:--"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openContextMenu(e, track);
                      }}
                      aria-label="Mais opções"
                      className="p-1 rounded-lg text-[#71778c] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé: Informações Fonográficas & Outros Álbuns */}
      <div className="space-y-6 pt-2 pb-6">
        {albumDetail?.release_date || albumDetail?.copyright ? (
          <div className="text-xs text-[#63697e] space-y-1 font-mono px-2">
            {albumDetail.release_date && <p>Lançado em {albumDetail.release_date}</p>}
            {albumDetail.copyright && <p>{albumDetail.copyright}</p>}
          </div>
        ) : null}

        {/* Álbuns Relacionados (Mais do Artista) */}
        {albumDetail?.related_albums && albumDetail.related_albums.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-[#1f232e]">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Mais de {displayAlbum.artist}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albumDetail.related_albums.map((relAlbum) => (
                <AlbumCard
                  key={relAlbum.id}
                  album={relAlbum}
                  onSelect={(a) => onSelectRelatedAlbum && onSelectRelatedAlbum(a)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
