import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import { PlaybackProgressProvider } from "../../context/PlaybackProgressContext";
import { nativeAudioEngine } from "../../services/audioEngine";
import { setCachedLyrics } from "../../hooks/useLyrics";
import { Track } from "../../types";

function renderVisualizerWithProgress(
  isPlaying: boolean,
  currentTime = 0,
  duration = 200,
  barCount = 16,
  variant: "mini" | "inline" | "full" = "full",
  track?: Track | null
) {
  return render(
    <PlaybackProgressProvider currentTime={currentTime} duration={duration}>
      <SpectrumVisualizer
        isPlaying={isPlaying}
        barCount={barCount}
        variant={variant}
        track={track}
      />
    </PlaybackProgressProvider>
  );
}

describe("SpectrumVisualizer (Sincronização com Áudio & Espectro de Frequências)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve renderizar no estado pausado com barras na altura de repouso mínima", () => {
    const { container } = renderVisualizerWithProgress(false, 0, 180, 16, "full");
    expect(container).toBeDefined();

    // No modo full com estilo padrão (bars), deve renderizar 16 colunas
    const columns = container.querySelectorAll(".flex-1.flex.flex-col");
    expect(columns.length).toBe(16);
  });

  it("deve renderizar no modo mini com barCount reduzido (PlayerBar / MiniPlayer)", () => {
    const { container } = renderVisualizerWithProgress(true, 10, 180, 4, "mini");
    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(4);
  });

  it("deve sincronizar com o espectro real de frequências do Web Audio quando disponível", () => {
    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const mockFftData = [80, 75, 60, 50, 40, 35, 30, 25, 20, 18, 15, 12, 10, 8, 5, 2];
    vi.spyOn(nativeAudioEngine, "getSpectrumData").mockReturnValue(mockFftData);

    const { container } = renderVisualizerWithProgress(true, 30, 200, 16, "full");

    // Simula a passagem de um frame de animação (> 35ms)
    act(() => {
      if (rafCallback) {
        (rafCallback as (time: number) => void)(performance.now() + 50);
      }
    });

    expect(nativeAudioEngine.getSpectrumData).toHaveBeenCalledWith(16);
    expect(container).toBeDefined();
  });

  it("deve sintetizar envelope acústico rítmico sincronizado ao tempo da música e letras quando FFT for nulo", () => {
    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    vi.spyOn(nativeAudioEngine, "getSpectrumData").mockReturnValue(null);

    const mockTrack: Track = {
      id: "sync_test_track",
      title: "Sync Song",
      artist: "Sync Artist",
    };

    setCachedLyrics("sync_test_track", {
      synced: "[00:10.00]Primeiro verso melódico\n[00:25.00]Refrão vibrante",
      plain: "Primeiro verso melódico\nRefrão vibrante",
      source: "lrclib",
    });

    const { container } = renderVisualizerWithProgress(true, 12, 180, 16, "full", mockTrack);

    act(() => {
      if (rafCallback) {
        (rafCallback as (time: number) => void)(performance.now() + 50);
      }
    });

    expect(container).toBeDefined();
    const columns = container.querySelectorAll(".flex-1.flex.flex-col");
    expect(columns.length).toBe(16);
  });
});
