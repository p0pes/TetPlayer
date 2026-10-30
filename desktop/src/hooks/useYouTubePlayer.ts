import { useState, useEffect, useRef, useCallback } from "react";
import { SettingsService } from "../services/settings";
import { nativeAudioEngine } from "../services/audioEngine";
import { fetchStreamInfoCached, getCachedStreamInfo } from "../services/streamCache";

interface UseYouTubePlayerProps {
  crossfadeSeconds: number;
  onTrackEnded: () => void;
  onTrackError: (msg: string) => void;
}

export function useYouTubePlayer({
  crossfadeSeconds,
  onTrackEnded,
  onTrackError,
}: UseYouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const activeEngineRef = useRef<"native" | "iframe">("iframe");
  const currentVideoIdRef = useRef<string | null>(null);
  const activeLoadedVideoIdRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef<number>(0);
  const rapidSkipTimerRef = useRef<number | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    try {
      const raw = localStorage.getItem("tetplayer_player_session");
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.currentTime === "number" && s.currentTime > 0) {
          return s.currentTime;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  });
  const [duration, setDuration] = useState(() => {
    try {
      const raw = localStorage.getItem("tetplayer_player_session");
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.duration === "number" && s.duration > 0) {
          return s.duration;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  });

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

  // Refs para acesso dentro do loop de sincronização sem stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<number | null>(null);
  // Evita flicker Play -> Pause -> Play durante transição de faixa ou fallback de motor
  const isTransitioningTrackRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const crossfadeSecondsRef = useRef(crossfadeSeconds);
  const onTrackEndedRef = useRef(onTrackEnded);
  const onTrackErrorRef = useRef(onTrackError);
  // Sentinela para evitar flooding de postMessage de volume a cada 80ms (Item #3)
  const lastAppliedVolumeRef = useRef<number>(-1);
  // Sentinela para evitar flooding de automação no Web Audio a cada 80ms (Item 69)
  const lastAppliedNativeVolumeRef = useRef<number>(-1);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  crossfadeSecondsRef.current = crossfadeSeconds;
  onTrackEndedRef.current = onTrackEnded;
  onTrackErrorRef.current = onTrackError;

  const clearTransitionGuard = useCallback(() => {
    isTransitioningTrackRef.current = false;
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  const startTransitionGuard = useCallback(() => {
    isTransitioningTrackRef.current = true;
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      isTransitioningTrackRef.current = false;
      transitionTimeoutRef.current = null;
    }, 3500);
  }, []);

  // Inicializa callbacks do motor de áudio nativo e sincronizador de timeline
  useEffect(() => {
    initYouTubePlayer();

    // Callbacks do AudioEngine nativo (Item 1.1)
    nativeAudioEngine.onEnded = () => {
      if (activeEngineRef.current === "native") {
        clearTransitionGuard();
        isPlayingRef.current = false;
        setIsPlaying(false);
        onTrackEndedRef.current();
      }
    };

    nativeAudioEngine.onPlay = () => {
      if (activeEngineRef.current === "native") {
        activeLoadedVideoIdRef.current = currentVideoIdRef.current;
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
    };

    nativeAudioEngine.onPause = () => {
      if (activeEngineRef.current === "native" && !isTransitioningTrackRef.current) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    nativeAudioEngine.onError = (err) => {
      console.warn("[Player] Erro no stream direto nativo. Acionando fallback transparente para IFrame:", err);
      if (activeEngineRef.current === "native" && currentVideoIdRef.current) {
        const fallbackVid = currentVideoIdRef.current;
        const seekPos = currentTimeRef.current;
        startTransitionGuard();
        activeEngineRef.current = "iframe";
        nativeAudioEngine.stop();
        playIframeVideo(fallbackVid, seekPos);
      }
    };

    // Sincronizador unificado de timeline (80ms para sincronia de letras e scrubber)
    const interval = setInterval(() => {
      // Impede leitura da posição da faixa antiga (ex: 10s) enquanto a nova faixa está carregando
      if (activeLoadedVideoIdRef.current !== currentVideoIdRef.current) {
        return;
      }

      if (activeEngineRef.current === "native") {
        const curr = nativeAudioEngine.getCurrentTime();
        const dur = nativeAudioEngine.getDuration();
        if (typeof curr === "number" && !isNaN(curr)) {
          setCurrentTime(curr);
        }
        if (typeof dur === "number" && dur > 0 && !isNaN(dur)) {
          setDuration(dur);
        }

        // Crossfade e Normalização de Volume no motor nativo
        const cf = crossfadeSecondsRef.current;
        const baseVol = isMutedRef.current ? 0 : volumeRef.current;
        let target = baseVol;

        if (cf > 0 && dur > 0 && typeof curr === "number" && !isNaN(curr)) {
          const remaining = dur - curr;
          if (remaining <= cf && remaining >= 0) {
            target = baseVol * Math.max(0, remaining / cf);
          } else if (curr <= cf) {
            target = baseVol * Math.min(1, Math.max(0, curr / cf));
          }
        }

        nativeAudioEngine.setNormalizeVolume(SettingsService.getSetting("normalizeVolume"));

        if (Math.abs(lastAppliedNativeVolumeRef.current - target) > 0.001) {
          nativeAudioEngine.setVolume(target);
          lastAppliedNativeVolumeRef.current = target;
        }
      } else if (ytPlayerRef.current && isPlayerReady) {
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

            // Crossfade suave de volume com verificação de sentinela
            const cf = crossfadeSecondsRef.current;
            const baseVol = isMutedRef.current ? 0 : volumeRef.current * 100;

            let target = Math.round(baseVol);
            if (cf > 0 && dur > 0 && typeof curr === "number" && !isNaN(curr)) {
              const remaining = dur - curr;
              if (remaining <= cf && remaining >= 0) {
                const factor = Math.max(0, remaining / cf);
                target = Math.round(baseVol * factor);
              } else if (curr <= cf) {
                const factor = Math.min(1, Math.max(0, curr / cf));
                target = Math.round(baseVol * factor);
              }
            }

            // Normalização inteligente de volume (ReplayGain / Anti-Clipping)
            if (SettingsService.getSetting("normalizeVolume") && target > 85) {
              target = Math.round(85 + (target - 85) * 0.5);
            }

            // Apenas despacha chamada IPC se o volume efetivo tiver sofrido alteração
            if (lastAppliedVolumeRef.current !== target) {
              ytPlayerRef.current.setVolume(target);
              lastAppliedVolumeRef.current = target;
            }
          }
        } catch {
          // ignore
        }
      }
    }, 80);

    return () => {
      clearInterval(interval);
      if (seekTimeoutRef.current) window.clearTimeout(seekTimeoutRef.current);
      if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
      if (rapidSkipTimerRef.current) window.clearTimeout(rapidSkipTimerRef.current);
    };
  }, [isPlayerReady, clearTransitionGuard, startTransitionGuard]);

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
          const initialVol = Math.round(volumeRef.current * 100);
          ytPlayerRef.current.setVolume(initialVol);
          lastAppliedVolumeRef.current = initialVol;
          if (isMutedRef.current) {
            ytPlayerRef.current.mute();
          } else {
            ytPlayerRef.current.unMute();
          }
          ytPlayerRef.current.setPlaybackRate(1.0);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (event: any) => {
          if (activeEngineRef.current !== "iframe") return;

          if (event.data === 1) { // PLAYING
            isSeekingRef.current = false;
            clearTransitionGuard();
            activeLoadedVideoIdRef.current = currentVideoIdRef.current;
            isPlayingRef.current = true;
            setIsPlaying(true);
            setLoadingTrackId(null);
            ytPlayerRef.current.setPlaybackRate(1.0);
            const dur = ytPlayerRef.current.getDuration();
            if (dur) setDuration(dur);
          } else if (event.data === 2) { // PAUSED
            // Ignora eventos transitórios de pausa disparados pelo IFrame ao trocar de faixa ou durante seek
            if ((isSeekingRef.current || isTransitioningTrackRef.current) && isPlayingRef.current) {
              try {
                ytPlayerRef.current.playVideo();
              } catch {
                // ignore
              }
              return;
            }
            isPlayingRef.current = false;
            setIsPlaying(false);
          } else if (event.data === 0) { // ENDED -> Autoplay next
            isSeekingRef.current = false;
            clearTransitionGuard();
            isPlayingRef.current = false;
            setIsPlaying(false);
            onTrackEndedRef.current();
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          if (activeEngineRef.current !== "iframe") return;
          console.error("YouTube Player Error:", err);
          clearTransitionGuard();
          setLoadingTrackId(null);
          isPlayingRef.current = false;
          setIsPlaying(false);
          onTrackErrorRef.current("Não foi possível reproduzir esta faixa. Avançando para a próxima...");
          onTrackEndedRef.current();
        },
      },
    });
  }

  function playIframeVideo(videoId: string, seekSec = 0, isManual = false) {
    if (currentVideoIdRef.current !== videoId) return;

    startTransitionGuard();
    isPlayingRef.current = true;
    setIsPlaying(true);

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      if (isMutedRef.current) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
      }
      const userVol = Math.round(volumeRef.current * 100);
      const targetVol = (isManual || crossfadeSecondsRef.current <= 0) ? userVol : 0;
      ytPlayerRef.current.setVolume(targetVol);
      lastAppliedVolumeRef.current = targetVol;
      ytPlayerRef.current.loadVideoById(videoId, seekSec);
      ytPlayerRef.current.setPlaybackRate(1.0);
      ytPlayerRef.current.playVideo();
      setLoadingTrackId(null);
    } else {
      setTimeout(() => {
        if (currentVideoIdRef.current !== videoId) return;

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          startTransitionGuard();
          if (isMutedRef.current) {
            ytPlayerRef.current.mute();
          } else {
            ytPlayerRef.current.unMute();
          }
          const userVol = Math.round(volumeRef.current * 100);
          const targetVol = (isManual || crossfadeSecondsRef.current <= 0) ? userVol : 0;
          ytPlayerRef.current.setVolume(targetVol);
          lastAppliedVolumeRef.current = targetVol;
          ytPlayerRef.current.loadVideoById(videoId, seekSec);
          ytPlayerRef.current.setPlaybackRate(1.0);
          ytPlayerRef.current.playVideo();
          isPlayingRef.current = true;
          setIsPlaying(true);
          setLoadingTrackId(null);
        }
      }, 500);
    }
  }

  async function loadAndPlayVideo(videoId: string, seekSec = 0, isManual = false) {
    const requestId = ++loadRequestIdRef.current;
    setLoadingTrackId(videoId);
    currentVideoIdRef.current = videoId;

    // Reseta imediatamente o progresso no milissegundo do clique (elimina a barra congelada no tempo anterior)
    activeLoadedVideoIdRef.current = null;
    setCurrentTime(seekSec);
    currentTimeRef.current = seekSec;
    setDuration(0);

    // Feedback otimista imediato sem oscilar Play -> Pause -> Play
    startTransitionGuard();
    isPlayingRef.current = true;
    setIsPlaying(true);

    if (rapidSkipTimerRef.current !== null) {
      window.clearTimeout(rapidSkipTimerRef.current);
      rapidSkipTimerRef.current = null;
    }

    // 1. Resolução Síncrona Imediata (0ms) se o stream nativo já estiver em cache
    const instantCached = getCachedStreamInfo(videoId);
    if (instantCached && instantCached.stream_url) {
      activeEngineRef.current = "native";
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
          ytPlayerRef.current.mute();
        } catch {
          // ignore
        }
      }

      nativeAudioEngine.setNormalizeVolume(SettingsService.getSetting("normalizeVolume"));
      nativeAudioEngine.load(instantCached.stream_url, videoId, instantCached.loudness_db);
      if (seekSec > 0) {
        nativeAudioEngine.seek(seekSec);
      }
      const userVol = isMutedRef.current ? 0 : volumeRef.current;
      const initialVol = (isManual || crossfadeSecondsRef.current <= 0) ? userVol : 0;
      nativeAudioEngine.setVolume(initialVol);
      if (instantCached.duration_seconds) {
        setDuration(instantCached.duration_seconds);
      }

      await nativeAudioEngine.play();
      if (requestId !== loadRequestIdRef.current || currentVideoIdRef.current !== videoId) {
        nativeAudioEngine.stop();
        return;
      }
      activeLoadedVideoIdRef.current = videoId;
      clearTransitionGuard();
      isPlayingRef.current = true;
      setIsPlaying(true);
      setLoadingTrackId(null);
      return;
    }

    // 2. Se o stream nativo não está em cache e o motor anterior era nativo, encerra o áudio nativo
    if (activeEngineRef.current === "native") {
      nativeAudioEngine.stop();
    }

    // 3. Fallback Instantâneo para o IFrame Player do YouTube:
    // Dispara loadVideoById IMEDIATAMENTE no milissegundo 0 sem esperar timeouts nem debounces artificiais
    activeEngineRef.current = "iframe";
    playIframeVideo(videoId, seekSec, isManual);

    // 4. Em background, busca os dados da faixa para popular o cache de futuras execuções
    fetchStreamInfoCached(videoId, 1000).catch(() => {});
  }

  const togglePlayPause = useCallback(() => {
    clearTransitionGuard();
    if (activeEngineRef.current === "native") {
      if (isPlayingRef.current) {
        nativeAudioEngine.pause();
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        nativeAudioEngine.play().catch(console.error);
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
      return;
    }

    if (!ytPlayerRef.current) return;
    if (isPlayingRef.current) {
      ytPlayerRef.current.pauseVideo();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [clearTransitionGuard]);

  function seekTo(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, duration || 99999));
    setCurrentTime(clamped);

    if (activeEngineRef.current === "native") {
      nativeAudioEngine.seek(clamped);
      if (isPlayingRef.current) {
        nativeAudioEngine.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      const wasPlaying = isPlayingRef.current;
      isSeekingRef.current = true;
      if (seekTimeoutRef.current) window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = window.setTimeout(() => {
        isSeekingRef.current = false;
      }, 1200);

      ytPlayerRef.current.seekTo(clamped, true);

      if (wasPlaying) {
        try {
          ytPlayerRef.current.playVideo();
        } catch {
          // ignore
        }
        setIsPlaying(true);
      }
    }
  }

  function changeVolume(newVolume: number) {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    setIsMuted(false);
    try {
      localStorage.setItem("tetplayer_volume", String(clamped));
      localStorage.setItem("tetplayer_muted", "false");
    } catch {
      // ignore
    }

    if (activeEngineRef.current === "native") {
      nativeAudioEngine.setVolume(clamped);
    } else {
      const targetVol = Math.round(clamped * 100);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(targetVol);
        lastAppliedVolumeRef.current = targetVol;
      }
    }
  }

  function toggleMute() {
    if (isMuted) {
      setIsMuted(false);
      try {
        localStorage.setItem("tetplayer_muted", "false");
      } catch {
        // ignore
      }
      if (activeEngineRef.current === "native") {
        nativeAudioEngine.setVolume(volume);
      } else if (ytPlayerRef.current) {
        ytPlayerRef.current.unMute();
        const target = Math.round(volume * 100);
        ytPlayerRef.current.setVolume(target);
        lastAppliedVolumeRef.current = target;
      }
    } else {
      setIsMuted(true);
      try {
        localStorage.setItem("tetplayer_muted", "true");
      } catch {
        // ignore
      }
      if (activeEngineRef.current === "native") {
        nativeAudioEngine.setVolume(0);
      } else if (ytPlayerRef.current) {
        ytPlayerRef.current.mute();
        lastAppliedVolumeRef.current = 0;
      }
    }
  }

  function restartCurrentTrack() {
    setCurrentTime(0);
    if (activeEngineRef.current === "native") {
      nativeAudioEngine.seek(0);
      nativeAudioEngine.play().catch(console.error);
      setIsPlaying(true);
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(0, true);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  }

  return {
    ytPlayerRef,
    isPlayerReady,
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
  };
}
