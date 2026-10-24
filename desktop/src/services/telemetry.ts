export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  jankCount: number;
  droppedFrames: number;
  sampleCount: number;
}

type MetricsListener = (metrics: PerformanceMetrics) => void;

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

        // Se o frame demorar mais que 16.67ms (orçamento de 60fps), conta como queda de frame
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
   * Emite aviso no console em modo de desenvolvimento com limitação de taxa (máximo 1 a cada 4s)
   */
  private warnJank(frameTimeMs: number): void {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      const now = performance.now();
      if (now - this.lastWarningTime > 4000) {
        this.lastWarningTime = now;
        console.warn(
          `[TetPlayer Telemetry] ⚠️ Queda de quadros (Jank): frame levou ${frameTimeMs.toFixed(
            1
          )}ms (limite 16.6ms / 60fps). Total de engasgos: ${this.jankCount}`
        );
      }
    }
  }

  /**
   * Obtém snapshot das métricas atuais de performance
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
   * Redefine contadores de telemetria
   */
  reset(): void {
    this.frameCount = 0;
    this.totalFrameTime = 0;
    this.jankCount = 0;
    this.droppedFrames = 0;
    this.currentFps = 60;
    this.avgFps = 60;
  }
}

export const PerformanceTelemetry = new PerformanceTelemetryService();
