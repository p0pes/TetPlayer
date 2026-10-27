import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar/Sidebar";

describe("Sidebar Navigation", () => {
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

    // Clicar em Buscar
    const searchBtn = screen.getByRole("button", { name: /buscar/i });
    fireEvent.click(searchBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("search");

    // Clicar em Estatísticas
    const statsBtn = screen.getByRole("button", { name: /estatísticas/i });
    fireEvent.click(statsBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("stats");

    // Clicar em Biblioteca
    const libraryBtn = screen.getByRole("button", { name: /biblioteca/i });
    fireEvent.click(libraryBtn);
    expect(handleSetActiveTab).toHaveBeenCalledWith("library");
  });
});
