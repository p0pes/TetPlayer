import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Search,
  Volume2,
  VolumeX,
  Music,
  Library,
  Flame,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ListMusic,
  Minus,
  Square,
  Copy,
  X,
  Pin,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Shuffle,
  Repeat,
  Repeat1,
  Mic2,
  Sparkles,
} from "lucide-react";

interface AuthSession {
  is_authenticated: boolean;
  browser: string;
  profile: string;
  sapisid?: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  artwork_url?: string;
}

interface Playlist {
  id: string;
  title: string;
  subtitle?: string;
  artwork_url?: string;
  track_count?: string;
}

interface LyricsData {
  synced?: string | null;
  plain?: string | null;
  source: string;
}

interface LyricLine {
  time: number;
  text: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
  }
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function parseLrc(lrcText: string): LyricLine[] {
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

export default function App() {
  // Navigation: 'library' (default home) or 'search'
  const [activeTab, setActiveTab] = useState<"library" | "search">("library");

  // Auth state
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Playlists & Library state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Playback state & Queue
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [activeQueue, setActiveQueue] = useState<Track[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_volume");
      return saved !== null && !isNaN(parseFloat(saved)) ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tetplayer_muted") === "true";
    } catch {
      return false;
    }
  });
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // Shuffle & Repeat state
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tetplayer_shuffle") === "true";
    } catch {
      return false;
    }
  });
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">(() => {
    try {
      const saved = localStorage.getItem("tetplayer_repeat");
      return saved === "all" || saved === "one" ? saved : "off";
    } catch {
      return "off";
    }
  });
  const originalQueueRef = useRef<Track[]>([]);

  // Lyrics state
  const [showLyrics, setShowLyrics] = useState(false);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Window state & controls
  const [isMaximized, setIsMaximized] = useState(false);

  // Pinning & Recently Listened State
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_pinned_playlists");
      return saved ? JSON.parse(saved) : ["VLLM"];
    } catch {
      return ["VLLM"];
    }
  });

  const [playlistHistory, setPlaylistHistory] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_playlist_history");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Mark playlist as listened to in history
  function markPlaylistListened(playlistId?: string) {
    if (!playlistId) return;
    setPlaylistHistory((prev) => {
      const updated = { ...prev, [playlistId]: Date.now() };
      try {
        localStorage.setItem("tetplayer_playlist_history", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // Toggle pinning on a playlist
  function togglePinPlaylist(playlistId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setPinnedPlaylistIds((prev) => {
      let updated: string[];
      if (prev.includes(playlistId)) {
        updated = prev.filter((id) => id !== playlistId);
      } else {
        updated = [...prev, playlistId];
      }
      try {
        localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // Move pinned playlist up or down with arrows
  function movePinnedPlaylist(playlistId: string, direction: "up" | "down", e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setPinnedPlaylistIds((prev) => {
      const idx = prev.indexOf(playlistId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(targetIdx, 0, item);
      try {
        localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Pointer-based drag and drop reordering for pinned playlists
  const [activeDragPinnedId, setActiveDragPinnedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragSourceIdRef = useRef<string | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  dragOverIndexRef.current = dragOverIndex;

  function handleGripPointerDown(e: React.PointerEvent, id: string, index: number) {
    if (e.button !== 0) return; // Only left mouse button
    e.preventDefault();
    e.stopPropagation();

    dragSourceIdRef.current = id;
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = false;
    dragOverIndexRef.current = index;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setActiveDragPinnedId(id);
    setDragOverIndex(index);
  }

  function handleGripPointerMove(e: React.PointerEvent) {
    if (!dragSourceIdRef.current) return;

    if (Math.abs(e.clientY - dragStartYRef.current) > 3) {
      isDraggingRef.current = true;
    }

    if (!isDraggingRef.current) return;

    // Detect target pinned row under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const pinnedRow = el?.closest("[data-pinned-index]");
    if (pinnedRow) {
      const idxAttr = pinnedRow.getAttribute("data-pinned-index");
      if (idxAttr !== null) {
        const targetIdx = parseInt(idxAttr, 10);
        if (!isNaN(targetIdx) && targetIdx !== dragOverIndexRef.current) {
          dragOverIndexRef.current = targetIdx;
          setDragOverIndex(targetIdx);
        }
      }
    }
  }

  function handleGripPointerUp(e: React.PointerEvent) {
    const sourceId = dragSourceIdRef.current;
    const targetIdx = dragOverIndexRef.current;
    const wasDragging = isDraggingRef.current;

    dragSourceIdRef.current = null;
    isDraggingRef.current = false;
    dragOverIndexRef.current = null;
    setActiveDragPinnedId(null);
    setDragOverIndex(null);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (wasDragging && sourceId && targetIdx !== null && targetIdx >= 0) {
      setPinnedPlaylistIds((prev) => {
        const sourceIdx = prev.indexOf(sourceId);
        if (sourceIdx === -1 || sourceIdx === targetIdx) return prev;
        const next = [...prev];
        const [item] = next.splice(sourceIdx, 1);
        next.splice(targetIdx, 0, item);
        try {
          localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  }

  // Pinned playlists always stay on top in user-defined order
  const pinnedPlaylists = useMemo(() => {
    const map = new Map(playlists.map((p) => [p.id, p]));
    const list: Playlist[] = [];
    for (const id of pinnedPlaylistIds) {
      const pl = map.get(id);
      if (pl) list.push(pl);
    }
    return list;
  }, [playlists, pinnedPlaylistIds]);

  // Non-pinned playlists ordered by most recently listened (highest timestamp first)
  const unpinnedPlaylists = useMemo(() => {
    const pinnedSet = new Set(pinnedPlaylistIds);
    const list = playlists.filter((p) => !pinnedSet.has(p.id));
    return list.sort((a, b) => {
      const timeA = playlistHistory[a.id] || 0;
      const timeB = playlistHistory[b.id] || 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Most recent first
      }
      return 0; // Maintain original order if unplayed
    });
  }, [playlists, pinnedPlaylistIds, playlistHistory]);

  // Combined sorted playlists: pinned always above, then recently listened
  const sortedPlaylists = useMemo(() => {
    return [...pinnedPlaylists, ...unpinnedPlaylists];
  }, [pinnedPlaylists, unpinnedPlaylists]);

  useEffect(() => {
    checkMaximizedState();

    const handleResize = () => {
      checkMaximizedState();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function checkMaximizedState() {
    try {
      const maximized = await invoke<boolean>("is_window_maximized");
      setIsMaximized(maximized);
    } catch {
      // ignore
    }
  }

  async function handleMinimize() {
    try {
      await invoke("minimize_window");
    } catch (err) {
      console.error("Erro ao minimizar janela:", err);
    }
  }

  async function handleToggleMaximize() {
    try {
      const maximized = await invoke<boolean>("toggle_maximize_window");
      setIsMaximized(maximized);
    } catch (err) {
      console.error("Erro ao alternar maximizar/modo janela:", err);
    }
  }

  async function handleClose() {
    try {
      await invoke("close_window");
    } catch (err) {
      console.error("Erro ao fechar aplicação:", err);
    }
  }

  async function handleStartDrag(e: React.MouseEvent) {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("select")
      ) {
        return;
      }
      try {
        await invoke("start_drag_window");
      } catch {
        // ignore fallback fora do Tauri
      }
    }
  }

  // Preservação do scroll da playlist / busca ao alternar letras
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const playlistScrollPosRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (!showLyrics && mainScrollRef.current) {
      mainScrollRef.current.scrollTop = playlistScrollPosRef.current;
      const frameId = requestAnimationFrame(() => {
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollTop = playlistScrollPosRef.current;
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [showLyrics]);

  function toggleShowLyrics() {
    setShowLyrics((prev) => {
      if (!prev && mainScrollRef.current) {
        playlistScrollPosRef.current = mainScrollRef.current.scrollTop;
      }
      return !prev;
    });
  }

  function handleCloseLyrics() {
    setShowLyrics(false);
  }

  // Refs for access inside callbacks without stale closures
  const activeQueueRef = useRef<Track[]>([]);
  const currentQueueIndexRef = useRef<number>(-1);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const isPlayingRef = useRef(isPlaying);
  const currentTrackRef = useRef<Track | null>(null);
  const repeatModeRef = useRef(repeatMode);
  const isShuffleRef = useRef(isShuffle);

  activeQueueRef.current = activeQueue;
  currentQueueIndexRef.current = currentQueueIndex;
  currentTimeRef.current = currentTime;
  durationRef.current = duration;
  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  isPlayingRef.current = isPlaying;
  currentTrackRef.current = currentTrack;
  repeatModeRef.current = repeatMode;
  isShuffleRef.current = isShuffle;

  useEffect(() => {
    loadAuthStatus();
    loadPlaylists();
    initYouTubePlayer();

    // Sincronizador de timeline em alta frequência (80ms para resposta imediata das letras)
    const interval = setInterval(() => {
      if (ytPlayerRef.current && isPlayerReady) {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1) { // PLAYING
            const curr = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (typeof curr === "number" && !isNaN(curr)) {
              setCurrentTime(curr);
            }
            if (typeof dur === "number" && dur > 0 && !isNaN(dur)) {
              setDuration(dur);
            }
          }
        } catch {
          // ignore
        }
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isPlayerReady]);

  function initYouTubePlayer() {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayerInstance();
    };

    if (window.YT && window.YT.Player) {
      createPlayerInstance();
    }
  }

  function createPlayerInstance() {
    if (ytPlayerRef.current) return;

    ytPlayerRef.current = new window.YT.Player("yt-player-frame", {
      height: "200",
      width: "200",
      videoId: "",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          setIsPlayerReady(true);
          ytPlayerRef.current.setVolume(volumeRef.current * 100);
          if (isMutedRef.current) {
            ytPlayerRef.current.mute();
          } else {
            ytPlayerRef.current.unMute();
          }
          ytPlayerRef.current.setPlaybackRate(1.0);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (event: any) => {
          if (event.data === 1) { // PLAYING
            setIsPlaying(true);
            setLoadingTrackId(null);
            ytPlayerRef.current.setPlaybackRate(1.0);
            const dur = ytPlayerRef.current.getDuration();
            if (dur) setDuration(dur);
          } else if (event.data === 2) { // PAUSED
            setIsPlaying(false);
          } else if (event.data === 0) { // ENDED -> Autoplay next
            setIsPlaying(false);
            handleNextTrack();
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          console.error("YouTube Player Error:", err);
          setErrorMessage("Não foi possível reproduzir esta faixa. Avançando para a próxima...");
          setLoadingTrackId(null);
          setIsPlaying(false);
          handleNextTrack();
        },
      },
    });
  }

  async function loadAuthStatus() {
    setIsCheckingAuth(true);
    try {
      const res = await invoke<AuthSession>("get_auth_status");
      setAuth(res);
    } catch (err) {
      console.error("Erro ao verificar auth:", err);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function handleRefreshAuth() {
    setIsCheckingAuth(true);
    try {
      const res = await invoke<AuthSession>("refresh_auth");
      setAuth(res);
      await loadPlaylists();
    } catch (err) {
      setErrorMessage(`Erro ao recarregar cookies: ${String(err)}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function loadPlaylists() {
    setIsLoadingPlaylists(true);
    try {
      const res = await invoke<Playlist[]>("get_user_playlists");
      setPlaylists(res);
    } catch (err) {
      console.error("Erro ao carregar playlists:", err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }

  async function handleSelectPlaylist(playlist: Playlist) {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedPlaylist(playlist);
    setActiveTab("library");
    setIsLoadingPlaylistTracks(true);
    setPlaylistTracks([]);
    setErrorMessage(null);

    try {
      const tracks = await invoke<Track[]>("get_playlist_tracks", {
        playlistId: playlist.id,
      });
      setPlaylistTracks(tracks);
    } catch (err) {
      setErrorMessage(`Erro ao carregar músicas da playlist: ${String(err)}`);
    } finally {
      setIsLoadingPlaylistTracks(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveTab("search");
    setErrorMessage(null);
    try {
      const res = await invoke<Track[]>("search_tracks", { query: searchQuery });
      setSearchResults(res);
    } catch (err) {
      setErrorMessage(`Erro na busca: ${String(err)}`);
    } finally {
      setIsSearching(false);
    }
  }

  // Modo Aleatório (Shuffle)
  function toggleShuffle() {
    setIsShuffle((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem("tetplayer_shuffle", String(nextState));
      } catch {
        // ignore
      }

      if (nextState) {
        // Ativando shuffle: preserva fila original
        originalQueueRef.current = [...activeQueueRef.current];
        if (activeQueueRef.current.length > 1 && currentTrackRef.current) {
          const current = currentTrackRef.current;
          const others = activeQueueRef.current.filter((t) => t.id !== current.id);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          const shuffled = [current, ...others];
          setActiveQueue(shuffled);
          setCurrentQueueIndex(0);
        }
      } else {
        // Desativando shuffle: restaura fila original
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

  // Alternar Repetição (off -> all -> one -> off)
  function cycleRepeatMode() {
    setRepeatMode((prev) => {
      const nextMode = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      try {
        localStorage.setItem("tetplayer_repeat", nextMode);
      } catch {
        // ignore
      }
      return nextMode;
    });
  }

  function playTrackWithQueue(track: Track, queue: Track[], index: number, playlistId?: string) {
    setLoadingTrackId(track.id);
    setCurrentTrack(track);
    setErrorMessage(null);

    const activePlId = playlistId || selectedPlaylist?.id;
    if (activePlId) {
      markPlaylistListened(activePlId);
    }

    originalQueueRef.current = queue;

    if (isShuffleRef.current) {
      // Se shuffle estiver ativo, coloca a faixa escolhida como 0 e embaralha o restante
      const others = queue.filter((t) => t.id !== track.id);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      const shuffled = [track, ...others];
      setActiveQueue(shuffled);
      setCurrentQueueIndex(0);
    } else {
      setActiveQueue(queue);
      setCurrentQueueIndex(index);
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      ytPlayerRef.current.loadVideoById(track.id);
      ytPlayerRef.current.setPlaybackRate(1.0);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      setTimeout(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          ytPlayerRef.current.loadVideoById(track.id);
          ytPlayerRef.current.setPlaybackRate(1.0);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }, 500);
    }
  }

  function handleNextTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (queue.length === 0 || currentIndex === -1) return;

    if (repeat === "one") {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      playTrackWithQueue(queue[nextIndex], queue, nextIndex);
    } else if (repeat === "all" && queue.length > 0) {
      playTrackWithQueue(queue[0], queue, 0);
    } else {
      setIsPlaying(false);
    }
  }

  function handlePrevTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    const repeat = repeatModeRef.current;

    if (queue.length === 0 || currentIndex === -1) return;

    // Se passou de 3 segundos, reinicia a música atual
    if (currentTimeRef.current > 3) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        ytPlayerRef.current.seekTo(0, true);
        setCurrentTime(0);
      }
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

  function togglePlayPause() {
    if (!ytPlayerRef.current || !currentTrackRef.current) return;
    if (isPlayingRef.current) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  }

  function handleSeekTo(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, durationRef.current || 99999));
    setCurrentTime(clamped);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(clamped, true);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    handleSeekTo(time);
  }

  // Integração com SMTC do Windows (System Media Transport Controls)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (currentTrack) {
      const artUrl =
        currentTrack.artwork_url ||
        `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "TetPlayer",
        artwork: [
          { src: artUrl, sizes: "96x96", type: "image/jpeg" },
          { src: artUrl, sizes: "128x128", type: "image/jpeg" },
          { src: artUrl, sizes: "192x192", type: "image/jpeg" },
          { src: artUrl, sizes: "256x256", type: "image/jpeg" },
          { src: artUrl, sizes: "384x384", type: "image/jpeg" },
          { src: artUrl, sizes: "512x512", type: "image/jpeg" },
        ],
      });
    }

    try {
      navigator.mediaSession.setActionHandler("play", () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === "function") {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        handlePrevTrack();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        handleNextTrack();
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          handleSeekTo(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 5;
        handleSeekTo(currentTimeRef.current - offset);
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 5;
        handleSeekTo(currentTimeRef.current + offset);
      });
    } catch (err) {
      console.warn("Erro ao configurar handlers de MediaSession:", err);
    }
  }, [currentTrack?.id]);

  // Sincronizar estado de reprodução no SMTC
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Sincronizar barra de progresso no SMTC
  useEffect(() => {
    if (
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession &&
      duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 0),
          playbackRate: 1.0,
          position: Math.min(Math.max(currentTime, 0), duration),
        });
      } catch {
        // ignore
      }
    }
  }, [currentTime, duration]);

  // Teclas Multimídia & Atalhos Globais de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
        case "MediaPlayPause":
          e.preventDefault();
          togglePlayPause();
          break;
        case "MediaTrackNext":
          e.preventDefault();
          handleNextTrack();
          break;
        case "MediaTrackPrevious":
          e.preventDefault();
          handlePrevTrack();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeekTo(currentTimeRef.current - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeekTo(currentTimeRef.current + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
            try {
              localStorage.setItem("tetplayer_volume", String(next));
              localStorage.setItem("tetplayer_muted", "false");
            } catch {
              // ignore
            }
            if (ytPlayerRef.current) {
              ytPlayerRef.current.unMute();
              ytPlayerRef.current.setVolume(next * 100);
            }
            setIsMuted(false);
            return next;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
            try {
              localStorage.setItem("tetplayer_volume", String(next));
            } catch {
              // ignore
            }
            if (ytPlayerRef.current) {
              ytPlayerRef.current.setVolume(next * 100);
            }
            return next;
          });
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyL":
          toggleShowLyrics();
          break;
        case "KeyS":
          toggleShuffle();
          break;
        case "KeyR":
          cycleRepeatMode();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Autoscroll Suave e Otimizado da Linha Ativa (Isolado no container de letras)
  useEffect(() => {
    if (!showLyrics || activeLyricIndex === -1 || userScrollingLyricsRef.current) return;
    if (activeLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeEl = activeLyricRef.current;
      const targetScroll = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
      setIsUserScrolledAway(false);
    }
  }, [activeLyricIndex, showLyrics]);

  function handleLyricsContainerScroll() {
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
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });
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

  // Fundo Dinâmico Aurora de Alta Resolução (Amostragem Inteligente por Saturação + GPU)
  useEffect(() => {
    if (!currentTrack) return;

    let hash = 0;
    const str = currentTrack.id + currentTrack.artist;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 70) % 360;
    const hue3 = (hue1 + 190) % 360;

    const root = document.documentElement;
    root.style.setProperty("--aurora-1", `hsla(${hue1}, 85%, 52%, 0.45)`);
    root.style.setProperty("--aurora-2", `hsla(${hue2}, 80%, 48%, 0.35)`);
    root.style.setProperty("--aurora-3", `hsla(${hue3}, 75%, 45%, 0.28)`);

    const imgUrl =
      currentTrack.artwork_url ||
      `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => {
      // Mantém silenciosamente a paleta determinística vibrante
    };
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;

        // Amostragem inteligente de cores dominantes e vibrantes
        const buckets: { r: number; g: number; b: number; score: number; count: number }[] = [];
        const step = 4 * 4;

        for (let i = 0; i < data.length; i += step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const brightness = (r + g + b) / 3;

          // Ignora pretos/brancos extremos e tons cinzas desbotados
          if (brightness < 28 || brightness > 240 || delta < 20) continue;

          const saturation = delta / (max || 1);
          const score = saturation * 2.0 + (1 - Math.abs(brightness - 128) / 128);

          let matched = false;
          for (const bucket of buckets) {
            const dist = Math.abs(bucket.r - r) + Math.abs(bucket.g - g) + Math.abs(bucket.b - b);
            if (dist < 80) {
              bucket.count++;
              bucket.score = Math.max(bucket.score, score);
              matched = true;
              break;
            }
          }
          if (!matched && buckets.length < 32) {
            buckets.push({ r, g, b, score, count: 1 });
          }
        }

        buckets.sort((a, b) => (b.score * Math.log2(b.count + 2)) - (a.score * Math.log2(a.count + 2)));

        if (buckets.length > 0) {
          const c1 = buckets[0];
          const c2 = buckets[1] || {
            r: Math.min(255, c1.g + 50),
            g: Math.min(255, c1.b + 50),
            b: Math.min(255, c1.r + 50),
          };
          const c3 = buckets[2] || {
            r: Math.max(0, c1.b - 40),
            g: Math.max(0, c1.r - 40),
            b: Math.min(255, c1.g + 60),
          };

          root.style.setProperty("--aurora-1", `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.45)`);
          root.style.setProperty("--aurora-2", `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.35)`);
          root.style.setProperty("--aurora-3", `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.28)`);
        }
      } catch {
        // Fallback resiliente contra DOMException (tainted canvas)
      }
    };
    img.src = imgUrl;
  }, [currentTrack?.id]);

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(false);
    try {
      localStorage.setItem("tetplayer_volume", String(val));
      localStorage.setItem("tetplayer_muted", "false");
    } catch {
      // ignore
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(val * 100);
    }
  }

  function toggleMute() {
    if (!ytPlayerRef.current) return;
    if (isMuted) {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(volume * 100);
      setIsMuted(false);
      try {
        localStorage.setItem("tetplayer_muted", "false");
      } catch {
        // ignore
      }
    } else {
      ytPlayerRef.current.mute();
      setIsMuted(true);
      try {
        localStorage.setItem("tetplayer_muted", "true");
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0c10] text-[#e0e2ec] select-none overflow-hidden relative">
      {/* Fundo Dinâmico Aurora de Alta Resolução (Otimizado por GPU) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[60vw] h-[60vw] rounded-full aurora-blob-1 blur-[90px] opacity-90" />
        <div className="absolute top-[15%] -right-[10%] w-[55vw] h-[55vw] rounded-full aurora-blob-2 blur-[100px] opacity-80" />
        <div className="absolute -bottom-[15%] left-[20%] w-[50vw] h-[50vw] rounded-full aurora-blob-3 blur-[90px] opacity-85" />
        {/* Camada sutil de suavização / difusão para eliminar qualquer banding ou pixelado */}
        <div className="absolute inset-0 bg-[#0b0c10]/45 backdrop-blur-[1px]" />
      </div>

      {/* Hidden YouTube Iframe Player */}
      <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
        <div id="yt-player-frame" />
      </div>

      {/* Barra Superior Integrada com Window Controls (Title Bar Customizada - 100% Arrastável) */}
      <header
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        onDoubleClick={handleToggleMaximize}
        className="h-10 border-b border-[#1f232e] bg-[#0c0e14]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-50 cursor-default"
      >
        {/* Esquerda: Logo TetPlayer alinhado à largura da sidebar */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-2.5 px-4 w-64 shrink-0 h-full border-r border-[#1f232e]"
        >
          <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
          <span className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5 pointer-events-none">
            TetPlayer <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-800/50 px-1.5 py-0.2 rounded font-medium">Desktop</span>
          </span>
        </div>

        {/* Centro: Breadcrumbs / Título da Visualização Ativa */}
        <div data-tauri-drag-region className="flex-1 flex items-center px-4 h-full pointer-events-none min-w-0">
          <span className="text-xs text-[#8c91a4] truncate">
            {showLyrics
              ? `Letras Sincronizadas > ${currentTrack?.title || "Música Atual"}`
              : activeTab === "library"
              ? selectedPlaylist
                ? `Biblioteca > ${selectedPlaylist.title}`
                : "Biblioteca de Playlists"
              : "Busca de Músicas"}
          </span>
        </div>

        {/* Direita: Status de Sessão + Controles de Janela Colados no Canto */}
        <div className="flex items-center h-full">
          {auth?.is_authenticated ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sincronizado: {auth.browser}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-950/70 text-amber-300 border border-amber-800/50 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none">
              <AlertCircle className="w-3.5 h-3.5" />
              Modo Anônimo
            </span>
          )}

          {/* Menu de Navegação / Janela do Windows (Minimizar, Modo Janela, Fechar) - COLADOS NO CANTO DIREITO */}
          <div className="flex items-center h-full">
            <button
              onClick={handleMinimize}
              title="Minimizar"
              aria-label="Minimizar"
              className="w-12 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleMaximize}
              title={isMaximized ? "Restaurar (Modo Janela)" : "Maximizar"}
              aria-label={isMaximized ? "Restaurar" : "Maximizar"}
              className="w-12 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
            >
              {isMaximized ? (
                <Copy className="w-3 h-3" />
              ) : (
                <Square className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={handleClose}
              title="Fechar"
              aria-label="Fechar"
              className="w-12 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================= */}
      {/* CORPO PRINCIPAL (Sidebar + Conteúdo Central)            */}
      {/* ======================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* SIDEBAR LATERAL (Design System Oficial do Mockup) */}
        <aside className="w-64 bg-[#0f1118]/90 backdrop-blur-md border-r border-[#1f232e] p-4 flex flex-col justify-between shrink-0 h-full z-10">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            {/* Navegação Principal: Biblioteca como Página Inicial + Buscar */}
            <nav className="space-y-1">
              <button
                onClick={() => {
                  playlistScrollPosRef.current = 0;
                  setActiveTab("library");
                  setSelectedPlaylist(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                  activeTab === "library"
                    ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                    : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
                }`}
              >
                <Library className="w-4 h-4" />
                Biblioteca
              </button>

              <button
                onClick={() => {
                  playlistScrollPosRef.current = 0;
                  setActiveTab("search");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  activeTab === "search"
                    ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                    : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
                }`}
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </nav>

          {/* Seção de Playlists do Usuário com Scroll Suave e Reordenação */}
          <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-[#1f232e]">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-[#555a6d] uppercase tracking-wider">
                  Suas Playlists
                </p>
                {pinnedPlaylists.length > 0 && (
                  <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-900/40 px-1.5 py-0.2 rounded-full font-mono">
                    {pinnedPlaylists.length} fixada{pinnedPlaylists.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={loadPlaylists}
                title="Recarregar playlists"
                className="text-[#555a6d] hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPlaylists ? "animate-spin text-red-500" : ""}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {isLoadingPlaylists && playlists.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#555a6d]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                  Carregando playlists...
                </div>
              ) : sortedPlaylists.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#555a6d]">
                  Nenhuma playlist encontrada.
                </div>
              ) : (
                <>
                  {/* 1. PLAYLISTS FIXADAS (sempre no topo, arrastáveis e reordenáveis) */}
                  {pinnedPlaylists.map((pl, idx) => {
                    const isSelected = selectedPlaylist?.id === pl.id;
                    const isLiked = pl.id === "VLLM";
                    const isBeingDragged = activeDragPinnedId === pl.id;
                    const isTargetOfDrop = dragOverIndex === idx && activeDragPinnedId !== null && !isBeingDragged;

                    return (
                      <div
                        key={`pinned-${pl.id}`}
                        data-pinned-index={idx}
                        className={`group relative px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-1.5 select-none ${
                          isSelected
                            ? "bg-[#1f2331] text-red-400 font-semibold"
                            : "text-[#9da3b7] hover:bg-[#1a1d28] hover:text-white"
                        } ${isBeingDragged ? "opacity-40 scale-[0.98] ring-1 ring-red-500/50 bg-[#221722]" : ""} ${
                          isTargetOfDrop ? "border-t-2 border-red-500 bg-[#281c25] shadow-[0_-2px_8px_rgba(239,68,68,0.4)]" : ""
                        }`}
                      >
                        {/* Grip Handle para Arrastar (Pointer Events nativos) */}
                        <div
                          onPointerDown={(e) => handleGripPointerDown(e, pl.id, idx)}
                          onPointerMove={handleGripPointerMove}
                          onPointerUp={handleGripPointerUp}
                          title="Clique e arraste para reordenar"
                          className="p-1 -ml-1 rounded hover:bg-[#252b3b] text-[#555a6d] hover:text-white cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none flex items-center justify-center"
                        >
                          <GripVertical className="w-3.5 h-3.5 pointer-events-none" />
                        </div>

                        {/* Conteúdo da Playlist (Click para Selecionar) */}
                        <div
                          onClick={() => handleSelectPlaylist(pl)}
                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                        >
                          {isLiked ? (
                            <Flame className="w-3.5 h-3.5 text-red-500 shrink-0 pointer-events-none" />
                          ) : (
                            <ListMusic className="w-3.5 h-3.5 text-[#5e6479] shrink-0 pointer-events-none" />
                          )}
                          <span className="truncate flex-1 pointer-events-none">{pl.title}</span>
                        </div>

                        {/* Ações da Playlist Fixada */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Botões Rápidos de Mover (Up / Down) */}
                          <div className="flex items-center gap-0.5">
                            {idx > 0 && (
                              <button
                                onClick={(e) => movePinnedPlaylist(pl.id, "up", e)}
                                title="Mover para cima"
                                className="p-0.5 rounded text-[#71778c] hover:text-white hover:bg-[#282d3d] transition-colors cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < pinnedPlaylists.length - 1 && (
                              <button
                                onClick={(e) => movePinnedPlaylist(pl.id, "down", e)}
                                title="Mover para baixo"
                                className="p-0.5 rounded text-[#71778c] hover:text-white hover:bg-[#282d3d] transition-colors cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Botão de Desafixar */}
                          <button
                            onClick={(e) => togglePinPlaylist(pl.id, e)}
                            title="Desafixar playlist"
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/60 transition-colors cursor-pointer"
                          >
                            <Pin className="w-3 h-3 fill-current rotate-45" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Divisor Visual se houver fixadas e não fixadas */}
                  {pinnedPlaylists.length > 0 && unpinnedPlaylists.length > 0 && (
                    <div className="pt-2 pb-1 px-2 flex items-center justify-between border-t border-[#1a1d27] my-1">
                      <span className="text-[10px] font-semibold text-[#484e62] uppercase tracking-wider">
                        Ouvidas Recentes
                      </span>
                    </div>
                  )}

                  {/* 2. PLAYLISTS NÃO FIXADAS (em ordem de ouvida recente) */}
                  {unpinnedPlaylists.map((pl) => {
                    const isSelected = selectedPlaylist?.id === pl.id;
                    const isLiked = pl.id === "VLLM";

                    return (
                      <div
                        key={`unpinned-${pl.id}`}
                        onClick={() => handleSelectPlaylist(pl)}
                        className={`group px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? "bg-[#1f2331] text-red-400 font-semibold"
                            : "text-[#9da3b7] hover:bg-[#1a1d28] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isLiked ? (
                            <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : (
                            <ListMusic className="w-3.5 h-3.5 text-[#5e6479] shrink-0" />
                          )}
                          <span className="truncate flex-1">{pl.title}</span>
                        </div>

                        {/* Botão Fixar no Hover */}
                        <div className="flex items-center shrink-0">
                          <button
                            onClick={(e) => togglePinPlaylist(pl.id, e)}
                            title="Fixar playlist no topo"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#555a6d] hover:text-red-400 hover:bg-[#232838] transition-all"
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card da Conta / Perfil no Rodapé da Sidebar */}
        <div className="pt-3 border-t border-[#1f232e]">
          <div className="bg-[#171a24] p-2.5 rounded-xl border border-[#232836] flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
                P
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {auth?.is_authenticated ? auth.browser : "Modo Visitante"}
                </p>
                <p className="text-[10px] text-emerald-400 font-mono truncate">
                  {auth?.is_authenticated ? "Premium Ativo" : "Sem login"}
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshAuth}
              disabled={isCheckingAuth}
              title="Recarregar sessão de cookies"
              className="p-1 rounded-lg hover:bg-[#232836] text-[#8c91a4] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAuth ? "animate-spin text-red-400" : ""}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================= */}
      {/* ÁREA PRINCIPAL (Conteúdo dinâmico da aplicação)         */}
      {/* ======================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Alerta de Erro se houver */}
        {errorMessage && (
          <div className="m-6 mb-0 bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white text-xs underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll da Playlist e Busca (Scroll Preservado ao fechar letras) */}
        <main
          ref={mainScrollRef}
          onScroll={(e) => {
            if (!showLyrics) {
              playlistScrollPosRef.current = e.currentTarget.scrollTop;
            }
          }}
          className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar ${
            showLyrics ? "hidden" : "block"
          }`}
        >
          {/* ABA: BIBLIOTECA (Página Inicial com Playlists) */}
          {activeTab === "library" && (
            <>
              {selectedPlaylist ? (
                /* Detalhes da Playlist Selecionada */
                <div className="space-y-6">
                  {/* Botão Voltar */}
                  <button
                    onClick={() => {
                      playlistScrollPosRef.current = 0;
                      if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
                      setSelectedPlaylist(null);
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para todas as playlists
                  </button>

                  {/* Header da Playlist */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gradient-to-r from-red-950/40 via-[#1c1826] to-[#12141c] p-6 rounded-2xl border border-red-900/30">
                    <div className="w-36 h-36 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 overflow-hidden shrink-0 shadow-2xl flex items-center justify-center">
                      {selectedPlaylist.artwork_url ? (
                        <img
                          src={selectedPlaylist.artwork_url}
                          alt={selectedPlaylist.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-14 h-14 text-white/50" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider bg-red-950/80 px-2.5 py-1 rounded-md border border-red-800/40">
                        Playlist
                      </span>
                      <h2 className="text-2xl font-extrabold text-white">
                        {selectedPlaylist.title}
                      </h2>
                      {selectedPlaylist.subtitle && (
                        <p className="text-xs text-[#8c91a4]">
                          {selectedPlaylist.subtitle}
                        </p>
                      )}
                      <p className="text-xs text-[#71778c]">
                        {playlistTracks.length} músicas carregadas
                      </p>

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            if (playlistTracks.length > 0) {
                              markPlaylistListened(selectedPlaylist.id);
                              playTrackWithQueue(playlistTracks[0], playlistTracks, 0, selectedPlaylist.id);
                            }
                          }}
                          disabled={playlistTracks.length === 0}
                          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/50 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                          Tocar Playlist
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Faixas da Playlist */}
                  <div className="space-y-2">
                    {isLoadingPlaylistTracks ? (
                      <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
                        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                        <p className="text-xs">Carregando músicas da playlist...</p>
                      </div>
                    ) : playlistTracks.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
                        <Music className="w-6 h-6 text-[#343a4e]" />
                        <p className="text-xs">Nenhuma faixa encontrada nesta playlist.</p>
                      </div>
                    ) : (
                      playlistTracks.map((track, idx) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isLoadingThis = loadingTrackId === track.id;

                        return (
                          <div
                            key={`${track.id}-${idx}`}
                            onClick={() => playTrackWithQueue(track, playlistTracks, idx, selectedPlaylist.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                              isCurrent
                                ? "bg-[#1c202d] border-red-500/50"
                                : "bg-[#12141c] border-[#1f232e] hover:bg-[#171a24] hover:border-[#2b3040]"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span className="w-6 text-center text-xs font-mono text-[#5e6479] shrink-0">
                                {idx + 1}
                              </span>

                              {/* Artwork */}
                              <div className="w-11 h-11 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center relative">
                                {track.artwork_url ? (
                                  <img
                                    src={track.artwork_url}
                                    alt={track.title}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const img = e.target as HTMLImageElement;
                                      if (track.id && !img.src.includes("hqdefault.jpg")) {
                                        img.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                                      }
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : track.id ? (
                                  <img
                                    src={`https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                                    alt={track.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Music className="w-4 h-4 text-[#5e6479]" />
                                )}
                                {isLoadingThis && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${isCurrent ? "text-red-400" : "text-white"}`}>
                                  {track.title}
                                </p>
                                <p className="text-xs text-[#8c91a4] truncate">
                                  {track.artist} {track.album ? `• ${track.album}` : ""}
                                </p>
                              </div>
                            </div>

                            {/* Duration & Play Button */}
                            <div className="flex items-center gap-4 shrink-0 pl-3">
                              {track.duration && (
                                <span className="text-xs text-[#71778c] font-mono">{track.duration}</span>
                              )}
                              <button
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isCurrent && isPlaying
                                    ? "bg-red-600 text-white"
                                    : "bg-[#1a1d28] text-white group-hover:bg-red-600"
                                }`}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isCurrent && isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Grid Geral de Playlists (Home Oficial da Biblioteca) */
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Sua Biblioteca</h2>
                    <p className="text-xs text-[#8c91a4] mt-1">
                      Playlists sincronizadas com a sua conta do YouTube Music
                    </p>
                  </div>

                  {isLoadingPlaylists && playlists.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#71778c]">
                      <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                      <p className="text-xs">Carregando suas playlists...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {sortedPlaylists.map((pl) => {
                        const isLiked = pl.id === "VLLM";
                        const isPinned = pinnedPlaylistIds.includes(pl.id);

                        return (
                          <div
                            key={pl.id}
                            onClick={() => handleSelectPlaylist(pl)}
                            className="bg-[#12141c] hover:bg-[#171a24] p-4 rounded-2xl border border-[#1f232e] hover:border-[#2f3549] transition-all group cursor-pointer flex flex-col justify-between relative"
                          >
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3.5 shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-700">
                              {pl.artwork_url ? (
                                <img
                                  src={pl.artwork_url}
                                  alt={pl.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : isLiked ? (
                                <Flame className="w-14 h-14 text-red-400" />
                              ) : (
                                <ListMusic className="w-12 h-12 text-white/50" />
                              )}

                              {/* Botão de Fixar / Desafixar no Card */}
                              <button
                                onClick={(e) => togglePinPlaylist(pl.id, e)}
                                title={isPinned ? "Desafixar playlist" : "Fixar playlist no topo"}
                                className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
                                  isPinned
                                    ? "bg-red-600 text-white"
                                    : "bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
                                }`}
                              >
                                <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current rotate-45" : ""}`} />
                              </button>

                              <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                {isPinned && (
                                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider shrink-0 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800/40">
                                    Fixada
                                  </span>
                                )}
                                <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                                  {pl.title}
                                </h4>
                              </div>
                              <p className="text-xs text-[#787f98] truncate mt-0.5">
                                {pl.subtitle || "Playlist do YouTube Music"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===================================================== */}
          {/* ABA: BUSCA                                            */}
          {/* ===================================================== */}
          {activeTab === "search" && (
            <div className="space-y-6">
              {/* Campo de Busca */}
              <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e6479]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar músicas, artistas ou álbuns..."
                    className="w-full bg-[#12141c] border border-[#232733] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#5e6479] focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </form>

              {/* Resultados da Busca */}
              <div className="space-y-2">
                {isSearching ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                    <p className="text-xs">Buscando no YouTube Music...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
                    <Music className="w-8 h-8 text-[#343a4e]" />
                    <p className="text-xs">Digite algo acima para pesquisar qualquer faixa no YouTube Music.</p>
                  </div>
                ) : (
                  searchResults.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isLoadingThis = loadingTrackId === track.id;

                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => playTrackWithQueue(track, searchResults, idx)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                          isCurrent
                            ? "bg-[#1c202d] border-red-500/50"
                            : "bg-[#12141c] border-[#1f232e] hover:bg-[#171a24] hover:border-[#2b3040]"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center relative">
                            {track.artwork_url ? (
                              <img
                                src={track.artwork_url}
                                alt={track.title}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  if (track.id && !img.src.includes("hqdefault.jpg")) {
                                    img.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                                  }
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : track.id ? (
                              <img
                                src={`https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                                alt={track.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-[#5e6479]" />
                            )}
                            {isLoadingThis && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${isCurrent ? "text-red-400" : "text-white"}`}>
                              {track.title}
                            </p>
                            <p className="text-xs text-[#8c91a4] truncate">
                              {track.artist} {track.album ? `• ${track.album}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 pl-3">
                          {track.duration && (
                            <span className="text-xs text-[#71778c] font-mono">{track.duration}</span>
                          )}
                          <button
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isCurrent && isPlaying
                                ? "bg-red-600 text-white"
                                : "bg-[#1a1d28] text-white group-hover:bg-red-600"
                            }`}
                          >
                            {isLoadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isCurrent && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>

        {/* Visualização de Letras Sincronizadas (Scroll Isolado e Independente) */}
        {showLyrics && (
          <div className="flex-1 overflow-hidden p-6 flex flex-col max-w-4xl mx-auto w-full relative">
            {/* Header das Letras */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1f232e] mb-4 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#171a24] border border-[#232733] overflow-hidden shrink-0">
                  {currentTrack?.artwork_url ? (
                    <img
                      src={currentTrack.artwork_url}
                      alt={currentTrack.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-6 h-6 text-[#5e6479] m-auto" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">
                    {currentTrack?.title || "Nenhuma faixa em reprodução"}
                  </h2>
                  <p className="text-xs text-[#8c91a4] truncate">
                    {currentTrack?.artist || "TetPlayer"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lyricsData?.synced ? (
                  <span className="flex items-center gap-1.5 text-xs bg-red-950/70 text-red-300 border border-red-800/60 px-3 py-1 rounded-full font-medium shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    Letra Sincronizada ({lyricsData.source})
                  </span>
                ) : lyricsData?.plain ? (
                  <span className="text-xs bg-[#1a1d28] text-[#8c91a4] border border-[#232733] px-3 py-1 rounded-full font-medium">
                    Letra Estática ({lyricsData.source})
                  </span>
                ) : null}

                <button
                  onClick={handleCloseLyrics}
                  className="p-1.5 rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
                  title="Fechar Letras [L]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Corpo das Letras com todos os 4 estados de UI (Loading, Empty, Error, Success) */}
            <div
              ref={lyricsContainerRef}
              onScroll={handleLyricsContainerScroll}
              className="flex-1 overflow-y-auto px-4 py-6 space-y-4 text-center custom-scrollbar"
            >
              {isLoadingLyrics ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <p className="text-sm font-medium">Buscando letra sincronizada...</p>
                </div>
              ) : lyricsError || (!lyricsData?.synced && !lyricsData?.plain) ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
                  <div className="w-14 h-14 rounded-2xl bg-[#141722] border border-[#212638] flex items-center justify-center">
                    <Mic2 className="w-7 h-7 text-[#4e556e]" />
                  </div>
                  <p className="text-sm font-semibold text-white">Nenhuma letra encontrada</p>
                  <p className="text-xs text-[#71778c] max-w-sm">
                    Não encontramos a letra desta música no LRCLIB ou no YouTube Music.
                  </p>
                  <button
                    onClick={handleCloseLyrics}
                    className="mt-2 text-xs bg-[#1a1d28] hover:bg-[#232738] text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#2b3145]"
                  >
                    Voltar para a Biblioteca
                  </button>
                </div>
              ) : parsedLyrics.length > 0 ? (
                <div className="py-20 space-y-4">
                  {parsedLyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPast = idx < activeLyricIndex;
                    return (
                      <div
                        key={`${line.time}-${idx}`}
                        ref={isActive ? activeLyricRef : null}
                        onClick={() => handleSeekTo(line.time)}
                        className={`py-2 px-4 rounded-xl transition-[transform,opacity,color] duration-200 ease-out will-change-transform cursor-pointer select-none ${
                          isActive
                            ? "text-2xl md:text-3xl font-bold text-white scale-[1.03] [text-shadow:0_0_20px_rgba(255,255,255,0.4)]"
                            : isPast
                            ? "text-lg md:text-xl text-[#51576d] hover:text-[#9ea5bc] font-medium opacity-60 scale-100"
                            : "text-lg md:text-xl text-[#787f95] hover:text-white font-medium opacity-85 scale-100"
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              ) : lyricsData?.plain ? (
                <div className="py-8 max-w-2xl mx-auto whitespace-pre-line text-base text-[#c4c8d8] leading-relaxed font-sans">
                  {lyricsData.plain}
                </div>
              ) : null}
            </div>

            {/* Botão Flutuante de Sincronização ao Rolar Manualmente */}
            {isUserScrolledAway && parsedLyrics.length > 0 && activeLyricIndex !== -1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={handleRecenterLyrics}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/95 hover:bg-red-500 text-white text-xs font-semibold shadow-xl shadow-red-950/70 border border-red-400/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-200" />
                  <span>Sincronizar com o áudio</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ======================================================= */}
    {/* PLAYER INFERIOR PERSISTENTE (Footer Playback Bar)        */}
    {/* ======================================================= */}
    <footer className="h-20 shrink-0 border-t border-[#1f232e] bg-[#0e1017]/95 backdrop-blur-md px-6 flex items-center justify-between gap-6 z-40">
        {/* Faixa Atual */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
          <div className="w-12 h-12 rounded-lg bg-[#171a24] border border-[#232733] overflow-hidden shrink-0 flex items-center justify-center">
            {currentTrack?.artwork_url ? (
              <img
                src={currentTrack.artwork_url}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (currentTrack?.id && !img.src.includes("hqdefault.jpg")) {
                    img.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
                  }
                }}
                className="w-full h-full object-cover"
              />
            ) : currentTrack?.id ? (
              <img
                src={`https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-[#5e6479]" />
            )}
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">
              {currentTrack?.title || "Nenhuma faixa selecionada"}
            </p>
            <p className="text-[11px] text-[#8c91a4] truncate">
              {currentTrack?.artist || "Escolha uma playlist para tocar"}
            </p>
          </div>
        </div>

        {/* Controles Centrais (Shuffle, Prev, Play/Pause, Next, Repeat) e Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            {/* Modo Aleatório (Shuffle) */}
            <button
              onClick={toggleShuffle}
              aria-label="Modo aleatório"
              aria-pressed={isShuffle}
              title={`Modo Aleatório [S] (${isShuffle ? "Ativado" : "Desativado"})`}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                isShuffle
                  ? "text-red-400 bg-red-950/40 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                  : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
              }`}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && (
                <span className="w-1 h-1 rounded-full bg-red-400 absolute bottom-1 left-1/2 -translate-x-1/2" />
              )}
            </button>

            {/* Faixa Anterior */}
            <button
              onClick={handlePrevTrack}
              disabled={activeQueue.length === 0}
              aria-label="Faixa anterior"
              title="Faixa Anterior [Media / J]"
              className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlayPause}
              disabled={!currentTrack}
              aria-label={isPlaying ? "Pausar música" : "Reproduzir música"}
              title="Reproduzir / Pausar [Espaço / Media]"
              className="w-10 h-10 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center shadow-lg shadow-white/10 transition-transform cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Próxima Faixa */}
            <button
              onClick={handleNextTrack}
              disabled={activeQueue.length === 0}
              aria-label="Próxima faixa"
              title="Próxima Faixa [Media / K]"
              className="text-[#8c91a4] hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-[#1a1d28] transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Modo Repetição (Repeat: off / all / one) */}
            <button
              onClick={cycleRepeatMode}
              aria-label={`Modo de repetição: ${
                repeatMode === "off"
                  ? "desativada"
                  : repeatMode === "all"
                  ? "toda a fila"
                  : "música atual"
              }`}
              aria-pressed={repeatMode !== "off"}
              title={`Repetição [R]: ${
                repeatMode === "off"
                  ? "Desativada"
                  : repeatMode === "all"
                  ? "Repetir Toda a Fila"
                  : "Repetir Música Atual"
              }`}
              className={`p-2 rounded-lg transition-all cursor-pointer relative ${
                repeatMode !== "off"
                  ? "text-red-400 bg-red-950/40 border border-red-800/50 shadow-[0_0_10px_rgba(239,68,68,0.25)]"
                  : "text-[#71778c] hover:text-white hover:bg-[#1a1d28]"
              }`}
            >
              {repeatMode === "one" ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
              {repeatMode !== "off" && (
                <span className="w-1 h-1 rounded-full bg-red-400 absolute bottom-1 left-1/2 -translate-x-1/2" />
              )}
            </button>
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full flex items-center gap-3 text-[10px] text-[#71778c] font-mono">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!currentTrack}
              aria-label="Posição da música na linha do tempo"
              className="flex-1 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume, Letras & Status */}
        <div className="flex items-center justify-end gap-3.5 w-1/4 min-w-[200px]">
          {/* Botão Letras */}
          <button
            onClick={toggleShowLyrics}
            disabled={!currentTrack}
            aria-label="Exibir letras sincronizadas"
            aria-pressed={showLyrics}
            title="Letras Sincronizadas [L]"
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium disabled:opacity-30 ${
              showLyrics
                ? "bg-red-600 text-white shadow-lg shadow-red-950/50 border border-red-500"
                : "text-[#8c91a4] hover:text-white hover:bg-[#1a1d28]"
            }`}
          >
            <Mic2 className="w-4 h-4" />
            <span className="hidden md:inline">Letras</span>
          </button>

          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a24] text-emerald-400 border border-emerald-900/40">
            {isPlaying ? "Reproduzindo" : "Pausado"}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? "Desativar mudo" : "Ativar mudo"}
              title="Mudo [M]"
              className="text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume de reprodução"
              className="w-20 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
