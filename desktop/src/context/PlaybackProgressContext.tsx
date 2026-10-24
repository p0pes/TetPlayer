import { createContext, useContext, ReactNode, useMemo } from "react";

export interface PlaybackProgressContextType {
  currentTime: number;
  duration: number;
  buffered: number;
}

const PlaybackProgressContext = createContext<PlaybackProgressContextType>({
  currentTime: 0,
  duration: 0,
  buffered: 0,
});

interface PlaybackProgressProviderProps {
  currentTime: number;
  duration: number;
  buffered?: number;
  children: ReactNode;
}

export function PlaybackProgressProvider({
  currentTime,
  duration,
  buffered = 0,
  children,
}: PlaybackProgressProviderProps) {
  const value = useMemo<PlaybackProgressContextType>(
    () => ({
      currentTime,
      duration,
      buffered,
    }),
    [currentTime, duration, buffered]
  );

  return (
    <PlaybackProgressContext.Provider value={value}>
      {children}
    </PlaybackProgressContext.Provider>
  );
}

export function usePlaybackProgress(): PlaybackProgressContextType {
  return useContext(PlaybackProgressContext);
}
