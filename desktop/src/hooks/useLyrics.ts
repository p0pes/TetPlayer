import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, LyricsData, LyricLine } from "../types";
import { retryWithBackoff } from "../services/network";

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

  // Carregamento de Letras Sincronizadas com Resiliência e Cache Global
  useEffect(() => {
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

  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);

  // Cleanup de timeouts pendentes ao desmontar
  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) window.clearTimeout(programmaticScrollTimeoutRef.current);
      if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
    };
  }, []);

  // Autoscroll Suave e Otimizado da Linha Ativa
  useEffect(() => {
    const isLyricsActive = (isNowPlayingOpen && nowPlayingTab === "lyrics") || showLyrics;
    if (!isLyricsActive || activeLyricIndex === -1 || userScrollingLyricsRef.current) return;
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeEl = activeLyricRef.current;
      const targetScroll = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;

      isProgrammaticScrollRef.current = true;
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });

      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);

      setIsUserScrolledAway(false);
    }
  }, [activeLyricIndex, isNowPlayingOpen, nowPlayingTab, showLyrics]);

  function handleLyricsContainerScroll() {
    if (isProgrammaticScrollRef.current) return;

    userScrollingLyricsRef.current = true;
    setIsUserScrolledAway(true);
    if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = window.setTimeout(() => {
      userScrollingLyricsRef.current = false;
      setIsUserScrolledAway(false);
      if (activeLyricRef.current && lyricsContainerRef.current) {
        const container = lyricsContainerRef.current;
        const activeEl = activeLyricRef.current;
        const targetScroll = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        isProgrammaticScrollRef.current = true;
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
        if (programmaticScrollTimeoutRef.current) window.clearTimeout(programmaticScrollTimeoutRef.current);
        programmaticScrollTimeoutRef.current = window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 700);
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
      const targetScroll = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      isProgrammaticScrollRef.current = true;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
      if (programmaticScrollTimeoutRef.current) window.clearTimeout(programmaticScrollTimeoutRef.current);
      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);
    }
  }

  function handleLyricClick(time: number, onSeek: (time: number) => void) {
    userScrollingLyricsRef.current = false;
    setIsUserScrolledAway(false);
    if (userScrollTimeoutRef.current) window.clearTimeout(userScrollTimeoutRef.current);

    onSeek(time);

    if (lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      isProgrammaticScrollRef.current = true;
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }

      const targetIdx = parsedLyrics.findIndex((l) => l.time === time);
      if (targetIdx !== -1) {
        setActiveLyricIndex(targetIdx);
        const lineElements = container.querySelectorAll<HTMLElement>("[data-lyric-time]");
        const targetEl = lineElements[targetIdx];
        if (targetEl) {
          const targetScroll = targetEl.offsetTop - container.clientHeight / 2 + targetEl.clientHeight / 2;
          container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth",
          });
        }
      }

      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);
    }
  }

  return {
    lyricsData,
    parsedLyrics,
    isLoadingLyrics,
    lyricsError,
    activeLyricIndex,
    isUserScrolledAway,
    lyricsContainerRef,
    activeLyricRef,
    handleLyricsContainerScroll,
    handleRecenterLyrics,
    handleLyricClick,
  };
}
