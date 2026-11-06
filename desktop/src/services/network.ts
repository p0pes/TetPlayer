import { useState, useEffect } from "react";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

const DEV_SIMULATED_OFFLINE_KEY = "tetplayer_dev_offline_sim";

let devSimulatedOffline: boolean = (() => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DEV_SIMULATED_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
})();

/**
 * Serviço central de gerenciamento de conectividade de rede com suporte a simulação em modo Develop.
 */
export const NetworkService = {
  /**
   * Retorna se a aplicação possui conectividade com a internet.
   * Se a simulação de offline estiver ativada, sempre retorna false.
   */
  isOnline(): boolean {
    if (devSimulatedOffline) return false;
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },

  /**
   * Retorna se a conexão está atualmente cortada intencionalmente pelo desenvolvedor.
   */
  isSimulatedOffline(): boolean {
    return devSimulatedOffline;
  },

  /**
   * Corta ou restabelece a conexão da aplicação para testes de resiliência e reprodução offline.
   */
  setSimulatedOffline(offline: boolean) {
    devSimulatedOffline = offline;
    try {
      if (offline) {
        sessionStorage.setItem(DEV_SIMULATED_OFFLINE_KEY, "true");
      } else {
        sessionStorage.removeItem(DEV_SIMULATED_OFFLINE_KEY);
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(offline ? "offline" : "online"));
      window.dispatchEvent(
        new CustomEvent("tetplayer:dev-network-change", {
          detail: { isOnline: !offline, isSimulated: offline },
        })
      );
      window.dispatchEvent(
        new CustomEvent("tetplayer:toast", {
          detail: {
            message: offline
              ? "⚡ Dev: Conexão CORTADA (Modo Offline Simulado Ativo)"
              : "🌐 Dev: Conexão RESTABELECIDA (Modo Online)",
          },
        })
      );
    }
  },

  /**
   * Alterna entre conectado e offline simulado.
   */
  toggleSimulatedOffline(): boolean {
    const next = !devSimulatedOffline;
    this.setSimulatedOffline(next);
    return next;
  },
};

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
      if (attempt > maxRetries || !NetworkService.isOnline()) {
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
  const [isOnline, setIsOnline] = useState<boolean>(() => NetworkService.isOnline());
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() =>
    NetworkService.isSimulatedOffline()
  );
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    function handleOnline() {
      if (NetworkService.isSimulatedOffline()) {
        setIsOnline(false);
        setIsSimulatedOffline(true);
        return;
      }
      setIsOnline(true);
      setIsSimulatedOffline(false);
      setShowRestoredNotice(true);
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setShowRestoredNotice(false);
      }, 3500);
    }

    function handleOffline() {
      setIsOnline(false);
      setIsSimulatedOffline(NetworkService.isSimulatedOffline());
      setShowRestoredNotice(false);
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    function handleDevChange(e: Event) {
      const custom = e as CustomEvent<{ isOnline: boolean; isSimulated: boolean }>;
      const nextOnline = custom.detail?.isOnline ?? NetworkService.isOnline();
      const nextSim = custom.detail?.isSimulated ?? NetworkService.isSimulatedOffline();
      setIsOnline(nextOnline);
      setIsSimulatedOffline(nextSim);
      if (nextOnline) {
        setShowRestoredNotice(true);
        if (timeoutId) window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          setShowRestoredNotice(false);
        }, 3500);
      } else {
        setShowRestoredNotice(false);
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("tetplayer:dev-network-change", handleDevChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("tetplayer:dev-network-change", handleDevChange);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return {
    isOnline,
    isSimulatedOffline,
    showRestoredNotice,
    toggleSimulatedOffline: NetworkService.toggleSimulatedOffline.bind(NetworkService),
    setSimulatedOffline: NetworkService.setSimulatedOffline.bind(NetworkService),
  };
}
