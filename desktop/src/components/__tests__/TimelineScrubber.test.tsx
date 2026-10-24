import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineScrubber } from "../Player/TimelineScrubber";
import { PlaybackProgressProvider } from "../../context/PlaybackProgressContext";

function renderScrubberWithProgress(
  currentTime: number,
  duration: number,
  disabled = false,
  onSeek = vi.fn()
) {
  return render(
    <PlaybackProgressProvider currentTime={currentTime} duration={duration}>
      <TimelineScrubber disabled={disabled} onSeek={onSeek} />
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

  it("deve respeitar a prop disabled quando nenhuma faixa estiver ativa", () => {
    renderScrubberWithProgress(0, 0, true);

    const input = screen.getByTestId("scrubber-range-input") as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});
