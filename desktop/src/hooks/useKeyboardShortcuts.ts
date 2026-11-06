import { useEffect, useRef } from "react";
import { NowPlayingTab } from "../types";
import { NetworkService } from "../services/network";

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
  const stateAndHandlersRef = useRef({
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

  stateAndHandlersRef.current = {
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
  };

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

      // Atalho de Desenvolvedor (Develop Only): Ctrl + Alt + O para alternar simulação offline
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyO") {
        e.preventDefault();
        NetworkService.toggleSimulatedOffline();
        return;
      }

      const h = stateAndHandlersRef.current;

      switch (e.code) {
        case "Space":
        case "MediaPlayPause":
          e.preventDefault();
          h.togglePlayPause();
          break;
        case "MediaTrackNext":
        case "KeyK":
          e.preventDefault();
          h.handleNextTrack();
          break;
        case "MediaTrackPrevious":
        case "KeyJ":
          e.preventDefault();
          h.handlePrevTrack();
          break;
        case "ArrowLeft":
          if (e.altKey) break;
          e.preventDefault();
          h.seekTo(h.currentTime - 5);
          break;
        case "ArrowRight":
          if (e.altKey) break;
          e.preventDefault();
          h.seekTo(h.currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          // Item #5: Atalho Shift+Up para abrir/fechar a gaveta de reprodução conforme anunciado na UI
          if (e.shiftKey) {
            h.toggleNowPlaying();
            break;
          }
          h.changeVolume(Math.min(1, Math.round((h.volume + 0.05) * 100) / 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          h.changeVolume(Math.max(0, Math.round((h.volume - 0.05) * 100) / 100));
          break;
        case "KeyM":
          h.toggleMute();
          break;
        case "KeyL":
          e.preventDefault();
            if (h.isNowPlayingOpen && h.nowPlayingTab === "lyrics") {
              h.closeNowPlaying();
            } else {
              h.openNowPlaying("lyrics");
            }
            break;
        case "KeyQ":
          e.preventDefault();
            if (h.isNowPlayingOpen && h.nowPlayingTab === "queue") {
              h.closeNowPlaying();
            } else {
              h.openNowPlaying("queue");
            }
            break;
        case "KeyS":
          h.toggleShuffle();
          break;
        case "KeyR":
          h.cycleRepeatMode();
          break;
        case "Escape":
            if (h.isNowPlayingOpen) {
              e.preventDefault();
              h.closeNowPlaying();
            }
            break;
          }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
}
