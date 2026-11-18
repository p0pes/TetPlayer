import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MiniPlayer } from "../MiniPlayer/MiniPlayer";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const setVolumeMock = vi.fn();
const togglePlayPauseMock = vi.fn();
const toggleMiniPlayerMock = vi.fn();

vi.mock("../../context/PlayerContext", () => ({
  usePlayer: () => ({
    currentTrack: {
      id: "track-1",
      title: "Miku Beam",
      artist: "Hatsune Miku",
      duration_seconds: 180,
    },
    isPlaying: true,
    volume: 0.5,
    isMuted: false,
    handlePrevTrack: vi.fn(),
    handleNextTrack: vi.fn(),
    togglePlayPause: togglePlayPauseMock,
    handleSeekTo: vi.fn(),
    handleVolumeChange: vi.fn(),
    setVolume: setVolumeMock,
    toggleMute: vi.fn(),
    toggleMiniPlayer: toggleMiniPlayerMock,
  }),
  usePlaybackProgress: () => ({
    currentTime: 42,
    duration: 180,
  }),
}));

vi.mock("../../services/likes", () => ({
  useLikedTrack: () => ({
    isLiked: false,
    toggleLike: vi.fn(),
  }),
}));

describe("MiniPlayer — Gaveta Inteligente Auto-Slide", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockReset();
    setVolumeMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "check_and_snap_mini_player") return Promise.resolve("right");
      if (cmd === "dock_mini_player") return Promise.resolve("right");
      if (cmd === "peek_docked_mini_player") return Promise.resolve();
      if (cmd === "undock_mini_player") return Promise.resolve();
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve ancorar na borda em modo Auto-Slide e abrir automaticamente ao encostar o mouse (0 cliques)", async () => {
    render(<MiniPlayer />);

    // Inicialmente em modo flutuante
    expect(screen.getByText("Mini Player")).toBeInTheDocument();

    // Clica para ancorar na borda
    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    // Agora deve exibir a alça recolhida Auto-Slide
    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    expect(handle).toBeInTheDocument();

    // Passa o mouse sobre a alça (onMouseEnter) -> deve abrir sozinho após o cooldown/intent delay
    await act(async () => {
      fireEvent.mouseEnter(handle);
      vi.advanceTimersByTime(450);
    });

    expect(invokeMock).toHaveBeenCalledWith("peek_docked_mini_player", {
      side: "right",
    });
    expect(screen.getByText("Mini Player • Auto")).toBeInTheDocument();
  });

  it("deve recolher automaticamente de volta para a borda ao retirar o mouse da gaveta", async () => {
    render(<MiniPlayer />);

    // Ancora na borda
    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    // Abre no hover
    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    await act(async () => {
      fireEvent.mouseEnter(handle);
      vi.advanceTimersByTime(450);
    });

    const badge = screen.getByText("Mini Player • Auto");
    const expandedRoot = badge.closest("div.w-full.h-full") as HTMLElement;
    expect(expandedRoot).toBeTruthy();

    // Avança o tempo além da guarda de resize (240ms) e retira o mouse
    await act(async () => {
      vi.advanceTimersByTime(300);
      fireEvent.mouseLeave(expandedRoot);
      vi.advanceTimersByTime(400);
    });

    expect(invokeMock).toHaveBeenCalledWith("dock_mini_player", {
      side: "right",
    });
    expect(screen.getByTitle(/TetPlayer Auto-Slide/i)).toBeInTheDocument();
  });

  it("deve permitir ajustar o volume girando o scroll do mouse diretamente sobre a alça recolhida", async () => {
    render(<MiniPlayer />);

    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    fireEvent.wheel(handle, { deltaY: -100 });
    expect(setVolumeMock).toHaveBeenCalledWith(0.55);

    fireEvent.wheel(handle, { deltaY: 100 });
    expect(setVolumeMock).toHaveBeenCalledWith(0.45);
  });

  it("deve desafixar da borda e voltar ao modo flutuante permanente ao clicar em Desafixar", async () => {
    render(<MiniPlayer />);

    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    await act(async () => {
      fireEvent.mouseEnter(handle);
      vi.advanceTimersByTime(450);
    });

    const unpinBtn = screen.getByTitle(/Desafixar da borda/i);
    await act(async () => {
      fireEvent.click(unpinBtn);
    });

    expect(invokeMock).toHaveBeenCalledWith("undock_mini_player", {
      side: "right",
    });
    expect(screen.getByText("Mini Player")).toBeInTheDocument();
  });
});
