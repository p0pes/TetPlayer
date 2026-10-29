import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Music,
  Play,
  Loader2,
  Search,
  X,
  ArrowUpDown,
  SearchX,
  Edit3,
  Trash2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Playlist, Track } from "../../types";
import { VirtualizedTrackList } from "./VirtualizedTrackList";
import { upgradeArtworkQuality } from "../../utils/artwork";

export type PlaylistSortOption =
  | "original"
  | "title"
  | "artist"
  | "duration_desc"
  | "duration_asc";

const sortOptions: { value: PlaylistSortOption; label: string }[] = [
  { value: "original", label: "Ordem Original" },
  { value: "title", label: "Título (A-Z)" },
  { value: "artist", label: "Artista (A-Z)" },
  { value: "duration_desc", label: "Duração (Mais longas)" },
  { value: "duration_asc", label: "Duração (Mais curtas)" },
];

const sortOptionLabels: Record<PlaylistSortOption, string> = {
  original: "Ordem Original",
  title: "Título (A-Z)",
  artist: "Artista (A-Z)",
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

interface PlaylistDetailViewProps {
  playlist: Playlist;
  tracks: Track[];
  isLoadingTracks: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onBack: () => void;
  onPlayPlaylist: (customTracks?: Track[]) => void;
  onPlayTrack: (track: Track, index: number, customQueue?: Track[]) => void;
  onTogglePlayPause?: () => void;
  onEditPlaylist?: (playlist: Playlist) => void;
  onDeletePlaylist?: (playlist: Playlist) => void;
  onReorderTrack?: (fromIndex: number, toIndex: number) => void;
  scrollRef: React.RefObject<HTMLElement | null>;
}

export const PlaylistDetailView = React.memo(function PlaylistDetailView({
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
  onEditPlaylist,
  onDeletePlaylist,
  onReorderTrack,
  scrollRef,
}: PlaylistDetailViewProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<PlaylistSortOption>("original");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Reseta busca e ordenação quando o usuário muda de playlist
  useEffect(() => {
    setHasImageError(false);
    setSearchFilter("");
    setSortBy("original");
    setIsSortOpen(false);
  }, [playlist.id]);

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

  // Atalho global Ctrl+F / Cmd+F para focar imediatamente o campo de filtro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        filterInputRef.current?.focus();
        filterInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtragem e ordenação em tempo real (Sugestão 2.2)
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

    if (sortBy === "original") return result;

    const sorted = [...result];
    if (sortBy === "title") {
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      );
    } else if (sortBy === "artist") {
      sorted.sort((a, b) =>
        a.artist.localeCompare(b.artist, "pt-BR", { sensitivity: "base" })
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
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gradient-to-r from-[var(--accent-subtle)] via-[#1c1826] to-[#12141c] p-6 rounded-2xl border border-[var(--accent-border)]">
        <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 overflow-hidden shrink-0 shadow-2xl flex items-center justify-center">
          {playlist.artwork_url && !hasImageError ? (
            <img
              src={upgradeArtworkQuality(playlist.artwork_url)}
              alt={playlist.title}
              referrerPolicy="no-referrer"
              onError={() => setHasImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-14 h-14 text-white/50" />
          )}
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--accent-text)] uppercase tracking-wider bg-[var(--accent-subtle)] px-2.5 py-1 rounded-md border border-[var(--accent-border)]">
              Playlist
            </span>

            {/* Ações da Playlist (Editar e Excluir) se não for VLLM */}
            {playlist.id !== "VLLM" && (
              <div className="flex items-center gap-1.5">
                {onEditPlaylist && (
                  <button
                    type="button"
                    onClick={() => onEditPlaylist(playlist)}
                    title="Editar título e descrição da playlist"
                    aria-label="Editar playlist"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeletePlaylist && (
                  <button
                    type="button"
                    onClick={() => onDeletePlaylist(playlist)}
                    title="Excluir playlist do YouTube Music"
                    aria-label="Excluir playlist"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#8c91a4] hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-extrabold text-white">
            {playlist.title}
          </h2>
          {playlist.subtitle && (
            <p className="text-xs text-[#8c91a4]">
              {playlist.subtitle}
            </p>
          )}
          {playlist.description && (
            <p className="text-xs text-[#8c91a4] line-clamp-2 italic">
              {playlist.description}
            </p>
          )}
          <p className="text-xs text-[#71778c]">
            {tracks.length} {tracks.length === 1 ? "música carregada" : "músicas carregadas"}
          </p>

          <div className="pt-2">
            <button
              onClick={() => onPlayPlaylist(displayedTracks)}
              disabled={displayedTracks.length === 0}
              className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-[var(--accent-glow)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              {searchFilter.trim() || sortBy !== "original"
                ? `Tocar Lista Filtrada (${displayedTracks.length})`
                : "Tocar Playlist"}
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Ordenação (Sugestão 2.2) */}
      {tracks.length > 0 && (
        <div className="relative z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#121520]/80 border border-[#212638] backdrop-blur-md">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="w-4 h-4 text-[#6c7287] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={filterInputRef}
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar nesta playlist... (Ctrl+F)"
              aria-label="Filtrar músicas na playlist"
              className="w-full bg-[#181c28] text-xs text-white placeholder-[#6c7287] pl-9 pr-8 py-2 rounded-lg border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                title="Limpar filtro"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c91a4] hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controles de Ordenação e Contador */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* Seletor de Ordenação Customizado */}
            <div ref={sortRef} className="relative flex items-center gap-1.5 text-xs text-[#8c91a4]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#6c7287] shrink-0" />
              <label htmlFor="playlist-sort-select" className="hidden md:inline text-[11px] font-medium text-[#6c7287]">
                Ordenar por:
              </label>

              {/* Select acessível invisível para leitores de tela e testes automatizados */}
              <select
                id="playlist-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PlaylistSortOption)}
                aria-label="Ordenar músicas da playlist"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Botão de Gatilho do Dropdown Customizado */}
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className={`flex items-center gap-2 bg-[#181c28] text-[#d1d5db] hover:text-white border rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer select-none ${
                  isSortOpen
                    ? "border-[var(--accent)] shadow-md shadow-[var(--accent-glow)] bg-[#1e2334]"
                    : "border-[#272d40] hover:border-[#384056] hover:bg-[#1c202e]"
                }`}
                aria-haspopup="listbox"
                aria-expanded={isSortOpen}
              >
                <span>{sortOptionLabels[sortBy]}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8c91a4] transition-transform duration-200 ${
                    isSortOpen ? "rotate-180 text-[var(--accent-text)]" : ""
                  }`}
                />
              </button>

              {/* Menu Flutuante Customizado (Substitui gaveta nativa do Windows) */}
              {isSortOpen && (
                <div
                  role="listbox"
                  aria-label="Opções de ordenação"
                  className="absolute right-0 top-full mt-1.5 z-50 min-w-[195px] bg-[#12141f]/95 backdrop-blur-2xl border border-[#272c3f] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSortBy(opt.value);
                          setIsSortOpen(false);
                        }}
                        className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-[var(--accent-subtle)] text-white border border-[var(--accent-border)] font-semibold shadow-sm"
                            : "text-[#c4c8d8] hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contador de Músicas */}
            <span className="text-xs text-[#6c7287] font-mono shrink-0">
              {searchFilter.trim()
                ? `${displayedTracks.length} de ${tracks.length}`
                : `${tracks.length} ${tracks.length === 1 ? "faixa" : "faixas"}`}
            </span>
          </div>
        </div>
      )}

      {/* Lista de Faixas com Virtualização */}
      <div className="relative z-10 space-y-2">
        {isLoadingTracks && tracks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <p className="text-xs">Carregando músicas da playlist...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
            <Music className="w-6 h-6 text-[#343a4e]" />
            <p className="text-xs">Nenhuma faixa encontrada nesta playlist.</p>
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl p-4">
            <SearchX className="w-8 h-8 text-[var(--accent)]" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Nenhuma música encontrada</p>
              <p className="text-xs text-[#8c91a4] mt-0.5">
                Nenhum resultado corresponde a "{searchFilter}".
              </p>
            </div>
            <button
              onClick={() => setSearchFilter("")}
              className="text-xs bg-[#1f232e] hover:bg-[#2b3040] text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <VirtualizedTrackList
            tracks={displayedTracks}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            loadingTrackId={loadingTrackId}
            playlistId={playlist.id}
            canReorder={
              playlist.id !== "VLLM" &&
              sortBy === "original" &&
              !searchFilter.trim() &&
              !!onReorderTrack
            }
            onReorderTrack={onReorderTrack}
            onPlayTrack={(track, idx) => onPlayTrack(track, idx, displayedTracks)}
            onTogglePlayPause={onTogglePlayPause}
            parentRef={scrollRef}
          />
        )}
      </div>
    </div>
  );
});
