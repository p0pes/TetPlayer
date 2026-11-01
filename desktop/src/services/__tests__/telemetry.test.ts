import { describe, it, expect, vi, beforeEach } from "vitest";
import { PerformanceTelemetry } from "../telemetry";

describe("PerformanceTelemetry (Métricas, FPS e SLA)", () => {
  beforeEach(() => {
    PerformanceTelemetry.reset();
  });

  describe("Métricas e Monitoramento de FPS", () => {
    it("deve fornecer métricas padrão iniciais consistentes", () => {
      const metrics = PerformanceTelemetry.getMetrics();
      expect(metrics.fps).toBe(60);
      expect(metrics.jankCount).toBe(0);
      expect(metrics.droppedFrames).toBe(0);
    });

    it("deve permitir inscrição e notificação de listeners", () => {
      const listener = vi.fn();
      const unsubscribe = PerformanceTelemetry.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: 60,
          jankCount: 0,
        })
      );

      unsubscribe();
    });
  });

  describe("SLA de Troca de Música (Transição entre faixas)", () => {
    it("não deve disparar aviso quando a troca de faixa ocorre dentro do limite (< 1000ms)", () => {
      const warningListener = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningListener);

      const fakeNow = vi.spyOn(performance, "now");
      fakeNow.mockReturnValueOnce(1000); // Início
      PerformanceTelemetry.startTrackTransition("track_next_123", "track_current_001");

      fakeNow.mockReturnValueOnce(1450); // Término (450ms depois)
      const duration = PerformanceTelemetry.endTrackTransition("track_next_123");

      expect(duration).toBe(450);
      expect(warningListener).not.toHaveBeenCalled();

      const report = PerformanceTelemetry.getSlaReport();
      expect(report.slowTrackTransitionsCount).toBe(0);
      expect(report.lastTrackTransition).toEqual({
        fromTrackId: "track_current_001",
        toTrackId: "track_next_123",
        startTime: 1000,
        durationMs: 450,
        exceededSla: false,
      });

      unsub();
      fakeNow.mockRestore();
    });

    it("deve emitir aviso de lentidão caso o pulo de música demore mais de 1 segundo (> 1000ms)", () => {
      const warningListener = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningListener);

      const fakeNow = vi.spyOn(performance, "now");
      fakeNow.mockReturnValueOnce(2000); // Início
      PerformanceTelemetry.startTrackTransition("slow_track_999", "prev_track_888");

      fakeNow.mockReturnValueOnce(3250); // Término (1250ms depois -> violação de SLA!)
      const duration = PerformanceTelemetry.endTrackTransition("slow_track_999");

      expect(duration).toBe(1250);
      expect(warningListener).toHaveBeenCalledTimes(1);
      expect(warningListener).toHaveBeenCalledWith(
        expect.stringContaining("Troca de faixa lenta: levou 1250ms para iniciar a reprodução de 'slow_track_999'")
      );

      const report = PerformanceTelemetry.getSlaReport();
      expect(report.slowTrackTransitionsCount).toBe(1);
      expect(report.lastTrackTransition?.exceededSla).toBe(true);

      unsub();
      fakeNow.mockRestore();
    });
  });

  describe("SLA de Carregamento e Hidratação de Telas", () => {
    it("não deve alertar quando a tela carrega dentro do SLA (< 400ms)", () => {
      const warningListener = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningListener);

      const fakeNow = vi.spyOn(performance, "now");
      fakeNow.mockReturnValueOnce(5000);
      PerformanceTelemetry.startScreenLoad("PlaylistDetailView");

      fakeNow.mockReturnValueOnce(5180); // 180ms
      const duration = PerformanceTelemetry.endScreenLoad("PlaylistDetailView");

      expect(duration).toBe(180);
      expect(warningListener).not.toHaveBeenCalled();
      expect(PerformanceTelemetry.getSlaReport().slowScreenLoadsCount).toBe(0);

      unsub();
      fakeNow.mockRestore();
    });

    it("deve emitir alerta caso a tela demore mais que o orçamento SLA para carregar (> 400ms)", () => {
      const warningListener = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningListener);

      const fakeNow = vi.spyOn(performance, "now");
      fakeNow.mockReturnValueOnce(10000);
      PerformanceTelemetry.startScreenLoad("HeavyAlbumDetailView");

      fakeNow.mockReturnValueOnce(10650); // 650ms -> violação do limite de 400ms!
      const duration = PerformanceTelemetry.endScreenLoad("HeavyAlbumDetailView");

      expect(duration).toBe(650);
      expect(warningListener).toHaveBeenCalledTimes(1);
      expect(warningListener).toHaveBeenCalledWith(
        expect.stringContaining("Carregamento lento de tela: 'HeavyAlbumDetailView' levou 650ms")
      );
      expect(PerformanceTelemetry.getSlaReport().slowScreenLoadsCount).toBe(1);

      unsub();
      fakeNow.mockRestore();
    });
  });

  describe("Medição de Operações Assíncronas (measureAsyncOperation)", () => {
    it("deve executar a função e alertar quando o orçamento for ultrapassado", async () => {
      const warningListener = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningListener);

      const fakeNow = vi.spyOn(performance, "now");
      let time = 1000;
      fakeNow.mockImplementation(() => time);

      const result = await PerformanceTelemetry.measureAsyncOperation(
        "HeavyCalculation",
        async () => {
          time += 750; // simula 750ms de processamento
          return 42;
        },
        500 // limite de 500ms
      );

      expect(result).toBe(42);
      expect(warningListener).toHaveBeenCalledWith(
        expect.stringContaining("Operação 'HeavyCalculation' excedeu orçamento de tempo: levou 750ms")
      );

      unsub();
      fakeNow.mockRestore();
    });
  });

  describe("Customização e Reset de Limiares", () => {
    it("deve permitir ajustar limiares de SLA dinamicamente", () => {
      PerformanceTelemetry.setTrackTransitionSla(500);
      PerformanceTelemetry.setScreenLoadSla(200);

      const report = PerformanceTelemetry.getSlaReport();
      expect(report.trackTransitionSlaMs).toBe(500);
      expect(report.screenLoadSlaMs).toBe(200);
    });

    it("deve limpar todos os estados ao executar reset()", () => {
      PerformanceTelemetry.startScreenLoad("TestScreen");
      PerformanceTelemetry.reset();

      expect(PerformanceTelemetry.endScreenLoad("TestScreen")).toBe(0);
      expect(PerformanceTelemetry.getSlaReport().slowScreenLoadsCount).toBe(0);
    });
  });
});
