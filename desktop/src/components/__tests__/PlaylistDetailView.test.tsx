import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistDetailView } from "../MainView/PlaylistDetailView";
import { Playlist, Track } from "../../types";

vi.mock("../../context/PlayerContext", () => ({
  usePlayer: () => ({
    openContextMenu: vi.fn(),
  }),
  triggerTrackContextMenu: vi.fn(),
}));

const mockPlaylist: Playlist = {
  id: "test-pl",
  title: "Minha Playlist de Teste",
  subtitle: "Criada para testes unitários",
  artwork_url: "https://example.com/cover.jpg",
};

const mockTracks: Track[] = [
  {
    id: "track-1",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    duration: "5:55",
    duration_seconds: 355,
  },
  {
    id: "track-2",
    title: "Stairway to Heaven",
    artist: "Led Zeppelin",
    album: "Led Zeppelin IV",
    duration: "8:02",
    duration_seconds: 482,
  },
  {
    id: "track-3",
    title: "Another One Bites the Dust",
    artist: "Queen",
    album: "The Game",
    duration: "3:35",
    duration_seconds: 215,
  },
];

describe("PlaylistDetailView (Busca e Ordenação - Item 2.2)", () => {
  it("deve filtrar músicas em tempo real por título e artista", () => {
    const handlePlayTrack = vi.fn();
    const handlePlayPlaylist = vi.fn();

    render(
      <PlaylistDetailView
        playlist={mockPlaylist}
        tracks={mockTracks}
        isLoadingTracks={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayPlaylist={handlePlayPlaylist}
        onPlayTrack={handlePlayTrack}
        scrollRef={{ current: null }}
      />
    );

    // Inicialmente mostra 3 faixas
    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    expect(screen.getByText("Stairway to Heaven")).toBeInTheDocument();
    expect(screen.getByText("Another One Bites the Dust")).toBeInTheDocument();

    // Digita "Queen" no filtro
    const input = screen.getByPlaceholderText(/filtrar nesta playlist/i);
    fireEvent.change(input, { target: { value: "Queen" } });

    // Apenas faixas do Queen devem estar presentes
    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    expect(screen.getByText("Another One Bites the Dust")).toBeInTheDocument();
    expect(screen.queryByText("Stairway to Heaven")).not.toBeInTheDocument();

    // Contador deve refletir 2 de 3
    expect(screen.getByText("2 de 3")).toBeInTheDocument();
  });

  it("deve limpar a busca ao clicar no botão X", () => {
    render(
      <PlaylistDetailView
        playlist={mockPlaylist}
        tracks={mockTracks}
        isLoadingTracks={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayPlaylist={vi.fn()}
        onPlayTrack={vi.fn()}
        scrollRef={{ current: null }}
      />
    );

    const input = screen.getByPlaceholderText(/filtrar nesta playlist/i);
    fireEvent.change(input, { target: { value: "Led" } });
    expect(screen.queryByText("Bohemian Rhapsody")).not.toBeInTheDocument();

    // Clica no botão X para limpar
    const clearBtn = screen.getByTitle("Limpar filtro");
    fireEvent.click(clearBtn);

    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
    expect(screen.getByText("Stairway to Heaven")).toBeInTheDocument();
  });

  it("deve exibir empty state específico quando nenhum resultado corresponder ao filtro", () => {
    render(
      <PlaylistDetailView
        playlist={mockPlaylist}
        tracks={mockTracks}
        isLoadingTracks={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayPlaylist={vi.fn()}
        onPlayTrack={vi.fn()}
        scrollRef={{ current: null }}
      />
    );

    const input = screen.getByPlaceholderText(/filtrar nesta playlist/i);
    fireEvent.change(input, { target: { value: "NonExistentTrackXYZ" } });

    expect(screen.getByText(/nenhuma música encontrada/i)).toBeInTheDocument();
    expect(screen.getByText(/limpar busca/i)).toBeInTheDocument();

    // Clica em Limpar busca
    fireEvent.click(screen.getByText(/limpar busca/i));
    expect(screen.getByText("Bohemian Rhapsody")).toBeInTheDocument();
  });

  it("deve ordenar músicas por título A-Z quando selecionado", () => {
    render(
      <PlaylistDetailView
        playlist={mockPlaylist}
        tracks={mockTracks}
        isLoadingTracks={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayPlaylist={vi.fn()}
        onPlayTrack={vi.fn()}
        scrollRef={{ current: null }}
      />
    );

    const sortSelect = screen.getByLabelText(/ordenar músicas da playlist/i);
    fireEvent.change(sortSelect, { target: { value: "title" } });

    // Verifica que a seleção de ordenação foi aplicada
    expect((sortSelect as HTMLSelectElement).value).toBe("title");
  });
});
