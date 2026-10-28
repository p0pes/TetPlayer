import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SettingsService } from "../services/settings";
import { nativeAudioEngine, StreamInfo } from "../services/audioEngine";

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

  const [isPlayerReady, setIsPlayerReady] = useState(false);
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

  // Refs para acesso dentro do loop de sincronização sem stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<number | null>(null);

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

  // Inicializa callbacks do motor de áudio nativo e sincronizador de timeline
  useEffect(() => {
    initYouTubePlayer();

    // Callbacks do AudioEngine nativo (Item 1.1)
    nativeAudioEngine.onEnded = () => {
      if (activeEngineRef.current === "native") {
        setIsPlaying(false);
        onTrackEndedRef.current();
      }
    };

    nativeAudioEngine.onPlay = () => {
      if (activeEngineRef.current === "native") {
        setIsPlaying(true);
      }
    };

    nativeAudioEngine.onPause = () => {
      if (activeEngineRef.current === "native") {
        setIsPlaying(false);
      }
    };

    nativeAudioEngine.onError = (err) => {
      console.warn("[Player] Erro no stream direto nativo. Acionando fallback transparente para IFrame:", err);
      if (activeEngineRef.current === "native" && currentVideoIdRef.current) {
        const fallbackVid = currentVideoIdRef.current;
        const seekPos = currentTimeRef.current;
        activeEngineRef.current = "iframe";
        nativeAudioEngine.stop();
        playIframeVideo(fallbackVid, seekPos);
      }
    };

    // Sincronizador unificado de timeline (80ms para sincronia de letras e scrubber)
    const interval = setInterval(() => {
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

        if (SettingsService.getSetting("normalizeVolume") && target > 0.85) {
          target = 0.85 + (target - 0.85) * 0.5;
        }

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
    };
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
            setIsPlaying(true);
            setLoadingTrackId(null);
            ytPlayerRef.current.setPlaybackRate(1.0);
            const dur = ytPlayerRef.current.getDuration();
            if (dur) setDuration(dur);
          } else if (event.data === 2) { // PAUSED
            if (isSeekingRef.current && isPlayingRef.current) {
              try {
                ytPlayerRef.current.playVideo();
              } catch {
                // ignore
              }
              return;
            }
            setIsPlaying(false);
          } else if (event.data === 0) { // ENDED -> Autoplay next
            isSeekingRef.current = false;
            setIsPlaying(false);
            onTrackEndedRef.current();
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          if (activeEngineRef.current !== "iframe") return;
          console.error("YouTube Player Error:", err);
          setLoadingTrackId(null);
          setIsPlaying(false);
          onTrackErrorRef.current("Não foi possível reproduzir esta faixa. Avançando para a próxima...");
          onTrackEndedRef.current();
        },
      },
    });
  }

  function playIframeVideo(videoId: string, seekSec = 0) {
    if (currentVideoIdRef.current !== videoId) return;

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      if (isMutedRef.current) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
      }
      const targetVol = crossfadeSecondsRef.current > 0 ? 0 : Math.round(volumeRef.current * 100);
      ytPlayerRef.current.setVolume(targetVol);
      lastAppliedVolumeRef.current = targetVol;
      ytPlayerRef.current.loadVideoById(videoId, seekSec);
      ytPlayerRef.current.setPlaybackRate(1.0);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      setLoadingTrackId(null);
    } else {
      setTimeout(() => {
        if (currentVideoIdRef.current !== videoId) return;

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          if (isMutedRef.current) {
            ytPlayerRef.current.mute();
          } else {
            ytPlayerRef.current.unMute();
          }
          const targetVol = crossfadeSecondsRef.current > 0 ? 0 : Math.round(volumeRef.current * 100);
          ytPlayerRef.current.setVolume(targetVol);
          lastAppliedVolumeRef.current = targetVol;
          ytPlayerRef.current.loadVideoById(videoId, seekSec);
          ytPlayerRef.current.setPlaybackRate(1.0);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setLoadingTrackId(null);
        }
      }, 500);
    }
  }

  async function loadAndPlayVideo(videoId: string) {
    setLoadingTrackId(videoId);
    currentVideoIdRef.current = videoId;

    // 1. Arquitetura Híbrida: tenta obter stream direto de áudio nativo (Item 1.1)
    try {
      const stream = await invoke<StreamInfo | null>("get_stream_info", { videoId });
      // Prevenção de Race Condition (Item 68): descarta se o usuário já selecionou outra faixa
      if (currentVideoIdRef.current !== videoId) return;

      if (stream && stream.stream_url) {
        activeEngineRef.current = "native";

        // Pausa e silencia o player IFrame para evitar playback em duplicidade ou processamento de vídeo
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
            ytPlayerRef.current.mute();
          } catch {
            // ignore
          }
        }

        nativeAudioEngine.load(stream.stream_url);
        const initialVol = isMutedRef.current ? 0 : volumeRef.current;
        nativeAudioEngine.setVolume(crossfadeSecondsRef.current > 0 ? 0 : initialVol);
        if (stream.duration_seconds) {
          setDuration(stream.duration_seconds);
        }

        await nativeAudioEngine.play();
        if (currentVideoIdRef.current !== videoId) {
          nativeAudioEngine.stop();
          return;
        }
        setIsPlaying(true);
        setLoadingTrackId(null);
        return;
      }
    } catch (err) {
      if (currentVideoIdRef.current !== videoId) return;
      console.warn("[Player] Stream direto nativo não disponível, utilizando IFrame fallback:", err);
    }

    if (currentVideoIdRef.current !== videoId) return;

    // 2. Fallback Transparente para o IFrame Player do YouTube
    activeEngineRef.current = "iframe";
    nativeAudioEngine.stop();
    playIframeVideo(videoId);
  }

  function togglePlayPause() {
    if (activeEngineRef.current === "native") {
      if (isPlaying) {
        nativeAudioEngine.pause();
        setIsPlaying(false);
      } else {
        nativeAudioEngine.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  }

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
