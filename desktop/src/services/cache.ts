import { invoke } from "@tauri-apps/api/core";
import { Playlist, Track, Album, AlbumDetail, ArtistDetail } from "../types";
import { clearLyricsCache } from "../hooks/useLyrics";

const PLAYLISTS_CACHE_KEY = "tetplayer_cache_playlists";
const PLAYLIST_TRACKS_CACHE_PREFIX = "tetplayer_cache_tracks_";
const PLAYLISTS_LRU_KEY = "tetplayer_cache_playlist_lru";
const MAX_CACHED_PLAYLISTS = 25;

const ALBUMS_CACHE_KEY = "tetplayer_cache_albums";
const ALBUM_DETAIL_CACHE_PREFIX = "tetplayer_cache_album_";
const ALBUMS_LRU_KEY = "tetplayer_cache_album_lru";
const MAX_CACHED_ALBUMS = 25;

function getAlbumLruList(): string[] {
  try {
    const data = localStorage.getItem(ALBUMS_LRU_KEY);
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

function saveAlbumLruList(list: string[]): void {
  try {
    localStorage.setItem(ALBUMS_LRU_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function touchAlbumLru(albumId: string): void {
  const list = getAlbumLruList().filter((id) => id !== albumId);
  list.unshift(albumId);

  while (list.length > MAX_CACHED_ALBUMS) {
    const evictedId = list.pop();
    if (evictedId) {
      try {
        localStorage.removeItem(`${ALBUM_DETAIL_CACHE_PREFIX}${evictedId}`);
      } catch {
        // ignore
      }
    }
  }

  saveAlbumLruList(list);
}

function getLruList(): string[] {
  try {
    const data = localStorage.getItem(PLAYLISTS_LRU_KEY);
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

function saveLruList(list: string[]): void {
  try {
    localStorage.setItem(PLAYLISTS_LRU_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function touchPlaylistLru(playlistId: string): void {
  const list = getLruList().filter((id) => id !== playlistId);
  list.unshift(playlistId);

  // Evicção das playlists que excedem o teto máximo permitido no localStorage
  while (list.length > MAX_CACHED_PLAYLISTS) {
    const evictedId = list.pop();
    if (evictedId) {
      try {
        localStorage.removeItem(`${PLAYLIST_TRACKS_CACHE_PREFIX}${evictedId}`);
      } catch {
        // ignore
      }
    }
  }

  saveLruList(list);
}

export const LocalCacheService = {
  // Salvar diretamente na tabela app_cache do SQLite nativo
  async saveToDbCache(key: string, value: string): Promise<void> {
    try {
      await invoke("save_to_db_cache", { key, value });
    } catch (err) {
      // Fallback silencioso em ambiente sem Tauri backend
      console.warn("Falha ao salvar no cache SQLite:", err);
    }
  },

  // Obter valor diretamente da tabela app_cache do SQLite nativo
  async getFromDbCache(key: string): Promise<string | null> {
    try {
      return await invoke<string | null>("get_from_db_cache", { key });
    } catch {
      return null;
    }
  },

  // Deletar chave do cache SQLite
  async deleteFromDbCache(key: string): Promise<void> {
    try {
      await invoke("delete_from_db_cache", { key });
    } catch {
      // ignore
    }
  },

  // Obter playlists salvas no cache local (0ms instant loading síncrono)
  getCachedPlaylists(): Playlist[] | null {
    try {
      const data = localStorage.getItem(PLAYLISTS_CACHE_KEY);
      if (!data) return null;
      return JSON.parse(data) as Playlist[];
    } catch {
      return null;
    }
  },

  // Persistir playlists no cache local e espelhar no SQLite nativo
  saveCachedPlaylists(playlists: Playlist[]): void {
    const serialized = JSON.stringify(playlists);
    try {
      localStorage.setItem(PLAYLISTS_CACHE_KEY, serialized);
    } catch {
      // quota or private browsing fallback
    }
    // Espelha assincronamente no SQLite para persistência definitiva
    this.saveToDbCache(PLAYLISTS_CACHE_KEY, serialized).catch(() => {});
  },

  // Obter faixas em cache de uma playlist específica (0ms instant display síncrono)
  getCachedPlaylistTracks(playlistId: string): Track[] | null {
    try {
      const data = localStorage.getItem(`${PLAYLIST_TRACKS_CACHE_PREFIX}${playlistId}`);
      if (!data) return null;
      touchPlaylistLru(playlistId);
      return JSON.parse(data) as Track[];
    } catch {
      return null;
    }
  },

  // Salvar faixas de uma playlist no cache local com política de evicção LRU e espelhamento no SQLite
  saveCachedPlaylistTracks(playlistId: string, tracks: Track[]): void {
    const cacheKey = `${PLAYLIST_TRACKS_CACHE_PREFIX}${playlistId}`;
    const serialized = JSON.stringify(tracks);

    try {
      touchPlaylistLru(playlistId);
      localStorage.setItem(cacheKey, serialized);
    } catch {
      // Em caso de cota excedida no localStorage, poda forçada das 5 playlists mais antigas
      try {
        const list = getLruList();
        const toEvict = list.splice(Math.max(0, list.length - 5), 5);
        for (const evictedId of toEvict) {
          localStorage.removeItem(`${PLAYLIST_TRACKS_CACHE_PREFIX}${evictedId}`);
        }
        saveLruList(list);
        localStorage.setItem(cacheKey, serialized);
      } catch {
        // quota fallback silencioso
      }
    }

    // Persiste no SQLite com capacidade irrestrita
    this.saveToDbCache(cacheKey, serialized).catch(() => {});
  },

  // Obter álbuns salvos no cache local (0ms instant loading síncrono)
  getCachedAlbums(): Album[] | null {
    try {
      const data = localStorage.getItem(ALBUMS_CACHE_KEY);
      if (!data) return null;
      return JSON.parse(data) as Album[];
    } catch {
      return null;
    }
  },

  // Persistir álbuns no cache local e espelhar no SQLite nativo
  saveCachedAlbums(albums: Album[]): void {
    const serialized = JSON.stringify(albums);
    try {
      localStorage.setItem(ALBUMS_CACHE_KEY, serialized);
    } catch {
      // quota fallback
    }
    this.saveToDbCache(ALBUMS_CACHE_KEY, serialized).catch(() => {});
  },

  // Obter detalhes de um álbum em cache (0ms instant display síncrono)
  getCachedAlbumDetail(albumId: string): AlbumDetail | null {
    try {
      const data = localStorage.getItem(`${ALBUM_DETAIL_CACHE_PREFIX}${albumId}`);
      if (!data) return null;
      touchAlbumLru(albumId);
      return JSON.parse(data) as AlbumDetail;
    } catch {
      return null;
    }
  },

  // Salvar detalhes de um álbum no cache local com política de evicção LRU e espelhamento no SQLite
  saveCachedAlbumDetail(albumId: string, detail: AlbumDetail): void {
    const cacheKey = `${ALBUM_DETAIL_CACHE_PREFIX}${albumId}`;
    const serialized = JSON.stringify(detail);

    try {
      touchAlbumLru(albumId);
      localStorage.setItem(cacheKey, serialized);
    } catch {
      try {
        const list = getAlbumLruList();
        const toEvict = list.splice(Math.max(0, list.length - 5), 5);
        for (const evictedId of toEvict) {
          localStorage.removeItem(`${ALBUM_DETAIL_CACHE_PREFIX}${evictedId}`);
        }
        saveAlbumLruList(list);
        localStorage.setItem(cacheKey, serialized);
      } catch {
        // quota fallback
      }
    }

    this.saveToDbCache(cacheKey, serialized).catch(() => {});
  },

  // Inicialização e hidratação do cache a partir do SQLite nativo (#83)
  getCachedArtistDetail(artistKey: string): ArtistDetail | null {
    try {
      const data = localStorage.getItem(`tetplayer_cache_artist_${artistKey}`);
      if (!data) return null;
      return JSON.parse(data) as ArtistDetail;
    } catch {
      return null;
    }
  },

  saveCachedArtistDetail(artistKey: string, detail: ArtistDetail): void {
    const cacheKey = `tetplayer_cache_artist_${artistKey}`;
    const serialized = JSON.stringify(detail);
    try {
      localStorage.setItem(cacheKey, serialized);
    } catch {
      // quota fallback
    }
    this.saveToDbCache(cacheKey, serialized).catch(() => {});
  },

  async initDbCache(): Promise<void> {
    try {
      if (!localStorage.getItem(PLAYLISTS_CACHE_KEY)) {
        const dbData = await this.getFromDbCache(PLAYLISTS_CACHE_KEY);
        if (dbData) {
          localStorage.setItem(PLAYLISTS_CACHE_KEY, dbData);
        }
      }
      if (!localStorage.getItem(ALBUMS_CACHE_KEY)) {
        const dbAlbums = await this.getFromDbCache(ALBUMS_CACHE_KEY);
        if (dbAlbums) {
          localStorage.setItem(ALBUMS_CACHE_KEY, dbAlbums);
        }
      }
    } catch {
      // ignore
    }
  },

  // Estimar tamanho total ocupado pelo cache de playlists e faixas
  getEstimatedCacheSize(): string {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("tetplayer_cache_") || key.startsWith("tetplayer_palette_"))) {
          const val = localStorage.getItem(key) || "";
          totalBytes += (key.length + val.length) * 2; // UTF-16 approx
        }
      }

      if (totalBytes < 1024) return `${totalBytes} B`;
      if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return "0 KB";
    }
  },

  // Limpeza de cache temporário (preserva histórico de reprodução e playlists fixadas)
  async clearCache(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("tetplayer_cache_") || key.startsWith("tetplayer_palette_"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });
      saveLruList([]);
      saveAlbumLruList([]);

      // Limpa cache na tabela app_cache do SQLite nativo
      try {
        await invoke("clear_all_db_cache");
      } catch (err) {
        console.warn("Falha ao limpar cache SQLite nativo:", err);
      }

      // Limpa cache em memória de letras sincronizadas
      try {
        clearLyricsCache();
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn("Erro ao limpar cache local:", err);
    }
  },
};


