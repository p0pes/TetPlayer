import React, { useState, useMemo } from "react";
import { Disc3, Search, RefreshCw, Loader2, ArrowUpDown } from "lucide-react";
import { Album } from "../../types";
import { AlbumCard } from "./AlbumCard";

export type AlbumSortOption = "recent" | "title" | "artist" | "year_desc" | "year_asc";

interface AlbumGridViewProps {
  albums: Album[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAlbum: (album: Album) => void;
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
}

export const AlbumGridView = React.memo(function AlbumGridView({
  albums,
  isLoading,
  onRefresh,
  onSelectAlbum,
  onPlayAlbumQuick,
}: AlbumGridViewProps) {
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<AlbumSortOption>("recent");

  const filteredAlbums = useMemo(() => {
    let result = albums;

    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.toLowerCase().includes(q) ||
          (a.year && a.year.includes(q))
      );
    }

    if (sortBy === "recent") return result;

    const sorted = [...result];
    if (sortBy === "title") {
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })
      );
    } else if (sortBy === "artist") {
      sorted.sort((a, b) =>
        a.artist.localeCompare(b.artist, "pt-BR", { sensitivity: "base" })
      );
    } else if (sortBy === "year_desc") {
      sorted.sort((a, b) => (b.year || "0").localeCompare(a.year || "0"));
    } else if (sortBy === "year_asc") {
      sorted.sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999"));
    }

    return sorted;
  }, [albums, filterText, sortBy]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtro e Ordenação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca de Álbuns */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#71778c] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar por álbum, artista ou ano..."
            className="w-full bg-[#131622] border border-[#232738] focus:border-[var(--accent-border)] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#5a6074] focus:outline-none transition-colors"
          />
        </div>

        {/* Ordenação e Botão Atualizar */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#71778c] absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AlbumSortOption)}
              aria-label="Ordenar álbuns"
              className="bg-[#131622] border border-[#232738] focus:border-[var(--accent-border)] rounded-xl pl-8 pr-7 py-2 text-xs text-[#a0a5b8] focus:text-white focus:outline-none cursor-pointer appearance-none transition-colors"
            >
              <option value="recent">Recentes</option>
              <option value="title">Título (A-Z)</option>
              <option value="artist">Artista (A-Z)</option>
              <option value="year_desc">Ano (Mais novos)</option>
              <option value="year_asc">Ano (Mais antigos)</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Atualizar álbuns"
            aria-label="Atualizar lista de álbuns"
            className="p-2 rounded-xl bg-[#131622] hover:bg-[#1a1e2c] border border-[#232738] text-[#8c91a4] hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[var(--accent)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Grade de Álbuns */}
      {isLoading && albums.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#71778c]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-medium">Carregando seus álbuns...</span>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center text-[#71778c] bg-[#10121a]/50 rounded-2xl border border-dashed border-[#1f232e] p-6">
          <Disc3 className="w-12 h-12 text-[#3b4154] mb-3" />
          <p className="text-sm font-bold text-white">Nenhum álbum encontrado</p>
          <p className="text-xs text-[#71778c] max-w-sm mt-1">
            {filterText
              ? `Nenhum álbum corresponde ao termo "${filterText}". Tente outra busca.`
              : "Sua coleção de álbuns ainda não possui itens salvos no YouTube Music."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredAlbums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onSelect={onSelectAlbum}
              onPlay={onPlayAlbumQuick}
            />
          ))}
        </div>
      )}
    </div>
  );
});
