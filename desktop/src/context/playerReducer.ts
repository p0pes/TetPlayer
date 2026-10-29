import { Track, RepeatMode } from "../types";

export interface QueueState {
  currentTrack: Track | null;
  activeQueue: Track[];
  originalQueue: Track[];
  currentQueueIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isAutoplayRadio: boolean;
}

export type QueueAction =
  | {
      type: "PLAY_TRACK_WITH_QUEUE";
      payload: {
        track: Track;
        queue: Track[];
        index: number;
      };
    }
  | { type: "PLAY_FROM_QUEUE"; payload: { index: number } }
  | { type: "REMOVE_FROM_QUEUE"; payload: { index: number } }
  | { type: "CLEAR_UPCOMING_QUEUE" }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "SET_SHUFFLE"; payload: boolean }
  | { type: "CYCLE_REPEAT_MODE" }
  | { type: "SET_REPEAT_MODE"; payload: RepeatMode }
  | { type: "TOGGLE_AUTOPLAY_RADIO" }
  | { type: "SET_AUTOPLAY_RADIO"; payload: boolean }
  | { type: "APPEND_RADIO_TRACKS"; payload: { tracks: Track[] } }
  | { type: "INSERT_NEXT"; payload: { track: Track } }
  | { type: "ADD_TO_END"; payload: { track: Track } }
  | { type: "ADD_TRACKS_TO_END"; payload: { tracks: Track[] } }
  | { type: "SET_TRACK_INDEX"; payload: { index: number } }
  | { type: "REORDER_QUEUE"; payload: { fromIndex: number; toIndex: number } };

/**
 * Embaralha um array via algoritmo Fisher-Yates de forma pura
 */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialQueueState(): QueueState {
  let isShuffle = false;
  try {
    isShuffle = localStorage.getItem("tetplayer_shuffle") === "true";
  } catch {
    // ignore
  }

  let repeatMode: RepeatMode = "off";
  try {
    const saved = localStorage.getItem("tetplayer_repeat");
    if (saved === "all" || saved === "one") {
      repeatMode = saved;
    }
  } catch {
    // ignore
  }

  let isAutoplayRadio = true;
  try {
    const saved = localStorage.getItem("tetplayer_autoplay_radio");
    if (saved !== null) {
      isAutoplayRadio = saved === "true";
    }
  } catch {
    // ignore
  }

  return {
    currentTrack: null,
    activeQueue: [],
    originalQueue: [],
    currentQueueIndex: -1,
    isShuffle,
    repeatMode,
    isAutoplayRadio,
  };
}

/**
 * Reducer determinístico para gerenciar a fila e máquina de estados da reprodução
 */
