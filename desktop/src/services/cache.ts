import { Playlist, Track } from "../types";

const PLAYLISTS_CACHE_KEY = "tetplayer_cache_playlists";
const PLAYLIST_TRACKS_CACHE_PREFIX = "tetplayer_cache_tracks_";

export const LocalCacheService = {
  // Obter playlists salvas no cache local (0ms instant loading)
  getCachedPlaylists(): Playlist[] | null {
    try {
      const data = localStorage.getItem(PLAYLISTS_CACHE_KEY);
      if (!data) return null;
      return JSON.parse(data) as Playlist[];
    } catch {
      return null;
    }
  },

  // Persistir playlists no cache local
  saveCachedPlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify(playlists));
    } catch {
      // quota or private browsing fallback
    }
  },

  // Obter faixas em cache de uma playlist específica (0ms instant display)
  getCachedPlaylistTracks(playlistId: string): Track[] | null {
    try {
      const data = localStorage.getItem(`${PLAYLIST_TRACKS_CACHE_PREFIX}${playlistId}`);
      if (!data) return null;
      return JSON.parse(data) as Track[];
    } catch {
      return null;
    }
  },

  // Salvar faixas de uma playlist no cache local
  saveCachedPlaylistTracks(playlistId: string, tracks: Track[]): void {
    try {
      localStorage.setItem(`${PLAYLIST_TRACKS_CACHE_PREFIX}${playlistId}`, JSON.stringify(tracks));
    } catch {
      // ignore
    }
  },
};
