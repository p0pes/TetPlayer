import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, LyricsData, LyricLine } from "../types";
import { retryWithBackoff } from "../services/network";
import { SettingsService } from "../services/settings";

export const MAX_LYRICS_CACHE_ENTRIES = 80;
const globalLyricsCache = new Map<string, LyricsData>();

export function getCachedLyrics(trackId: string): LyricsData | undefined {
  const item = globalLyricsCache.get(trackId);
  if (item) {
    // Reinsere para manter a ordem de acesso mais recente (LRU)
    globalLyricsCache.delete(trackId);
    globalLyricsCache.set(trackId, item);
  }
  return item;
}

export function setCachedLyrics(trackId: string, data: LyricsData): void {
  if (globalLyricsCache.has(trackId)) {
    globalLyricsCache.delete(trackId);
  } else if (globalLyricsCache.size >= MAX_LYRICS_CACHE_ENTRIES) {
    // Evicção da entrada mais antiga (FIFO / LRU)
    const oldestKey = globalLyricsCache.keys().next().value;
    if (oldestKey) {
      globalLyricsCache.delete(oldestKey);
    }
  }
  globalLyricsCache.set(trackId, data);
}

export function clearLyricsCache(): void {
  globalLyricsCache.clear();
}

/**
 * Pré-carregamento assíncrono antecipado de letras para próxima faixa (Gapless)
 */
export async function prefetchTrackLyrics(track: Track): Promise<LyricsData | null> {
  if (!track || !track.id) return null;
  const cached = getCachedLyrics(track.id);
  if (cached) return cached;

  try {
    const data = await retryWithBackoff(() =>
      invoke<LyricsData>("get_track_lyrics", {
        title: track.title,
        artist: track.artist,
        videoId: track.id,
      })
    );
    setCachedLyrics(track.id, data);
    return data;
  } catch {
    return null;
  }
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Curva de amortecimento cinético cúbico (Spring Ease-Out Damping estilo Apple Music).
 * Proporciona aceleração responsiva inicial e frenagem orgânica e sedosa ao se aproximar da estrofe.
 */
export function kineticEaseOut(t: number): number {
  const p = 1 - Math.max(0, Math.min(1, t));
  return 1 - p * p * p;
}

/**
 * Curva de amortecimento cinético com suave overshoot elástico (Spring Bounce Easing).
 * Simula uma física de mola fluida que avança com aceleração orgânica, realiza um leve
 * overshoot elástico (~2.6%) e assenta suavemente no centro da linha ativa.
 */
export function kineticSpringBounce(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0) return 0;
  if (clamped >= 1) return 1;
  const s = 0.85;
  const p = clamped - 1;
  return 1 + (s + 1) * p * p * p + s * p * p;
}

/**
 * Calcula a duração ideal (ms) baseada na distância física em pixels do scroll.
 * - Passagem contígua de estrofe (~40 a 90px): ~340ms a 420ms
 * - Salto longo por seek ou clique direto (> 400px): ~500ms a 750ms com aceleração proporcional
 */
export function calculateScrollDuration(distance: number, isDirectSeek: boolean): number {
  const absDist = Math.abs(distance);
  if (isDirectSeek) {
    return Math.min(800, Math.max(400, 360 + Math.sqrt(absDist) * 10));
  }
  return Math.min(520, Math.max(340, 300 + Math.sqrt(absDist) * 8));
}

export function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length === 0) continue;

    const rawText = line.replace(timeRegex, "").trim();
    // Se a linha possuir marcador de tempo mas sem texto (pausa instrumental), usa o símbolo musical ♪
    const text = rawText || "♪";

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      const time = minutes * 60 + seconds + millis / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

interface UseLyricsProps {
  currentTrack: Track | null;
  currentTime: number;
  isNowPlayingOpen: boolean;
  nowPlayingTab: "queue" | "lyrics";
  showLyrics: boolean;
}

