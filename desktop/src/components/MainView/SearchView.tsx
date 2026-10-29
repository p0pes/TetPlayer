import React, { useState } from "react";
import { Search, Loader2, Music, X, SearchX, Disc3, LayoutGrid } from "lucide-react";
import { Track, Album } from "../../types";
import { VirtualizedTrackList } from "./VirtualizedTrackList";
import { AlbumCard } from "./AlbumCard";

export type SearchFilterSection = "all" | "tracks" | "albums";

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e?: React.FormEvent) => void;
  isSearching: boolean;
  searchResults: Track[];
  searchAlbums?: Album[];
  currentTrack: Track | null;
  isPlaying: boolean;
  loadingTrackId: string | null;
  onPlayTrack: (track: Track, index: number) => void;
  onTogglePlayPause?: () => void;
  onSelectAlbum?: (album: Album) => void;
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
  pinnedAlbumIds?: string[];
  onTogglePinAlbum?: (albumId: string, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLElement | null>;
  hasSearched?: boolean;
}

export const SearchView = React.memo(function SearchView({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchResults,
  searchAlbums = [],
  currentTrack,
  isPlaying,
  loadingTrackId,
  onPlayTrack,
  onTogglePlayPause,
  onSelectAlbum,
  onPlayAlbumQuick,
  pinnedAlbumIds = [],
  onTogglePinAlbum,
  scrollRef,
  hasSearched = false,
}: SearchViewProps) {
  const [filterSection, setFilterSection] = useState<SearchFilterSection>("all");

  const totalResults = searchResults.length + searchAlbums.length;

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

      {/* Segmented Control de Filtro de Busca (quando há busca realizada) */}
      {hasSearched && totalResults > 0 && !isSearching && (
        <div className="relative inline-flex items-center p-1 bg-[#12141f] border border-[#272c3f] rounded-xl select-none self-start animate-view-fade">
          <div
            className="absolute top-1 bottom-1 w-28 rounded-lg bg-[var(--accent)] shadow-md shadow-[var(--accent-glow)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
            style={{
              transform:
                filterSection === "all"
                  ? "translate3d(0px, 0, 0)"
                  : filterSection === "tracks"
                  ? "translate3d(112px, 0, 0)"
                  : "translate3d(224px, 0, 0)",
            }}
          />

          <button
            type="button"
            onClick={() => setFilterSection("all")}
            className={`relative z-10 w-28 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
              filterSection === "all" ? "text-white font-bold" : "text-[#8c91a4] hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tudo</span>
            <span className="text-[10px] opacity-75 font-mono">({totalResults})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterSection("tracks")}
            className={`relative z-10 w-28 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
              filterSection === "tracks" ? "text-white font-bold" : "text-[#8c91a4] hover:text-white"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Músicas</span>
            <span className="text-[10px] opacity-75 font-mono">({searchResults.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterSection("albums")}
            className={`relative z-10 w-28 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
              filterSection === "albums" ? "text-white font-bold" : "text-[#8c91a4] hover:text-white"
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Álbuns</span>
            <span className="text-[10px] opacity-75 font-mono">({searchAlbums.length})</span>
          </button>
        </div>
      )}

      {/* Resultados da Busca */}
      <div className="space-y-6">
        {isSearching ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            <p className="text-xs">Buscando músicas e álbuns no YouTube Music...</p>
          </div>
        ) : totalResults === 0 ? (
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
              <p className="text-xs">Digite algo acima para pesquisar faixas ou álbuns no YouTube Music.</p>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-view-fade">
            {/* Seção de Álbuns (quando na aba Tudo ou Álbuns) */}
            {(filterSection === "all" || filterSection === "albums") && searchAlbums.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Disc3 className="w-4 h-4 text-[var(--accent-text)]" />
                    <span>Álbuns Encontrados ({searchAlbums.length})</span>
                  </h3>
                  {filterSection === "all" && searchAlbums.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setFilterSection("albums")}
                      className="text-xs text-[var(--accent-text)] hover:underline cursor-pointer font-medium"
                    >
                      Ver todos os álbuns ({searchAlbums.length}) →
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {(filterSection === "all" ? searchAlbums.slice(0, 6) : searchAlbums).map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      onSelect={(al) => onSelectAlbum?.(al)}
                      onPlay={(al, e) => onPlayAlbumQuick?.(al, e)}
                      isPinned={pinnedAlbumIds.includes(album.id)}
                      onTogglePin={onTogglePinAlbum}
                      density="compact"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seção de Músicas (quando na aba Tudo ou Músicas) */}
            {(filterSection === "all" || filterSection === "tracks") && searchResults.length > 0 && (
              <div className="space-y-3">
                {filterSection === "all" && searchAlbums.length > 0 && (
                  <div className="flex items-center justify-between pb-1 border-b border-white/5">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Music className="w-4 h-4 text-[var(--accent-text)]" />
                      <span>Músicas ({searchResults.length})</span>
                    </h3>
                  </div>
                )}
                <VirtualizedTrackList
                  tracks={searchResults}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  loadingTrackId={loadingTrackId}
                  onPlayTrack={onPlayTrack}
                  onTogglePlayPause={onTogglePlayPause}
                  parentRef={scrollRef}
                />
              </div>
            )}

            {/* Mensagens de aba vazia */}
            {filterSection === "albums" && searchAlbums.length === 0 && (
              <div className="py-12 text-center text-[#71778c]">
                <p className="text-sm">Nenhum álbum encontrado para esta pesquisa.</p>
              </div>
            )}
            {filterSection === "tracks" && searchResults.length === 0 && (
              <div className="py-12 text-center text-[#71778c]">
                <p className="text-sm">Nenhuma música encontrada para esta pesquisa.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
