import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Pin,
  ListPlus,
  Download,
  CheckCircle2,
  AlertCircle,
  Heart,
  Trash2,
} from "lucide-react";
import { usePlaylistDownload, useTrackDownload } from "../../services/downloads";
import { useLikedTrack } from "../../services/likes";
import { useNetworkStatus } from "../../services/network";
import { Album, AlbumDetail, Track } from "../../types";
import { upgradeArtworkQuality } from "../../utils/artwork";
import { triggerTrackContextMenu, triggerPlayNext } from "../../context/PlayerContext";
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
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
  pinnedAlbumIds?: string[];
  onTogglePinAlbum?: (albumId: string, e: React.MouseEvent) => void;
}

const SubtleWaveIndicator = React.memo(function SubtleWaveIndicator({
  isPlaying,
}: {
  isPlaying: boolean;
}) {
  return (
    <div
      className="flex items-end justify-center gap-[2.5px] h-3.5 w-5 px-0.5"
      aria-hidden="true"
      title={isPlaying ? "Reproduzindo faixa" : "Faixa pausada"}
    >
      {[
        { dur: "1.4s", delay: "0s" },
        { dur: "1.6s", delay: "0.35s" },
        { dur: "1.3s", delay: "0.7s" },
        { dur: "1.5s", delay: "1.05s" },
      ].map((b, i) => (
        <span
          key={i}
          className="w-[2.5px] h-full rounded-full bg-[var(--accent)] shadow-[0_0_5px_var(--accent-glow)] will-change-transform"
          style={{
            transformOrigin: "bottom",
            animation: isPlaying
              ? `subtle-equalizer-wave ${b.dur} ease-in-out infinite alternate`
              : "none",
            animationDelay: isPlaying ? b.delay : undefined,
            transform: isPlaying ? undefined : "scaleY(0.25)",
          }}
        />
      ))}
    </div>
  );
});

interface AlbumTrackRowProps {
  track: Track;
  idx: number;
  tracks: Track[];
  albumArtist: string;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoadingThis: boolean;
  onPlayTrack: (track: Track, index: number, customQueue?: Track[]) => void;
  onTogglePlayPause?: () => void;
}

