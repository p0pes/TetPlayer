
/**
 * Detecta o MIME type de áudio com base nos magic bytes do cabeçalho binário,
 * garantindo compatibilidade estrita com containers WebM/Opus, MP4/M4A/AAC, OGG e MP3.
 */
export function detectAudioMimeType(bytes: ArrayBuffer, fallbackMime?: string): string {
  if (bytes && bytes.byteLength >= 8) {
    const u8 = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 32));

    // WebM / EBML: 0x1A 0x45 0xDF 0xA3
    if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) {
      return "audio/webm; codecs=opus";
    }

    // MP4 / M4A: contém 'ftyp' nos bytes 4 a 7 (ex: 'ftypM4A ', 'ftypmp42', 'ftypisom')
    if (
      u8[4] === 0x66 && // 'f'
      u8[5] === 0x74 && // 't'
      u8[6] === 0x79 && // 'y'
      u8[7] === 0x70    // 'p'
    ) {
      return "audio/mp4; codecs=mp4a.40.2";
    }

    // Ogg: 'OggS' (0x4F 0x67 0x67 0x53)
    if (u8[0] === 0x4f && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) {
      return "audio/ogg; codecs=opus";
    }

    // MP3: Cabeçalho ID3 ou sync word MPEG (0xFF 0xFB / 0xF3 / 0xF2)
    if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
      return "audio/mpeg";
    }
    if (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) {
      return "audio/mpeg";
    }

    // FLAC: 'fLaC' (0x66 0x4C 0x61 0x43)
    if (u8[0] === 0x66 && u8[1] === 0x4c && u8[2] === 0x61 && u8[3] === 0x43) {
      return "audio/flac";
    }
  }

  if (fallbackMime && fallbackMime.startsWith("audio/")) {
    return fallbackMime;
  }

  return "audio/webm; codecs=opus";
}

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect, useCallback } from "react";
import { Track } from "../types";
import { LocalCacheService } from "./cache";

export interface DownloadedTrack {
  video_id: string;
  title: string;
  artist: string;
  artwork_url?: string;
  duration_seconds?: number;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  downloaded_at: number;
}

export interface PlaylistDownloadBatch {
  playlistId: string;
  total: number;
  completed: number;
  failed: number;
  currentTrackTitle?: string;
  currentTrackIndex?: number;
  abortController: AbortController;
}

export interface DownloadProgressPayload {
  video_id: string;
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
  status: "downloading" | "completed" | "error";
}

const STORAGE_KEY = "tetplayer_downloaded_track_ids";
const EVENT_NAME = "tetplayer:downloads-updated";

type DownloadsListener = () => void;
const listeners = new Set<DownloadsListener>();

function loadInitialDownloadedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

let downloadedIds: Set<string> = loadInitialDownloadedIds();
const activeProgress = new Map<string, number>();
const activePlaylistBatches = new Map<string, PlaylistDownloadBatch>();

const DOWNLOADED_COLLECTIONS_KEY = "tetplayer_downloaded_collection_ids";

function loadInitialDownloadedCollectionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DOWNLOADED_COLLECTIONS_KEY);
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

let downloadedCollectionIds: Set<string> = loadInitialDownloadedCollectionIds();

function saveDownloadedCollectionIds(ids: Set<string>) {
  try {
    localStorage.setItem(DOWNLOADED_COLLECTIONS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

const MAX_CACHED_BLOB_URLS = 4;
const offlineBlobUrls = new Map<string, string>();

function saveDownloadedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // ignore
    }
  }
}

// Inicializa escuta de eventos nativos do Tauri para progresso em segundo plano
let isInitialized = false;

