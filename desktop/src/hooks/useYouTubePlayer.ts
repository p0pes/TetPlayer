import { useState, useEffect, useRef } from "react";

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
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const crossfadeSecondsRef = useRef(crossfadeSeconds);
  const onTrackEndedRef = useRef(onTrackEnded);
  const onTrackErrorRef = useRef(onTrackError);
  // Sentinela para evitar flooding de postMessage de volume a cada 80ms (Item #3)
  const lastAppliedVolumeRef = useRef<number>(-1);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  crossfadeSecondsRef.current = crossfadeSeconds;
  onTrackEndedRef.current = onTrackEnded;
  onTrackErrorRef.current = onTrackError;

  useEffect(() => {
    initYouTubePlayer();

    // Sincronizador de timeline em alta frequência (80ms para resposta imediata das letras + Crossfade suave)
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

            // Crossfade suave de volume com verificação de sentinela
            const cf = crossfadeSecondsRef.current;
            const baseVol = isMutedRef.current ? 0 : volumeRef.current * 100;

            let target = Math.round(baseVol);
            if (cf > 0 && dur > 0 && typeof curr === "number" && !isNaN(curr)) {
              const remaining = dur - curr;
              if (remaining <= cf && remaining >= 0) {
                // Fade-out no final da faixa
                const factor = Math.max(0, remaining / cf);
                target = Math.round(baseVol * factor);
              } else if (curr <= cf) {
                // Fade-in no início da nova faixa
                const factor = Math.min(1, Math.max(0, curr / cf));
                target = Math.round(baseVol * factor);
              }
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
            onTrackEndedRef.current();
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          console.error("YouTube Player Error:", err);
          setLoadingTrackId(null);
          setIsPlaying(false);
          onTrackErrorRef.current("Não foi possível reproduzir esta faixa. Avançando para a próxima...");
          onTrackEndedRef.current();
        },
      },
    });
  }

  function loadAndPlayVideo(videoId: string) {
    setLoadingTrackId(videoId);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
      if (crossfadeSecondsRef.current > 0) {
        ytPlayerRef.current.setVolume(0);
        lastAppliedVolumeRef.current = 0;
      }
      ytPlayerRef.current.loadVideoById(videoId);
      ytPlayerRef.current.setPlaybackRate(1.0);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      setTimeout(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
          if (crossfadeSecondsRef.current > 0) {
            ytPlayerRef.current.setVolume(0);
            lastAppliedVolumeRef.current = 0;
          }
          ytPlayerRef.current.loadVideoById(videoId);
          ytPlayerRef.current.setPlaybackRate(1.0);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }, 500);
    }
  }

  function togglePlayPause() {
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
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(clamped, true);
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
    const targetVol = Math.round(clamped * 100);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(targetVol);
      lastAppliedVolumeRef.current = targetVol;
    }
  }

  function toggleMute() {
    if (!ytPlayerRef.current) return;
    if (isMuted) {
      ytPlayerRef.current.unMute();
      const target = Math.round(volume * 100);
      ytPlayerRef.current.setVolume(target);
      lastAppliedVolumeRef.current = target;
      setIsMuted(false);
      try {
        localStorage.setItem("tetplayer_muted", "false");
      } catch {
        // ignore
      }
    } else {
      ytPlayerRef.current.mute();
      lastAppliedVolumeRef.current = 0;
      setIsMuted(true);
      try {
        localStorage.setItem("tetplayer_muted", "true");
      } catch {
        // ignore
      }
    }
  }

  function restartCurrentTrack() {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(0, true);
      setCurrentTime(0);
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
