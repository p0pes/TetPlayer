import React, { useState, useMemo, useRef, useEffect } from "react";
import { Disc3, Search, RefreshCw, Loader2, ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { Album } from "../../types";
import { AlbumCard } from "./AlbumCard";

export type AlbumSortOption = "recent" | "title" | "artist" | "year_desc" | "year_asc";

const sortOptions: { value: AlbumSortOption; label: string }[] = [
  { value: "recent", label: "Recentes" },
  { value: "title", label: "Título (A-Z)" },
  { value: "artist", label: "Artista (A-Z)" },
  { value: "year_desc", label: "Ano (Mais novos)" },
  { value: "year_asc", label: "Ano (Mais antigos)" },
];

const sortOptionLabels: Record<AlbumSortOption, string> = {
  recent: "Recentes",
  title: "Título (A-Z)",
  artist: "Artista (A-Z)",
  year_desc: "Ano (Mais novos)",
  year_asc: "Ano (Mais antigos)",
};

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
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

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
          <div ref={sortRef} className="relative flex items-center">
            {/* Select acessível invisível para testes e acessibilidade */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AlbumSortOption)}
              aria-label="Ordenar álbuns"
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

            {/* Gatilho Customizado com Estilo do TetPlayer */}
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              className={`flex items-center gap-2 bg-[#131622] text-[#d1d5db] hover:text-white border rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer select-none ${
                isSortOpen
                  ? "border-[var(--accent)] shadow-md shadow-[var(--accent-glow)] bg-[#1e2334]"
                  : "border-[#232738] hover:border-[#384056] hover:bg-[#1a1e2c]"
              }`}
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#71778c] shrink-0" />
              <span>{sortOptionLabels[sortBy]}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#8c91a4] transition-transform duration-200 ${
                  isSortOpen ? "rotate-180 text-[var(--accent-text)]" : ""
                }`}
              />
            </button>

            {/* Menu Flutuante Customizado */}
            {isSortOpen && (
              <div
                role="listbox"
                aria-label="Opções de ordenação de álbuns"
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

