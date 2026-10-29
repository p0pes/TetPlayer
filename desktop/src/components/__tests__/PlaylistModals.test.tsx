import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreatePlaylistModal } from "../Modals/CreatePlaylistModal";
import { AddToPlaylistModal } from "../Modals/AddToPlaylistModal";
import { EditPlaylistModal } from "../Modals/EditPlaylistModal";
import { ConfirmDeleteModal } from "../Modals/ConfirmDeleteModal";
import { Playlist, Track } from "../../types";

describe("PlaylistModals (Criação, Edição, Adição e Exclusão)", () => {
  const mockTrack: Track = {
    id: "vid123",
    title: "Awesome Song",
    artist: "Great Artist",
    duration: "3:30",
    artwork_url: "https://example.com/art.jpg",
  };

  const mockPlaylists: Playlist[] = [
    {
      id: "VLLM",
      title: "Músicas Curtidas",
      subtitle: "Automática",
      track_count: "50 músicas",
    },
    {
      id: "PLcustom1",
      title: "Rock Clássico",
      subtitle: "Playlist",
      track_count: "24 músicas",
    },
    {
      id: "PLcustom2",
      title: "Estudo e Foco",
      subtitle: "Playlist",
      track_count: "15 músicas",
    },
  ];

  describe("CreatePlaylistModal", () => {
    it("não renderiza quando isOpen é falso", () => {
      const { container } = render(
        <CreatePlaylistModal
          isOpen={false}
          onClose={vi.fn()}
          onCreate={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renderiza campos e submete com sucesso", async () => {
      const handleCreate = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <CreatePlaylistModal
          isOpen={true}
          onClose={handleClose}
          onCreate={handleCreate}
        />
      );

      expect(screen.getByRole("heading", { name: /nova playlist/i })).toBeDefined();

      const titleInput = screen.getByPlaceholderText(/minha playlist favorita/i);
      const descInput = screen.getByPlaceholderText(/adicione uma breve descrição/i);

      fireEvent.change(titleInput, { target: { value: "Minhas Favoritas 2026" } });
      fireEvent.change(descInput, { target: { value: "Melhores faixas do ano" } });

      const submitBtn = screen.getByRole("button", { name: /criar playlist/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleCreate).toHaveBeenCalledWith(
          "Minhas Favoritas 2026",
          "Melhores faixas do ano",
          "PRIVATE"
        );
        expect(handleClose).toHaveBeenCalled();
      });
    });

    it("valida título obrigatório", () => {
      const handleCreate = vi.fn();
      render(
        <CreatePlaylistModal
          isOpen={true}
          onClose={vi.fn()}
          onCreate={handleCreate}
        />
      );

      const submitBtn = screen.getByRole("button", { name: /criar playlist/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe("AddToPlaylistModal", () => {
    it("renderiza faixas e lista playlists exceto VLLM", () => {
      render(
        <AddToPlaylistModal
          isOpen={true}
          track={mockTrack}
          playlists={mockPlaylists}
          onClose={vi.fn()}
          onAddToPlaylist={vi.fn()}
          onCreateNewPlaylist={vi.fn()}
        />
      );

      expect(screen.getByText("Awesome Song")).toBeDefined();
      expect(screen.getByText("Great Artist")).toBeDefined();
      expect(screen.getByText("Rock Clássico")).toBeDefined();
      expect(screen.getByText("Estudo e Foco")).toBeDefined();
      // Não deve listar a playlist VLLM (Músicas Curtidas) na seleção de adicionar
      expect(screen.queryByText("Músicas Curtidas")).toBeNull();
    });

    it("filtra playlists com a caixa de busca", () => {
      render(
        <AddToPlaylistModal
          isOpen={true}
          track={mockTrack}
          playlists={mockPlaylists}
          onClose={vi.fn()}
          onAddToPlaylist={vi.fn()}
          onCreateNewPlaylist={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/buscar playlist/i);
      fireEvent.change(searchInput, { target: { value: "Rock" } });

      expect(screen.getByText("Rock Clássico")).toBeDefined();
      expect(screen.queryByText("Estudo e Foco")).toBeNull();
    });

    it("chama onAddToPlaylist ao clicar em uma playlist", async () => {
      const handleAddToPlaylist = vi.fn().mockResolvedValue(undefined);
      render(
        <AddToPlaylistModal
          isOpen={true}
          track={mockTrack}
          playlists={mockPlaylists}
          onClose={vi.fn()}
          onAddToPlaylist={handleAddToPlaylist}
          onCreateNewPlaylist={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Rock Clássico"));
      await waitFor(() => {
        expect(handleAddToPlaylist).toHaveBeenCalledWith(mockPlaylists[1], mockTrack);
      });
    });

    it("chama onCreateNewPlaylist ao clicar no botão de criar", () => {
      const handleCreateNew = vi.fn();
      const handleClose = vi.fn();
      render(
        <AddToPlaylistModal
          isOpen={true}
          track={mockTrack}
          playlists={mockPlaylists}
          onClose={handleClose}
          onAddToPlaylist={vi.fn()}
          onCreateNewPlaylist={handleCreateNew}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /criar nova/i }));
      expect(handleClose).toHaveBeenCalled();
      expect(handleCreateNew).toHaveBeenCalled();
    });
  });

  describe("EditPlaylistModal", () => {
    it("preenche os campos existentes e salva alterações", async () => {
      const handleSave = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <EditPlaylistModal
          isOpen={true}
          playlist={{
            id: "PLcustom1",
            title: "Rock Clássico",
            description: "Músicas dos anos 70 e 80",
          }}
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      const titleInput = screen.getByPlaceholderText(/nome da playlist/i) as HTMLInputElement;
      expect(titleInput.value).toBe("Rock Clássico");

      fireEvent.change(titleInput, { target: { value: "Rock Clássico Remastered" } });
      fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith(
          "PLcustom1",
          "Rock Clássico Remastered",
          "Músicas dos anos 70 e 80"
        );
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });

  describe("ConfirmDeleteModal", () => {
    it("renderiza mensagem e confirma exclusão", async () => {
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      const handleClose = vi.fn();

      render(
        <ConfirmDeleteModal
          isOpen={true}
          title="Excluir Playlist"
          itemName="Rock Clássico"
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      );

      expect(screen.getByText(/"Rock Clássico"/)).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /excluir definitivamente/i }));

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
