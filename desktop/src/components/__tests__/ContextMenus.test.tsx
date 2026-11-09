import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrackContextMenu } from "../ContextMenu/TrackContextMenu";
import { CollectionContextMenu, CollectionContextItem } from "../ContextMenu/CollectionContextMenu";
import { DownloadsService } from "../../services/downloads";
import { Track, Playlist, Album } from "../../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

vi.mock("../../context/PlayerContext", () => ({
  usePlayer: () => ({
    handlePlayNext: vi.fn(),
    handleAddToQueue: vi.fn(),
    handleStartRadio: vi.fn(),
    searchArtist: vi.fn(),
  }),
}));

describe("Menus de Contexto — Opções de Download e Remoção Offline", () => {
  const sampleTrack: Track = {
    id: "track_test_123",
    title: "Miku Beam Song",
    artist: "Hatsune Miku",
    artwork_url: "https://example.com/art.jpg",
  };

  const samplePlaylist: Playlist = {
    id: "playlist_test_456",
    title: "Minha Playlist Favorita",
    subtitle: "10 músicas",
    artwork_url: "https://example.com/pl.jpg",
  };

  const sampleAlbum: Album = {
    id: "album_test_789",
    title: "Vocaloid Greatest Hits",
    artist: "Various Artists",
    artwork_url: "https://example.com/al.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TrackContextMenu (Músicas Individuais)", () => {
    it("deve exibir 'Baixar para ouvir offline' quando a música NÃO estiver baixada", () => {
      vi.spyOn(DownloadsService, "isDownloaded").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isDownloading").mockReturnValue(false);

      render(
        <TrackContextMenu
          track={sampleTrack}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Baixar para ouvir offline")).toBeInTheDocument();
      expect(screen.queryByText("Remover do download")).not.toBeInTheDocument();
    });

    it("deve disparar downloadTrack ao clicar em 'Baixar para ouvir offline'", async () => {
      vi.spyOn(DownloadsService, "isDownloaded").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isDownloading").mockReturnValue(false);
      const downloadSpy = vi.spyOn(DownloadsService, "downloadTrack").mockResolvedValue({} as any);

      render(
        <TrackContextMenu
          track={sampleTrack}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );

      const downloadBtn = screen.getByText("Baixar para ouvir offline");
      await fireEvent.click(downloadBtn);

      expect(downloadSpy).toHaveBeenCalledWith(sampleTrack);
    });

    it("deve exibir 'Remover do download' quando a música ESTIVER baixada", () => {
      vi.spyOn(DownloadsService, "isDownloaded").mockReturnValue(true);
      vi.spyOn(DownloadsService, "isDownloading").mockReturnValue(false);

      render(
        <TrackContextMenu
          track={sampleTrack}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Remover do download")).toBeInTheDocument();
      expect(screen.queryByText("Baixar para ouvir offline")).not.toBeInTheDocument();
    });

    it("deve disparar removeDownload ao clicar em 'Remover do download'", async () => {
      vi.spyOn(DownloadsService, "isDownloaded").mockReturnValue(true);
      vi.spyOn(DownloadsService, "isDownloading").mockReturnValue(false);
      const removeSpy = vi.spyOn(DownloadsService, "removeDownload").mockResolvedValue(true);

      render(
        <TrackContextMenu
          track={sampleTrack}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
        />
      );

      const removeBtn = screen.getByText("Remover do download");
      await fireEvent.click(removeBtn);

      expect(removeSpy).toHaveBeenCalledWith(sampleTrack.id);
    });
  });

  describe("CollectionContextMenu (Playlists e Álbuns)", () => {
    it("deve exibir 'Remover Downloads da Playlist' quando a playlist tiver faixas baixadas offline", () => {
      vi.spyOn(DownloadsService, "isPlaylistDownloading").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isPlaylistDownloaded").mockReturnValue(true);
      vi.spyOn(DownloadsService, "isCollectionAvailableOffline").mockReturnValue(true);

      const item: CollectionContextItem = {
        kind: "playlist",
        playlist: samplePlaylist,
        isPinned: false,
      };

      render(
        <CollectionContextMenu
          item={item}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onPlay={vi.fn()}
          onAddToQueue={vi.fn()}
          onTogglePin={vi.fn()}
          onDownloadCollection={vi.fn()}
          onRemoveCollectionDownloads={vi.fn()}
        />
      );

      expect(screen.getByText("Remover Downloads da Playlist")).toBeInTheDocument();
      expect(screen.getByText("Baixar Playlist Offline")).toBeInTheDocument();
    });

    it("deve exibir 'Remover Downloads do Álbum' quando o álbum tiver faixas baixadas offline", () => {
      vi.spyOn(DownloadsService, "isPlaylistDownloading").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isPlaylistDownloaded").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isCollectionAvailableOffline").mockReturnValue(true);

      const item: CollectionContextItem = {
        kind: "album",
        album: sampleAlbum,
        isPinned: false,
      };

      render(
        <CollectionContextMenu
          item={item}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onPlay={vi.fn()}
          onAddToQueue={vi.fn()}
          onTogglePin={vi.fn()}
          onDownloadCollection={vi.fn()}
          onRemoveCollectionDownloads={vi.fn()}
        />
      );

      expect(screen.getByText("Remover Downloads do Álbum")).toBeInTheDocument();
    });

    it("deve disparar onRemoveCollectionDownloads ao clicar na opção de remoção", () => {
      vi.spyOn(DownloadsService, "isPlaylistDownloading").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isPlaylistDownloaded").mockReturnValue(true);
      vi.spyOn(DownloadsService, "isCollectionAvailableOffline").mockReturnValue(true);

      const onRemoveMock = vi.fn();
      const item: CollectionContextItem = {
        kind: "playlist",
        playlist: samplePlaylist,
        isPinned: false,
      };

      render(
        <CollectionContextMenu
          item={item}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onPlay={vi.fn()}
          onAddToQueue={vi.fn()}
          onTogglePin={vi.fn()}
          onDownloadCollection={vi.fn()}
          onRemoveCollectionDownloads={onRemoveMock}
        />
      );

      const removeBtn = screen.getByText("Remover Downloads da Playlist");
      fireEvent.click(removeBtn);

      expect(onRemoveMock).toHaveBeenCalledWith(item);
    });

    it("NÃO deve exibir 'Remover Downloads' se a coleção não tiver faixas baixadas nem estiver marcada como offline", () => {
      vi.spyOn(DownloadsService, "isPlaylistDownloading").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isPlaylistDownloaded").mockReturnValue(false);
      vi.spyOn(DownloadsService, "isCollectionAvailableOffline").mockReturnValue(false);

      const item: CollectionContextItem = {
        kind: "playlist",
        playlist: samplePlaylist,
        isPinned: false,
      };

      render(
        <CollectionContextMenu
          item={item}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onPlay={vi.fn()}
          onAddToQueue={vi.fn()}
          onTogglePin={vi.fn()}
          onDownloadCollection={vi.fn()}
          onRemoveCollectionDownloads={vi.fn()}
        />
      );

      expect(screen.queryByText("Remover Downloads da Playlist")).not.toBeInTheDocument();
      expect(screen.getByText("Baixar Playlist Offline")).toBeInTheDocument();
    });
  });
});
