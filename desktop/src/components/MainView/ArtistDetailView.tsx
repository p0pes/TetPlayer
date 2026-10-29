import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Mic2,
  Play,
  Pause,
  Shuffle,
  Loader2,
  Clock,
  MoreVertical,
  Check,
  Share2,
  ListPlus,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  SearchX,
  Disc3,
} from "lucide-react";
import { Album, ArtistDetail, Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { triggerTrackContextMenu } from "../../context/PlayerContext";
import { AlbumCard } from "./AlbumCard";

export type ArtistSortOption =
  | "popular"
  | "title"
  | "duration_desc"
  | "duration_asc";

const sortOptions: { value: ArtistSortOption; label: string }[] = [
  { value: "popular", label: "Populares / Padrão" },
  { value: "title", label: "Título (A-Z)" },
  { value: "duration_desc", label: "Duração (Mais longas)" },
  { value: "duration_asc", label: "Duração (Mais curtas)" },
];

const sortOptionLabels: Record<ArtistSortOption, string> = {
  popular: "Populares / Padrão",
  title: "Título (A-Z)",
  duration_desc: "Duração (Mais longas)",
  duration_asc: "Duração (Mais curtas)",
};

function parseDurationToSeconds(duration?: string, durationSeconds?: number): number {
  if (typeof durationSeconds === "number" && !isNaN(durationSeconds)) {
    return durationSeconds;
  }
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
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

interface ArtistDetailViewProps {
  artistName: string;
  artistId?: string;
  artistDetail: ArtistDetail | null;
  isLoading: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onBack: () => void;
  onPlayArtistTracks: (tracks: Track[], startIndex?: number, shuffle?: boolean) => void;
  onPlayTrack: (track: Track, index: number, customQueue?: Track[]) => void;
  onTogglePlayPause?: () => void;
  onSelectAlbum?: (album: Album) => void;
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
  pinnedAlbumIds?: string[];
  onTogglePinAlbum?: (albumId: string, e: React.MouseEvent) => void;
}

export const ArtistDetailView = React.memo(function ArtistDetailView({
  artistName,
  artistId,
  artistDetail,
  isLoading,
  currentTrack,
  isPlaying,
  loadingTrackId,
  onBack,
  onPlayArtistTracks,
  onPlayTrack,
  onTogglePlayPause,
  onSelectAlbum,
  onPlayAlbumQuick,
  pinnedAlbumIds = [],
  onTogglePinAlbum,
}: ArtistDetailViewProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<ArtistSortOption>("popular");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const displayName = artistDetail?.name || artistName;
  const effectiveId = artistDetail?.id || artistId || "";
  const tracks = useMemo(() => artistDetail?.tracks || [], [artistDetail]);
  const albums = useMemo(() => artistDetail?.albums || [], [artistDetail]);
  const artworkUrl = artistDetail?.artwork_url || tracks[0]?.artwork_url || albums[0]?.artwork_url;

  const pinnedSet = useMemo(() => new Set(pinnedAlbumIds), [pinnedAlbumIds]);

  useEffect(() => {
    setHasImageError(false);
    setIsBioExpanded(false);
    setSearchFilter("");
    setSortBy("popular");
    setIsSortOpen(false);
  }, [artistName, artistId, artistDetail?.id]);

  // Fecha dropdown de ordenação ao clicar fora ou apertar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsSortOpen(false);
      }
    }
    if (isSortOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortOpen]);

  // Atalho global Ctrl+F / Cmd+F para focar o filtro de músicas do artista
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (
          filterInputRef.current?.closest("[inert]") ||
          document.querySelector("[role='dialog']")
        ) {
          return;
        }
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const displayedTracks = useMemo(() => {
    let result = tracks;
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q))
      );
    }

    if (sortBy === "popular") return result;

    const sorted = [...result];
    if (sortBy === "title") {
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      );
    } else if (sortBy === "duration_desc") {
      sorted.sort(
        (a, b) =>
          parseDurationToSeconds(b.duration, b.duration_seconds) -
          parseDurationToSeconds(a.duration, a.duration_seconds)
      );
    } else if (sortBy === "duration_asc") {
      sorted.sort(
        (a, b) =>
          parseDurationToSeconds(a.duration, a.duration_seconds) -
          parseDurationToSeconds(b.duration, b.duration_seconds)
      );
    }
    return sorted;
  }, [tracks, searchFilter, sortBy]);

  const isCurrentArtistPlaying = useMemo(() => {
    if (!currentTrack || tracks.length === 0) return false;
    return tracks.some((t) => t.id === currentTrack.id);
  }, [currentTrack, tracks]);

  const handlePlayAllClick = () => {
    const target = displayedTracks.length > 0 ? displayedTracks : tracks;
    if (target.length === 0) return;
    if (isCurrentArtistPlaying && onTogglePlayPause && !searchFilter.trim()) {
      onTogglePlayPause();
    } else {
      onPlayArtistTracks(target, 0, false);
    }
  };

  const handleShuffleClick = () => {
    const target = displayedTracks.length > 0 ? displayedTracks : tracks;
    if (target.length === 0) return;
    onPlayArtistTracks(target, 0, true);
  };

  const handleAddToPlaylist = () => {
    const target = displayedTracks.length > 0 ? displayedTracks : tracks;
    if (target.length === 0) return;
    window.dispatchEvent(
      new CustomEvent("tetplayer:open-add-tracks-to-playlist", {
        detail: {
          tracks: target,
          albumTitle: displayName,
        },
      })
    );
  };

  const handleCopyLink = () => {
    const url = effectiveId.startsWith("UC")
      ? `https://music.youtube.com/channel/${effectiveId}`
      : `https://music.youtube.com/search?q=${encodeURIComponent(displayName)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Botão Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-[#8c91a4] hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Voltar
      </button>

      {/* Header Cinematográfico do Artista */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--accent-subtle)] via-[#151824] to-[#0e1017] p-6 sm:p-8 border border-[var(--accent-border)] shadow-2xl">
        {/* Glow dinâmico de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--accent-glow)] opacity-20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar / Foto do Artista */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-2xl overflow-hidden bg-[#161824] border border-white/10 shrink-0 shadow-2xl relative">
            {artworkUrl && !hasImageError ? (
              <img
                src={upgradeArtworkQuality(artworkUrl, undefined, "high")}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setHasImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1d2c] to-[#0f1118] text-[#63697e]">
                <Mic2 className="w-20 h-20" />
              </div>
            )}
          </div>

          {/* Metadados e Ações Principais */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
            <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-white/10 text-[var(--accent-text)] border border-white/10 shadow-sm inline-block">
              ARTISTA
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-2 text-balance leading-tight">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-[#8c91a4] mt-2.5 font-medium">
              {artistDetail?.monthly_listeners && (
                <span className="text-white font-semibold">
                  {artistDetail.monthly_listeners}
                </span>
              )}
              {artistDetail?.subscribers && (
                <span>
                  {artistDetail?.monthly_listeners ? "• " : ""}
                  {artistDetail.subscribers}
                </span>
              )}
              {tracks.length > 0 && (
                <span>
                  {artistDetail?.monthly_listeners || artistDetail?.subscribers ? "• " : ""}
                  {tracks.length} {tracks.length === 1 ? "música" : "músicas"}
                </span>
              )}
              {albums.length > 0 && (
                <span>
                  • {albums.length} {albums.length === 1 ? "lançamento" : "lançamentos"}
                </span>
              )}
            </div>

            {artistDetail?.description && (
              <div className="mt-3 max-w-2xl">
                <p
                  className={`text-xs text-[#a0a5b8] leading-relaxed ${
                    isBioExpanded ? "" : "line-clamp-2"
                  }`}
                >
                  {artistDetail.description}
                </p>
                {artistDetail.description.length > 140 && (
                  <button
                    type="button"
                    onClick={() => setIsBioExpanded((prev) => !prev)}
                    className="text-[11px] font-semibold text-[var(--accent-text)] hover:underline mt-1 cursor-pointer"
                  >
                    {isBioExpanded ? "Mostrar menos" : "Ler biografia completa"}
                  </button>
                )}
              </div>
            )}

            {/* Barra de Ações do Artista */}
            <div className="flex items-center gap-3 mt-6 flex-wrap justify-center md:justify-start">
              <button
                onClick={handlePlayAllClick}
                disabled={isLoading || tracks.length === 0}
                aria-label={
                  isCurrentArtistPlaying && isPlaying
                    ? "Pausar reprodução do artista"
                    : "Reproduzir músicas do artista"
                }
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[var(--accent)] hover:opacity-90 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent-glow)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCurrentArtistPlaying && isPlaying && !searchFilter.trim() ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    Reproduzir Tudo
                  </>
                )}
              </button>

              <button
                onClick={handleShuffleClick}
                disabled={isLoading || tracks.length === 0}
                title="Reproduzir músicas do artista em ordem aleatória"
                aria-label="Reproduzir aleatoriamente"
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                <span className="hidden sm:inline">Aleatório</span>
              </button>

              <button
                type="button"
                onClick={handleAddToPlaylist}
                disabled={isLoading || tracks.length === 0}
                title="Adicionar músicas deste artista a uma playlist"
                aria-label="Adicionar músicas à playlist"
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <ListPlus className="w-4 h-4 text-[var(--accent-text)]" />
                <span className="hidden sm:inline">Adicionar à Playlist</span>
              </button>

              <button
                onClick={handleCopyLink}
                title="Copiar link do artista no YouTube Music"
                aria-label="Copiar link do artista"
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

      {/* Barra de Filtro e Ordenação das Músicas */}
      {!isLoading && tracks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12141c] p-3 rounded-xl border border-[#1f232e]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71778c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={filterInputRef}
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Filtrar músicas de ${displayName}... (Ctrl+F)`}
              aria-label="Filtrar músicas do artista"
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#181b26] border border-[#242838] text-xs text-white placeholder-[#71778c] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                aria-label="Limpar filtro"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71778c] hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div ref={sortRef} className="relative flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-[#181b26] hover:bg-[#1e2230] border border-[#242838] text-xs text-zinc-200 font-medium focus:outline-none focus:border-[var(--accent)] cursor-pointer transition-colors min-w-[180px]"
            >
              <span className="flex items-center gap-2 truncate">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#71778c] shrink-0" />
                <span className="truncate">{sortOptionLabels[sortBy]}</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#71778c] shrink-0 transition-transform duration-200 ${
                  isSortOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {isSortOpen && (
              <div
                role="listbox"
                aria-label="Ordenar faixas do artista"
                className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-[#161925]/95 backdrop-blur-xl border border-white/10 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {sortOptions.map((option) => {
                  const isSelected = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSortBy(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] font-semibold"
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de Músicas do Artista */}
      <div className="bg-[#0e1017]/80 rounded-2xl border border-[#1f232e] overflow-hidden p-4 sm:p-6 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f232e] text-[11px] font-bold text-[#63697e] uppercase tracking-wider px-3 select-none">
          <div className="flex items-center gap-4">
            <span className="w-6 text-center">#</span>
            <span>Músicas de {displayName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-3.5 h-3.5" />
            <span className="w-12 text-right">Duração</span>
          </div>
        </div>

        {isLoading && tracks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#71778c]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            <span className="text-xs font-medium">
              Carregando perfil e músicas de {displayName}...
            </span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-12 text-center text-[#71778c] text-xs">
            Nenhuma música encontrada para este artista.
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center gap-3 text-[#8c91a4]">
            <SearchX className="w-10 h-10 text-[#63697e]" />
            <p className="text-sm font-medium text-zinc-300">
              Nenhuma música encontrada para &ldquo;{searchFilter}&rdquo;
            </p>
            <button
              onClick={() => setSearchFilter("")}
              className="mt-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white transition-colors cursor-pointer"
            >
              Limpar filtro
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03] mt-1">
            {displayedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLoadingThis = loadingTrackId === track.id;

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => {
                    if (isCurrent && onTogglePlayPause) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, idx, displayedTracks);
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
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Numeração / Indicador de Play */}
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

                    {/* Capa da Faixa */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#161824] border border-white/5 shrink-0 flex items-center justify-center">
                      {track.artwork_url ? (
                        <img
                          src={upgradeArtworkQuality(track.artwork_url, track.id)}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleArtworkError(e, track.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Disc3 className="w-4 h-4 text-[#63697e]" />
                      )}
                    </div>

                    {/* Título, Colaboradores e Álbum */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? "text-[var(--accent-text)]" : "text-white"
                        }`}
                      >
                        {track.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8c91a4] truncate mt-0.5">
                        <span className="truncate">{track.artist || displayName}</span>
                        {track.album && (
                          <>
                            <span className="text-[#63697e]">•</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(
                                  new CustomEvent("tetplayer:open-album", {
                                    detail: {
                                      albumId: track.album_id,
                                      albumTitle: track.album,
                                      artist: track.artist || displayName,
                                      artworkUrl: track.artwork_url,
                                    },
                                  })
                                );
                              }}
                              className="hover:text-white hover:underline cursor-pointer transition-colors truncate"
                              title={`Ir para o álbum ${track.album}`}
                            >
                              {track.album}
                            </span>
                          </>
                        )}
                      </div>
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
                        triggerTrackContextMenu(e, track);
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

      {/* Discografia: Álbuns, Singles e EPs do Artista */}
      {albums.length > 0 && (
        <div className="space-y-4 pt-4 pb-6 border-t border-[#1f232e]">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Discografia & Lançamentos de {displayName}</span>
            <span className="text-[11px] font-mono text-[#71778c]">({albums.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((albumItem) => (
              <AlbumCard
                key={albumItem.id}
                album={albumItem}
                onSelect={(a) => onSelectAlbum && onSelectAlbum(a)}
                onPlay={onPlayAlbumQuick}
                isPinned={pinnedSet.has(albumItem.id)}
                onTogglePin={onTogglePinAlbum}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

