import { describe, it, expect, vi, beforeEach } from "vitest";
import { PerformanceTelemetry } from "../telemetry";

describe("PerformanceTelemetry", () => {
  beforeEach(() => {
    PerformanceTelemetry.reset();
  });

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