const AlbumTrackRow = React.memo(function AlbumTrackRow({
  track,
  idx,
  tracks,
  albumArtist,
  isCurrent,
  isPlaying,
  isLoadingThis,
  onPlayTrack,
  onTogglePlayPause,
}: AlbumTrackRowProps) {
  const { isLiked, toggleLike } = useLikedTrack(track);
  const { isDownloaded: isTrackDownloaded, isDownloading: isTrackDownloading } =
    useTrackDownload(track);
  const { isOnline } = useNetworkStatus();
  const [queuedFeedback, setQueuedFeedback] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const isUnavailableOffline = !isOnline && !isTrackDownloaded;

  return (
    <div
      onClick={() => {
        if (isCurrent && onTogglePlayPause) {
          onTogglePlayPause();
        } else {
          onPlayTrack(track, idx, tracks);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerTrackContextMenu(e, track);
      }}
      className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-all cursor-pointer group ${
        isCurrent
          ? "bg-[#181b28] text-[var(--accent-text)]"
          : "hover:bg-white/[0.04] text-zinc-300 hover:text-white"
      } ${isUnavailableOffline ? "opacity-45" : ""}`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Numeração de Vinil / Indicador de Play */}
        <div className="w-6 text-center text-xs font-mono shrink-0 text-[#63697e] group-hover:text-white flex items-center justify-center">
          {isLoadingThis ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          ) : isCurrent ? (
            <>
              <div className="group-hover:hidden flex items-center justify-center">
                <SubtleWaveIndicator isPlaying={isPlaying} />
              </div>
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current hidden group-hover:block text-[var(--accent)]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block text-[var(--accent)]" />
              )}
            </>
          ) : (
            <>
              <span className="group-hover:hidden">{idx + 1}</span>
              <Play className="w-3.5 h-3.5 fill-current hidden group-hover:block" />
            </>
          )}
        </div>

        {/* Título, Indicador Offline e Artistas */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={`text-xs sm:text-sm font-semibold truncate ${
                isCurrent ? "text-[var(--accent-text)]" : "text-white"
              }`}
            >
              {track.title}
            </p>
            {isTrackDownloading ? (
              <Loader2
                className="w-3.5 h-3.5 text-[var(--accent)] animate-spin shrink-0"
                aria-label="Baixando para reprodução offline..."
              />
            ) : isTrackDownloaded ? (
              <span title="Baixada para reprodução offline" className="shrink-0 inline-flex">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            ) : null}
          </div>
          {track.artist !== albumArtist && (
            <p
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(
                  new CustomEvent("tetplayer:search-artist", {
                    detail: {
                      query: track.artist,
                      artistId: track.artist_id,
                    },
                  })
                );
              }}
              className="text-[11px] text-[#8c91a4] hover:text-white hover:underline cursor-pointer transition-colors truncate"
              title={`Ir para o artista ${track.artist}`}
            >
              {track.artist}
            </p>
          )}
        </div>
      </div>

      {/* Ações Rápidas Unificadas: Curtir, Tocar a Seguir, Duração e Menu */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3">
        <button
          type="button"
          onClick={toggleLike}
          title={isLiked ? "Remover dos Favoritos" : "Curtir música"}
          aria-label={isLiked ? "Remover dos Favoritos" : "Curtir música"}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isLiked
              ? "text-rose-500 opacity-100 hover:bg-rose-500/10"
              : "text-[#71778c] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-rose-400 hover:bg-white/10"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500" : ""}`} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerPlayNext?.(track);
            setQueuedFeedback(true);
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setQueuedFeedback(false), 1200);
          }}
          title={queuedFeedback ? "Adicionada para tocar a seguir!" : "Tocar a seguir na fila"}
          aria-label="Tocar a seguir"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            queuedFeedback
              ? "text-emerald-400 bg-emerald-500/15 opacity-100"
              : "text-[#71778c] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          {queuedFeedback ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ListPlus className="w-3.5 h-3.5" />
          )}
        </button>

        <span className="text-xs font-mono text-[#71778c] min-w-[38px] text-right">
          {track.duration || "--:--"}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerTrackContextMenu(e, track);
          }}
          title="Mais opções da música"
          aria-label="Mais opções"
          className="p-1.5 rounded-lg text-[#71778c] hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

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
  onPlayAlbumQuick,
  pinnedAlbumIds = [],
  onTogglePinAlbum,
}: AlbumDetailViewProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const pinnedSet = useMemo(() => new Set(pinnedAlbumIds), [pinnedAlbumIds]);
  const isPinned = pinnedSet.has(album.id);

  const displayAlbum = albumDetail || album;
  const tracks = useMemo(() => albumDetail?.tracks || [], [albumDetail]);

  const artworkUrl = albumDetail?.artwork_url || album.artwork_url || tracks[0]?.artwork_url;

  useEffect(() => {
    setHasImageError(false);
  }, [album.id, artworkUrl]);

  const trackCount = displayAlbum.track_count || tracks.length;

  const durationText = useMemo(() => {
    if (displayAlbum.duration_text) return displayAlbum.duration_text;
    if (tracks.length === 0) return null;
    const totalSecs = tracks.reduce((acc, t) => {
      if (t.duration_seconds) return acc + t.duration_seconds;
      if (!t.duration) return acc;
      const parts = t.duration.split(":").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return acc + parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return acc;
    }, 0);
    if (totalSecs === 0) return null;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins} min ${secs} s`;
  }, [displayAlbum.duration_text, tracks]);

  const isCurrentAlbumPlaying = useMemo(() => {
    if (!currentTrack || tracks.length === 0) return false;
    return tracks.some((t) => t.id === currentTrack.id);
  }, [currentTrack, tracks]);

  const {
    total: totalDownloadable,
    downloaded: downloadedCount,
    isAllDownloaded,
    isDownloading: isAlbumDownloading,
    batchInfo,
    startDownload: handleStartAlbumDownload,
    cancelDownload: handleCancelAlbumDownload,
    removeDownloads: handleRemoveAlbumDownloads,
  } = usePlaylistDownload(album.id, tracks);

  const [downloadFeedback, setDownloadFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!downloadFeedback) return;
    const t = setTimeout(() => setDownloadFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [downloadFeedback]);

  const onStartDownloadWithFeedback = async () => {
    try {
      const res = await handleStartAlbumDownload();
      if (res) {
        if (res.completed > 0 && res.failed === 0) {
          setDownloadFeedback({
            type: "success",
            message: `Todas as ${res.completed} faixas de "${displayAlbum.title}" foram salvas para ouvir offline!`,
          });
        } else if (res.completed > 0 && res.failed > 0) {
          setDownloadFeedback({
            type: "info",
            message: `Download finalizado: ${res.completed} salvas, ${res.failed} falharam.`,
          });
        } else if (res.completed === 0 && res.failed > 0) {
          setDownloadFeedback({
            type: "error",
            message: "Não foi possível baixar as músicas deste álbum.",
          });
        }
      }
    } catch {
      setDownloadFeedback({
        type: "error",
        message: "Erro ao iniciar o download do álbum.",
      });
    }
  };

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

  const handleAddToPlaylist = () => {
    if (tracks.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("tetplayer:open-add-tracks-to-playlist", {
        detail: {
          tracks,
          albumTitle: displayAlbum.title,
        },
      })
    );
  };

  const handleCopyLink = () => {
    const url = `https://music.youtube.com/browse/${album.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  const albumTypeLabel =
    displayAlbum.album_type === "ep"
      ? "EP"
      : displayAlbum.album_type === "single"
      ? "SINGLE"
      : "ÁLBUM";

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Cinematográfico do Álbum */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--accent-subtle)] via-[#151824] to-[#0e1017] p-6 sm:p-8 border border-[var(--accent-border)] shadow-2xl">
        {/* Glow dinâmico de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-glow)] opacity-20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Capa do Álbum em Alta Resolução */}
          <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-[#161824] border border-white/10 shrink-0 shadow-2xl group relative">
            {artworkUrl && !hasImageError ? (
              <img
                src={upgradeArtworkQuality(artworkUrl, undefined, "high")}
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
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onBack}
                title="Voltar para a Biblioteca (Alt+←)"
                aria-label="Voltar para todos os álbuns"
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-[#8c91a4] hover:text-white transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/50 inline-block">
                {albumTypeLabel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-2 text-balance leading-tight">
              {displayAlbum.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-[#8c91a4] mt-2.5 font-medium">
              <span
                onClick={() => {
                  if (displayAlbum.artist && displayAlbum.artist !== "Artista") {
                    window.dispatchEvent(
                      new CustomEvent("tetplayer:search-artist", {
                        detail: {
                          query: displayAlbum.artist,
                          artistId: displayAlbum.artist_id,
                        },
                      })
                    );
                  }
                }}
                className="text-white font-bold hover:text-[var(--accent-text)] hover:underline cursor-pointer transition-colors"
                title={`Ir para o artista ${displayAlbum.artist}`}
              >
                {displayAlbum.artist}
              </span>
              {displayAlbum.year && <span>• {displayAlbum.year}</span>}
              {trackCount > 0 ? (
                <span>
                  • {trackCount} {trackCount === 1 ? "faixa" : "faixas"}
                </span>
              ) : null}
              {durationText && (
                <span className="font-mono text-[#71778c]">({durationText})</span>
              )}
            </div>

            {albumDetail?.description && (
              <p className="text-xs text-[#a0a5b8] mt-3 line-clamp-2 max-w-2xl leading-relaxed">
                {albumDetail.description}
              </p>
            )}

            {/* Barra de Ações do Álbum: 1 Botão Principal + Fileira de Ícones Circulares (Regra 6.1.1) */}
            <div className="flex items-center gap-2.5 mt-5 flex-wrap justify-center md:justify-start">
              <button
                onClick={handlePlayAlbumClick}
                disabled={isLoading || tracks.length === 0}
                aria-label={
                  isCurrentAlbumPlaying && isPlaying
                    ? "Pausar álbum"
                    : "Reproduzir álbum na íntegra"
                }
                className="flex items-center gap-2 px-6 h-10 rounded-full bg-[var(--accent)] hover:opacity-90 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent-glow)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCurrentAlbumPlaying && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    Reproduzir
                  </>
                )}
              </button>

              <button
                onClick={handleShuffleAlbumClick}
                disabled={isLoading || tracks.length === 0}
                title="Reproduzir álbum em ordem aleatória"
                aria-label="Reproduzir álbum aleatoriamente"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleAddToPlaylist}
                disabled={isLoading || tracks.length === 0}
                title="Adicionar todas as músicas deste álbum a uma playlist"
                aria-label="Adicionar álbum à playlist"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-[var(--accent-text)] hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <ListPlus className="w-4 h-4" />
              </button>

              {/* Botão de Download Offline do Álbum (Somente-Ícone c/ Tooltip) */}
              {tracks.length > 0 &&
                (isAlbumDownloading ? (
                  <button
                    type="button"
                    onClick={handleCancelAlbumDownload}
                    className="flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50 text-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
                    title={
                      batchInfo?.currentTrackTitle
                        ? `Baixando faixa ${batchInfo.currentTrackIndex ?? 1} de ${batchInfo.total}: ${batchInfo.currentTrackTitle} (Clique para cancelar)`
                        : "Clique para cancelar o download das faixas deste álbum"
                    }
                  >
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="font-mono text-[11px]">
                      {batchInfo
                        ? `${batchInfo.completed}/${batchInfo.total}${batchInfo.failed > 0 ? ` (${batchInfo.failed} falha${batchInfo.failed > 1 ? "s" : ""})` : ""}`
                        : `${downloadedCount}/${totalDownloadable}`}
                    </span>
                    <span className="text-[10px] opacity-70 group-hover:opacity-100 ml-0.5">✕</span>
                  </button>
                ) : isAllDownloaded ? (
                  <button
                    type="button"
                    onClick={handleRemoveAlbumDownloads}
                    aria-label="Remover download do álbum"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-950/50 hover:bg-red-950/50 border border-emerald-600/50 hover:border-red-600/50 text-emerald-300 hover:text-red-300 transition-all cursor-pointer shadow-sm group"
                    title="Álbum salvo para ouvir offline (Clique para remover do disco)"
                  >
                    <Check className="w-4 h-4 text-emerald-400 group-hover:hidden" />
                    <Trash2 className="w-4 h-4 text-red-400 hidden group-hover:block" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartDownloadWithFeedback}
                    aria-label="Baixar álbum"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white transition-all cursor-pointer shadow-sm group"
                    title={
                      downloadedCount > 0
                        ? `Baixar as ${totalDownloadable - downloadedCount} faixas restantes para ouvir offline`
                        : "Baixar álbum para ouvir offline"
                    }
                  >
                    <Download className="w-4 h-4 text-[var(--accent-text)] group-hover:scale-110 transition-transform" />
                  </button>
                ))}

              {onTogglePinAlbum && (
                <button
                  type="button"
                  onClick={(e) => onTogglePinAlbum(album.id, e)}
                  title={isPinned ? "Desafixar álbum da barra lateral" : "Fixar álbum na barra lateral"}
                  aria-label={isPinned ? "Desafixar álbum" : "Fixar álbum"}
                  className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 border transition-all cursor-pointer ${
                    isPinned
                      ? "bg-[var(--accent-subtle)] border-[var(--accent-border)] text-[var(--accent-text)] shadow-sm"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                  }`}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? "fill-current text-[var(--accent-text)]" : ""}`} />
                </button>
              )}

              <button
                onClick={handleCopyLink}
                title="Copiar link do YouTube Music"
                aria-label="Copiar link do álbum"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-[#8c91a4] hover:text-white transition-all cursor-pointer"
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
      <div className="bg-[#0e1017]/80 rounded-2xl border border-white/[0.06] overflow-hidden p-4 sm:p-6 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-[11px] font-bold text-[#63697e] uppercase tracking-wider px-3 select-none">
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
            {tracks.map((track, idx) => (
              <AlbumTrackRow
                key={`${track.id}-${idx}`}
                track={track}
                idx={idx}
                tracks={tracks}
                albumArtist={displayAlbum.artist}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
                isLoadingThis={loadingTrackId === track.id}
                onPlayTrack={onPlayTrack}
                onTogglePlayPause={onTogglePlayPause}
              />
            ))}
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
                  onPlay={onPlayAlbumQuick}
                  isPinned={pinnedSet.has(relAlbum.id)}
                  onTogglePin={onTogglePinAlbum}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast de Confirmação Visual de Download */}
      {downloadFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-24 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium animate-fade-in ${
            downloadFeedback.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50"
              : downloadFeedback.type === "error"
              ? "bg-red-950/95 border-red-500/50 text-red-200 shadow-red-950/50"
              : "bg-[#181c2b]/95 border-[#2b3248] text-[#c4c8d8]"
          }`}
        >
          {downloadFeedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : downloadFeedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Download className="w-4 h-4 text-[var(--accent)] shrink-0" />
          )}
          <span>{downloadFeedback.message}</span>
          <button
            type="button"
            onClick={() => setDownloadFeedback(null)}
            className="ml-2 text-white/50 hover:text-white p-0.5 rounded cursor-pointer"
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
});
