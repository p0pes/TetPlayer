import { invoke } from "@tauri-apps/api/core";
import { StreamInfo } from "./audioEngine";

const STREAM_CACHE_TTL = 30 * 60 * 1000; // 30 minutos de validade em memória

interface CacheEntry {
  stream: StreamInfo | null;
  timestamp: number;
}

const memoryStreamCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<StreamInfo | null>>();

/**
 * Busca informações de stream nativo com cache em memória e timeout resiliente.
 * Se já estiver em cache, resolve em 0ms sem qualquer chamada de rede.
 */
/**
 * Retorna de forma síncrona (0ms) as informações de stream se já estiverem em memória
 */
export function getCachedStreamInfo(videoId: string): StreamInfo | null {
  if (!videoId) return null;
  const cached = memoryStreamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.stream;
  }
  return null;
}

export async function fetchStreamInfoCached(
  videoId: string,
  timeoutMs = 650
): Promise<StreamInfo | null> {
  if (!videoId) return null;

  const cached = memoryStreamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < STREAM_CACHE_TTL) {
    return cached.stream;
  }

  // Deduplicação: se já existe requisição em voo (ex: disparada pelo prefetch), reutiliza
  if (inFlightRequests.has(videoId)) {
    return inFlightRequests.get(videoId)!;
  }

  const promise = (async () => {
    try {
      const invokePromise = invoke<StreamInfo | null>("get_stream_info", { videoId });
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      });

      const res = await Promise.race([invokePromise, timeoutPromise]);
      memoryStreamCache.set(videoId, { stream: res, timestamp: Date.now() });
      return res;
    } catch (err) {
      console.warn("[StreamCache] Falha ao obter stream direto:", err);
      memoryStreamCache.set(videoId, { stream: null, timestamp: Date.now() });
      return null;
    } finally {
      inFlightRequests.delete(videoId);
    }
  })();

  inFlightRequests.set(videoId, promise);
  return promise;
}

/**
 * Dispara o pré-carregamento imediato da próxima faixa em background sem bloquear a UI.
 */
export function prefetchStreamInfo(videoId?: string | null): void {
  if (!videoId || memoryStreamCache.has(videoId) || inFlightRequests.has(videoId)) {
    return;
  }
  // Dá um timeout generoso para background prefetch (3s) para garantir resolução
  fetchStreamInfoCached(videoId, 3000).catch(() => {});
}

/**
 * Limpa o cache de streams em memória
 */
export function clearStreamCache(): void {
  memoryStreamCache.clear();
  inFlightRequests.clear();
}

