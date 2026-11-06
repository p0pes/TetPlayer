import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus, retryWithBackoff, NetworkService } from "../network";

describe("NetworkService & useNetworkStatus (Detecção de Modo Offline e Resiliência)", () => {
  beforeEach(() => {
    NetworkService.setSimulatedOffline(false);
  });

  it("deve reportar status online por padrão quando navigator.onLine for true", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it("deve reagir aos eventos de offline e online do window", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.showRestoredNotice).toBe(true);
  });

  it("deve permitir simular corte de conexão e restaurar via NetworkService", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSimulatedOffline).toBe(false);

    act(() => {
      NetworkService.setSimulatedOffline(true);
    });

    expect(NetworkService.isOnline()).toBe(false);
    expect(NetworkService.isSimulatedOffline()).toBe(true);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isSimulatedOffline).toBe(true);

    act(() => {
      NetworkService.toggleSimulatedOffline();
    });

    expect(NetworkService.isOnline()).toBe(true);
    expect(NetworkService.isSimulatedOffline()).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSimulatedOffline).toBe(false);
    expect(result.current.showRestoredNotice).toBe(true);
  });

  it("deve executar retryWithBackoff e resolver com sucesso", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts++;
        if (attempts < 2) throw new Error("Falha temporária");
        return "sucesso";
      },
      { maxRetries: 2, initialDelayMs: 10 }
    );
    expect(result).toBe("sucesso");
    expect(attempts).toBe(2);
  });
});
