import { describe, it, expect, beforeEach } from "vitest";
import {
  playerReducer,
  createInitialQueueState,
  QueueState,
  SESSION_STORAGE_KEY,
} from "../playerReducer";
import { Track } from "../../types";

describe("playerReducer (FSM da Fila e Reprodução)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockTrack1: Track = { id: "1", title: "Faixa 1", artist: "Artista A" };
  const mockTrack2: Track = { id: "2", title: "Faixa 2", artist: "Artista B" };
  const mockTrack3: Track = { id: "3", title: "Faixa 3", artist: "Artista C" };
  const mockQueue: Track[] = [mockTrack1, mockTrack2, mockTrack3];

  it("deve inicializar com valores padrão seguros", () => {
    const state = createInitialQueueState();
    expect(state.currentTrack).toBeNull();
    expect(state.activeQueue).toEqual([]);
    expect(state.currentQueueIndex).toBe(-1);
    expect(state.isShuffle).toBe(false);
    expect(state.repeatMode).toBe("off");
    expect(state.isAutoplayRadio).toBe(true);
  });

  it("deve reproduzir faixa com fila preservando a ordem original quando shuffle está desativado", () => {
    const initialState = createInitialQueueState();
    const nextState = playerReducer(initialState, {
      type: "PLAY_TRACK_WITH_QUEUE",
      payload: {
        track: mockTrack2,
        queue: mockQueue,
        index: 1,
      },
    });

    expect(nextState.currentTrack?.id).toBe("2");
    expect(nextState.currentQueueIndex).toBe(1);
    expect(nextState.activeQueue).toHaveLength(3);
    expect(nextState.originalQueue).toEqual(mockQueue);
  });

  it("deve posicionar a música selecionada no topo e embaralhar o restante quando shuffle está ativo", () => {
    const stateWithShuffle: QueueState = {
      ...createInitialQueueState(),
      isShuffle: true,
    };

    const nextState = playerReducer(stateWithShuffle, {
      type: "PLAY_TRACK_WITH_QUEUE",
      payload: {
        track: mockTrack3,
        queue: mockQueue,
        index: 2,
      },
    });

    expect(nextState.currentTrack?.id).toBe("3");
    expect(nextState.currentQueueIndex).toBe(0);
    expect(nextState.activeQueue[0].id).toBe("3");
    expect(nextState.activeQueue).toHaveLength(3);
    expect(nextState.originalQueue).toEqual(mockQueue);
  });

  it("deve alternar modo shuffle e restaurar a ordem original ao desativar", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1, mockTrack2, mockTrack3],
      originalQueue: [mockTrack1, mockTrack2, mockTrack3],
      currentTrack: mockTrack2,
      currentQueueIndex: 1,
      isShuffle: false,
    };

    // Ativa shuffle
    const shuffled = playerReducer(state, { type: "TOGGLE_SHUFFLE" });
    expect(shuffled.isShuffle).toBe(true);
    expect(shuffled.activeQueue[0].id).toBe("2"); // Música atual mantida na posição 0
    expect(shuffled.currentQueueIndex).toBe(0);

    // Desativa shuffle: restaura ordem da originalQueue
    const unshuffled = playerReducer(shuffled, { type: "TOGGLE_SHUFFLE" });
    expect(unshuffled.isShuffle).toBe(false);
    expect(unshuffled.activeQueue).toEqual(mockQueue);
    expect(unshuffled.currentQueueIndex).toBe(1); // Faixa 2 estava no índice 1 originalmente
  });

  it("deve remover faixa da fila e ajustar índice atual adequadamente", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1, mockTrack2, mockTrack3],
      originalQueue: [mockTrack1, mockTrack2, mockTrack3],
      currentTrack: mockTrack3,
      currentQueueIndex: 2,
    };

    // Remove a faixa anterior (índice 0) -> índice atual deve decrementar
    const nextState = playerReducer(state, {
      type: "REMOVE_FROM_QUEUE",
      payload: { index: 0 },
    });

    expect(nextState.activeQueue).toHaveLength(2);
    expect(nextState.currentQueueIndex).toBe(1);
    expect(nextState.currentTrack?.id).toBe("3");
  });

  it("deve ciclar os modos de repetição: off -> all -> one -> off", () => {
    let state = createInitialQueueState();
    expect(state.repeatMode).toBe("off");

    state = playerReducer(state, { type: "CYCLE_REPEAT_MODE" });
    expect(state.repeatMode).toBe("all");

    state = playerReducer(state, { type: "CYCLE_REPEAT_MODE" });
    expect(state.repeatMode).toBe("one");

    state = playerReducer(state, { type: "CYCLE_REPEAT_MODE" });
    expect(state.repeatMode).toBe("off");
  });

  it("deve anexar faixas de rádio sem duplicar faixas já existentes", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1, mockTrack2],
      originalQueue: [mockTrack1, mockTrack2],
      currentTrack: mockTrack1,
      currentQueueIndex: 0,
    };

    const nextState = playerReducer(state, {
      type: "APPEND_RADIO_TRACKS",
      payload: {
        tracks: [mockTrack2, mockTrack3], // mockTrack2 já existe
      },
    });

    expect(nextState.activeQueue).toHaveLength(3);
    expect(nextState.activeQueue.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("deve reordenar a fila via REORDER_QUEUE e manter o currentQueueIndex sincronizado com a faixa tocando", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1, mockTrack2, mockTrack3],
      originalQueue: [mockTrack1, mockTrack2, mockTrack3],
      currentTrack: mockTrack2,
      currentQueueIndex: 1,
    };

    // Move a faixa 3 (índice 2) para a posição da faixa 1 (índice 0)
    const reordered = playerReducer(state, {
      type: "REORDER_QUEUE",
      payload: { fromIndex: 2, toIndex: 0 },
    });

    // Nova ordem: [mockTrack3, mockTrack1, mockTrack2]
    expect(reordered.activeQueue.map((t) => t.id)).toEqual(["3", "1", "2"]);
    // A faixa 2 agora está no índice 2
    expect(reordered.currentQueueIndex).toBe(2);
    expect(reordered.currentTrack?.id).toBe("2");
  });

  it("não deve alterar o estado se os índices de REORDER_QUEUE forem inválidos ou iguais", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1, mockTrack2],
      originalQueue: [mockTrack1, mockTrack2],
      currentTrack: mockTrack1,
      currentQueueIndex: 0,
    };

    const same = playerReducer(state, {
      type: "REORDER_QUEUE",
      payload: { fromIndex: 0, toIndex: 0 },
    });
    expect(same).toBe(state);

    const outOfBounds = playerReducer(state, {
      type: "REORDER_QUEUE",
      payload: { fromIndex: 0, toIndex: 99 },
    });
    expect(outOfBounds).toBe(state);
  });

  it("deve adicionar múltiplas faixas ao final da fila com ADD_TRACKS_TO_END", () => {
    const state: QueueState = {
      ...createInitialQueueState(),
      activeQueue: [mockTrack1],
      originalQueue: [mockTrack1],
      currentTrack: mockTrack1,
      currentQueueIndex: 0,
    };

    const nextState = playerReducer(state, {
      type: "ADD_TRACKS_TO_END",
      payload: { tracks: [mockTrack2, mockTrack3] },
    });

    expect(nextState.activeQueue).toHaveLength(3);
    expect(nextState.activeQueue.map((t) => t.id)).toEqual(["1", "2", "3"]);
    expect(nextState.originalQueue.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("deve restaurar sessão salva ao inicializar quando há dados persistidos (Item 4.3)", () => {
    const savedSession = {
      currentTrack: mockTrack2,
      activeQueue: mockQueue,
      originalQueue: mockQueue,
      currentQueueIndex: 1,
      currentTime: 42,
      duration: 180,
      isShuffle: true,
      repeatMode: "all",
      isAutoplayRadio: false,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(savedSession));

    const state = createInitialQueueState();
    expect(state.currentTrack?.id).toBe("2");
    expect(state.activeQueue).toHaveLength(3);
    expect(state.currentQueueIndex).toBe(1);
    expect(state.isShuffle).toBe(true);
    expect(state.repeatMode).toBe("all");
    expect(state.isAutoplayRadio).toBe(false);
  });
});