export function playerReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "PLAY_TRACK_WITH_QUEUE": {
      const { track, queue, index } = action.payload;
      const originalQueue = [...queue];

      if (state.isShuffle) {
        const resolvedIndex =
          index >= 0 && index < queue.length
            ? index
            : queue.findIndex((t) => t.id === track.id);
        const validIdx = resolvedIndex !== -1 ? resolvedIndex : 0;
        const selected = queue[validIdx] || track;
        const others = queue.filter((_, i) => i !== validIdx);
        const shuffledOthers = shuffleArray(others);

        return {
          ...state,
          currentTrack: selected,
          activeQueue: [selected, ...shuffledOthers],
          originalQueue,
          currentQueueIndex: 0,
        };
      }

      const resolvedIdx =
        index >= 0 && index < queue.length
          ? index
          : queue.findIndex((t) => t.id === track.id);
      const safeIdx = resolvedIdx !== -1 ? resolvedIdx : 0;

      return {
        ...state,
        currentTrack: queue[safeIdx] || track,
        activeQueue: originalQueue,
        originalQueue,
        currentQueueIndex: safeIdx,
      };
    }

    case "PLAY_FROM_QUEUE": {
      const { index } = action.payload;
      if (index < 0 || index >= state.activeQueue.length) {
        return state;
      }
      return {
        ...state,
        currentTrack: state.activeQueue[index],
        currentQueueIndex: index,
      };
    }

    case "REMOVE_FROM_QUEUE": {
      const { index } = action.payload;
      if (index < 0 || index >= state.activeQueue.length) {
        return state;
      }

      const removedTrack = state.activeQueue[index];
      const newActiveQueue = state.activeQueue.filter((_, i) => i !== index);
      const newOriginalQueue = state.originalQueue.filter((t) => t.id !== removedTrack.id);

      let newCurrentIndex = state.currentQueueIndex;
      let newCurrentTrack = state.currentTrack;

      if (index < state.currentQueueIndex) {
        newCurrentIndex = Math.max(0, state.currentQueueIndex - 1);
      } else if (index === state.currentQueueIndex) {
        if (newActiveQueue.length === 0) {
          newCurrentIndex = -1;
          newCurrentTrack = null;
        } else {
          newCurrentIndex = Math.min(state.currentQueueIndex, newActiveQueue.length - 1);
          newCurrentTrack = newActiveQueue[newCurrentIndex];
        }
      }

      return {
        ...state,
        activeQueue: newActiveQueue,
        originalQueue: newOriginalQueue,
        currentQueueIndex: newCurrentIndex,
        currentTrack: newCurrentTrack,
      };
    }

    case "CLEAR_UPCOMING_QUEUE": {
      if (state.currentQueueIndex === -1) {
        return state;
      }
      const newActiveQueue = state.activeQueue.slice(0, state.currentQueueIndex + 1);
      const currentTrackId = state.currentTrack?.id;
      let newOriginalQueue = state.originalQueue;
      if (currentTrackId) {
        const origIdx = state.originalQueue.findIndex((t) => t.id === currentTrackId);
        if (origIdx !== -1) {
          newOriginalQueue = state.originalQueue.slice(0, origIdx + 1);
        }
      }

      return {
        ...state,
        activeQueue: newActiveQueue,
        originalQueue: newOriginalQueue,
      };
    }

    case "TOGGLE_SHUFFLE": {
      const nextShuffle = !state.isShuffle;
      try {
        localStorage.setItem("tetplayer_shuffle", String(nextShuffle));
      } catch {
        // ignore
      }

      if (nextShuffle) {
        const originalQueue =
          state.originalQueue.length > 0 ? state.originalQueue : [...state.activeQueue];

        if (state.activeQueue.length > 1 && state.currentTrack) {
          const currentIdx =
            state.currentQueueIndex >= 0 ? state.currentQueueIndex : 0;
          const current = state.activeQueue[currentIdx];
          const others = state.activeQueue.filter((_, i) => i !== currentIdx);
          const shuffledOthers = shuffleArray(others);

          return {
            ...state,
            isShuffle: true,
            originalQueue,
            activeQueue: [current, ...shuffledOthers],
            currentQueueIndex: 0,
          };
        }

        return {
          ...state,
          isShuffle: true,
          originalQueue,
        };
      }

      // Desativando Shuffle: restaura fila original mantendo música atual
      if (state.originalQueue.length > 0) {
        const currId = state.currentTrack?.id;
        const newIdx = currId
          ? state.originalQueue.findIndex((t) => t.id === currId)
          : -1;
        return {
          ...state,
          isShuffle: false,
          activeQueue: [...state.originalQueue],
          currentQueueIndex: newIdx !== -1 ? newIdx : 0,
        };
      }

      return {
        ...state,
        isShuffle: false,
      };
    }

    case "SET_SHUFFLE": {
      if (state.isShuffle === action.payload) return state;
      return playerReducer(state, { type: "TOGGLE_SHUFFLE" });
    }

    case "CYCLE_REPEAT_MODE": {
      const nextMode: RepeatMode =
        state.repeatMode === "off"
          ? "all"
          : state.repeatMode === "all"
          ? "one"
          : "off";

      try {
        localStorage.setItem("tetplayer_repeat", nextMode);
      } catch {
        // ignore
      }

      return {
        ...state,
        repeatMode: nextMode,
      };
    }

    case "SET_REPEAT_MODE": {
      try {
        localStorage.setItem("tetplayer_repeat", action.payload);
      } catch {
        // ignore
      }
      return {
        ...state,
        repeatMode: action.payload,
      };
    }

    case "TOGGLE_AUTOPLAY_RADIO": {
      const nextAutoplay = !state.isAutoplayRadio;
      try {
        localStorage.setItem("tetplayer_autoplay_radio", String(nextAutoplay));
      } catch {
        // ignore
      }
      return {
        ...state,
        isAutoplayRadio: nextAutoplay,
      };
    }

    case "SET_AUTOPLAY_RADIO": {
      try {
        localStorage.setItem("tetplayer_autoplay_radio", String(action.payload));
      } catch {
        // ignore
      }
      return {
        ...state,
        isAutoplayRadio: action.payload,
      };
    }

    case "APPEND_RADIO_TRACKS": {
      const existingIds = new Set(state.activeQueue.map((t) => t.id));
      const newTracks = action.payload.tracks.filter((t) => !existingIds.has(t.id));

      if (newTracks.length === 0) return state;

      return {
        ...state,
        activeQueue: [...state.activeQueue, ...newTracks],
        originalQueue: [...state.originalQueue, ...newTracks],
      };
    }

    case "INSERT_NEXT": {
      const { track } = action.payload;
      if (!track || !track.id) return state;

      if (state.activeQueue.length === 0) {
        return {
          ...state,
          activeQueue: [track],
          originalQueue: [track],
          currentQueueIndex: 0,
          currentTrack: track,
        };
      }

      const insertIdx =
        state.currentQueueIndex >= 0
          ? state.currentQueueIndex + 1
          : state.activeQueue.length;

      const newActive = [...state.activeQueue];
      newActive.splice(insertIdx, 0, track);

      const newOriginal = [...state.originalQueue];
      newOriginal.splice(insertIdx, 0, track);

      return {
        ...state,
        activeQueue: newActive,
        originalQueue: newOriginal,
      };
    }

    case "ADD_TRACKS_TO_END": {
      const validTracks = action.payload.tracks.filter((t) => t && t.id);
      if (validTracks.length === 0) return state;

      if (state.activeQueue.length === 0) {
        return {
          ...state,
          activeQueue: [...validTracks],
          originalQueue: [...validTracks],
          currentQueueIndex: 0,
          currentTrack: validTracks[0],
        };
      }

      return {
        ...state,
        activeQueue: [...state.activeQueue, ...validTracks],
        originalQueue: [...state.originalQueue, ...validTracks],
      };
    }

    case "ADD_TO_END": {
      const { track } = action.payload;
      if (!track || !track.id) return state;

      if (state.activeQueue.length === 0) {
        return {
          ...state,
          activeQueue: [track],
          originalQueue: [track],
          currentQueueIndex: 0,
          currentTrack: track,
        };
      }

      return {
        ...state,
        activeQueue: [...state.activeQueue, track],
        originalQueue: [...state.originalQueue, track],
      };
    }

    case "SET_TRACK_INDEX": {
      const { index } = action.payload;
      if (index < 0 || index >= state.activeQueue.length) return state;
      return {
        ...state,
        currentQueueIndex: index,
        currentTrack: state.activeQueue[index],
      };
    }

    case "REORDER_QUEUE": {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex < 0 ||
        fromIndex >= state.activeQueue.length ||
        toIndex < 0 ||
        toIndex >= state.activeQueue.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const newActiveQueue = [...state.activeQueue];
      const [movedItem] = newActiveQueue.splice(fromIndex, 1);
      newActiveQueue.splice(toIndex, 0, movedItem);

      // Recalcula o índice atual baseado no ID da faixa tocando
      let newCurrentIndex = state.currentQueueIndex;
      if (state.currentTrack) {
        const foundIdx = newActiveQueue.findIndex((t) => t.id === state.currentTrack?.id);
        if (foundIdx !== -1) {
          newCurrentIndex = foundIdx;
        }
      }

      // Se não estiver em modo shuffle, sincroniza com a fila original
      let newOriginalQueue = state.originalQueue;
      if (!state.isShuffle && state.originalQueue.length === state.activeQueue.length) {
        newOriginalQueue = [...newActiveQueue];
      }

      return {
        ...state,
        activeQueue: newActiveQueue,
        originalQueue: newOriginalQueue,
        currentQueueIndex: newCurrentIndex,
      };
    }

    default:
      return state;
  }
}
