import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlbumGridView } from "../MainView/AlbumGridView";
import { AlbumDetailView } from "../MainView/AlbumDetailView";
import { Album, AlbumDetail, Track } from "../../types";

vi.mock("../../context/PlayerContext", () => ({
  usePlayer: () => ({
    openContextMenu: vi.fn(),
  }),
}));

const mockAlbums: Album[] = [
  {
    id: "MPREb_album1",
    title: "Discovery",
    artist: "Daft Punk",
    year: "2001",
    album_type: "album",
    track_count: 14,
  },
  {
    id: "MPREb_album2",
    title: "Random Access Memories",
    artist: "Daft Punk",
    year: "2013",
    album_type: "album",
    track_count: 13,
  },
  {
    id: "MPREb_album3",
    title: "Currents",
    artist: "Tame Impala",
    year: "2015",
    album_type: "album",
    track_count: 13,
  },
];

const mockTracks: Track[] = [
  {
    id: "trk-1",
    title: "One More Time",
    artist: "Daft Punk",
    album: "Discovery",
    album_id: "MPREb_album1",
    duration: "5:20",
    duration_seconds: 320,
  },
  {
    id: "trk-2",
    title: "Aerodynamic",
    artist: "Daft Punk",
    album: "Discovery",
    album_id: "MPREb_album1",
    duration: "3:27",
    duration_seconds: 207,
  },
];

const mockAlbumDetail: AlbumDetail = {
  ...mockAlbums[0],
  description: "Segundo álbum de estúdio do duo francês.",
  release_date: "12 de março de 2001",
  copyright: "℗ 2001 Daft Life Ltd",
  tracks: mockTracks,
};

describe("AlbumGridView Component", () => {
  it("deve renderizar a grade de álbuns corretamente", () => {
    const handleSelect = vi.fn();
    render(
      <AlbumGridView
        albums={mockAlbums}
        isLoading={false}
        onRefresh={vi.fn()}
        onSelectAlbum={handleSelect}
      />
    );

    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Random Access Memories")).toBeInTheDocument();
    expect(screen.getByText("Currents")).toBeInTheDocument();
  });

  it("deve filtrar álbuns em tempo real por título e artista", () => {
    render(
      <AlbumGridView
        albums={mockAlbums}
        isLoading={false}
        onRefresh={vi.fn()}
        onSelectAlbum={vi.fn()}
      />
    );

    const filterInput = screen.getByPlaceholderText(/buscar por álbum/i);
    fireEvent.change(filterInput, { target: { value: "Tame" } });

    expect(screen.getByText("Currents")).toBeInTheDocument();
    expect(screen.queryByText("Discovery")).not.toBeInTheDocument();
    expect(screen.queryByText("Random Access Memories")).not.toBeInTheDocument();
  });

  it("deve disparar onSelectAlbum ao clicar em um cartão de álbum", () => {
    const handleSelect = vi.fn();
    render(
      <AlbumGridView
        albums={mockAlbums}
        isLoading={false}
        onRefresh={vi.fn()}
        onSelectAlbum={handleSelect}
      />
    );

    fireEvent.click(screen.getByText("Discovery"));
    expect(handleSelect).toHaveBeenCalledWith(mockAlbums[0]);
  });
});

describe("AlbumDetailView Component", () => {
  it("deve exibir metadados do álbum e lista ordinal de faixas", () => {
    render(
      <AlbumDetailView
        album={mockAlbums[0]}
        albumDetail={mockAlbumDetail}
        isLoading={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayAlbum={vi.fn()}
        onPlayTrack={vi.fn()}
      />
    );

    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("One More Time")).toBeInTheDocument();
    expect(screen.getByText("Aerodynamic")).toBeInTheDocument();
    expect(screen.getByText(/Segundo álbum de estúdio/i)).toBeInTheDocument();
    expect(screen.getByText(/Daft Life Ltd/i)).toBeInTheDocument();
  });

  it("deve disparar onPlayAlbum ao clicar no botão Reproduzir", () => {
    const handlePlayAlbum = vi.fn();
    render(
      <AlbumDetailView
        album={mockAlbums[0]}
        albumDetail={mockAlbumDetail}
        isLoading={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayAlbum={handlePlayAlbum}
        onPlayTrack={vi.fn()}
      />
    );

    const playBtn = screen.getByRole("button", { name: /reproduzir álbum na íntegra/i });
    fireEvent.click(playBtn);
    expect(handlePlayAlbum).toHaveBeenCalledWith(mockTracks, 0, false);
  });

  it("deve disparar onPlayTrack ao clicar em uma faixa ordinal", () => {
    const handlePlayTrack = vi.fn();
    render(
      <AlbumDetailView
        album={mockAlbums[0]}
        albumDetail={mockAlbumDetail}
        isLoading={false}
        currentTrack={null}
        isPlaying={false}
        loadingTrackId={null}
        onBack={vi.fn()}
        onPlayAlbum={vi.fn()}
        onPlayTrack={handlePlayTrack}
      />
    );

    fireEvent.click(screen.getByText("Aerodynamic"));
    expect(handlePlayTrack).toHaveBeenCalledWith(mockTracks[1], 1, mockTracks);
  });
});
