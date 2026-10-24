import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalCacheService } from "../cache";
import { Playlist, Track } from "../../types";

describe("LocalCacheService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockPlaylist: Playlist = {
    id: "pl_test_1",
    title: "Minha Playlist Favorita",
    subtitle: "TetPlayer User",
    track_count: "2 faixas",
  };

  const mockTracks: Track[] = [
    {
      id: "trk_1",
      title: "Musica 1",
      artist: "Artista 1",
      duration: "3:30",
    },
    {
      id: "trk_2",
      title: "Musica 2",
      artist: "Artista 2",
      duration: "4:15",
    },
  ];

  it("deve salvar e recuperar playlists no cache local", () => {
    expect(LocalCacheService.getCachedPlaylists()).toBeNull();
    LocalCacheService.saveCachedPlaylists([mockPlaylist]);
    const cached = LocalCacheService.getCachedPlaylists();
    expect(cached).toHaveLength(1);
    expect(cached?.[0].title).toBe("Minha Playlist Favorita");
  });

  it("deve salvar e recuperar faixas de uma playlist específica", () => {
    expect(LocalCacheService.getCachedPlaylistTracks("pl_test_1")).toBeNull();
    LocalCacheService.saveCachedPlaylistTracks("pl_test_1", mockTracks);
    const cachedTracks = LocalCacheService.getCachedPlaylistTracks("pl_test_1");
    expect(cachedTracks).toHaveLength(2);
    expect(cachedTracks?.[0].title).toBe("Musica 1");
    expect(cachedTracks?.[1].title).toBe("Musica 2");
  });

  it("deve aplicar política LRU e expurgar a playlist mais antiga ao exceder o teto de 25", () => {
    // Insere 26 playlists para forçar evicção
    for (let i = 1; i <= 26; i++) {
      LocalCacheService.saveCachedPlaylistTracks(`pl_${i}`, [
        {
          id: `t_${i}`,
          title: `Track ${i}`,
          artist: "Artist",
        },
      ]);
    }

    // A primeira salva (pl_1) deve ter sido expurgada do cache local
    expect(LocalCacheService.getCachedPlaylistTracks("pl_1")).toBeNull();

    // A mais recente (pl_26) deve continuar presente
    expect(LocalCacheService.getCachedPlaylistTracks("pl_26")).not.toBeNull();
  });

  it("deve retornar null em caso de JSON corrompido no localStorage", () => {
    localStorage.setItem("tetplayer_cache_playlists", "invalid_json{{{");
    expect(LocalCacheService.getCachedPlaylists()).toBeNull();
  });
});
