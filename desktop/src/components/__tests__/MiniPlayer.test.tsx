import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MiniPlayer } from "../MiniPlayer/MiniPlayer";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => { })),
}));

const setVolumeMock = vi.fn();
const togglePlayPauseMock = vi.fn();
const toggleMiniPlayerMock = vi.fn();
const handleSeekToMock = vi.fn();

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
    handleSeekTo: handleSeekToMock,
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
    handleSeekToMock.mockReset();
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "check_and_snap_mini_player") return Promise.resolve("right");
      if (cmd === "dock_mini_player") return Promise.resolve("right");
      if (cmd === "peek_docked_mini_player") return Promise.resolve(true);
      if (cmd === "undock_mini_player") return Promise.resolve();
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve ancorar na borda em modo Auto-Slide (apenas indicador vertical sem seta) e abrir automaticamente ao encostar o mouse", async () => {
    render(<MiniPlayer />);

    expect(screen.getByText("Miku Beam")).toBeInTheDocument();

    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    expect(handle).toBeInTheDocument();
    expect(handle.querySelector("svg")).toBeNull();

    await act(async () => {
      fireEvent.mouseEnter(handle);
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(invokeMock).toHaveBeenCalledWith("peek_docked_mini_player", {
      side: "right",
    });
    expect(screen.getByTitle(/Desafixar da borda/i)).toBeInTheDocument();
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
      await vi.advanceTimersByTimeAsync(450);
    });

    const expandedRoot = screen.getByTestId("miniplayer-expanded-root");
    expect(expandedRoot).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
      fireEvent.mouseLeave(expandedRoot);
      await vi.advanceTimersByTimeAsync(300);
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
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(screen.getByTitle(/Desafixar da borda/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.blur(window);
      await vi.advanceTimersByTimeAsync(100);
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
      await vi.advanceTimersByTimeAsync(450);
    });

    const unpinBtn = screen.getByTitle(/Desafixar da borda/i);
    await act(async () => {
      fireEvent.click(unpinBtn);
    });

    expect(invokeMock).toHaveBeenCalledWith("undock_mini_player", {
      side: "right",
    });
    expect(screen.getByTitle(/Ancorar na borda/i)).toBeInTheDocument();
  });

  it("deve usar layout ultra-compacto sem timestamps numéricos e permitir seek na Edge Line de 3px", () => {
    render(<MiniPlayer />);

    expect(screen.queryByText("0:42")).not.toBeInTheDocument();
    expect(screen.queryByText("3:00")).not.toBeInTheDocument();

    const scrubber = screen.getByRole("slider", { name: /Linha do tempo/i });
    vi.spyOn(scrubber, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 300,
      top: 0,
      right: 300,
      bottom: 10,
      height: 10,
      x: 0,
      y: 0,
      toJSON: () => { },
    });

    fireEvent.pointerDown(scrubber, { button: 0, clientX: 150 });
    expect(handleSeekToMock).toHaveBeenCalledWith(90);
  });

  it("deve ajustar volume com scroll sobre o ícone de áudio (exibindo badge), abrir slider horizontal ao clicar e fechar ao sair com o mouse", () => {
    render(<MiniPlayer />);

    const volBtn = screen.getByRole("button", { name: /Controle de volume/i });
    expect(screen.queryByRole("dialog", { name: /Ajuste de volume/i })).not.toBeInTheDocument();

    fireEvent.wheel(volBtn, { deltaY: -100 });
    expect(setVolumeMock).toHaveBeenCalledWith(0.55);
    expect(screen.getByRole("status", { name: /Volume 55%/i })).toBeInTheDocument();

    fireEvent.click(volBtn);
    const dialog = screen.getByRole("dialog", { name: /Ajuste de volume/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Volume no Mini Player/i })).toBeInTheDocument();

    fireEvent.mouseLeave(dialog);
    expect(screen.queryByRole("dialog", { name: /Ajuste de volume/i })).not.toBeInTheDocument();
  });

  it("não deve abrir a gaveta nem alterar o estado expandido quando peek_docked_mini_player recusar por cursor oculto em jogos", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "check_and_snap_mini_player") return Promise.resolve("right");
      if (cmd === "dock_mini_player") return Promise.resolve("right");
      if (cmd === "peek_docked_mini_player") return Promise.resolve(false);
      return Promise.resolve();
    });

    render(<MiniPlayer />);

    const dockBtn = screen.getByTitle(/Ancorar na borda/i);
    await act(async () => {
      fireEvent.click(dockBtn);
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    expect(handle).toBeInTheDocument();

    await act(async () => {
      fireEvent.mouseEnter(handle);
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(invokeMock).toHaveBeenCalledWith("peek_docked_mini_player", { side: "right" });
    expect(screen.queryByTitle(/Desafixar da borda/i)).not.toBeInTheDocument();
    expect(screen.getByTitle(/TetPlayer Auto-Slide/i)).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("deve manter a alça recolhida em segurança se peek_docked_mini_player rejeitar com erro", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "check_and_snap_mini_player") return Promise.resolve("right");
      if (cmd === "dock_mini_player") return Promise.resolve("right");
      if (cmd === "peek_docked_mini_player") return Promise.reject(new Error("Falha nativa"));
      return Promise.resolve();
    });

    render(<MiniPlayer />);

    await act(async () => {
      fireEvent.click(screen.getByTitle(/Ancorar na borda/i));
    });

    await act(async () => {
      fireEvent.mouseEnter(screen.getByTitle(/TetPlayer Auto-Slide/i));
      await vi.advanceTimersByTimeAsync(450);
    });

    expect(screen.queryByTitle(/Desafixar da borda/i)).not.toBeInTheDocument();
    expect(screen.getByTitle(/TetPlayer Auto-Slide/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it("deve suportar clique rápido (pointerDown/pointerUp) e arrasto vertical na alça recolhida sem erros assíncronos", async () => {
    render(<MiniPlayer />);

    await act(async () => {
      fireEvent.click(screen.getByTitle(/Ancorar na borda/i));
    });

    const handle = screen.getByTitle(/TetPlayer Auto-Slide/i);
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();

    // Arrasto vertical (> 4px) chama move_docked_tab e NÃO abre a gaveta no soltar
    await act(async () => {
      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, screenY: 200, clientY: 20 });
      fireEvent.pointerMove(handle, { pointerId: 1, screenY: 240, clientY: 20 });
      fireEvent.pointerUp(handle, { pointerId: 1 });
    });

    expect(invokeMock).toHaveBeenCalledWith("move_docked_tab", {
      side: "right",
      screenYLogical: 240,
      grabOffsetYLogical: 20,
    });
    expect(invokeMock).not.toHaveBeenCalledWith("peek_docked_mini_player", expect.anything());

    // Clique simples sem arrasto abre a gaveta imediatamente
    await act(async () => {
      fireEvent.pointerDown(handle, { button: 0, pointerId: 2, screenY: 240, clientY: 20 });
      fireEvent.pointerUp(handle, { pointerId: 2 });
    });

    expect(invokeMock).toHaveBeenCalledWith("peek_docked_mini_player", { side: "right" });
    expect(screen.getByTitle(/Desafixar da borda/i)).toBeInTheDocument();
  });
});
