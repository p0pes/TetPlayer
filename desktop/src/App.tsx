import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Pause,
  Search,
  Volume2,
  VolumeX,
  Music,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Radio,
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
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Inicializa o player embutido do YouTube e autenticação
  useEffect(() => {
    loadAuthStatus();
    loadInitialTracks();
    initYouTubePlayer();

    // Timer para sincronizar o tempo de reprodução
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
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (event: any) => {
          // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
          if (event.data === 1) {
            setIsPlaying(true);
            setLoadingTrackId(null);
            const dur = ytPlayerRef.current.getDuration();
            if (dur) setDuration(dur);
          } else if (event.data === 2) {
            setIsPlaying(false);
          } else if (event.data === 0) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          console.error("YouTube Player Error:", err);
          setErrorMessage("Não foi possível reproduzir esta faixa. Tente outra música.");
          setLoadingTrackId(null);
          setIsPlaying(false);
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
    } catch (err) {
      setErrorMessage(`Erro ao recarregar cookies: ${String(err)}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function loadInitialTracks() {
    setIsLoadingTracks(true);
    setErrorMessage(null);
    try {
      const res = await invoke<Track[]>("get_quick_tracks");
      setTracks(res);
    } catch (err) {
      setErrorMessage(`Erro ao carregar faixas iniciais: ${String(err)}`);
    } finally {
      setIsLoadingTracks(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingTracks(true);
    setErrorMessage(null);
    try {
      const res = await invoke<Track[]>("search_tracks", { query: searchQuery });
      setTracks(res);
    } catch (err) {
      setErrorMessage(`Erro ao buscar: ${String(err)}`);
    } finally {
      setIsLoadingTracks(false);
    }
  }

  function handlePlayTrack(track: Track) {
    setLoadingTrackId(track.id);
    setCurrentTrack(track);
    setErrorMessage(null);

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      ytPlayerRef.current.loadVideoById(track.id);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      // Se o iframe ainda estiver inicializando, tenta novamente em 300ms
      setTimeout(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          ytPlayerRef.current.loadVideoById(track.id);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }, 500);
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
    <div className="flex flex-col h-screen w-screen bg-[#0b0c10] text-[#e0e2ec] select-none">
      {/* Hidden YouTube Iframe Player */}
      <div className="fixed -top-[9999px] -left-[9999px] pointer-events-none opacity-0">
        <div id="yt-player-frame" />
      </div>

      {/* Top Header */}
      <header className="h-14 border-b border-[#1f232e] bg-[#0e1017] px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
            TetPlayer <span className="text-xs bg-red-950 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full font-normal">PC Alpha</span>
          </h1>
        </div>

        {/* Auth Status Badge */}
        <div className="flex items-center gap-3">
          {auth?.is_authenticated ? (
            <div className="flex items-center gap-2 bg-[#121f1a] border border-emerald-800/60 text-emerald-400 text-xs px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conectado: {auth.browser} ({auth.profile})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#221818] border border-amber-800/60 text-amber-300 text-xs px-3 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Visitante (Sem cookies YT)</span>
            </div>
          )}

          <button
            onClick={handleRefreshAuth}
            disabled={isCheckingAuth}
            title="Recarregar cookies do navegador"
            className="p-1.5 rounded-lg bg-[#171a24] border border-[#232733] text-[#8c91a4] hover:text-white hover:bg-[#1f2331] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAuth ? "animate-spin text-red-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 overflow-hidden max-w-5xl w-full mx-auto space-y-5">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e6479]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome da música, artista ou álbum..."
              className="w-full bg-[#12141c] border border-[#232733] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#5e6479] focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingTracks}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isLoadingTracks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white text-xs underline cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {/* Tracks List Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500" />
            {searchQuery ? `Resultados para "${searchQuery}"` : "Músicas Sugeridas"}
          </h2>
          <span className="text-xs text-[#71778c]">{tracks.length} faixas</span>
        </div>

        {/* Tracks Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoadingTracks ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c]">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <p className="text-xs">Buscando no YouTube Music...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#71778c] border border-dashed border-[#1f232e] rounded-xl">
              <Music className="w-8 h-8 text-[#343a4e]" />
              <p className="text-xs">Nenhuma música encontrada. Faça uma busca acima!</p>
            </div>
          ) : (
            tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLoadingThis = loadingTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                    isCurrent
                      ? "bg-[#1c202d] border-red-500/50"
                      : "bg-[#12141c] border-[#1f232e] hover:bg-[#171a24] hover:border-[#2b3040]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Artwork */}
                    <div className="w-12 h-12 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 flex items-center justify-center relative">
                      {track.artwork_url ? (
                        <img
                          src={track.artwork_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-5 h-5 text-[#5e6479]" />
                      )}
                      {isLoadingThis && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isCurrent ? "text-red-400" : "text-white"}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-[#8c91a4] truncate">
                        {track.artist} {track.album ? `• ${track.album}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Actions / Duration */}
                  <div className="flex items-center gap-4 shrink-0 pl-3">
                    {track.duration && (
                      <span className="text-xs text-[#71778c] font-mono">{track.duration}</span>
                    )}
                    <button
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isCurrent && isPlaying
                          ? "bg-red-600 text-white"
                          : "bg-[#1a1d28] text-white group-hover:bg-red-600"
                      }`}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Bottom Playback Bar */}
      <footer className="h-20 border-t border-[#1f232e] bg-[#0e1017] px-6 flex items-center justify-between gap-6 shrink-0">
        {/* Current Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
          <div className="w-12 h-12 rounded-lg bg-[#171a24] border border-[#232733] overflow-hidden shrink-0 flex items-center justify-center">
            {currentTrack?.artwork_url ? (
              <img
                src={currentTrack.artwork_url}
                alt={currentTrack.title}
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
              {currentTrack?.artist || "Escolha uma música para tocar"}
            </p>
          </div>
        </div>

        {/* Center Controls & Timeline */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
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
          </div>

          {/* Timeline Scrubber */}
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

        {/* Volume & Stream Quality Info */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[180px]">
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#171a24] text-emerald-400 border border-emerald-900/40">
            {isPlaying ? "Reproduzindo" : "Pausado"}
          </span>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-[#8c91a4] hover:text-white transition-colors cursor-pointer">
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
