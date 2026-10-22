import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Track, LyricsData, LyricLine } from "../types";

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      const time = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ time, text });
      }
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

  const lyricsCacheRef = useRef<Record<string, LyricsData>>({});
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const userScrollingLyricsRef = useRef(false);
  const userScrollTimeoutRef = useRef<number | null>(null);

  // Carregamento de Letras Sincronizadas
  useEffect(() => {
    if (!currentTrack) {
      setLyricsData(null);
      setParsedLyrics([]);
      setLyricsError(null);
      return;
    }

    const trackId = currentTrack.id;
    if (lyricsCacheRef.current[trackId]) {
      const cached = lyricsCacheRef.current[trackId];
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

    invoke<LyricsData>("get_track_lyrics", {
      title: currentTrack.title,
      artist: currentTrack.artist,
      videoId: currentTrack.id,
    })
      .then((data) => {
        if (!isMounted) return;
        lyricsCacheRef.current[trackId] = data;
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
      }, 550);

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
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 550);
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
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
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
  };
}
