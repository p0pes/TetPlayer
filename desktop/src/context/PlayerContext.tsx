import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Track, RepeatMode, NowPlayingTab } from "../types";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useAuroraColor } from "../hooks/useAuroraColor";
import { useMediaSession } from "../hooks/useMediaSession";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

interface PlayerContextType {
  currentTrack: Track | null;
  activeQueue: Track[];
  currentQueueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  loadingTrackId: string | null;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;

  isShuffle: boolean;
  repeatMode: RepeatMode;
  crossfadeSeconds: number;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  cycleCrossfade: () => void;

  isAutoplayRadio: boolean;
  toggleAutoplayRadio: () => void;

  isMiniPlayer: boolean;
  toggleMiniPlayer: () => void;

  isNowPlayingOpen: boolean;
  nowPlayingTab: NowPlayingTab;
  showLyrics: boolean;
  showPastTracks: boolean;
  setShowPastTracks: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNowPlaying: () => void;
  openNowPlaying: (tab: NowPlayingTab) => void;
  closeNowPlaying: () => void;
  setNowPlayingTab: (tab: NowPlayingTab) => void;
  toggleShowLyrics: () => void;
  toggleShowQueue: () => void;

  playTrackWithQueue: (
    track: Track,
    queue: Track[],
    index: number,
    playlistId?: string
  ) => void;
  handlePlayFromQueue: (idx: number) => void;
  handleRemoveFromQueue: (idx: number, e?: React.MouseEvent) => void;
  handleClearUpcomingQueue: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  togglePlayPause: () => void;
  handleSeekTo: (seconds: number) => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;

  pastTracks: Track[];
  upcomingTracks: Track[];

