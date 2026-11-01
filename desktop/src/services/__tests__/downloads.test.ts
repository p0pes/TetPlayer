import { describe, it, expect, vi, beforeEach } from "vitest";
import { DownloadsService, DownloadedTrack, detectAudioMimeType } from "../downloads";
import { Track } from "../../types";

describe("DownloadsService (Reprodução Offline e Downloads)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockTrack: Track = {
    id: "test-offline-track",
    title: "Offline Song",
    artist: "Test Artist",
    artwork_url: "https://example.com/art.jpg",
    duration_seconds: 180,
  };

  it("deve reportar falso para faixas não baixadas", () => {
    expect(DownloadsService.isDownloaded("non-existent")).toBe(false);
    expect(DownloadsService.isDownloaded(null)).toBe(false);
    expect(DownloadsService.isDownloaded(undefined)).toBe(false);
  });

  it("deve gerenciar o ciclo de download e remoção com persistência", async () => {
    const mockRecord: DownloadedTrack = {
      video_id: mockTrack.id,
      title: mockTrack.title,
      artist: mockTrack.artist,
      artwork_url: mockTrack.artwork_url,
      duration_seconds: mockTrack.duration_seconds,
      file_path: "D:/music/test-offline-track.opus",
      file_size_bytes: 3500000,
      mime_type: "audio/webm; codecs=opus",
      downloaded_at: Date.now(),
    };

    // Mock invoke for download_track and delete_downloaded_track
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "download_track") return mockRecord;
      if (cmd === "delete_downloaded_track") return true;
      if (cmd === "get_downloaded_tracks") return [mockRecord];
      return null as any;
    });

    const res = await DownloadsService.downloadTrack(mockTrack);
    expect(res.video_id).toBe(mockTrack.id);
    expect(DownloadsService.isDownloaded(mockTrack.id)).toBe(true);

    const tracks = await DownloadsService.getDownloadedTracks();
    expect(tracks.length).toBe(1);
    expect(tracks[0].video_id).toBe(mockTrack.id);

    const removed = await DownloadsService.removeDownload(mockTrack.id);
    expect(removed).toBe(true);
    expect(DownloadsService.isDownloaded(mockTrack.id)).toBe(false);
  });

  it("deve notificar listeners registrados quando houver alterações", async () => {
    const listener = vi.fn();
    const unsub = DownloadsService.subscribe(listener);

    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "download_track") {
        return {
          video_id: "track-listen",
          title: "Listen",
          artist: "Artist",
          file_path: "",
          file_size_bytes: 100,
          mime_type: "audio/webm",
          downloaded_at: 0,
        };
      }
      return true as any;
    });

    await DownloadsService.downloadTrack({ ...mockTrack, id: "track-listen" });
    expect(listener).toHaveBeenCalled();

    unsub();
  });
  describe("detectAudioMimeType (Identificação Dinâmica de Codecs por Magic Bytes)", () => {
    it("deve detectar container WebM / Opus a partir dos magic bytes EBML", () => {
      const buffer = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]).buffer;
      expect(detectAudioMimeType(buffer)).toBe("audio/webm; codecs=opus");
    });

    it("deve detectar container MP4 / M4A / AAC a partir do átomo ftyp", () => {
      const buffer = new Uint8Array([
        0x00, 0x00, 0x00, 0x20, // box size
        0x66, 0x74, 0x79, 0x70, // 'f' 't' 'y' 'p'
        0x4d, 0x34, 0x41, 0x20, // 'M' '4' 'A' ' '
      ]).buffer;
      expect(detectAudioMimeType(buffer)).toBe("audio/mp4; codecs=mp4a.40.2");
    });

    it("deve detectar container OGG a partir da assinatura OggS", () => {
      const buffer = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00]).buffer;
      expect(detectAudioMimeType(buffer)).toBe("audio/ogg; codecs=opus");
    });

    it("deve detectar stream MP3 com tag ID3", () => {
      const buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00]).buffer;
      expect(detectAudioMimeType(buffer)).toBe("audio/mpeg");
    });

    it("deve respeitar fallback se fornecido quando os bytes forem genéricos", () => {
      const emptyBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]).buffer;
      expect(detectAudioMimeType(emptyBuffer, "audio/flac")).toBe("audio/flac");
      expect(detectAudioMimeType(emptyBuffer)).toBe("audio/webm; codecs=opus");
    });
  });

});
