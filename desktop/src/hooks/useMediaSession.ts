import { useEffect, useRef } from "react";
import { Track } from "../types";
import { upgradeArtworkQuality } from "../utils/artwork";

interface UseMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeekTo: (seconds: number) => void;
}

export function useMediaSession({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeekTo,
}: UseMediaSessionProps) {
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onSeekToRef = useRef(onSeekTo);

  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  onSeekToRef.current = onSeekTo;

  // 1. Configuração dos metadados e handlers estáveis (apenas quando a faixa muda)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (currentTrack) {
      const artUrl = upgradeArtworkQuality(
        currentTrack.artwork_url,
        currentTrack.id
      );

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
      navigator.mediaSession.setActionHandler("play", () => onPlayRef.current());
      navigator.mediaSession.setActionHandler("pause", () => onPauseRef.current());
      navigator.mediaSession.setActionHandler("previoustrack", () => onPrevRef.current());
      navigator.mediaSession.setActionHandler("nexttrack", () => onNextRef.current());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          onSeekToRef.current(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 5;
        onSeekToRef.current(currentTimeRef.current - offset);
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 5;
        onSeekToRef.current(currentTimeRef.current + offset);
      });
    } catch (err) {
      console.warn("Erro ao configurar handlers de MediaSession:", err);
    }

    return () => {
      const actions: MediaSessionAction[] = [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekto",
        "seekbackward",
        "seekforward",
      ];
      for (const action of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore unsupported actions
        }
      }
    };
  }, [currentTrack?.id]);

  // 2. Sincronizar estado de reprodução no SMTC
  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // 3. Sincronizar posição no SMTC com throttling de 1s para não sobrecarregar IPC
  const lastPositionUpdateRef = useRef<number>(0);
  const lastTrackedPositionRef = useRef<number>(0);
  useEffect(() => {
    if (
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession &&
      duration > 0
    ) {
      const now = performance.now();
      const isSeekJump = Math.abs(currentTime - lastTrackedPositionRef.current) > 2;
      // Atualiza apenas se passou 1s ou se houver salto grande (seek manual)
      if (now - lastPositionUpdateRef.current > 1000 || isSeekJump) {
        lastPositionUpdateRef.current = now;
        lastTrackedPositionRef.current = currentTime;
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
    }
  }, [currentTime, duration]);
}
