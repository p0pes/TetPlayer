import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineScrubber } from "../Player/TimelineScrubber";
import { PlaybackProgressProvider } from "../../context/PlaybackProgressContext";
import { setCachedLyrics } from "../../hooks/useLyrics";
import { Track } from "../../types";

function renderScrubberWithProgress(
  currentTime: number,
  duration: number,
  disabled = false,
  onSeek = vi.fn(),
  currentTrack?: Track | null
) {
  return render(
    <PlaybackProgressProvider currentTime={currentTime} duration={duration}>
      <TimelineScrubber disabled={disabled} onSeek={onSeek} currentTrack={currentTrack} />
    </PlaybackProgressProvider>
  );
}

describe("TimelineScrubber", () => {
  it("deve renderizar o tempo decorrido e duração formatados", () => {
    renderScrubberWithProgress(75, 240); // 1:15 e 4:00

    expect(screen.getByTestId("scrubber-current-time")).toHaveTextContent("1:15");
    expect(screen.getByTestId("scrubber-duration")).toHaveTextContent("4:00");
  });

  it("deve disparar onSeek com o novo valor ao alterar o slider", () => {
    const handleSeek = vi.fn();
    renderScrubberWithProgress(10, 100, false, handleSeek);

    const input = screen.getByTestId("scrubber-range-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "45" } });

    expect(handleSeek).toHaveBeenCalledTimes(1);
    expect(handleSeek).toHaveBeenCalledWith(45);
  });

  it("deve adiar o seek durante o arrasto e disparar apenas no pointerUp", () => {
    const handleSeek = vi.fn();
    renderScrubberWithProgress(10, 100, false, handleSeek);

    const input = screen.getByTestId("scrubber-range-input") as HTMLInputElement;

    // Inicia arrasto
    fireEvent.pointerDown(input);
    expect(handleSeek).not.toHaveBeenCalled();

    // Movimentos intermediários de arrasto
    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.change(input, { target: { value: "50" } });
    fireEvent.change(input, { target: { value: "70" } });
    expect(handleSeek).not.toHaveBeenCalled();

    // Solta o cursor (pointerUp)
    fireEvent.pointerUp(input);
    expect(handleSeek).toHaveBeenCalledTimes(1);
    expect(handleSeek).toHaveBeenCalledWith(70);
  });

  it("deve respeitar a prop disabled quando nenhuma faixa estiver ativa", () => {
    renderScrubberWithProgress(0, 0, true);

    const input = screen.getByTestId("scrubber-range-input") as HTMLInputElement;
    expect(input).toBeDisabled();
  });

  it("deve exibir tooltip com timestamp e estrofe sincronizada ao mover o cursor sobre a barra (Item 1.4)", () => {
    const mockTrack: Track = {
      id: "track_test_lrc",
      title: "Música Teste",
      artist: "Artista Teste",
    };

    setCachedLyrics("track_test_lrc", {
      synced: "[00:10.00]Primeiro verso da canção\n[00:45.00]Refrão vibrante e marcante",
      plain: "Primeiro verso da canção\nRefrão vibrante e marcante",
      source: "lrclib",
    });

    const { container } = renderScrubberWithProgress(15, 120, false, vi.fn(), mockTrack);

    // Simula container com largura de 200px
    const scrubberContainer = container.querySelector(".group.cursor-pointer") as HTMLElement;
    expect(scrubberContainer).toBeDefined();

    scrubberContainer.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      left: 0,
      right: 200,
      top: 0,
      bottom: 20,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mouse na posição 80px (80 / 200 = 40% de 120s = 48s -> deve pegar o Refrão em 45s)
    fireEvent.mouseMove(scrubberContainer, { clientX: 80 });

    expect(screen.getByText("0:48")).toBeDefined();
    expect(screen.getByText(/Refrão vibrante e marcante/i)).toBeDefined();

    // Ao sair com o mouse, o tooltip deve sumir
    fireEvent.mouseLeave(scrubberContainer);
    expect(screen.queryByText(/Refrão vibrante e marcante/i)).toBeNull();
  });
});
