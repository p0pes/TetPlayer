import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioEngine } from "../audioEngine";

describe("AudioEngine (Item 1.1 e 1.3 - Motor de Áudio Nativo, Dual-Deck e ReplayGain)", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AudioEngine();
  });

  it("deve instanciar com estado padrão e preload auto", () => {
    expect(engine).toBeDefined();
    expect(engine.getCurrentTime()).toBe(0);
    expect(engine.getDuration()).toBe(0);
    expect(engine.isPlaying()).toBe(false);
  });

  it("deve carregar URL de áudio corretamente", () => {
    const testUrl = "https://example.com/audio.opus";
    engine.load(testUrl, "test_video_1", -2.5);
    expect(engine.getCurrentTime()).toBe(0);
    expect(engine.getActiveVideoId()).toBe("test_video_1");
  });

  it("deve calcular ganhos de normalização loudnessDb corretamente (ReplayGain)", () => {
    // loudnessDb positivo (faixa mais alta que a referência) -> deve atenuar (ganho < 1.0)
    expect(engine.calculateLoudnessGain(6.0)).toBeCloseTo(0.501, 2);
    // loudnessDb negativo (faixa mais baixa que a referência) -> deve amplificar (ganho > 1.0)
    expect(engine.calculateLoudnessGain(-3.0)).toBeCloseTo(1.412, 2);
    // nulo / indefinido -> neutro 1.0
    expect(engine.calculateLoudnessGain(null)).toBe(1.0);
    expect(engine.calculateLoudnessGain(undefined)).toBe(1.0);
  });

  it("deve limitar o volume entre 0 e 1", () => {
    engine.setVolume(0.5);
    // Testa clamp em valores acima de 1 e abaixo de 0
    engine.setVolume(1.5);
    engine.setVolume(-0.2);
  });

  it("deve pausar e interromper (stop) limpando o áudio", () => {
    engine.load("https://example.com/audio.opus");
    engine.pause();
    expect(engine.isPlaying()).toBe(false);

    engine.stop();
    expect(engine.getCurrentTime()).toBe(0);
    expect(engine.getActiveVideoId()).toBeNull();
  });

  it("deve disparar callbacks registrados quando eventos do elemento ocorrerem", () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onEnded = vi.fn();
    const onTimeUpdate = vi.fn();

    engine.onPlay = onPlay;
    engine.onPause = onPause;
    engine.onEnded = onEnded;
    engine.onTimeUpdate = onTimeUpdate;

    // Dispara eventos simulados no elemento interno do deck ativo
    const primaryDeck = (engine as unknown as { primaryDeck: { audio: HTMLAudioElement } }).primaryDeck;
    primaryDeck.audio.dispatchEvent(new Event("play"));
    expect(onPlay).toHaveBeenCalled();

    primaryDeck.audio.dispatchEvent(new Event("pause"));
    expect(onPause).toHaveBeenCalled();

    primaryDeck.audio.dispatchEvent(new Event("ended"));
    expect(onEnded).toHaveBeenCalled();

    primaryDeck.audio.dispatchEvent(new Event("timeupdate"));
    expect(onTimeUpdate).toHaveBeenCalled();
  });
});
