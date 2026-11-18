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

  it("deve ancorar na borda em modo Auto-Slide (apenas indicador vertical sem seta) e abrir automaticamente ao encostar o mouse", async () => {
    render(<MiniPlayer />);

    expect(screen.getByText("Mini Player")).toBeInTheDocument();

    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    expect(handle).toBeInTheDocument();
    expect(handle.querySelector("svg")).toBeNull();

    await act(async () => {
      fireEvent.mouseEnter(handle);
      vi.advanceTimersByTime(450);
    });

    expect(invokeMock).toHaveBeenCalledWith("peek_docked_mini_player", {
      side: "right",
    });
    expect(screen.getByText("Mini Player • Auto")).toBeInTheDocument();
  });

  it("deve recolher rapidamente de volta para a borda ao retirar o mouse da gaveta", async () => {
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

    const badge = screen.getByText("Mini Player • Auto");
    const expandedRoot = badge.closest("div.w-full.h-full") as HTMLElement;
    expect(expandedRoot).toBeTruthy();

    await act(async () => {
      fireEvent.mouseLeave(expandedRoot);
      vi.advanceTimersByTime(320);
    });

    expect(invokeMock).toHaveBeenCalledWith("dock_mini_player", {
      side: "right",
    });
    expect(screen.getByTitle(/TetPlayer Auto-Slide/i)).toBeInTheDocument();
  });

  it("deve recolher imediatamente ao clicar em qualquer lugar fora da janela (blur)", async () => {
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

    expect(screen.getByText("Mini Player • Auto")).toBeInTheDocument();

    await act(async () => {
      fireEvent.blur(window);
      vi.advanceTimersByTime(100);
    });

    expect(invokeMock).toHaveBeenCalledWith("dock_mini_player", {
      side: "right",
    });
    expect(screen.getByTitle(/TetPlayer Auto-Slide/i)).toBeInTheDocument();
  });

  it("deve permitir ajustar o volume girando o scroll do mouse diretamente sobre o indicador vertical", async () => {
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
