import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar/Sidebar";
import { Playlist, Album } from "../../types";

const mockPlaylists: Playlist[] = [
  {
    id: "VLLM",
    title: "Músicas Curtidas",
    track_count: "120 músicas",
    artwork_url: "https://example.com/liked.jpg",
  },
  {
    id: "PL_SYNTH",
    title: "Synthwave Night",
    track_count: "42 músicas",
    artwork_url: "https://example.com/synth.jpg",
  },
];

const mockAlbums: Album[] = [
  {
    id: "MPREb_DISCOVERY",
    title: "Discovery",
    artist: "Daft Punk",
    year: "2001",
    artwork_url: "https://example.com/discovery.jpg",
    album_type: "album",
  },
];

describe("Sidebar Navigation & Unified Collection", () => {
  it("deve disparar setActiveTab ao clicar nos botões principais da sidebar", () => {
    const handleSetActiveTab = vi.fn();
    const handleSelectPlaylist = vi.fn();

    render(
      <Sidebar
        activeTab="library"
        setActiveTab={handleSetActiveTab}
        playlists={[]}
        isLoadingPlaylists={false}
        onRefreshPlaylists={vi.fn()}
        selectedPlaylist={null}
        onSelectPlaylist={handleSelectPlaylist}
        auth={null}
        isCheckingAuth={false}
        onRefreshAuth={vi.fn()}
        playlistHistory={{}}
        pinnedPlaylistIds={[]}
        setPinnedPlaylistIds={vi.fn()}
      />
    );

    const searchBtn = screen.getByRole("button", { name: /buscar no yt music/i });
    fireEvent.click(searchBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("search");

    const statsBtn = screen.getByRole("button", { name: /estatísticas/i });
    fireEvent.click(statsBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("stats");

    const libraryBtn = screen.getByRole("button", { name: /biblioteca/i });
    fireEvent.click(libraryBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("library");
  });

  it("deve exibir playlists e álbuns juntos em Sua Coleção e filtrar pelas pílulas Tudo, Playlists e Álbuns", () => {
    render(
      <Sidebar
        activeTab="library"
        setActiveTab={vi.fn()}
        playlists={mockPlaylists}
        isLoadingPlaylists={false}
        onRefreshPlaylists={vi.fn()}
        selectedPlaylist={null}
        onSelectPlaylist={vi.fn()}
        albums={mockAlbums}
        isLoadingAlbums={false}
        selectedAlbum={null}
        onSelectAlbum={vi.fn()}
        auth={null}
        isCheckingAuth={false}
        onRefreshAuth={vi.fn()}
        playlistHistory={{}}
        pinnedPlaylistIds={["VLLM", "MPREb_DISCOVERY"]}
        setPinnedPlaylistIds={vi.fn()}
      />
    );

    // Em "Tudo", ambos playlists e álbuns aparecem
    expect(screen.getByText("Músicas Curtidas")).toBeInTheDocument();
    expect(screen.getByText("Synthwave Night")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();

    // Filtra apenas por Álbuns
    fireEvent.click(screen.getByRole("tab", { name: /álbuns/i }));
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.queryByText("Músicas Curtidas")).not.toBeInTheDocument();
    expect(screen.queryByText("Synthwave Night")).not.toBeInTheDocument();

    // Filtra apenas por Playlists
    fireEvent.click(screen.getByRole("tab", { name: /playlists/i }));
    expect(screen.getByText("Músicas Curtidas")).toBeInTheDocument();
    expect(screen.getByText("Synthwave Night")).toBeInTheDocument();
    expect(screen.queryByText("Discovery")).not.toBeInTheDocument();
  });

  it("deve permitir busca rápida na coleção via lupa compacta e reproduzir item rapidamente pela mini-capa", () => {
    const handlePlayAlbumQuick = vi.fn();

    render(
      <Sidebar
        activeTab="library"
        setActiveTab={vi.fn()}
        playlists={mockPlaylists}
        isLoadingPlaylists={false}
        onRefreshPlaylists={vi.fn()}
        selectedPlaylist={null}
        onSelectPlaylist={vi.fn()}
        albums={mockAlbums}
        isLoadingAlbums={false}
        selectedAlbum={null}
        onSelectAlbum={vi.fn()}
        onPlayAlbumQuick={handlePlayAlbumQuick}
        auth={null}
        isCheckingAuth={false}
        onRefreshAuth={vi.fn()}
        playlistHistory={{}}
        pinnedPlaylistIds={["MPREb_DISCOVERY"]}
        setPinnedPlaylistIds={vi.fn()}
      />
    );

    // Abre a lupa compacta e filtra por "Daft Punk"
    const searchToggle = screen.getByRole("button", {
      name: /filtrar coleção na barra lateral/i,
    });
    fireEvent.click(searchToggle);

    const searchInput = screen.getByPlaceholderText(/filtrar coleção/i);
    fireEvent.change(searchInput, { target: { value: "Daft Punk" } });

    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.queryByText("Synthwave Night")).not.toBeInTheDocument();

    // Clica no botão de Play Rápido na mini-capa do álbum
    const quickPlayBtn = screen.getByRole("button", {
      name: /reproduzir discovery rapidamente/i,
    });
    fireEvent.click(quickPlayBtn);
    expect(handlePlayAlbumQuick).toHaveBeenCalledTimes(1);
  });
});
