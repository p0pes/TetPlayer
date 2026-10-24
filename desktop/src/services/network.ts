import { useState, useEffect } from "react";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

/**
 * Utilitário de resiliência com recuo exponencial (Exponential Backoff Retry)
 * Executa uma operação assíncrona com tentativas automáticas e intervalos crescentes.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    backoffMultiplier = 2,
    maxDelayMs = 4000,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || (typeof navigator !== "undefined" && !navigator.onLine)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
}

/**
 * Hook para monitorar o status de conectividade online/offline da aplicação
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    function handleOnline() {
      setIsOnline(true);
      setShowRestoredNotice(true);
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setShowRestoredNotice(false);
      }, 3500);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowRestoredNotice(false);
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return { isOnline, showRestoredNotice };
}
