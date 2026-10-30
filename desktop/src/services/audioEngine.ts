/**
 * AudioEngine - Motor de Áudio Nativo de Alta Fidelidade com Dual-Deck e ReplayGain
 * (Itens 1.1 e 1.3 do Guia de Sugestões)
 *
 * Características:
 * - Dual-Deck (Deck A e Deck B) para True Crossfade com sobreposição real
 * - Normalização de volume inteligente via loudnessDb (ReplayGain ITU-R BS.1770)
 * - Reprodução de alta fidelidade sem engasgos de processamento de vídeo
 * - Controle fino de ganho digital com rampa suave
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
  loudness_db?: number | null;
}

interface DeckState {
  audio: HTMLAudioElement;
  videoId: string | null;
  loudnessGain: number; // 0.0 a 2.0 (fator ReplayGain normalizado)
  currentVolume: number;
}

export class AudioEngine {
  private primaryDeck: DeckState;
  private secondaryDeck: DeckState;
  private activeDeckIndex: 0 | 1 = 0;

  private userVolume = 0.8;
  private isMuted = false;
  private isNormalizeEnabled = false;
  private isSuppressingPauseEvent = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onError: ((error: unknown) => void) | null = null;
  public onPlay: (() => void) | null = null;
  public onPause: (() => void) | null = null;

  constructor() {
    this.primaryDeck = this.createDeck();
    this.secondaryDeck = this.createDeck();
  }

  private createDeck(): DeckState {
    const audio = new Audio();
    audio.preload = "auto";

    const deck: DeckState = {
      audio,
      videoId: null,
      loudnessGain: 1.0,
      currentVolume: 1.0,
    };

    audio.addEventListener("timeupdate", () => {
      if (this.getActiveDeck().audio === audio) {
        if (this.onTimeUpdate) {
          this.onTimeUpdate(audio.currentTime, audio.duration || 0);
        }
      }
    });

    audio.addEventListener("ended", () => {
      if (this.getActiveDeck().audio === audio) {
        if (this.onEnded) {
          this.onEnded();
        }
      }
    });

    audio.addEventListener("play", () => {
      if (this.getActiveDeck().audio === audio) {
        if (this.onPlay) {
          this.onPlay();
        }
      }
    });

    audio.addEventListener("pause", () => {
      if (this.isSuppressingPauseEvent) return;
      if (this.getActiveDeck().audio === audio) {
        if (this.onPause) {
          this.onPause();
        }
      }
    });

    audio.addEventListener("error", (e) => {
      if (this.getActiveDeck().audio === audio) {
        this.isSuppressingPauseEvent = true;
        console.warn("[AudioEngine] Erro no elemento de áudio nativo:", e);
        if (this.onError) {
          this.onError(audio.error || e);
        }
        this.isSuppressingPauseEvent = false;
      }
    });

    return deck;
  }

  private getActiveDeck(): DeckState {
    return this.activeDeckIndex === 0 ? this.primaryDeck : this.secondaryDeck;
  }

  private getInactiveDeck(): DeckState {
    return this.activeDeckIndex === 0 ? this.secondaryDeck : this.primaryDeck;
  }

  /**
   * Converte loudnessDb do YouTube Music (ex: -3.5 dB ou +1.2 dB) em fator linear de ganho.
   * Target de normalização: -14 LUFS (padrão YouTube Music / Spotify).
   * Limita a atenuação/ganho entre 0.35 (-9dB) e 1.6 (+4dB) para evitar distorção ou silêncio.
   */
  public calculateLoudnessGain(loudnessDb?: number | null): number {
    if (loudnessDb === undefined || loudnessDb === null || isNaN(loudnessDb)) {
      return 1.0;
    }
    // loudnessDb positivo significa que a faixa é mais alta que a referência
    // Ex: +3dB -> atenua 10^(-3/20) = ~0.707
    // Ex: -3dB -> amplifica 10^(+3/20) = ~1.41
    const rawGain = Math.pow(10, -loudnessDb / 20);
    return Math.max(0.35, Math.min(1.6, rawGain));
  }

  /**
   * Atualiza a flag de normalização inteligente de volume (ReplayGain)
   */
  public setNormalizeVolume(enabled: boolean) {
    this.isNormalizeEnabled = enabled;
    this.applyEffectiveVolume(this.primaryDeck);
    this.applyEffectiveVolume(this.secondaryDeck);
  }

  /**
   * Carrega uma URL direta no deck ativo e calcula o ganho de normalização
   */
  public load(url: string, videoId?: string, loudnessDb?: number | null) {
    this.isSuppressingPauseEvent = true;
    const active = this.getActiveDeck();
    active.audio.pause();
    active.audio.src = url;
    active.videoId = videoId || null;
    active.loudnessGain = this.calculateLoudnessGain(loudnessDb);
    active.audio.load();
    this.applyEffectiveVolume(active);
    this.isSuppressingPauseEvent = false;
  }

  /**
   * Inicia a reprodução no deck ativo
   */
  public async play(): Promise<void> {
    this.isSuppressingPauseEvent = false;
    this.ensureAudioContext();
    const active = this.getActiveDeck();
    try {
      await active.audio.play();
    } catch (err: unknown) {
      this.isSuppressingPauseEvent = true;
      const errName = (err as Error)?.name;
      if (errName !== "AbortError") {
        console.warn("[AudioEngine] Erro ao reproduzir áudio:", err);
        if (this.onError) {
          this.onError(err);
        }
      }
      this.isSuppressingPauseEvent = false;
      throw err;
    }
  }

  public pause() {
    this.isSuppressingPauseEvent = false;
    this.getActiveDeck().audio.pause();
    this.getInactiveDeck().audio.pause();
  }

  public stop() {
    this.isSuppressingPauseEvent = true;
    this.primaryDeck.audio.pause();
    this.primaryDeck.audio.removeAttribute("src");
    this.primaryDeck.audio.load();
    this.primaryDeck.videoId = null;

    this.secondaryDeck.audio.pause();
    this.secondaryDeck.audio.removeAttribute("src");
    this.secondaryDeck.audio.load();
    this.secondaryDeck.videoId = null;
    this.isSuppressingPauseEvent = false;
  }

  public seek(seconds: number) {
    const active = this.getActiveDeck();
    const dur = active.audio.duration;
    const clamped = Math.max(0, dur && !isNaN(dur) ? Math.min(seconds, dur) : seconds);
    active.audio.currentTime = clamped;
  }

  /**
   * Define o volume master do usuário (0.0 a 1.0)
   */
  public setVolume(vol: number) {
    this.userVolume = Math.max(0, Math.min(1, vol));
    this.applyEffectiveVolume(this.primaryDeck);
    this.applyEffectiveVolume(this.secondaryDeck);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyEffectiveVolume(this.primaryDeck);
    this.applyEffectiveVolume(this.secondaryDeck);
  }

  /**
   * Aplica o volume final ponderando volume do usuário, crossfade e normalização ReplayGain
   */
  private applyEffectiveVolume(deck: DeckState, crossfadeFactor = 1.0) {
    if (this.isMuted) {
      deck.audio.volume = 0;
      deck.currentVolume = 0;
      return;
    }

    let effective = this.userVolume * crossfadeFactor;
    if (this.isNormalizeEnabled) {
      effective = effective * deck.loudnessGain;
    }

    const clamped = Math.max(0, Math.min(1, effective));
    if (Math.abs(deck.currentVolume - clamped) > 0.001) {
      deck.currentVolume = clamped;
      deck.audio.volume = clamped;
    }
  }

  /**
   * Dual-Deck True Crossfade (Item 1.1):
   * Dispara a próxima música no deck secundário com rampa equal-power,
   * enquanto desvanece o deck atual suavemente.
   */
  public async startCrossfadeToNext(
    nextStreamUrl: string,
    nextVideoId: string,
    nextLoudnessDb?: number | null,
    crossfadeSeconds = 3
  ): Promise<void> {
    const outgoing = this.getActiveDeck();
    const incoming = this.getInactiveDeck();

    // Prepara o deck receptor
    incoming.audio.pause();
    incoming.audio.src = nextStreamUrl;
    incoming.videoId = nextVideoId;
    incoming.loudnessGain = this.calculateLoudnessGain(nextLoudnessDb);
    incoming.audio.currentTime = 0;
    incoming.audio.volume = 0;
    incoming.currentVolume = 0;

    try {
      await incoming.audio.play();
    } catch (err) {
      console.warn("[AudioEngine] Falha ao iniciar incoming deck para crossfade:", err);
      return;
    }

    // Alterna o deck ativo no estado interno para os eventos responderem ao incoming
    this.activeDeckIndex = this.activeDeckIndex === 0 ? 1 : 0;

    const durationMs = Math.max(500, crossfadeSeconds * 1000);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Curva Equal-Power (sin / cos) para volume acústico constante durante a transição
      const inFactor = Math.sin((progress * Math.PI) / 2);
      const outFactor = Math.cos((progress * Math.PI) / 2);

      this.applyEffectiveVolume(incoming, inFactor);
      this.applyEffectiveVolume(outgoing, outFactor);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        outgoing.audio.pause();
        outgoing.audio.removeAttribute("src");
        outgoing.audio.load();
        outgoing.videoId = null;
        this.applyEffectiveVolume(incoming, 1.0);
      }
    };

    requestAnimationFrame(step);
  }

  public getCurrentTime(): number {
    return this.getActiveDeck().audio.currentTime || 0;
  }

  public getDuration(): number {
    const dur = this.getActiveDeck().audio.duration;
    return dur && !isNaN(dur) ? dur : 0;
  }

  public isPlaying(): boolean {
    const audio = this.getActiveDeck().audio;
    return !audio.paused && !audio.ended && audio.readyState > 2;
  }

  public getBufferedRanges(): TimeRanges {
    return this.getActiveDeck().audio.buffered;
  }

  public getActiveVideoId(): string | null {
    return this.getActiveDeck().videoId;
  }

  /**
   * Garante a inicialização sob demanda do AudioContext do Web Audio API
   */
  public ensureAudioContext(): void {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext && AudioCtx) {
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64; // 32 bandas de frequência
        this.analyser.smoothingTimeConstant = 0.8;
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
    } catch {
      // Ignora em caso de indisponibilidade de Web Audio
    }
  }

  /**
   * Extrai o espectro real de frequências (FFT) em barCount bandas (0 a 100).
   * Retorna null se não houver dados de sinal válidos (ex: IFrame ativo ou silêncio).
   */
  public getSpectrumData(barCount = 16): number[] | null {
    if (!this.analyser) return null;
    try {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      if (sum === 0) return null;

      const result: number[] = [];
      const step = bufferLength / barCount;
      for (let i = 0; i < barCount; i++) {
        const start = Math.floor(i * step);
        const end = Math.min(bufferLength, Math.floor((i + 1) * step));
        let binSum = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
          binSum += dataArray[j];
          count++;
        }
        const avg = count > 0 ? binSum / count : 0;
        result.push(Math.max(10, Math.min(100, Math.round((avg / 255) * 100))));
      }
      return result;
    } catch {
      return null;
    }
  }
}

// Instância Singleton do motor de áudio para reutilização global
export const nativeAudioEngine = new AudioEngine();
