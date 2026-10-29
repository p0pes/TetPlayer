import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Disc3, RefreshCw, Loader2, ArrowUpDown, X, ChevronDown, Check } from "lucide-react";
import { Album } from "../../types";
import { AlbumCard } from "./AlbumCard";

interface AlbumGridViewProps {
  albums: Album[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAlbum: (album: Album) => void;
  onPlayAlbumQuick?: (album: Album, e: React.MouseEvent) => void;
  pinnedAlbumIds?: string[];
  onTogglePinAlbum?: (albumId: string, e: React.MouseEvent) => void;
}

type SortOption = "title" | "artist" | "year_desc" | "year_asc";

export const AlbumGridView = React.memo(function AlbumGridView({
  albums,
  isLoading,
  onRefresh,
  onSelectAlbum,
  onPlayAlbumQuick,
  pinnedAlbumIds = [],
  onTogglePinAlbum,
}: AlbumGridViewProps) {
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const pinnedSet = useMemo(() => new Set(pinnedAlbumIds), [pinnedAlbumIds]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "title", label: "Título (A-Z)" },
    { value: "artist", label: "Artista (A-Z)" },
    { value: "year_desc", label: "Mais recentes" },
    { value: "year_asc", label: "Mais antigos" },
  ];

  // Fecha o menu customizado ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isSortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortOpen]);

  const filteredAlbums = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const matches = query
      ? albums.filter(
          (a) =>
            a.title.toLowerCase().includes(query) ||
            a.artist.toLowerCase().includes(query) ||
            (a.year && a.year.toLowerCase().includes(query))
        )
      : [...albums];

    const sortList = (list: Album[]) =>
      [...list].sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        if (sortBy === "artist") {
          const cmp = a.artist.localeCompare(b.artist, "pt-BR", { sensitivity: "base" });
          return cmp !== 0
            ? cmp
            : a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        if (sortBy === "year_desc") {
          const yA = parseInt(a.year || "0", 10) || 0;
          const yB = parseInt(b.year || "0", 10) || 0;
          return yB - yA || a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        if (sortBy === "year_asc") {
          const yA = parseInt(a.year || "9999", 10) || 9999;
          const yB = parseInt(b.year || "9999", 10) || 9999;
          return yA - yB || a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        return 0;
      });

    const pinned = pinnedAlbumIds
      .map((id) => matches.find((a) => a.id === id))
      .filter((a): a is Album => !!a);
    const unpinned = sortList(matches.filter((a) => !pinnedSet.has(a.id)));

    return [...pinned, ...unpinned];
  }, [albums, filterText, sortBy, pinnedAlbumIds, pinnedSet]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Controles de Filtro/Ordenação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Disc3 className="w-6 h-6 text-[var(--accent)]" />
            <span>Seus Álbuns</span>
          </h1>
          <p className="text-xs text-[#71778c] mt-1">
            Explore álbuns da sua biblioteca e lançamentos salvos dos seus artistas favoritos
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Busca Rápida de Álbum */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#63697e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar por álbum ou artista..."
              aria-label="Filtrar álbuns"
              className="w-full bg-[#131622] border border-[#232738] focus:border-[var(--accent)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#63697e] outline-none transition-colors"
            />
            {filterText && (
              <button
                onClick={() => setFilterText("")}
                aria-label="Limpar filtro"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#63697e] hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Seletor de Ordenação Customizado (Integrado à Identidade Visual do App) */}
          <div ref={sortDropdownRef} className="relative flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#71778c] shrink-0" />
            <button
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
              aria-label="Ordenar álbuns por"
              aria-expanded={isSortOpen}
              aria-haspopup="listbox"
              className={`flex items-center justify-between gap-2.5 min-w-[150px] bg-[#131622] hover:bg-[#191d2c] border rounded-xl px-3 py-1.5 text-xs font-medium text-white transition-all cursor-pointer select-none ${
                isSortOpen
                  ? "border-[var(--accent)] ring-1 ring-[var(--accent-glow)]/40"
                  : "border-[#232738] hover:border-[#323850]"
              }`}
            >
              <span className="truncate">
                {sortOptions.find((o) => o.value === sortBy)?.label || "Título (A-Z)"}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#8c91a4] transition-transform duration-200 shrink-0 ${
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
              isPinned={pinnedSet.has(album.id)}
              onTogglePin={onTogglePinAlbum}
            />
          ))}
        </div>
      )}
    </div>
  );
});
