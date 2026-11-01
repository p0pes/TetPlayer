import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus, retryWithBackoff } from "../network";

describe("NetworkService & useNetworkStatus (Detecção de Modo Offline e Resiliência)", () => {
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

  it("deve executar retryWithBackoff e resolver com sucesso", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts++;
      if (attempts < 2) throw new Error("Falha temporária");
      return "sucesso";
    }, { maxRetries: 2, initialDelayMs: 10 });
    expect(result).toBe("sucesso");
    expect(attempts).toBe(2);
  });
});
