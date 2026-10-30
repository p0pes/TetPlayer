import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchView } from "../MainView/SearchView";
import { Track, Album } from "../../types";

vi.mock("../../context/PlayerContext", () => ({
  usePlayer: () => ({
    openContextMenu: vi.fn(),
  }),
  triggerTrackContextMenu: vi.fn(),
}));

const mockTracks: Track[] = [
  {
    id: "track1",
    title: "Faixa 1",
    artist: "Anitta",
    duration: "2:45",
    album: "Álbum Alfa",
    album_id: "MPREb_album1",
  },
  {
    id: "track2",
    title: "Faixa 2",
    artist: "Anitta",
    duration: "3:10",
    album: "Álbum Beta",
    album_id: "MPREb_album2",
  },
];

const mockAlbums: Album[] = [
  {
    id: "MPREb_album1",
    title: "EQUILIBRIVM",
    artist: "Anitta",
    year: "2024",
    album_type: "album",
    track_count: 8,
  },
  {
    id: "MPREb_album2",
    title: "EQUILIBRIVM II",
    artist: "Anitta",
    year: "2025",
    album_type: "album",
    track_count: 10,
  },
];

describe("SearchView (Busca com Álbuns e Músicas)", () => {
  it("renderiza o formulário de busca e permite digitar e submeter", () => {
    const setSearchQuery = vi.fn();
    const onSearch = vi.fn((e) => e?.preventDefault());
    const scrollRef = { current: document.createElement("div") };

    render(
      <SearchView
        searchQuery="equilibrium anitta"
        setSearchQuery={setSearchQuery}
        onSearch={onSearch}
        isSearching={false}
        searchResults={[]}
        searchAlbums={[]}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onPlayTrack={vi.fn()}
        scrollRef={scrollRef}
        hasSearched={false}
      />
    );

    const input = screen.getByPlaceholderText(/pesquisar músicas, artistas ou álbuns/i);
    expect(input).toBeDefined();

    fireEvent.change(input, { target: { value: "novo termo" } });
    expect(setSearchQuery).toHaveBeenCalledWith("novo termo");

    const submitBtn = screen.getByRole("button", { name: /buscar/i });
    fireEvent.click(submitBtn);
    expect(onSearch).toHaveBeenCalled();
  });

  it("renderiza segmented control com contagens de Tudo, Músicas e Álbuns", () => {
    const scrollRef = { current: document.createElement("div") };

    render(
      <SearchView
        searchQuery="equilibrium"
        setSearchQuery={vi.fn()}
        onSearch={vi.fn()}
        isSearching={false}
        searchResults={mockTracks}
        searchAlbums={mockAlbums}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onPlayTrack={vi.fn()}
        scrollRef={scrollRef}
        hasSearched={true}
      />
    );

    // Contadores: 2 tracks + 2 albums = 4 no total
    expect(screen.getByText("Tudo")).toBeDefined();
    expect(screen.getByText("(4)")).toBeDefined();
    expect(screen.getByText("Músicas")).toBeDefined();
    expect(screen.getByText("Álbuns")).toBeDefined();
    expect(screen.getAllByText("(2)").length).toBe(2);

    // Na aba 'Tudo', exibe títulos das seções
    expect(screen.getByText(/Álbuns Encontrados \(2\)/i)).toBeDefined();
    expect(screen.getByText(/Músicas \(2\)/i)).toBeDefined();

    // Verifica que os álbuns foram renderizados
    expect(screen.getByText("EQUILIBRIVM")).toBeDefined();
    expect(screen.getByText("EQUILIBRIVM II")).toBeDefined();
  });

  it("dispara onSelectAlbum ao clicar no card de um álbum", () => {
    const onSelectAlbum = vi.fn();
    const scrollRef = { current: document.createElement("div") };

    render(
      <SearchView
        searchQuery="anitta"
        setSearchQuery={vi.fn()}
        onSearch={vi.fn()}
        isSearching={false}
        searchResults={mockTracks}
        searchAlbums={mockAlbums}
        onSelectAlbum={onSelectAlbum}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onPlayTrack={vi.fn()}
        scrollRef={scrollRef}
        hasSearched={true}
      />
    );

    const albumItem = screen.getByText("EQUILIBRIVM");
    fireEvent.click(albumItem);

    expect(onSelectAlbum).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "MPREb_album1",
        title: "EQUILIBRIVM",
      })
    );
  });

  it("filtra visualizações ao clicar nas pílulas do SegmentedControl", () => {
    const scrollRef = { current: document.createElement("div") };

    render(
      <SearchView
        searchQuery="anitta"
        setSearchQuery={vi.fn()}
        onSearch={vi.fn()}
        isSearching={false}
        searchResults={mockTracks}
        searchAlbums={mockAlbums}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onPlayTrack={vi.fn()}
        scrollRef={scrollRef}
        hasSearched={true}
      />
    );

    // Clica na aba Álbuns
    const albumsTabBtn = screen.getByRole("button", { name: /álbuns/i });
    fireEvent.click(albumsTabBtn);

    // Na aba Álbuns, deve mostrar os cards de álbum
    expect(screen.getByText("EQUILIBRIVM")).toBeDefined();
    expect(screen.getByText("EQUILIBRIVM II")).toBeDefined();

    // E a seção de músicas não deve estar visível
    expect(screen.queryByText(/Músicas \(2\)/i)).toBeNull();
  });
});
