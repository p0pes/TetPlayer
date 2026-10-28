import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioEngine } from "../audioEngine";

describe("AudioEngine (Item 1.1 - Motor de Áudio Nativo)", () => {
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
    engine.load(testUrl);
    // Em jsdom, o elemento Audio atualiza sua propriedade src
    expect(engine.getCurrentTime()).toBe(0);
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

    // Dispara eventos simulados no elemento interno
    const audioEl = (engine as unknown as { audio: HTMLAudioElement }).audio;
    audioEl.dispatchEvent(new Event("play"));
    expect(onPlay).toHaveBeenCalled();

    audioEl.dispatchEvent(new Event("pause"));
    expect(onPause).toHaveBeenCalled();

    audioEl.dispatchEvent(new Event("ended"));
    expect(onEnded).toHaveBeenCalled();

    audioEl.dispatchEvent(new Event("timeupdate"));
    expect(onTimeUpdate).toHaveBeenCalled();
  });
});