export function useLyrics({
  currentTrack,
  currentTime,
  isNowPlayingOpen,
  nowPlayingTab,
  showLyrics,
}: UseLyricsProps) {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [parsedLyrics, setParsedLyrics] = useState<LyricLine[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(-1);
  const [isUserScrolledAway, setIsUserScrolledAway] = useState(false);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const userScrollingLyricsRef = useRef(false);
  const userScrollTimeoutRef = useRef<number | null>(null);
  const lastActiveIndexRef = useRef<number>(-1);

  // Carregamento de Letras Sincronizadas com Resiliência e Cache Global
  useEffect(() => {
    lastActiveIndexRef.current = -1;
    setActiveLyricIndex(-1);

    if (!currentTrack) {
      setLyricsData(null);
      setParsedLyrics([]);
      setLyricsError(null);
      return;
    }

    const trackId = currentTrack.id;
    const cached = getCachedLyrics(trackId);
    if (cached) {
      setLyricsData(cached);
      if (cached.synced) {
        setParsedLyrics(parseLrc(cached.synced));
      } else {
        setParsedLyrics([]);
      }
      setLyricsError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingLyrics(true);
    setLyricsError(null);

    retryWithBackoff(() =>
      invoke<LyricsData>("get_track_lyrics", {
        title: currentTrack.title,
        artist: currentTrack.artist,
        videoId: currentTrack.id,
      })
    )
      .then((data) => {
        if (!isMounted) return;
        setCachedLyrics(trackId, data);
        setLyricsData(data);
        if (data.synced) {
          const parsed = parseLrc(data.synced);
          setParsedLyrics(parsed);
        } else {
          setParsedLyrics([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Erro ao carregar letra:", err);
        setLyricsError("Não foi possível carregar a letra desta música.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingLyrics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id]);

  // Sincronização da Linha Ativa das Letras
  useEffect(() => {
    if (parsedLyrics.length === 0) {
      setActiveLyricIndex(-1);
      return;
    }

    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== activeLyricIndex) {
      setActiveLyricIndex(activeIdx);
    }
  }, [currentTime, parsedLyrics]);

  const [isFastScrolling, setIsFastScrolling] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const seekDebounceTimerRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);

  // Motor de Interpolação Cinética Baseada em Física (Item 3.3)
  const scrollToTargetKinetic = useCallback((targetScroll: number, isDirectSeek: boolean) => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const startScroll = container.scrollTop;
    const distance = targetScroll - startScroll;

    // Se a distância for imperceptível, aplica diretamente
    if (Math.abs(distance) < 2) {
      container.scrollTop = targetScroll;
      setIsFastScrolling(false);
      return;
    }

    // Respeita modo de redução de movimento para conforto e economia de bateria
    const isReduced = SettingsService.getSetting("reducedMotion");
    if (isReduced) {
      container.scrollTop = targetScroll;
      setIsFastScrolling(false);
      return;
    }

    const duration = calculateScrollDuration(distance, isDirectSeek);
    const isLargeJump = Math.abs(distance) > 220;
    if (isLargeJump) {
      setIsFastScrolling(true);
    }

    const startTime = performance.now();
    isProgrammaticScrollRef.current = true;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = isDirectSeek ? kineticEaseOut(progress) : kineticSpringBounce(progress);

      container.scrollTop = startScroll + distance * ease;

      // Desliga o motion soft blur na aproximação final (últimos 15% do curso)
      if (progress > 0.85 && isLargeJump) {
        setIsFastScrolling(false);
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        container.scrollTop = targetScroll;
        rafIdRef.current = null;
        setIsFastScrolling(false);

        if (programmaticScrollTimeoutRef.current) {
          window.clearTimeout(programmaticScrollTimeoutRef.current);
        }
        programmaticScrollTimeoutRef.current = window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 120);
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, []);

  // Cleanup de timers e frames ao desmontar
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (seekDebounceTimerRef.current !== null) window.clearTimeout(seekDebounceTimerRef.current);
      if (programmaticScrollTimeoutRef.current) window.clearTimeout(programmaticScrollTimeoutRef.current);
      if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
    };
  }, []);

  // Autoscroll Cinético Suave e Estabilizado da Linha Ativa (Item 3.3)
  useEffect(() => {
    const isLyricsActive = (isNowPlayingOpen && nowPlayingTab === "lyrics") || showLyrics;
    if (!isLyricsActive || activeLyricIndex === -1 || userScrollingLyricsRef.current) return;

    const prevIndex = lastActiveIndexRef.current;
    lastActiveIndexRef.current = activeLyricIndex;

    const isSeekJump = prevIndex !== -1 && Math.abs(activeLyricIndex - prevIndex) > 1;

    const executeScroll = () => {
      if (activeLyricRef.current && lyricsContainerRef.current) {
        const container = lyricsContainerRef.current;
        const activeEl = activeLyricRef.current;
        const targetScroll = Math.max(
          0,
          activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
        );
        scrollToTargetKinetic(targetScroll, isSeekJump);
        setIsUserScrolledAway(false);
      }
    };

    if (isSeekJump) {
      // Em saltos rápidos de seek / arrasto da barra, debounça micro-rolagens por 90ms para evitar trepidação
      if (seekDebounceTimerRef.current !== null) {
        window.clearTimeout(seekDebounceTimerRef.current);
      }
      seekDebounceTimerRef.current = window.setTimeout(executeScroll, 90);
    } else {
      // Na progressão contínua das estrofes, o scroll desliza imediatamente a 0ms
      executeScroll();
    }
  }, [activeLyricIndex, isNowPlayingOpen, nowPlayingTab, showLyrics, scrollToTargetKinetic]);

  function handleLyricsContainerScroll() {
    if (isProgrammaticScrollRef.current) return;

    // Cancela qualquer animação cinética ativa se o usuário interagir manualmente
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      setIsFastScrolling(false);
    }

    userScrollingLyricsRef.current = true;
    setIsUserScrolledAway(true);
    if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = window.setTimeout(() => {
      userScrollingLyricsRef.current = false;
      setIsUserScrolledAway(false);
      if (activeLyricRef.current && lyricsContainerRef.current) {
        const container = lyricsContainerRef.current;
        const activeEl = activeLyricRef.current;
        const targetScroll = Math.max(
          0,
          activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
        );
        scrollToTargetKinetic(targetScroll, false);
      }
    }, 4500);
  }

  function handleRecenterLyrics() {
    userScrollingLyricsRef.current = false;
    setIsUserScrolledAway(false);
    if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeEl = activeLyricRef.current;
      const targetScroll = Math.max(
        0,
        activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2
      );
      scrollToTargetKinetic(targetScroll, true);
    }
  }

  function handleLyricClick(time: number, onSeek: (time: number) => void) {
    userScrollingLyricsRef.current = false;
    setIsUserScrolledAway(false);
    if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);

    onSeek(time);

    const targetIdx = parsedLyrics.findIndex((l) => l.time === time);
    if (targetIdx !== -1) {
      setActiveLyricIndex(targetIdx);
      if (lyricsContainerRef.current) {
        const container = lyricsContainerRef.current;
        const lineElements = container.querySelectorAll<HTMLElement>("[data-lyric-time]");
        const targetEl = lineElements[targetIdx];
        if (targetEl) {
          const targetScroll = Math.max(
            0,
            targetEl.offsetTop - container.clientHeight / 2 + targetEl.clientHeight / 2
          );
          scrollToTargetKinetic(targetScroll, true);
        }
      }
    }
  }

  return {
    lyricsData,
    parsedLyrics,
    isLoadingLyrics,
    lyricsError,
    activeLyricIndex,
    isUserScrolledAway,
    isFastScrolling,
    lyricsContainerRef,
    activeLyricRef,
    handleLyricsContainerScroll,
    handleRecenterLyrics,
    handleLyricClick,
  };
}
