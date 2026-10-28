/**
 * AudioEngine - Motor de Áudio Nativo de Alta Fidelidade (Item 1.1)
 *
 * Utiliza HTML5 Audio element e Web Audio API (GainNode) para:
 * - Reprodução direta com pré-buffer antecipado
 * - Fim de micro-travamentos do IFrame de vídeo
 * - Controle suave de ganho e volume sem latência de postMessage
 * - Monitoramento preciso de tempo e término da faixa
 */

export interface StreamInfo {
  video_id: string;
  title: string;
  artist: string;
  artwork_url?: string;
  stream_url: string;
  duration_seconds?: number;
  bitrate?: number;
  mime_type?: string;
}

export class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private isAudioCtxInitialized = false;
  private lastAppliedVolume = -1;

  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onError: ((error: unknown) => void) | null = null;
  public onPlay: (() => void) | null = null;
  public onPause: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.crossOrigin = "anonymous";

    this.setupListeners();
  }

  private initAudioContext() {
    if (this.isAudioCtxInitialized) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
        this.gainNode = this.audioCtx.createGain();
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
        this.isAudioCtxInitialized = true;
      }
    } catch (e) {
      console.warn("[AudioEngine] Web Audio API não pôde ser conectada, utilizando controle nativo de volume do HTMLAudioElement:", e);
    }
  }

  private ensureAudioContextRunning() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {
        // Ignora caso ainda falte gesto do usuário
      });
    }
  }

  private setupListeners() {
    this.audio.addEventListener("timeupdate", () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener("ended", () => {
      if (this.onEnded) {
        this.onEnded();
      }
    });

    this.audio.addEventListener("play", () => {
      if (this.onPlay) {
        this.onPlay();
      }
    });

    this.audio.addEventListener("pause", () => {
      if (this.onPause) {
        this.onPause();
      }
    });

    this.audio.addEventListener("error", (e) => {
      console.warn("[AudioEngine] Erro no elemento de áudio nativo:", e);
      if (this.onError) {
        this.onError(this.audio.error || e);
      }
    });
  }

  /**
   * Carrega uma URL de áudio direta e configura o pré-buffer
   */
  public load(url: string) {
    this.initAudioContext();
    this.audio.pause();
    this.audio.src = url;
    this.audio.load();
  }

  /**
   * Inicia ou retoma a reprodução de áudio de forma segura
   */
  public async play(): Promise<void> {
    this.initAudioContext();
    this.ensureAudioContextRunning();
    try {
      await this.audio.play();
    } catch (err: unknown) {
      const errName = (err as Error)?.name;
      // AbortError é comum quando uma nova faixa é selecionada antes da anterior iniciar
      if (errName !== "AbortError") {
        console.warn("[AudioEngine] Erro ao reproduzir áudio:", err);
        if (this.onError) {
          this.onError(err);
        }
      }
      throw err;
    }
  }

  /**
   * Pausa a reprodução
   */
  public pause() {
    this.audio.pause();
  }

  /**
   * Interrompe o áudio, limpa o buffer e o src
   */
  public stop() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }

  /**
   * Posiciona a agulha de reprodução no segundo especificado
   */
  public seek(seconds: number) {
    const dur = this.audio.duration;
    const clamped = Math.max(0, dur && !isNaN(dur) ? Math.min(seconds, dur) : seconds);
    this.audio.currentTime = clamped;
  }

  /**
   * Ajusta o volume linear (0.0 a 1.0) via GainNode ou HTMLAudioElement
   * Contém sentinela de cache para evitar flooding de automação no Web Audio (Item 69)
   */
  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    if (Math.abs(this.lastAppliedVolume - clamped) < 0.001) {
      return;
    }
    this.lastAppliedVolume = clamped;
    if (this.gainNode && this.audioCtx) {
      try {
        this.gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
      } catch {
        this.audio.volume = clamped;
      }
    } else {
      this.audio.volume = clamped;
    }
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio.duration && !isNaN(this.audio.duration) ? this.audio.duration : 0;
  }

  public isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  public getBufferedRanges(): TimeRanges {
    return this.audio.buffered;
  }
}

// Instância Singleton do motor de áudio para reutilização global
export const nativeAudioEngine = new AudioEngine();

