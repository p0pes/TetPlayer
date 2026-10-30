import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback, useRef } from "react";
import { Track } from "../types";

const LIKED_STORAGE_KEY = "tetplayer_liked_track_ids";
const LIKES_EVENT = "tetplayer:likes-updated";

type LikesListener = (likedIds: Set<string>) => void;
const listeners = new Set<LikesListener>();

function loadInitialLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

let currentLikedIds: Set<string> = loadInitialLikedIds();

function saveLikedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn(currentLikedIds));
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(LIKES_EVENT, { detail: { count: currentLikedIds.size } })
      );
    } catch {
      // ignore
    }
  }
}

export const LikesService = {
  isLiked(videoId?: string | null): boolean {
    if (!videoId) return false;
    return currentLikedIds.has(videoId);
  },

  async toggleLike(track: Track): Promise<boolean> {
    if (!track || !track.id) return false;
    const videoId = track.id;
    const wasLiked = currentLikedIds.has(videoId);
    const nextState = !wasLiked;

    // Atualização otimista de 0ms
    if (nextState) {
      currentLikedIds.add(videoId);
    } else {
      currentLikedIds.delete(videoId);
    }
    saveLikedIds(currentLikedIds);
    notifyListeners();

    try {
      if (nextState) {
        await invoke("like_track", { videoId });
      } else {
        await invoke("unlike_track", { videoId });
      }
      return nextState;
    } catch (err) {
      console.warn(`[LikesService] Falha ao sincronizar status de curtida para ${videoId}:`, err);
      // Rollback gracioso se a chamada de rede falhar
      if (wasLiked) {
        currentLikedIds.add(videoId);
      } else {
        currentLikedIds.delete(videoId);
      }
      saveLikedIds(currentLikedIds);
      notifyListeners();
      return wasLiked;
    }
  },

  syncLikedTracks(tracks: Track[]): void {
    if (!tracks || !Array.isArray(tracks)) return;
    let changed = false;
    for (const t of tracks) {
      if (t && t.id && !currentLikedIds.has(t.id)) {
        currentLikedIds.add(t.id);
        changed = true;
      }
    }
    if (changed) {
      saveLikedIds(currentLikedIds);
      notifyListeners();
    }
  },

  subscribe(listener: LikesListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Hook de alto desempenho para verificar e alternar o status de curtida de uma faixa.
 */
export function useLikedTrack(track?: Track | null) {
  const videoId = track?.id;
  const [isLiked, setIsLiked] = useState(() => LikesService.isLiked(videoId));
  const [isPending, setIsPending] = useState(false);
  const trackRef = useRef(track);
  trackRef.current = track;

  useEffect(() => {
    setIsLiked(LikesService.isLiked(videoId));
  }, [videoId]);

  useEffect(() => {
    return LikesService.subscribe(() => {
      setIsLiked(LikesService.isLiked(videoId));
    });
  }, [videoId]);

  const toggleLike = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const t = trackRef.current;
      if (!t || isPending) return;

      setIsPending(true);
      try {
        await LikesService.toggleLike(t);
      } finally {
        setIsPending(false);
      }
    },
    [isPending]
  );

  return { isLiked, toggleLike, isPending };
}

