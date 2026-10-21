import { useState, useEffect, useRef } from "react";
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
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Window state & controls
  const [isMaximized, setIsMaximized] = useState(false);

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

  // Refs for access inside callbacks
  const activeQueueRef = useRef<Track[]>([]);
  const currentQueueIndexRef = useRef<number>(-1);
  activeQueueRef.current = activeQueue;
  currentQueueIndexRef.current = currentQueueIndex;

  useEffect(() => {
    loadAuthStatus();
    loadPlaylists();
    initYouTubePlayer();

    // Sincronizador de timeline
    const interval = setInterval(() => {
      if (ytPlayerRef.current && isPlayerReady) {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1) { // PLAYING
            const curr = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            setCurrentTime(curr || 0);
            if (dur && dur > 0) setDuration(dur);
          }
        } catch {
          // ignore
        }
      }
    }, 500);

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
          ytPlayerRef.current.setVolume(volume * 100);
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

  function playTrackWithQueue(track: Track, queue: Track[], index: number) {
    setLoadingTrackId(track.id);
    setCurrentTrack(track);
    setActiveQueue(queue);
    setCurrentQueueIndex(index);
    setErrorMessage(null);

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
    if (queue.length === 0 || currentIndex === -1) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      playTrackWithQueue(queue[nextIndex], queue, nextIndex);
    }
  }

  function handlePrevTrack() {
    const queue = activeQueueRef.current;
    const currentIndex = currentQueueIndexRef.current;
    if (queue.length === 0 || currentIndex === -1) return;

    // Se passou de 3 segundos, reinicia a música atual
    if (currentTime > 3) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
        ytPlayerRef.current.seekTo(0, true);
        setCurrentTime(0);
      }
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      playTrackWithQueue(queue[prevIndex], queue, prevIndex);
    }
  }

  function togglePlayPause() {
    if (!ytPlayerRef.current || !currentTrack) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(time, true);
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(false);
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
    } else {
      ytPlayerRef.current.mute();
      setIsMuted(true);
    }
  }

  return (
    <div className="flex h-screen w-screen bg-[#0b0c10] text-[#e0e2ec] select-none overflow-hidden">
      {/* Hidden YouTube Iframe Player */}
      <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
        <div id="yt-player-frame" />
      </div>

      {/* ======================================================= */}
      {/* SIDEBAR LATERAL (Design System Oficial do Mockup)       */}
      {/* ======================================================= */}
      <aside className="w-64 bg-[#0f1118] border-r border-[#1f232e] p-4 flex flex-col justify-between shrink-0 h-full">
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          {/* Logo TetPlayer com suporte a arrastar janela */}
          <div
            data-tauri-drag-region
            onDoubleClick={handleToggleMaximize}
            className="flex items-center gap-2.5 px-2 pt-1 cursor-default"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2 pointer-events-none">
              TetPlayer <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 px-2 py-0.5 rounded-full font-medium">Desktop</span>
            </h1>
          </div>

          {/* Navegação Principal: Biblioteca como Página Inicial + Buscar */}
          <nav className="space-y-1">
            <button
              onClick={() => {
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
              onClick={() => setActiveTab("search")}
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

          {/* Seção de Playlists do Usuário com Scroll Suave */}
          <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-[#1f232e]">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[11px] font-bold text-[#555a6d] uppercase tracking-wider">
                Suas Playlists
              </p>
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
              ) : playlists.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#555a6d]">
                  Nenhuma playlist encontrada.
                </div>
              ) : (
                playlists.map((pl) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  const isLiked = pl.id === "VLLM";

                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl)}
                      className={`px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-2 truncate ${
                        isSelected
                          ? "bg-[#1f2331] text-red-400 font-semibold"
                          : "text-[#9da3b7] hover:bg-[#1a1d28] hover:text-white"
                      }`}
                    >
                      {isLiked ? (
                        <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : (
                        <ListMusic className="w-3.5 h-3.5 text-[#5e6479] shrink-0" />
                      )}
                      <span className="truncate">{pl.title}</span>
                    </div>
                  );
                })
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
      {/* ÁREA PRINCIPAL (Header superior + Conteúdo dinâmico)    */}
      {/* ======================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Barra Superior Integrada com Window Controls (Title Bar Customizada) */}
        <header
          data-tauri-drag-region
          onDoubleClick={handleToggleMaximize}
          className="h-14 border-b border-[#1f232e] bg-[#0e1017] px-6 flex items-center justify-between gap-4 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-3" data-tauri-drag-region>
            <span className="text-xs text-[#8c91a4] pointer-events-none">
              {activeTab === "library"
                ? selectedPlaylist
                  ? `Biblioteca > ${selectedPlaylist.title}`
                  : "Biblioteca de Playlists"
                : "Busca de Músicas"}
            </span>
          </div>

          {/* Status Pills e Controles de Navegação da Janela */}
          <div className="flex items-center gap-3">
            {auth?.is_authenticated ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 px-2.5 py-0.5 rounded-full text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sincronizado: {auth.browser}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-800/50 px-2.5 py-0.5 rounded-full text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Modo Anônimo
              </span>
            )}

            {/* Menu de Navegação / Janela do Windows (Minimizar, Modo Janela, Fechar) */}
            <div className="flex items-center gap-1 border-l border-[#1f232e] pl-3 ml-1">
              <button
                onClick={handleMinimize}
                title="Minimizar"
                aria-label="Minimizar"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleMaximize}
                title={isMaximized ? "Restaurar (Modo Janela)" : "Maximizar"}
                aria-label={isMaximized ? "Restaurar" : "Maximizar"}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
              >
                {isMaximized ? (
                  <Copy className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={handleClose}
                title="Fechar"
                aria-label="Fechar"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8c91a4] hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo Dinâmico */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alerta de Erro se houver */}
          {errorMessage && (
            <div className="bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
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

          {/* ===================================================== */}
          {/* ABA: BIBLIOTECA (Página Inicial com Playlists)       */}
          {/* ===================================================== */}
          {activeTab === "library" && (
            <>
              {selectedPlaylist ? (
                /* Detalhes da Playlist Selecionada */
                <div className="space-y-6">
                  {/* Botão Voltar */}
                  <button
                    onClick={() => setSelectedPlaylist(null)}
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
                              playTrackWithQueue(playlistTracks[0], playlistTracks, 0);
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
                            onClick={() => playTrackWithQueue(track, playlistTracks, idx)}
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
                      {playlists.map((pl) => {
                        const isLiked = pl.id === "VLLM";

                        return (
                          <div
                            key={pl.id}
                            onClick={() => handleSelectPlaylist(pl)}
                            className="bg-[#12141c] hover:bg-[#171a24] p-4 rounded-2xl border border-[#1f232e] hover:border-[#2f3549] transition-all group cursor-pointer flex flex-col justify-between"
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

                              <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                                {pl.title}
                              </h4>
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
      </div>

      {/* ======================================================= */}
      {/* PLAYER INFERIOR PERSISTENTE (Footer Playback Bar)        */}
      {/* ======================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 h-20 border-t border-[#1f232e] bg-[#0e1017] px-6 flex items-center justify-between gap-6 z-40">
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

        {/* Controles Centrais (Prev, Play/Pause, Next) e Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevTrack}
              disabled={activeQueue.length === 0}
              className="text-[#8c91a4] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 disabled:opacity-40 text-black flex items-center justify-center shadow-lg transition-transform cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={handleNextTrack}
              disabled={activeQueue.length === 0}
              className="text-[#8c91a4] hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
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
              className="flex-1 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Status */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[180px]">
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a24] text-emerald-400 border border-emerald-900/40">
            {isPlaying ? "Reproduzindo" : "Pausado"}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
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
              className="w-20 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