export const DownloadsService = {
  async init(): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;

    try {
      const serverRecords = await invoke<DownloadedTrack[]>("get_downloaded_tracks");
      if (Array.isArray(serverRecords)) {
        downloadedIds = new Set(serverRecords.map((r) => r.video_id));
        saveDownloadedIds(downloadedIds);
        notify();
      }
    } catch (err) {
      console.warn("[DownloadsService] Falha ao sincronizar lista de downloads do SQLite:", err);
    }

    try {
      await listen<DownloadProgressPayload>("download-progress", (event) => {
        const payload = event.payload;
        if (!payload || !payload.video_id) return;

        if (payload.status === "completed" || payload.percent >= 100) {
          activeProgress.delete(payload.video_id);
          downloadedIds.add(payload.video_id);
          saveDownloadedIds(downloadedIds);
          notify();
        } else if (payload.status === "downloading") {
          activeProgress.set(payload.video_id, payload.percent);
          notify();
        } else if (payload.status === "error") {
          activeProgress.delete(payload.video_id);
          notify();
        }
      });
    } catch {
      // ignore em ambiente fora do Tauri (ex: testes jsdom)
    }
  },

  isDownloaded(videoId?: string | null): boolean {
    if (!videoId) return false;
    return downloadedIds.has(videoId);
  },

  isDownloading(videoId?: string | null): boolean {
    if (!videoId) return false;
    return activeProgress.has(videoId);
  },

  getProgress(videoId?: string | null): number {
    if (!videoId) return 0;
    return activeProgress.get(videoId) ?? 0;
  },

  async downloadTrack(track: Track): Promise<DownloadedTrack> {
    if (!track || !track.id) {
      throw new Error("Faixa inválida para download.");
    }

    activeProgress.set(track.id, 10);
    notify();

    try {
      const record = await invoke<DownloadedTrack>("download_track", {
        track: {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album || null,
          duration_seconds: track.duration_seconds || null,
          artwork_url: track.artwork_url || null,
        },
      });

      downloadedIds.add(track.id);
      saveDownloadedIds(downloadedIds);
      activeProgress.delete(track.id);
      notify();
      return record;
    } catch (err) {
      activeProgress.delete(track.id);
      notify();
      throw err;
    }
  },

  async removeDownload(videoId: string): Promise<boolean> {
    if (!videoId) return false;

    // Revoga blob URL em memória se existir
    const existingBlobUrl = offlineBlobUrls.get(videoId);
    if (existingBlobUrl) {
      try {
        URL.revokeObjectURL(existingBlobUrl);
      } catch {
        // ignore
      }
      offlineBlobUrls.delete(videoId);
    }

    downloadedIds.delete(videoId);
    saveDownloadedIds(downloadedIds);
    activeProgress.delete(videoId);
    notify();

    try {
      const success = await invoke<boolean>("delete_downloaded_track", { videoId });
      return success;
    } catch (err) {
      console.warn(`[DownloadsService] Erro ao excluir faixa offline ${videoId}:`, err);
      return false;
    }
  },

  async getDownloadedTracks(): Promise<DownloadedTrack[]> {
    try {
      const list = await invoke<DownloadedTrack[]>("get_downloaded_tracks");
      if (Array.isArray(list)) {
        downloadedIds = new Set(list.map((r) => r.video_id));
        saveDownloadedIds(downloadedIds);
        return list;
      }
      return [];
    } catch (err) {
      console.warn("[DownloadsService] Falha ao listar faixas baixadas:", err);
      return [];
    }
  },

  async getOfflineAudioUrl(videoId: string): Promise<string | null> {
    if (!videoId) return null;

    if (offlineBlobUrls.has(videoId)) {
      const url = offlineBlobUrls.get(videoId)!;
      // Reordena no Map para manter o padrão LRU (mais recente no final)
      offlineBlobUrls.delete(videoId);
      offlineBlobUrls.set(videoId, url);
      return url;
    }

    try {
      const bytes = await invoke<ArrayBuffer>("read_offline_track", { videoId });
      if (!bytes || bytes.byteLength === 0) return null;

      // Política de Despejo LRU: Limita o cache em memória a 4 URLs ativas (< 50MB de RAM - Item 117)
      if (offlineBlobUrls.size >= MAX_CACHED_BLOB_URLS) {
        const oldestKey = offlineBlobUrls.keys().next().value;
        if (oldestKey) {
          const oldestUrl = offlineBlobUrls.get(oldestKey);
          if (oldestUrl) {
            try {
              URL.revokeObjectURL(oldestUrl);
            } catch {
              // ignore
            }
          }
          offlineBlobUrls.delete(oldestKey);
        }
      }

      const mimeType = detectAudioMimeType(bytes);
      const blob = new Blob([bytes], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      offlineBlobUrls.set(videoId, objectUrl);
      return objectUrl;
    } catch (err) {
      console.warn(`[DownloadsService] Erro ao carregar áudio offline para ${videoId}:`, err);
      return null;
    }
  },

  revokeOfflineAudioUrl(videoId: string): void {
    const url = offlineBlobUrls.get(videoId);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      offlineBlobUrls.delete(videoId);
    }
  },

  isPlaylistDownloaded(collectionId?: string | null): boolean {
    if (!collectionId) return false;
    return Boolean(downloadedCollectionIds?.has?.(collectionId));
  },

  isPlaylistDownloading(playlistId?: string | null): boolean {
    if (!playlistId) return false;
    return activePlaylistBatches.has(playlistId);
  },

  getPlaylistBatch(playlistId?: string | null): PlaylistDownloadBatch | undefined {
    if (!playlistId) return undefined;
    return activePlaylistBatches.get(playlistId);
  },

  getPlaylistDownloadStats(
    tracks: Track[] = [],
    _playlistId?: string | null
  ): {
    total: number;
    downloaded: number;
    percent: number;
    isAllDownloaded: boolean;
  } {
    if (!tracks || tracks.length === 0) {
      return { total: 0, downloaded: 0, percent: 0, isAllDownloaded: false };
    }
    const total = tracks.length;
    let downloaded = 0;
    for (const t of tracks) {
      if (t?.id && downloadedIds.has(t.id)) {
        downloaded++;
      }
    }
    const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    const isAllDownloaded = total > 0 && downloaded === total;
    return { total, downloaded, percent, isAllDownloaded };
  },

  async downloadPlaylist(
    playlistId: string,
    tracks: Track[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ completed: number; failed: number }> {
    if (!playlistId || !tracks || tracks.length === 0) {
      return { completed: 0, failed: 0 };
    }

    if (activePlaylistBatches.has(playlistId)) {
      return { completed: 0, failed: 0 };
    }

    const toDownload = tracks.filter((t) => t?.id && !downloadedIds.has(t.id));
    if (toDownload.length === 0) {
      downloadedCollectionIds.add(playlistId);
      saveDownloadedCollectionIds(downloadedCollectionIds);
      try {
        LocalCacheService.saveCachedPlaylistTracks(playlistId, tracks);
      } catch {
        // ignore
      }
      notify();
      return { completed: tracks.length, failed: 0 };
    }

    const abortController = new AbortController();
    const batch: PlaylistDownloadBatch = {
      playlistId,
      total: toDownload.length,
      completed: 0,
      failed: 0,
      abortController,
    };
    activePlaylistBatches.set(playlistId, batch);
    notify();

    try {
      for (let i = 0; i < toDownload.length; i++) {
        const track = toDownload[i];
        if (abortController.signal.aborted) {
          break;
        }

        batch.currentTrackTitle = track.title;
        batch.currentTrackIndex = i + 1;
        notify();

        try {
          await this.downloadTrack(track);
          batch.completed++;
        } catch (err) {
          console.warn(`[DownloadsService] Falha ao baixar faixa '${track.title}' (${track.id}) da playlist:`, err);
          batch.failed++;
        }

        notify();
        if (onProgress) {
          onProgress(batch.completed, batch.total);
        }

        // Intervalo defensivo de 50ms para ceder a fila de microtarefas e evitar starvation
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      activePlaylistBatches.delete(playlistId);
      const allDownloaded = tracks.length > 0 && tracks.every((t) => t?.id && downloadedIds.has(t.id));
      if (allDownloaded) {
        downloadedCollectionIds.add(playlistId);
        saveDownloadedCollectionIds(downloadedCollectionIds);
      } else {
        downloadedCollectionIds.delete(playlistId);
        saveDownloadedCollectionIds(downloadedCollectionIds);
      }
      if (allDownloaded || batch.completed > 0) {
        try {
          LocalCacheService.saveCachedPlaylistTracks(playlistId, tracks);
        } catch {
          // ignore
        }
      }
      notify();
    }

    return { completed: batch.completed, failed: batch.failed };
  },

  cancelPlaylistDownload(playlistId: string): void {
    const batch = activePlaylistBatches.get(playlistId);
    if (batch) {
      batch.abortController.abort();
      activePlaylistBatches.delete(playlistId);
      notify();
    }
  },

  async removePlaylistDownloads(tracks: Track[], playlistId?: string): Promise<number> {
    if (playlistId) {
      downloadedCollectionIds.delete(playlistId);
      saveDownloadedCollectionIds(downloadedCollectionIds);
    }
    if (!tracks || tracks.length === 0) {
      notify();
      return 0;
    }

    // Protege faixas que também pertencem a outras coleções baixadas offline quando playlistId é informado
    const sharedTrackIds = new Set<string>();
    if (playlistId) {
      try {
        for (const otherId of downloadedCollectionIds) {
          if (otherId === playlistId) continue;
          const otherPlTracks = LocalCacheService.getCachedPlaylistTracks(otherId);
          if (otherPlTracks) {
            for (const t of otherPlTracks) {
              if (t?.id) sharedTrackIds.add(t.id);
            }
          }
          const otherAlDetail = LocalCacheService.getCachedAlbumDetail(otherId);
          if (otherAlDetail?.tracks) {
            for (const t of otherAlDetail.tracks) {
              if (t?.id) sharedTrackIds.add(t.id);
            }
          }
        }
      } catch {
        // ignore
      }
    }

    let removed = 0;
    for (const track of tracks) {
      if (track?.id && downloadedIds.has(track.id) && !sharedTrackIds.has(track.id)) {
        const ok = await this.removeDownload(track.id);
        if (ok) removed++;
      }
    }
    notify();
    return removed;
  },

  subscribe(listener: DownloadsListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Auto-inicializa na importação
if (typeof window !== "undefined") {
  DownloadsService.init();
}

export function useTrackDownload(track?: Track | null) {
  const videoId = track?.id;
  const [isDownloaded, setIsDownloaded] = useState(() => DownloadsService.isDownloaded(videoId));
  const [isDownloading, setIsDownloading] = useState(() => DownloadsService.isDownloading(videoId));
  const [progress, setProgress] = useState(() => DownloadsService.getProgress(videoId));

  useEffect(() => {
    setIsDownloaded(DownloadsService.isDownloaded(videoId));
    setIsDownloading(DownloadsService.isDownloading(videoId));
    setProgress(DownloadsService.getProgress(videoId));

    return DownloadsService.subscribe(() => {
      setIsDownloaded(DownloadsService.isDownloaded(videoId));
      setIsDownloading(DownloadsService.isDownloading(videoId));
      setProgress(DownloadsService.getProgress(videoId));
    });
  }, [videoId]);

  const toggleDownload = useCallback(async () => {
    if (!track || !track.id) return;
    if (isDownloading) return;

    if (isDownloaded) {
      await DownloadsService.removeDownload(track.id);
    } else {
      await DownloadsService.downloadTrack(track);
    }
  }, [track, isDownloaded, isDownloading]);

  return {
    isDownloaded,
    isDownloading,
    progress,
    toggleDownload,
  };
}

export function usePlaylistDownload(playlistId?: string | null, tracks: Track[] = []) {
  const [stats, setStats] = useState(() => DownloadsService.getPlaylistDownloadStats(tracks, playlistId));
  const [isDownloading, setIsDownloading] = useState(() => DownloadsService.isPlaylistDownloading(playlistId));
  const [batchInfo, setBatchInfo] = useState(() => DownloadsService.getPlaylistBatch(playlistId));

  useEffect(() => {
    const update = () => {
      setStats(DownloadsService.getPlaylistDownloadStats(tracks, playlistId));
      setIsDownloading(DownloadsService.isPlaylistDownloading(playlistId));
      setBatchInfo(DownloadsService.getPlaylistBatch(playlistId));
    };

    update();
    return DownloadsService.subscribe(update);
  }, [playlistId, tracks]);

  const startDownload = useCallback(async () => {
    if (!playlistId || tracks.length === 0) return { completed: 0, failed: 0 };
    return await DownloadsService.downloadPlaylist(playlistId, tracks);
  }, [playlistId, tracks]);

  const cancelDownload = useCallback(() => {
    if (!playlistId) return;
    DownloadsService.cancelPlaylistDownload(playlistId);
  }, [playlistId]);

  const removeDownloads = useCallback(async () => {
    if (!tracks || tracks.length === 0) return 0;
    return await DownloadsService.removePlaylistDownloads(tracks, playlistId || undefined);
  }, [tracks, playlistId]);

  return {
    ...stats,
    isDownloading,
    batchInfo,
    startDownload,
    cancelDownload,
    removeDownloads,
  };
}
