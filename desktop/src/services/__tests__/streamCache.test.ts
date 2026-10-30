import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchStreamInfoCached, prefetchStreamInfo, clearStreamCache } from "../streamCache";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("StreamCache (Cache e Prefetch Instantâneo de Streams)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStreamCache();
  });

  it("deve buscar e cachear stream com sucesso", async () => {
    const mockStream = {
      video_id: "vid1",
      title: "Song 1",
      artist: "Artist 1",
      stream_url: "https://example.com/audio.opus",
    };
    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockStream);

    const first = await fetchStreamInfoCached("vid1");
    expect(first).toEqual(mockStream);
    expect(invoke).toHaveBeenCalledTimes(1);

    // Segunda chamada deve resolver via cache sem disparar IPC novamente
    const second = await fetchStreamInfoCached("vid1");
    expect(second).toEqual(mockStream);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("deve respeitar timeout e cair para null quando a rede atrasar", async () => {
    (invoke as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    const res = await fetchStreamInfoCached("slow_vid", 50);
    expect(res).toBeNull();
  });

  it("deve disparar prefetch em background sem lançar exceções", () => {
    (invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(() => prefetchStreamInfo("next_track_vid")).not.toThrow();
    expect(invoke).toHaveBeenCalledWith("get_stream_info", { videoId: "next_track_vid" });
  });
});
