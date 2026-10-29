import React, {
  createContext,
  useContext,
  useState,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Track, RepeatMode, NowPlayingTab } from "../types";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useAuroraColor, prefetchArtworkColors } from "../hooks/useAuroraColor";
import { useMediaSession } from "../hooks/useMediaSession";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { prefetchTrackLyrics } from "../hooks/useLyrics";
import { PlaybackProgressProvider } from "./PlaybackProgressContext";
import { playerReducer, createInitialQueueState } from "./playerReducer";
import { TrackContextMenu, ContextMenuPosition } from "../components/ContextMenu/TrackContextMenu";
import { SettingsService } from "../services/settings";

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
  setCrossfadeSeconds: (secs: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  cycleCrossfade: () => void;

  isAutoplayRadio: boolean;
  toggleAutoplayRadio: () => void;

  isMiniPlayer: boolean;
  toggleMiniPlayer: () => void;

  isNowPlayingOpen: boolean;
  isDrawerClosing: boolean;
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
  handleReorderQueue: (fromIndex: number, toIndex: number) => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  togglePlayPause: () => void;
  handleSeekTo: (seconds: number) => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleMute: () => void;

  handlePlayNext: (track: Track) => void;
  handleAddToQueue: (track: Track) => void;
  handleStartRadio: (track: Track) => void;
  searchArtist: (artist: string) => void;
  openContextMenu: (e: React.MouseEvent, track: Track, playlistId?: string) => void;
  closeContextMenu: () => void;

  pastTracks: Track[];
  upcomingTracks: Track[];

  mainScrollRef: React.RefObject<HTMLElement | null>;
  playlistScrollPosRef: React.MutableRefObject<number>;
  markPlaylistListened: (playlistId?: string) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

let globalOpenContextMenuHandler: ((e: React.MouseEvent, track: Track, playlistId?: string) => void) | null = null;

/**
 * Aciona o menu de contexto de faixa sem exigir subscrição ao PlayerContext,
 * preservando o isolamento de React.memo em componentes de linha (#85).
 */
export function triggerTrackContextMenu(e: React.MouseEvent, track: Track, playlistId?: string) {
  if (globalOpenContextMenuHandler) {
    globalOpenContextMenuHandler(e, track, playlistId);
  }
}

interface PlayerProviderProps {
  children: ReactNode;
  onMarkPlaylistListened?: (playlistId?: string) => void;
  onSearchArtist?: (artist: string) => void;
}

export function PlayerProvider({
  children,
  onMarkPlaylistListened,
  onSearchArtist,
}: PlayerProviderProps) {
  // Máquina de estados determinística para a fila de reprodução (Sugestão 1.5)
  const [queueState, dispatchQueue] = useReducer(
    playerReducer,
    undefined,
    createInitialQueueState
  );

  const {
    currentTrack,
    activeQueue,
    originalQueue,
    currentQueueIndex,
    isShuffle,
    repeatMode,
    isAutoplayRadio,
  } = queueState;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Crossfade suave sincronizado com o SettingsService
  const [crossfadeSeconds, setCrossfadeSecondsState] = useState<number>(() => {
    return SettingsService.getSetting("crossfadeSeconds");
  });

  // Listener para sincronização reativa com o SettingsService
  useEffect(() => {
    return SettingsService.subscribe((settings, key) => {
      if (!key || key === "crossfadeSeconds") {
        setCrossfadeSecondsState(settings.crossfadeSeconds);
      }
      if (!key || key === "isAutoplayRadio") {
        dispatchQueue({ type: "SET_AUTOPLAY_RADIO", payload: settings.isAutoplayRadio });
      }
    });
  }, []);

  const setCrossfadeSeconds = useCallback((secs: number) => {
    SettingsService.updateSetting("crossfadeSeconds", secs);
  }, []);

  // Modo Mini Player Flutuante (Sugestão 2.1)
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const isMiniPlayerRef = useRef(isMiniPlayer);
  isMiniPlayerRef.current = isMiniPlayer;

  // Gaveta de reprodução & Abas
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const closeDrawerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowPlayingTab, setNowPlayingTabState] = useState<NowPlayingTab>("lyrics");
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPastTracks, setShowPastTracks] = useState(true);

  const originalQueueRef = useRef<Track[]>(originalQueue);
  const activeQueueRef = useRef<Track[]>(activeQueue);
  const currentQueueIndexRef = useRef<number>(currentQueueIndex);
  const currentTrackRef = useRef<Track | null>(currentTrack);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);
  const isAutoplayRadioRef = useRef(isAutoplayRadio);

  originalQueueRef.current = originalQueue;
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

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // Amostragem inteligente de cores da capa via Web Worker
  useAuroraColor(currentTrack);

  // Alternar Mini Player com controle de janela nativo (Sugestão 2.1)
  function toggleMiniPlayer() {
    const next = !isMiniPlayerRef.current;
    isMiniPlayerRef.current = next;
    setIsMiniPlayer(next);
    invoke("set_mini_player_mode", { enabled: next }).catch(console.error);
  }

  // Alternar Autoplay Infinito / Rádio Contínua (Sugestão 2.6)
  function toggleAutoplayRadio() {
    const next = !isAutoplayRadio;
    dispatchQueue({ type: "TOGGLE_AUTOPLAY_RADIO" });
    SettingsService.updateSetting("isAutoplayRadio", next);
  }

  const trayHandlersRef = useRef({
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    toggleMiniPlayer,
  });
  trayHandlersRef.current = {
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    toggleMiniPlayer,
  };

  // Escuta de Ações do System Tray e Teclas Globais de Mídia (Sugestão 2.2 & #82)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("tray-action", (event) => {
      switch (event.payload) {
        case "toggle-play":
          trayHandlersRef.current.togglePlayPause();
          break;
        case "next-track":
          trayHandlersRef.current.handleNextTrack();
          break;
        case "prev-track":
          trayHandlersRef.current.handlePrevTrack();
          break;
        case "toggle-mini-player":
          trayHandlersRef.current.toggleMiniPlayer();
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
    if (closeDrawerTimeoutRef.current) {
      clearTimeout(closeDrawerTimeoutRef.current);
      closeDrawerTimeoutRef.current = null;
    }
    setIsDrawerClosing(false);
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
    if (!isNowPlayingOpen && !showLyrics) return;
    setIsDrawerClosing(true);
    if (closeDrawerTimeoutRef.current) {
      clearTimeout(closeDrawerTimeoutRef.current);
    }
    closeDrawerTimeoutRef.current = setTimeout(() => {
      setIsNowPlayingOpen(false);
      setShowLyrics(false);
      setIsDrawerClosing(false);
      closeDrawerTimeoutRef.current = null;
    }, 200);
  }

  function toggleNowPlaying() {
    if (isNowPlayingOpen || showLyrics) {
      closeNowPlaying();
    } else {
      openNowPlaying(nowPlayingTab);
    }
  }

  function toggleShowLyrics() {
    if ((isNowPlayingOpen || showLyrics) && nowPlayingTab === "lyrics") {
      closeNowPlaying();
    } else {
      openNowPlaying("lyrics");
    }
  }

  function toggleShowQueue() {
    if ((isNowPlayingOpen || showLyrics) && nowPlayingTab === "queue") {
      closeNowPlaying();
    } else {
      openNowPlaying("queue");
    }
  }

  // Registrar reprodução no SQLite para o Resumo Musical (#81)
  function recordTrackPlayed(track: Track) {
    invoke("record_track_played", { track }).catch((err) => {
      console.warn("Erro ao registrar reprodução no SQLite:", err);
    });
  }

  // Reproduzir faixa com fila e registrar no SQLite (Sugestão 4.4)
  function playTrackWithQueue(
    track: Track,
    queue: Track[],
    index: number,
    playlistId?: string
  ) {
    setErrorMessage(null);

    markPlaylistListened(playlistId);

    // Registrar no SQLite para o Resumo Musical
    recordTrackPlayed(track);

    const enqueueMode = SettingsService.getSetting("playlistEnqueueMode");
    if (enqueueMode === "append" && activeQueueRef.current.length > 0) {
      const existingQueue = activeQueueRef.current;
      const filteredNew = queue.filter((t) => !existingQueue.some((e) => e.id === t.id));
      const combined = [...existingQueue, ...filteredNew];
      const targetIndex = combined.findIndex((t) => t.id === track.id);
      dispatchQueue({
        type: "PLAY_TRACK_WITH_QUEUE",
        payload: { track, queue: combined, index: targetIndex >= 0 ? targetIndex : index },
      });
    } else {
      dispatchQueue({
        type: "PLAY_TRACK_WITH_QUEUE",
        payload: { track, queue, index },
      });
    }

    loadAndPlayVideo(track.id);
  }

  function toggleShuffle() {
    dispatchQueue({ type: "TOGGLE_SHUFFLE" });
  }

  function cycleRepeatMode() {
    dispatchQueue({ type: "CYCLE_REPEAT_MODE" });
  }

  const cycleCrossfade = useCallback(() => {
    const current = SettingsService.getSetting("crossfadeSeconds") ?? 0;
    // Ciclo ordenado e determinístico: Off (0s) -> 2s -> 3s -> 5s -> 8s -> 12s -> Off (0s)
    const PRESETS = [0, 2, 3, 5, 8, 12];
    const currentIndex = PRESETS.indexOf(current);
    const next =
      currentIndex >= 0 && currentIndex < PRESETS.length - 1
        ? PRESETS[currentIndex + 1]
        : PRESETS[0];

    SettingsService.updateSetting("crossfadeSeconds", next);
  }, []);

  function handlePlayFromQueue(idx: number) {
    const queue = activeQueueRef.current;
    if (idx >= 0 && idx < queue.length) {
      const track = queue[idx];
      recordTrackPlayed(track);
      dispatchQueue({ type: "PLAY_FROM_QUEUE", payload: { index: idx } });
      loadAndPlayVideo(track.id);
    }
  }

  function handleRemoveFromQueue(idx: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    dispatchQueue({ type: "REMOVE_FROM_QUEUE", payload: { index: idx } });
  }

  function handleClearUpcomingQueue() {
    dispatchQueue({ type: "CLEAR_UPCOMING_QUEUE" });
  }

  const handleReorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    dispatchQueue({ type: "REORDER_QUEUE", payload: { fromIndex, toIndex } });
  }, []);

  // Avançar faixa com suporte a Autoplay Infinito & Rádio Contínua (Sugestão 2.6)
  function handleNextTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (queue.length === 0 || currentIndex === -1) return;

    if (repeat === "one") {
      if (queue[currentIndex]) {
        recordTrackPlayed(queue[currentIndex]);
      }
      restartCurrentTrack();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      const nextTrack = queue[nextIndex];
      recordTrackPlayed(nextTrack);
      dispatchQueue({ type: "PLAY_FROM_QUEUE", payload: { index: nextIndex } });
      loadAndPlayVideo(nextTrack.id);
    } else if (repeat === "all" && queue.length > 0) {
      const firstTrack = queue[0];
      recordTrackPlayed(firstTrack);
      dispatchQueue({ type: "PLAY_FROM_QUEUE", payload: { index: 0 } });
      loadAndPlayVideo(firstTrack.id);
    } else if (isAutoplayRadioRef.current && currentTrackRef.current) {
      // Autoplay Infinito: busca recomendações da rádio do YouTube Music
      const lastTrack = currentTrackRef.current;
      invoke<Track[]>("get_radio_tracks", { videoId: lastTrack.id })
        .then((radioTracks) => {
          if (radioTracks && radioTracks.length > 0) {
            const nextIdx = activeQueueRef.current.length;
            recordTrackPlayed(radioTracks[0]);
            dispatchQueue({
              type: "APPEND_RADIO_TRACKS",
              payload: { tracks: radioTracks },
            });
            dispatchQueue({
              type: "PLAY_FROM_QUEUE",
              payload: { index: nextIdx },
            });
            loadAndPlayVideo(radioTracks[0].id);
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

    if (currentTimeRef.current > 3) {
      restartCurrentTrack();
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = queue[prevIndex];
      recordTrackPlayed(prevTrack);
      dispatchQueue({ type: "PLAY_FROM_QUEUE", payload: { index: prevIndex } });
      loadAndPlayVideo(prevTrack.id);
    } else if (repeat === "all" && queue.length > 0) {
      const lastIndex = queue.length - 1;
      const lastTrack = queue[lastIndex];
      recordTrackPlayed(lastTrack);
      dispatchQueue({ type: "PLAY_FROM_QUEUE", payload: { index: lastIndex } });
      loadAndPlayVideo(lastTrack.id);
    }
  }

  // Ações do Menu de Contexto (Sugestão 2.2)
  function handlePlayNext(track: Track) {
    dispatchQueue({ type: "INSERT_NEXT", payload: { track } });
  }

  function handleAddToQueue(track: Track) {
    dispatchQueue({ type: "ADD_TO_END", payload: { track } });
  }

  function handleStartRadio(track: Track) {
    playTrackWithQueue(track, [track], 0);
    invoke<Track[]>("get_radio_tracks", { videoId: track.id })
      .then((radioTracks) => {
        if (radioTracks && radioTracks.length > 0) {
          dispatchQueue({
            type: "APPEND_RADIO_TRACKS",
            payload: { tracks: radioTracks },
          });
        }
      })
      .catch((err) => {
        console.warn("Falha ao iniciar rádio a partir da música:", err);
      });
  }

  function searchArtist(artist: string) {
    if (onSearchArtist && artist) {
      onSearchArtist(artist);
    }
    window.dispatchEvent(
      new CustomEvent("tetplayer:search-artist", { detail: { query: artist } })
    );
  }

  // Estado e gatilhos do Menu de Contexto Flutuante (Sugestão 2.2)
  const [contextMenuTrack, setContextMenuTrack] = useState<Track | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuPlaylistId, setContextMenuPlaylistId] = useState<string | null>(null);

  const openContextMenu = React.useCallback((e: React.MouseEvent, track: Track, playlistId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTrack(track);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuPlaylistId(playlistId || null);
  }, []);

  useEffect(() => {
    globalOpenContextMenuHandler = openContextMenu;
    return () => {
      if (globalOpenContextMenuHandler === openContextMenu) {
        globalOpenContextMenuHandler = null;
      }
    };
  }, [openContextMenu]);

  const closeContextMenu = React.useCallback(() => {
    setContextMenuTrack(null);
    setContextMenuPosition(null);
    setContextMenuPlaylistId(null);
  }, []);

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

  // Pipeline de pré-carregamento inteligente da próxima faixa (Gapless Playback - Sugestão 1.2)
  const prefetchedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    prefetchedTrackIdRef.current = null;
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!duration || duration <= 15 || currentTime <= 10) return;
    const nextTrack = upcomingTracks[0];
    if (!nextTrack || prefetchedTrackIdRef.current === nextTrack.id) return;

    // Dispara quando faltar 20 segundos ou passar de 88% da faixa atual
    if (currentTime / duration >= 0.88 || duration - currentTime <= 20) {
      prefetchedTrackIdRef.current = nextTrack.id;
      prefetchTrackLyrics(nextTrack).catch(() => { });
      prefetchArtworkColors(nextTrack);

      // Se rádio contínua estiver ativa e a fila estiver no fim, antecipa a busca
      if (isAutoplayRadioRef.current && currentTrackRef.current && upcomingTracks.length <= 1) {
        invoke<Track[]>("get_radio_tracks", { videoId: nextTrack.id })
          .then((radioTracks) => {
            if (radioTracks && radioTracks.length > 0) {
              dispatchQueue({
                type: "APPEND_RADIO_TRACKS",
                payload: { tracks: radioTracks },
              });
            }
          })
          .catch(() => { });
      }
    }
  }, [currentTime, duration, upcomingTracks]);

  const contextValue = useMemo<PlayerContextType>(
    () => ({
      currentTrack,
      activeQueue,
      currentQueueIndex,
      isPlaying,
      get currentTime() {
        return currentTimeRef.current;
      },
      get duration() {
        return durationRef.current;
      },
      volume,
      isMuted,
      loadingTrackId,
      errorMessage,
      setErrorMessage,
      isShuffle,
      repeatMode,
      crossfadeSeconds,
      setCrossfadeSeconds,
      toggleShuffle,
      cycleRepeatMode,
      cycleCrossfade,
      isAutoplayRadio,
      toggleAutoplayRadio,
      isMiniPlayer,
      toggleMiniPlayer,
      isNowPlayingOpen,
      isDrawerClosing,
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
      handleReorderQueue,
      handleNextTrack,
      handlePrevTrack,
      togglePlayPause,
      handleSeekTo: seekTo,
      handleVolumeChange,
      toggleMute,
      handlePlayNext,
      handleAddToQueue,
      handleStartRadio,
      searchArtist,
      openContextMenu,
      closeContextMenu,
      pastTracks,
      upcomingTracks,
      mainScrollRef,
      playlistScrollPosRef,
      markPlaylistListened,
    }),
    [
      currentTrack,
      activeQueue,
      currentQueueIndex,
      isPlaying,
      // Desacoplado do currentTime/duration: PlayerContext não re-renderiza consumidores a cada 80ms!
      volume,
      isMuted,
      loadingTrackId,
      errorMessage,
      isShuffle,
      repeatMode,
      crossfadeSeconds,
      isAutoplayRadio,
      isMiniPlayer,
      isNowPlayingOpen,
      isDrawerClosing,
      nowPlayingTab,
      showLyrics,
      showPastTracks,
      pastTracks,
      upcomingTracks,
      seekTo,
      togglePlayPause,
      handleReorderQueue,
      openContextMenu,
      closeContextMenu,
    ]
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlaybackProgressProvider currentTime={currentTime} duration={duration}>
        {/* Hidden YouTube Iframe Player mantido PERMANENTEMENTE no DOM raiz com pipeline ativo para evitar background throttling */}
        <div
          className="fixed bottom-0 right-0 pointer-events-none opacity-[0.001] w-48 h-48 -z-50 overflow-hidden"
          aria-hidden="true"
        >
          <div id="yt-player-frame" />
        </div>
        {children}

        {/* Menu de Contexto Flutuante com Backdrop & Posicionamento Inteligente (Sugestão 2.2) */}
        <TrackContextMenu
          track={contextMenuTrack}
          position={contextMenuPosition}
          contextPlaylistId={contextMenuPlaylistId}
          onClose={closeContextMenu}
        />
      </PlaybackProgressProvider>
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

export { usePlaybackProgress } from "./PlaybackProgressContext";
