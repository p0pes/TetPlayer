export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  jankCount: number;
  droppedFrames: number;
  sampleCount: number;
}

export interface TrackTransitionRecord {
  fromTrackId: string | null;
  toTrackId: string;
  startTime: number;
  durationMs: number;
  exceededSla: boolean;
}

export interface ScreenLoadRecord {
  screenName: string;
  startTime: number;
  durationMs: number;
  exceededSla: boolean;
}

export interface PerformanceSlaReport {
  metrics: PerformanceMetrics;
  slowTrackTransitionsCount: number;
  slowScreenLoadsCount: number;
  lastTrackTransition: TrackTransitionRecord | null;
  lastScreenLoad: ScreenLoadRecord | null;
  trackTransitionSlaMs: number;
  screenLoadSlaMs: number;
}

type MetricsListener = (metrics: PerformanceMetrics) => void;
type WarningListener = (warning: string) => void;

class PerformanceTelemetryService {
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private totalFrameTime = 0;
  private jankCount = 0;
  private droppedFrames = 0;
  private currentFps = 60;
  private avgFps = 60;
  private lastWarningTime = 0;
  private listeners: Set<MetricsListener> = new Set();
  private warningListeners: Set<WarningListener> = new Set();

  // Limiares de SLA (Service Level Agreement) de Performance
  private trackTransitionSlaMs = 1000; // SLA: Troca de faixa deve iniciar áudio em até 1000ms
  private screenLoadSlaMs = 400; // SLA: Telas devem renderizar/hidratar em até 400ms

  // Contadores e registros de violação de SLA
  private slowTrackTransitionsCount = 0;
  private slowScreenLoadsCount = 0;
  private lastTrackTransition: TrackTransitionRecord | null = null;
  private lastScreenLoad: ScreenLoadRecord | null = null;

  // Rastreamento ativo em trânsito
  private activeTrackTransitions = new Map<string, { fromTrackId: string | null; startTime: number }>();
  private activeScreenLoads = new Map<string, number>();

