import { useEffect, useRef } from "react";
import { NowPlayingTab } from "../types";

interface UseKeyboardShortcutsProps {
  togglePlayPause: () => void;
  handleNextTrack: () => void;
  handlePrevTrack: () => void;
  seekTo: (seconds: number) => void;
  currentTime: number;
  changeVolume: (volume: number) => void;
  volume: number;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  isNowPlayingOpen: boolean;
  nowPlayingTab: NowPlayingTab;
  toggleNowPlaying: () => void;
  openNowPlaying: (tab: NowPlayingTab) => void;
  closeNowPlaying: () => void;
}

export function useKeyboardShortcuts({
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
}: UseKeyboardShortcutsProps) {
  const currentTimeRef = useRef(currentTime);
  const volumeRef = useRef(volume);
  const isNowPlayingOpenRef = useRef(isNowPlayingOpen);
  const nowPlayingTabRef = useRef(nowPlayingTab);

  currentTimeRef.current = currentTime;
  volumeRef.current = volume;
  isNowPlayingOpenRef.current = isNowPlayingOpen;
  nowPlayingTabRef.current = nowPlayingTab;

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
        case "KeyK":
          e.preventDefault();
          handleNextTrack();
          break;
        case "MediaTrackPrevious":
        case "KeyJ":
          e.preventDefault();
          handlePrevTrack();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(currentTimeRef.current - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(currentTimeRef.current + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          // Item #5: Atalho Shift+Up para abrir/fechar a gaveta de reprodução conforme anunciado na UI
          if (e.shiftKey) {
            toggleNowPlaying();
            break;
          }
          changeVolume(Math.min(1, Math.round((volumeRef.current + 0.05) * 100) / 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(0, Math.round((volumeRef.current - 0.05) * 100) / 100));
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyL":
          e.preventDefault();
          if (isNowPlayingOpenRef.current && nowPlayingTabRef.current === "lyrics") {
            closeNowPlaying();
          } else {
            openNowPlaying("lyrics");
          }
          break;
        case "KeyQ":
          e.preventDefault();
          if (isNowPlayingOpenRef.current && nowPlayingTabRef.current === "queue") {
            closeNowPlaying();
          } else {
            openNowPlaying("queue");
          }
          break;
        case "KeyS":
          toggleShuffle();
          break;
        case "KeyR":
          cycleRepeatMode();
          break;
        case "Escape":
          if (isNowPlayingOpenRef.current) {
            e.preventDefault();
            closeNowPlaying();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlayPause,
    handleNextTrack,
    handlePrevTrack,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    toggleNowPlaying,
    openNowPlaying,
    closeNowPlaying,
  ]);
}
