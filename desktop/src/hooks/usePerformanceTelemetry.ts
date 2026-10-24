import { useState, useEffect } from "react";
import { PerformanceTelemetry, PerformanceMetrics } from "../services/telemetry";

export interface UsePerformanceTelemetryOptions {
  enabled?: boolean;
}

/**
 * Hook de telemetria local para monitoramento contínuo de taxa de quadros (FPS)
 * e detecção de gargalos de renderização na interface.
 */
export function usePerformanceTelemetry(
  options: UsePerformanceTelemetryOptions = {}
): PerformanceMetrics {
  const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
  const enabled = options.enabled ?? isDev;

  const [metrics, setMetrics] = useState<PerformanceMetrics>(() =>
    PerformanceTelemetry.getMetrics()
  );

  useEffect(() => {
    if (!enabled) return;

    PerformanceTelemetry.start();
    const unsubscribe = PerformanceTelemetry.subscribe((m) => {
      setMetrics(m);
    });

    return () => {
      unsubscribe();
    };
  }, [enabled]);

  return metrics;
}