  mainScrollRef: React.RefObject<HTMLElement | null>;
  playlistScrollPosRef: React.MutableRefObject<number>;
  markPlaylistListened: (playlistId?: string) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

interface PlayerProviderProps {
  children: ReactNode;
  onMarkPlaylistListened?: (playlistId?: string) => void;
}

export function PlayerProvider({
  children,
  onMarkPlaylistListened,
}: PlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modo Shuffle & Repeat
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tetplayer_shuffle") === "true";
    } catch {
      return false;
    }
  });

  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_repeat");
      return saved === "all" || saved === "one" ? saved : "off";
    } catch {
      return "off";
    }
  });

  // Crossfade suave (0s / 2s / 3s / 5s)
  const [crossfadeSeconds, setCrossfadeSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_crossfade");
      return saved !== null && !isNaN(parseInt(saved, 10)) ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  // Autoplay Infinito & Rádio Contínua (Sugestão 2.6)
  const [isAutoplayRadio, setIsAutoplayRadio] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_autoplay_radio");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  // Modo Mini Player Flutuante (Sugestão 2.1)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // Gaveta de reprodução & Abas
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [nowPlayingTab, setNowPlayingTabState] = useState<NowPlayingTab>("lyrics");
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPastTracks, setShowPastTracks] = useState(true);

  const originalQueueRef = useRef<Track[]>([]);
  const activeQueueRef = useRef<Track[]>([]);
  const currentQueueIndexRef = useRef<number>(-1);
  const currentTrackRef = useRef<Track | null>(null);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const isAutoplayRadioRef = useRef(isAutoplayRadio);

  activeQueueRef.current = activeQueue;
  currentQueueIndexRef.current = currentQueueIndex;
  currentTrackRef.current = currentTrack;
  repeatModeRef.current = repeatMode;
  isShuffleRef.current = isShuffle;
  isAutoplayRadioRef.current = isAutoplayRadio;

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const playlistScrollPosRef = useRef<number>(0);

  // Preservação do scroll da playlist / busca ao alternar gaveta de reprodução
  useLayoutEffect(() => {
    if (!isNowPlayingOpen && !showLyrics && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = playlistScrollPosRef.current;
      const frameId = requestAnimationFrame(() => {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop = playlistScrollPosRef.current;
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [isNowPlayingOpen, showLyrics]);

  // Hook central do reprodutor do YouTube
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    loadingTrackId,
    loadAndPlayVideo,
    togglePlayPause,
    seekTo,
    changeVolume,
    toggleMute,
    restartCurrentTrack,
  } = useYouTubePlayer({
    crossfadeSeconds,
    onTrackEnded: () => handleNextTrack(),
    onTrackError: (msg) => setErrorMessage(msg),
  });

  // Amostragem inteligente de cores da capa via Web Worker
  useAuroraColor(currentTrack);

  // Alternar Mini Player com controle de janela nativo (Sugestão 2.1)
  function toggleMiniPlayer() {
    setIsMiniPlayer((prev) => {
      const next = !prev;
      invoke("set_mini_player_mode", { enabled: next }).catch(console.error);
      return next;
    });
  }

  // Alternar Autoplay Infinito / Rádio Contínua (Sugestão 2.6)
  function toggleAutoplayRadio() {
    setIsAutoplayRadio((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tetplayer_autoplay_radio", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Escuta de Ações do System Tray (Sugestão 2.2)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("tray-action", (event) => {
      switch (event.payload) {
        case "toggle-play":
          togglePlayPause();
          break;
        case "next-track":
          handleNextTrack();
          break;
        case "prev-track":
          handlePrevTrack();
          break;
        case "toggle-mini-player":
          toggleMiniPlayer();
          break;
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.warn("Erro ao registrar listener do System Tray:", err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  function markPlaylistListened(playlistId?: string) {
    if (onMarkPlaylistListened && playlistId) {
      onMarkPlaylistListened(playlistId);
    }
  }

  function openNowPlaying(tab: NowPlayingTab) {
    if (mainScrollRef.current) {
      playlistScrollPosRef.current = mainScrollRef.current.scrollTop;
    }
    setNowPlayingTabState(tab);
    setIsNowPlayingOpen(true);
    setShowLyrics(tab === "lyrics");
  }

  function setNowPlayingTab(tab: NowPlayingTab) {
    setNowPlayingTabState(tab);
    setShowLyrics(tab === "lyrics");
  }

  function closeNowPlaying() {
    setIsNowPlayingOpen(false);
    setShowLyrics(false);
  }

  function toggleNowPlaying() {
    setIsNowPlayingOpen((prev) => {
      if (!prev && mainScrollRef.current) {
        playlistScrollPosRef.current = mainScrollRef.current.scrollTop;
      }
      return !prev;
    });
  }

  function toggleShowLyrics() {
    if (isNowPlayingOpen && nowPlayingTab === "lyrics") {
      closeNowPlaying();
    } else {
      openNowPlaying("lyrics");
    }
  }

  function toggleShowQueue() {
    if (isNowPlayingOpen && nowPlayingTab === "queue") {
      closeNowPlaying();
    } else {
      openNowPlaying("queue");
    }
  }

  // Reproduzir faixa com fila e registrar no SQLite (Sugestão 4.4)
  function playTrackWithQueue(
    track: Track,
    queue: Track[],
    index: number,
    playlistId?: string
  ) {
    setCurrentTrack(track);
    setErrorMessage(null);

    if (playlistId) {
      markPlaylistListened(playlistId);
    }

    // Registrar no SQLite para o TetStats
    invoke("record_track_played", { track }).catch((err) => {
      console.warn("Erro ao registrar reprodução no SQLite:", err);
    });

    originalQueueRef.current = [...queue];

    if (isShuffleRef.current) {
      const currentIdx = index >= 0 && index < queue.length ? index : 0;
      const current = queue[currentIdx];
      const others = queue.filter((_, i) => i !== currentIdx);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      setActiveQueue([current, ...others]);
      setCurrentQueueIndex(0);
    } else {
      setActiveQueue(queue);
      setCurrentQueueIndex(index);
    }

    loadAndPlayVideo(track.id);
  }

  function toggleShuffle() {
    setIsShuffle((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem("tetplayer_shuffle", String(nextState));
      } catch {
        // ignore
      }

      if (nextState) {
        originalQueueRef.current = [...activeQueueRef.current];
        if (activeQueueRef.current.length > 1 && currentTrackRef.current) {
          const currentIdx = currentQueueIndexRef.current >= 0 ? currentQueueIndexRef.current : 0;
          const current = activeQueueRef.current[currentIdx];
          const others = activeQueueRef.current.filter((_, i) => i !== currentIdx);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          setActiveQueue([current, ...others]);
          setCurrentQueueIndex(0);
        }
      } else {
        if (originalQueueRef.current.length > 0) {
          const original = [...originalQueueRef.current];
          const currId = currentTrackRef.current?.id;
          const newIdx = currId ? original.findIndex((t) => t.id === currId) : -1;
          setActiveQueue(original);
          setCurrentQueueIndex(newIdx !== -1 ? newIdx : 0);
        }
      }
      return nextState;
    });
  }

  function cycleRepeatMode() {
    setRepeatMode((prev) => {
      const nextMode: RepeatMode =
        prev === "off" ? "all" : prev === "all" ? "one" : "off";
      try {
        localStorage.setItem("tetplayer_repeat", nextMode);
      } catch {
        // ignore
      }
      return nextMode;
    });
  }

  function cycleCrossfade() {
    setCrossfadeSeconds((prev) => {
      const next = prev === 0 ? 2 : prev === 2 ? 3 : prev === 3 ? 5 : 0;
      try {
        localStorage.setItem("tetplayer_crossfade", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function handlePlayFromQueue(idx: number) {
    const queue = activeQueueRef.current;
    if (idx >= 0 && idx < queue.length) {
      playTrackWithQueue(queue[idx], queue, idx);
    }
  }

  function handleRemoveFromQueue(idx: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const removedTrack = activeQueue[idx];
    setActiveQueue((prev) => prev.filter((_, i) => i !== idx));

    if (removedTrack) {
      const origIdx = originalQueueRef.current.findIndex((t) => t.id === removedTrack.id);
      if (origIdx !== -1) {
        originalQueueRef.current = originalQueueRef.current.filter((_, i) => i !== origIdx);
      }
    }

    setCurrentQueueIndex((prev) => (idx < prev ? Math.max(0, prev - 1) : prev));
  }

  function handleClearUpcomingQueue() {
    const current = activeQueue[currentQueueIndex];
    setActiveQueue((prev) => prev.slice(0, currentQueueIndex + 1));
    if (current) {
      const origIdx = originalQueueRef.current.findIndex((t) => t.id === current.id);
      if (origIdx !== -1) {
        originalQueueRef.current = originalQueueRef.current.slice(0, origIdx + 1);
      }
    }
  }

  // Avançar faixa com suporte a Autoplay Infinito & Rádio Contínua (Sugestão 2.6)
  function handleNextTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (queue.length === 0 || currentIndex === -1) return;

    if (repeat === "one") {
      restartCurrentTrack();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      playTrackWithQueue(queue[nextIndex], queue, nextIndex);
    } else if (repeat === "all" && queue.length > 0) {
      playTrackWithQueue(queue[0], queue, 0);
    } else if (isAutoplayRadioRef.current && currentTrackRef.current) {
      // Autoplay Infinito: busca recomendações da rádio do YouTube Music
      const lastTrack = currentTrackRef.current;
      invoke<Track[]>("get_radio_tracks", { videoId: lastTrack.id })
        .then((radioTracks) => {
          if (radioTracks && radioTracks.length > 0) {
            const nextQueue = [...activeQueueRef.current, ...radioTracks];
            playTrackWithQueue(radioTracks[0], nextQueue, activeQueueRef.current.length);
          }
        })
        .catch((err) => {
          console.warn("Falha ao buscar rádio automática:", err);
        });
    }
  }

  function handlePrevTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (queue.length === 0 || currentIndex === -1) return;

    if (currentTime > 3) {
      restartCurrentTrack();
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      playTrackWithQueue(queue[prevIndex], queue, prevIndex);
    } else if (repeat === "all" && queue.length > 0) {
      const lastIndex = queue.length - 1;
      playTrackWithQueue(queue[lastIndex], queue, lastIndex);
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    changeVolume(parseFloat(e.target.value));
  }

  // Segmentação memoizada da fila ativa
  const pastTracks = useMemo(() => {
    if (currentQueueIndex <= 0) return [];
    return activeQueue.slice(0, currentQueueIndex);
  }, [activeQueue, currentQueueIndex]);

  const upcomingTracks = useMemo(() => {
    if (currentQueueIndex === -1 || currentQueueIndex >= activeQueue.length - 1) return [];
    return activeQueue.slice(currentQueueIndex + 1);
  }, [activeQueue, currentQueueIndex]);

  // SMTC Windows Media Session (Otimizado)
  useMediaSession({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    onPlay: () => togglePlayPause(),
    onPause: () => togglePlayPause(),
    onNext: () => handleNextTrack(),
    onPrev: () => handlePrevTrack(),
    onSeekTo: (sec) => seekTo(sec),
  });

  // Atalhos Globais de Teclado
  useKeyboardShortcuts({
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    seekTo,
    currentTime,
    changeVolume,
    volume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    isNowPlayingOpen,
    nowPlayingTab,
    toggleNowPlaying,
    openNowPlaying,
    closeNowPlaying,
  });

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        activeQueue,
        currentQueueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        loadingTrackId,
        errorMessage,
        setErrorMessage,
        isShuffle,
        repeatMode,
        crossfadeSeconds,
        toggleShuffle,
        cycleRepeatMode,
        cycleCrossfade,
        isAutoplayRadio,
        toggleAutoplayRadio,
        isMiniPlayer,
        toggleMiniPlayer,
        isNowPlayingOpen,
        nowPlayingTab,
        showLyrics,
        showPastTracks,
        setShowPastTracks,
        toggleNowPlaying,
        openNowPlaying,
        closeNowPlaying,
        setNowPlayingTab,
        toggleShowLyrics,
        toggleShowQueue,
        playTrackWithQueue,
        handlePlayFromQueue,
        handleRemoveFromQueue,
        handleClearUpcomingQueue,
        handleNextTrack,
        handlePrevTrack,
        togglePlayPause,
        handleSeekTo: seekTo,
        handleVolumeChange,
        toggleMute,
        pastTracks,
        upcomingTracks,
        mainScrollRef,
        playlistScrollPosRef,
        markPlaylistListened,
      }}
    >
      {/* Hidden YouTube Iframe Player mantido PERMANENTEMENTE no DOM raiz para zero interrupções */}
      <div
        className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0 w-1 h-1 overflow-hidden"
        aria-hidden="true"
      >
        <div id="yt-player-frame" />
      </div>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer deve ser usado dentro de um PlayerProvider");
  }
  return context;
}