  /**
   * Inicia o monitoramento de FPS e telemetria de renderização
   */
  start(): void {
    if (this.isRunning || typeof window === "undefined" || !window.requestAnimationFrame) {
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.totalFrameTime = 0;

    const tick = (now: number) => {
      if (!this.isRunning) return;

      const delta = now - this.lastTime;
      this.lastTime = now;

      if (delta > 0) {
        this.frameCount++;
        this.totalFrameTime += delta;

        // Se o frame demorar mais que 18.5ms (orçamento de 60fps ~16.6ms + tolerância), conta queda de frame
        if (delta > 18.5) {
          this.droppedFrames++;
          if (delta > 33.3) {
            this.jankCount++;
            this.warnJank(delta);
          }
        }

        // Atualiza a cada 500ms
        if (this.totalFrameTime >= 500) {
          const fps = Math.round((this.frameCount * 1000) / this.totalFrameTime);
          this.currentFps = fps;
          this.avgFps = Math.min(144, Math.max(0, fps));
          this.frameCount = 0;
          this.totalFrameTime = 0;
          this.notifyListeners();
        }
      }

      this.animFrameId = window.requestAnimationFrame(tick);
    };

    this.animFrameId = window.requestAnimationFrame(tick);
  }

  /**
   * Para o monitoramento e libera o loop de animação
   */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Configura o limiar máximo de tempo para troca de música (padrão: 1000ms)
   */
  setTrackTransitionSla(ms: number): void {
    this.trackTransitionSlaMs = Math.max(100, ms);
  }

  /**
   * Configura o limiar máximo de tempo para carregamento de tela (padrão: 400ms)
   */
  setScreenLoadSla(ms: number): void {
    this.screenLoadSlaMs = Math.max(50, ms);
  }

  /**
   * Inicia o cronômetro para medição da transição entre faixas ao pular ou clicar
   */
  startTrackTransition(toTrackId: string, fromTrackId: string | null = null): void {
    if (!toTrackId) return;
    const now = performance.now();
    this.activeTrackTransitions.set(toTrackId, {
      fromTrackId,
      startTime: now,
    });
  }

  /**
   * Conclui a medição da transição de faixa no momento em que o áudio efetivamente começa a tocar.
   * Retorna o tempo decorrido em milissegundos.
   */
  endTrackTransition(toTrackId: string): number {
    const active = this.activeTrackTransitions.get(toTrackId);
    if (!active) return 0;
    this.activeTrackTransitions.delete(toTrackId);

    const now = performance.now();
    const durationMs = Math.round((now - active.startTime) * 10) / 10;
    const exceededSla = durationMs > this.trackTransitionSlaMs;

    const record: TrackTransitionRecord = {
      fromTrackId: active.fromTrackId,
      toTrackId,
      startTime: active.startTime,
      durationMs,
      exceededSla,
    };

    this.lastTrackTransition = record;

    if (exceededSla) {
      this.slowTrackTransitionsCount++;
      this.emitWarning(
        `[TetPlayer Telemetry] ⚠️ Troca de faixa lenta: levou ${durationMs}ms para iniciar a reprodução de '${toTrackId}' (limite SLA: ${this.trackTransitionSlaMs}ms).`
      );
    }

    return durationMs;
  }

  /**
   * Inicia a medição de carregamento e hidratação de uma tela
   */
  startScreenLoad(screenName: string): void {
    if (!screenName) return;
    this.activeScreenLoads.set(screenName, performance.now());
  }

  /**
   * Conclui a medição de carregamento de uma tela e emite aviso se violar o SLA
   */
  endScreenLoad(screenName: string): number {
    const startTime = this.activeScreenLoads.get(screenName);
    if (startTime === undefined) return 0;
    this.activeScreenLoads.delete(screenName);

    const now = performance.now();
    const durationMs = Math.round((now - startTime) * 10) / 10;
    const exceededSla = durationMs > this.screenLoadSlaMs;

    const record: ScreenLoadRecord = {
      screenName,
      startTime,
      durationMs,
      exceededSla,
    };

    this.lastScreenLoad = record;

    if (exceededSla) {
      this.slowScreenLoadsCount++;
      this.emitWarning(
        `[TetPlayer Telemetry] ⚠️ Carregamento lento de tela: '${screenName}' levou ${durationMs}ms (limite SLA: ${this.screenLoadSlaMs}ms).`
      );
    }

    return durationMs;
  }

  /**
   * Utilitário assíncrono para medir o tempo de execução de qualquer rotina com verificação de SLA
   */
  async measureAsyncOperation<T>(
    name: string,
    operation: () => Promise<T>,
    thresholdMs: number = 500
  ): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const elapsed = Math.round((performance.now() - start) * 10) / 10;
      if (elapsed > thresholdMs) {
        this.emitWarning(
          `[TetPlayer Telemetry] ⚠️ Operação '${name}' excedeu orçamento de tempo: levou ${elapsed}ms (limite: ${thresholdMs}ms).`
        );
      }
    }
  }

  /**
   * Emite aviso no console em modo dev e notifica listeners registrados
   */
  private emitWarning(warning: string): void {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.warn(warning);
    }
    for (const listener of this.warningListeners) {
      try {
        listener(warning);
      } catch {
        // ignore listener error
      }
    }
  }

  /**
   * Emite aviso no console para quedas severas de quadros (Jank)
   */
  private warnJank(frameTimeMs: number): void {
    const now = performance.now();
    if (now - this.lastWarningTime > 4000) {
      this.lastWarningTime = now;
      this.emitWarning(
        `[TetPlayer Telemetry] ⚠️ Queda de quadros (Jank): frame levou ${frameTimeMs.toFixed(
          1
        )}ms (limite 16.6ms / 60fps). Total de engasgos: ${this.jankCount}`
      );
    }
  }

  /**
   * Registra listener para capturar avisos emitidos pela telemetria (ideal para testes de SLA)
   */
  onWarning(listener: WarningListener): () => void {
    this.warningListeners.add(listener);
    return () => {
      this.warningListeners.delete(listener);
    };
  }

  /**
   * Obtém snapshot das métricas de FPS
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: this.currentFps,
      avgFps: this.avgFps,
      frameTimeMs: this.avgFps > 0 ? +(1000 / this.avgFps).toFixed(1) : 0,
      jankCount: this.jankCount,
      droppedFrames: this.droppedFrames,
      sampleCount: this.frameCount,
    };
  }

  /**
   * Obtém relatório completo consolidado de SLA e métricas
   */
  getSlaReport(): PerformanceSlaReport {
    return {
      metrics: this.getMetrics(),
      slowTrackTransitionsCount: this.slowTrackTransitionsCount,
      slowScreenLoadsCount: this.slowScreenLoadsCount,
      lastTrackTransition: this.lastTrackTransition,
      lastScreenLoad: this.lastScreenLoad,
      trackTransitionSlaMs: this.trackTransitionSlaMs,
      screenLoadSlaMs: this.screenLoadSlaMs,
    };
  }

  /**
   * Registra um listener para receber atualizações periódicas das métricas
   */
  subscribe(listener: MetricsListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch {
        // ignore listener errors
      }
    }
  }

  /**
   * Redefine contadores e históricos de telemetria
   */
  reset(): void {
    this.frameCount = 0;
    this.totalFrameTime = 0;
    this.jankCount = 0;
    this.droppedFrames = 0;
    this.currentFps = 60;
    this.avgFps = 60;
    this.slowTrackTransitionsCount = 0;
    this.slowScreenLoadsCount = 0;
    this.lastTrackTransition = null;
    this.lastScreenLoad = null;
    this.activeTrackTransitions.clear();
    this.activeScreenLoads.clear();
    this.trackTransitionSlaMs = 1000;
    this.screenLoadSlaMs = 400;
  }
}

export const PerformanceTelemetry = new PerformanceTelemetryService();
