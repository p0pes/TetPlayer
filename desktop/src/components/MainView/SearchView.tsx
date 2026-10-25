import React from "react";
import { Search, Loader2, Music, X, SearchX } from "lucide-react";
import { Track } from "../../types";
import { VirtualizedTrackList } from "./VirtualizedTrackList";

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  isSearching: boolean;
  searchResults: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onPlayTrack: (track: Track, index: number) => void;
  onTogglePlayPause?: () => void;
  scrollRef: React.RefObject<HTMLElement | null>;
  hasSearched?: boolean;
}

export const SearchView = React.memo(function SearchView({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchResults,
  currentTrack,
  isPlaying,
  loadingTrackId,
  onPlayTrack,
  onTogglePlayPause,
  scrollRef,
  hasSearched = false,
}: SearchViewProps) {
  return (
    <div className="space-y-6">
      {/* Campo de Busca */}
      <form onSubmit={onSearch} className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e6479]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar músicas, artistas ou álbuns..."
            className="w-full bg-[#12141c] border border-[#232733] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-[#5e6479] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              title="Limpar pesquisa"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71778c] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-[var(--accent-glow)] flex items-center gap-2 transition-all cursor-pointer"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </button>
      </form>

      {/* Resultados da Busca com Virtualização */}
      <div className="space-y-2">
        {isSearching ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <p className="text-xs">Buscando no YouTube Music...</p>
          </div>
        ) : searchResults.length === 0 ? (
          hasSearched ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2.5 text-[#71778c] border border-dashed border-[#232838] rounded-xl p-6 text-center animate-in fade-in duration-150">
              <SearchX className="w-8 h-8 text-[#5e6479]" />
              <p className="text-sm font-semibold text-white">
                Nenhum resultado encontrado para &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-[#8c91a4] max-w-sm">
                Verifique se o nome está correto ou tente buscar por termos mais genéricos, outros artistas ou álbuns.
              </p>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
              <Music className="w-8 h-8 text-[#343a4e]" />
              <p className="text-xs">Digite algo acima para pesquisar qualquer faixa no YouTube Music.</p>
            </div>
          )
        ) : (
          <VirtualizedTrackList
            tracks={searchResults}
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
});

