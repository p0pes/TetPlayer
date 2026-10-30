import { describe, it, expect, beforeEach, vi } from "vitest";
import { LikesService } from "../likes";
import { Track } from "../../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe("LikesService (Curtir / Descurtir Faixas)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset internal liked IDs
    (LikesService as any).syncLikedTracks([]);
  });

  const mockTrack: Track = {
    id: "track-123",
    title: "Miku Song",
    artist: "Hatsune Miku",
  };

  it("retorna false para faixas que não foram curtidas", () => {
    expect(LikesService.isLiked("track-123")).toBe(false);
    expect(LikesService.isLiked(undefined)).toBe(false);
  });

  it("permite curtir e descurtir uma faixa com atualização otimista de 0ms", async () => {
    const isNowLiked = await LikesService.toggleLike(mockTrack);
    expect(isNowLiked).toBe(true);
    expect(LikesService.isLiked("track-123")).toBe(true);

    const isUnliked = await LikesService.toggleLike(mockTrack);
    expect(isUnliked).toBe(false);
    expect(LikesService.isLiked("track-123")).toBe(false);
  });

  it("sincroniza lista em lote de músicas curtidas (VLLM)", () => {
    const batch: Track[] = [
      { id: "v1", title: "T1", artist: "A1" },
      { id: "v2", title: "T2", artist: "A2" },
    ];
    LikesService.syncLikedTracks(batch);
    expect(LikesService.isLiked("v1")).toBe(true);
    expect(LikesService.isLiked("v2")).toBe(true);
    expect(LikesService.isLiked("v3")).toBe(false);
  });

  it("notifica assinantes quando o status de curtida muda", async () => {
    const listener = vi.fn();
    const unsub = LikesService.subscribe(listener);

    await LikesService.toggleLike(mockTrack);
    expect(listener).toHaveBeenCalled();

    unsub();
  });
});
