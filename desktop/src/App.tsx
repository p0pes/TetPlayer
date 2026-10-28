import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AlertCircle, AlertTriangle, ListMusic, Disc3 } from "lucide-react";
import { Playlist, Track, AuthSession, ActiveTab, Album, AlbumDetail } from "./types";
import { LocalCacheService } from "./services/cache";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { PlaylistGridView } from "./components/MainView/PlaylistGridView";
import { PlaylistDetailView } from "./components/MainView/PlaylistDetailView";
import { AlbumGridView } from "./components/MainView/AlbumGridView";
import { AlbumDetailView } from "./components/MainView/AlbumDetailView";
import { SearchView } from "./components/MainView/SearchView";
import { StatsView } from "./components/StatsView/StatsView";
import { PlayerBar } from "./components/Player/PlayerBar";
import { NowPlayingDrawer } from "./components/NowPlayingDrawer/NowPlayingDrawer";
import { MiniPlayer } from "./components/MiniPlayer/MiniPlayer";
import { UpdateInfo, checkForAppUpdates } from "./services/updater";
import { UpdateModal } from "./components/UpdateModal/UpdateModal";
import { SettingsModal } from "./components/SettingsModal/SettingsModal";
import { SettingsService } from "./services/settings";
import { PerformanceTelemetry } from "./services/telemetry";

export default function App() {
  useEffect(() => {
    // Revela a janela apenas quando a interface inicial já estiver montada
    invoke("show_main_window").catch(() => {});

    if (import.meta.env.DEV) {
      PerformanceTelemetry.start();
      return () => PerformanceTelemetry.stop();
    }
  }, []);

  const [playlistHistory, setPlaylistHistory] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_playlist_history");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function markPlaylistListened(playlistId?: string) {
    if (!playlistId) return;
    setPlaylistHistory((prev) => {
      const updated = { ...prev, [playlistId]: Date.now() };
      try {
        localStorage.setItem("tetplayer_playlist_history", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  return (
    <PlayerProvider onMarkPlaylistListened={markPlaylistListened}>
      <AppContent
        playlistHistory={playlistHistory}
        markPlaylistListened={markPlaylistListened}
      />
    </PlayerProvider>
  );
}

interface AppContentProps {
  playlistHistory: Record<string, number>;
  markPlaylistListened: (playlistId?: string) => void;
}

function AppContent({ playlistHistory, markPlaylistListened }: AppContentProps) {
  const {
    currentTrack,
    isNowPlayingOpen,
    isDrawerClosing,
    nowPlayingTab,
    showLyrics,
    closeNowPlaying,
    errorMessage,
    setErrorMessage,
    playTrackWithQueue,
    togglePlayPause,
    isPlaying,
    loadingTrackId,
    mainScrollRef,
    playlistScrollPosRef,
    isMiniPlayer,
  } = usePlayer();

  // Navegação: 'library', 'search' ou 'stats'
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [librarySection, setLibrarySection] = useState<"playlists" | "albums">("playlists");

  // Configurações & Aurora Glow (Aba de Configurações)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [auroraIntensity, setAuroraIntensity] = useState<number>(() => {
    return SettingsService.getSetting("auroraGlowIntensity");
  });

  useEffect(() => {
    SettingsService.applySettingsToDOM(SettingsService.getSettings());
    return SettingsService.subscribe((settings, key) => {
      if (!key || key === "auroraGlowIntensity") {
        setAuroraIntensity(settings.auroraGlowIntensity);
      }
    });
  }, []);

  // Atalho Global para abrir Configurações (Ctrl + , ou Cmd + ,)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Auth state
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Playlists & Biblioteca (com Cache Local Stale-While-Revalidate)
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    return LocalCacheService.getCachedPlaylists() || [];
  });
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const selectedPlaylistRef = useRef<Playlist | null>(null);
  selectedPlaylistRef.current = selectedPlaylist;
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);

  // Álbuns & Biblioteca (com Cache Local Stale-While-Revalidate)
  const [albums, setAlbums] = useState<Album[]>(() => {
    return LocalCacheService.getCachedAlbums() || [];
  });
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const selectedAlbumRef = useRef<Album | null>(null);
  selectedAlbumRef.current = selectedAlbum;
  const [albumDetail, setAlbumDetail] = useState<AlbumDetail | null>(null);
  const [isLoadingAlbumDetail, setIsLoadingAlbumDetail] = useState(false);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Playlists Fixadas
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_pinned_playlists");
      return saved ? JSON.parse(saved) : ["VLLM"];
    } catch {
      return ["VLLM"];
    }
  });

  // Verificação de Atualizações no GitHub (branch main)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Alerta de aplicativo já em execução (Single Instance)
  const [singleInstanceNotice, setSingleInstanceNotice] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("app-already-running", (event) => {
      setSingleInstanceNotice(
        event.payload || "O TetPlayer já está em execução! Sua janela ativa foi restaurada."
      );
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (!singleInstanceNotice) return;
    const timer = setTimeout(() => {
      setSingleInstanceNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [singleInstanceNotice]);

  useEffect(() => {
    // Hidratação a partir do banco de dados SQLite nativo
    LocalCacheService.initDbCache().then(() => {
      const cached = LocalCacheService.getCachedPlaylists();
      if (cached && cached.length > 0) {
        setPlaylists((prev) => (prev.length === 0 ? cached : prev));
      }
      const cachedAlbums = LocalCacheService.getCachedAlbums();
      if (cachedAlbums && cachedAlbums.length > 0) {
        setAlbums((prev) => (prev.length === 0 ? cachedAlbums : prev));
      }
    });

    loadAuthStatus();
    loadPlaylists();
    loadAlbums();

    // Checa atualizações na branch main do GitHub após inicialização
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const alreadyChecked = sessionStorage.getItem("tetplayer_update_checked");
        if (alreadyChecked) return;
        sessionStorage.setItem("tetplayer_update_checked", "true");

        const info = await checkForAppUpdates();
        if (isMounted && info.hasUpdate) {
          setUpdateInfo(info);
        }
      } catch (err) {
        console.warn("[App] Erro na verificação de atualização:", err);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Escuta busca automática de artista via Menu de Contexto (Sugestão 2.2)
  useEffect(() => {
    function handleSearchArtistEvent(e: Event) {
      const customEvent = e as CustomEvent<{ query: string }>;
      const artist = customEvent.detail?.query;
      if (artist) {
        setSearchQuery(artist);
        setActiveTab("search");
        setIsSearching(true);
        setHasSearched(true);
        invoke<Track[]>("search_tracks", { query: artist })
          .then((res) => setSearchResults(res))
          .catch((err) => setErrorMessage(`Erro na busca: ${String(err)}`))
          .finally(() => setIsSearching(false));
      }
    }

    window.addEventListener("tetplayer:search-artist", handleSearchArtistEvent);
    return () => window.removeEventListener("tetplayer:search-artist", handleSearchArtistEvent);
  }, [setErrorMessage]);

  async function loadAuthStatus() {
    setIsCheckingAuth(true);
    try {
      const res = await invoke<AuthSession>("get_auth_status");
      setAuth(res);
    } catch (err) {
      console.error("Erro ao verificar auth:", err);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  // Carregamento de Playlists com Stale-While-Revalidate (0ms de espera)
  const loadPlaylists = useCallback(async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await invoke<Playlist[]>("get_user_playlists");
      setPlaylists(res);
      LocalCacheService.saveCachedPlaylists(res);
    } catch (err) {
      console.warn("Falha ao carregar playlists da rede, mantendo cache local:", err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  // Carregamento de Álbuns com Stale-While-Revalidate (0ms de espera)
  const loadAlbums = useCallback(async () => {
    setIsLoadingAlbums(true);
    try {
      const res = await invoke<Album[]>("get_user_albums");
      setAlbums(res);
      LocalCacheService.saveCachedAlbums(res);
    } catch (err) {
      console.warn("Falha ao carregar álbuns da rede, mantendo cache local:", err);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, []);

  const handleRefreshAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await invoke<AuthSession>("refresh_auth");
      setAuth(res);
      await Promise.all([loadPlaylists(), loadAlbums()]);
    } catch (err) {
      setErrorMessage(`Erro ao atualizar sessão: ${String(err)}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [loadPlaylists, loadAlbums, setErrorMessage]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await invoke("start_google_login");
    } catch (err) {
      setErrorMessage(`Erro ao iniciar login do Google: ${String(err)}`);
    }
  }, [setErrorMessage]);

  const handleGoogleLogout = useCallback(async () => {
    try {
      await invoke("logout_google");
      setAuth(null);
      await Promise.all([loadPlaylists(), loadAlbums()]);
    } catch (err) {
      setErrorMessage(`Erro ao desconectar conta: ${String(err)}`);
    }
  }, [loadPlaylists, loadAlbums, setErrorMessage]);

  // Selecionar Playlist com Stale-While-Revalidate e tolerância offline
  const handleSelectPlaylist = useCallback(async (playlist: Playlist) => {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedPlaylist(playlist);
    setSelectedAlbum(null);
    setAlbumDetail(null);
    setLibrarySection("playlists");
    setActiveTab("library");
    closeNowPlaying();

    // Exibe faixas em cache instantaneamente (0ms) se existirem
    const cachedTracks = LocalCacheService.getCachedPlaylistTracks(playlist.id);
    if (cachedTracks && cachedTracks.length > 0) {
      setPlaylistTracks(cachedTracks);
    } else {
      setPlaylistTracks([]);
    }

    setIsLoadingPlaylistTracks(true);
    setErrorMessage(null);

    try {
      const tracks = await invoke<Track[]>("get_playlist_tracks", {
        playlistId: playlist.id,
      });
      setPlaylistTracks(tracks);
      LocalCacheService.saveCachedPlaylistTracks(playlist.id, tracks);
    } catch (err) {
      if (cachedTracks && cachedTracks.length > 0) {
        console.warn("Falha ao revalidar playlist pela rede, mantendo cache local offline:", err);
      } else {
        setErrorMessage(`Erro ao carregar músicas da playlist: ${String(err)}`);
      }
    } finally {
      setIsLoadingPlaylistTracks(false);
    }
  }, [mainScrollRef, playlistScrollPosRef, setErrorMessage, closeNowPlaying]);

  // Selecionar Álbum com Stale-While-Revalidate (0ms instant display)
  const handleSelectAlbum = useCallback(async (album: Album) => {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedAlbum(album);
    setSelectedPlaylist(null);
    setLibrarySection("albums");
    setActiveTab("library");
    closeNowPlaying();

    const cachedDetail = LocalCacheService.getCachedAlbumDetail(album.id);
    if (cachedDetail) {
      setAlbumDetail(cachedDetail);
    } else {
      setAlbumDetail(null);
    }

    setIsLoadingAlbumDetail(true);
    setErrorMessage(null);

    try {
      const detail = await invoke<AlbumDetail>("get_album_details", {
        browseId: album.id,
      });
      setAlbumDetail(detail);
      LocalCacheService.saveCachedAlbumDetail(album.id, detail);
    } catch (err) {
      if (cachedDetail) {
        console.warn("Falha ao revalidar álbum pela rede, mantendo cache local offline:", err);
      } else {
        setErrorMessage(`Erro ao carregar detalhes do álbum: ${String(err)}`);
      }
    } finally {
      setIsLoadingAlbumDetail(false);
    }
  }, [mainScrollRef, playlistScrollPosRef, setErrorMessage, closeNowPlaying]);

  // Escuta evento de abertura de álbum (via Menu de Contexto ou Drawer)
  useEffect(() => {
    async function handleOpenAlbumEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        albumId?: string;
        albumTitle?: string;
        artist?: string;
      }>;
      const { albumId, albumTitle, artist } = customEvent.detail || {};

      if (albumId) {
        const existing = albums.find((a) => a.id === albumId);
        const targetAlbum: Album = existing || {
          id: albumId,
          title: albumTitle || "Álbum",
          artist: artist || "Artista",
          year: "",
          artwork_url: "",
          album_type: "album",
        };
        handleSelectAlbum(targetAlbum);
      } else if (albumTitle) {
        try {
          const query = [albumTitle, artist].filter(Boolean).join(" ");
          const found = await invoke<Album | null>("search_album_by_name", { query });
          if (found) {
            handleSelectAlbum(found);
          } else {
            setSearchQuery(albumTitle);
            setActiveTab("search");
            setIsSearching(true);
            setHasSearched(true);
            const res = await invoke<Track[]>("search_tracks", { query: albumTitle });
            setSearchResults(res);
          }
        } catch (err) {
          setErrorMessage(`Álbum não encontrado: ${String(err)}`);
        } finally {
          setIsSearching(false);
        }
      }
    }

    window.addEventListener("tetplayer:open-album", handleOpenAlbumEvent);
    return () => window.removeEventListener("tetplayer:open-album", handleOpenAlbumEvent);
  }, [albums, handleSelectAlbum, setErrorMessage]);

  // Escuta evento de mudança na autenticação (quando o login via Webview do Google conclui)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<AuthSession>("auth-changed", (event) => {
      if (event.payload) {
        setAuth(event.payload);
        loadPlaylists();
        loadAlbums();
        if (selectedPlaylistRef.current) {
          handleSelectPlaylist(selectedPlaylistRef.current);
        }
        if (selectedAlbumRef.current) {
          handleSelectAlbum(selectedAlbumRef.current);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [loadPlaylists, loadAlbums, handleSelectPlaylist, handleSelectAlbum]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setActiveTab("search");
    setErrorMessage(null);
    try {
      const res = await invoke<Track[]>("search_tracks", { query: searchQuery });
      setSearchResults(res);
    } catch (err) {
      setErrorMessage(`Erro na busca: ${String(err)}`);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setErrorMessage]);

  const handleBackToPlaylists = useCallback(() => {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedPlaylist(null);
    closeNowPlaying();
  }, [mainScrollRef, playlistScrollPosRef, closeNowPlaying]);

  const handleBackToAlbums = useCallback(() => {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedAlbum(null);
    setAlbumDetail(null);
    closeNowPlaying();
  }, [mainScrollRef, playlistScrollPosRef, closeNowPlaying]);

  const handleSidebarTabChange = useCallback((tab: ActiveTab) => {
    playlistScrollPosRef.current = 0;
    setActiveTab(tab);
    if (tab === "library") {
      setSelectedPlaylist(null);
      setSelectedAlbum(null);
      setAlbumDetail(null);
    }
    closeNowPlaying();
  }, [playlistScrollPosRef, closeNowPlaying]);

  // Reprodução de Álbuns
  const handlePlayAlbum = useCallback(
    (tracks: Track[], startIndex = 0, shuffle = false) => {
      if (!tracks || tracks.length === 0) return;
      let queue = [...tracks];
      let startIdx = startIndex;
      if (shuffle) {
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        startIdx = 0;
      }
      const trackToPlay = queue[startIdx] || queue[0];
      playTrackWithQueue(trackToPlay, queue, startIdx, selectedAlbum?.id);
    },
    [playTrackWithQueue, selectedAlbum]
  );

  const handlePlayAlbumTrack = useCallback(
    (track: Track, index: number, customQueue?: Track[]) => {
      const queue = customQueue || albumDetail?.tracks || [track];
      playTrackWithQueue(track, queue, index, selectedAlbum?.id);
    },
    [albumDetail, playTrackWithQueue, selectedAlbum]
  );

  const handlePlayAlbumQuick = useCallback(
    async (album: Album, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const cached = LocalCacheService.getCachedAlbumDetail(album.id);
        if (cached && cached.tracks.length > 0) {
          playTrackWithQueue(cached.tracks[0], cached.tracks, 0, album.id);
          return;
        }
        const detail = await invoke<AlbumDetail>("get_album_details", {
          browseId: album.id,
        });
        if (detail && detail.tracks && detail.tracks.length > 0) {
          LocalCacheService.saveCachedAlbumDetail(album.id, detail);
          playTrackWithQueue(detail.tracks[0], detail.tracks, 0, album.id);
        }
      } catch (err) {
        console.error("Erro ao reproduzir álbum rapidamente:", err);
      }
    },
    [playTrackWithQueue]
  );

  const handleTogglePinPlaylist = useCallback((playlistId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedPlaylistIds((prev) => {
      let updated: string[];
      if (prev.includes(playlistId)) {
        updated = prev.filter((id) => id !== playlistId);
      } else {
        updated = [...prev, playlistId];
      }
      try {
        localStorage.setItem(
          "tetplayer_pinned_playlists",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  return (
    <div
      className={`w-screen h-screen select-none overflow-hidden relative ${
        isMiniPlayer ? "bg-[#0c0e17]" : "bg-[#0b0c10]"
      }`}
    >
      {/* Modo Mini Player Flutuante (Sugestão 2.1) */}
      {isMiniPlayer && <MiniPlayer />}

      {/* Interface Completa do TetPlayer (oculta visualmente quando em modo mini player sem recarregar o DOM) */}
      <div
        className={`flex-col h-full w-full bg-[#0b0c10] text-[#e0e2ec] overflow-hidden relative ${
          isMiniPlayer ? "hidden" : "flex"
        }`}
      >
        {/* Fundo Dinâmico Aurora de Alta Resolução */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-300"
          style={{ opacity: auroraIntensity / 100 }}
        >
          <div className="absolute -top-[15%] -left-[10%] w-[60vw] h-[60vw] rounded-full aurora-blob-1 blur-[90px] opacity-90" />
          <div className="absolute top-[15%] -right-[10%] w-[55vw] h-[55vw] rounded-full aurora-blob-2 blur-[100px] opacity-80" />
          <div className="absolute -bottom-[15%] left-[20%] w-[50vw] h-[50vw] rounded-full aurora-blob-3 blur-[90px] opacity-85" />
          <div className="absolute inset-0 bg-[#0b0c10]/45 backdrop-blur-[1px]" />
        </div>

        {/* Barra de Título Customizada */}
        <TitleBar
          auth={auth}
          activeTab={activeTab}
          selectedPlaylist={selectedPlaylist}
          selectedAlbum={selectedAlbum}
          currentTrack={currentTrack}
          isNowPlayingOpen={isNowPlayingOpen}
          nowPlayingTab={nowPlayingTab}
          showLyrics={showLyrics}
        />

        {/* Corpo Principal (Sidebar + Conteúdo Central) */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleSidebarTabChange}
            playlists={playlists}
            isLoadingPlaylists={isLoadingPlaylists}
            onRefreshPlaylists={loadPlaylists}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={handleSelectPlaylist}
            auth={auth}
            isCheckingAuth={isCheckingAuth}
            onRefreshAuth={handleRefreshAuth}
            onGoogleLogin={handleGoogleLogin}
            onOpenSettings={() => setIsSettingsOpen(true)}
            playlistHistory={playlistHistory}
            pinnedPlaylistIds={pinnedPlaylistIds}
            setPinnedPlaylistIds={setPinnedPlaylistIds}
          />

          {/* Área Central */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
            {singleInstanceNotice && (
              <div
                role="status"
                aria-live="polite"
                className="m-6 mb-0 bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs px-4 py-3 rounded-xl flex items-center gap-3 shrink-0 shadow-xl shadow-amber-950/50 backdrop-blur-md"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-white">Aplicativo já em execução</p>
                  <p className="text-[11px] text-amber-300/90">{singleInstanceNotice}</p>
                </div>
                <button
                  onClick={() => setSingleInstanceNotice(null)}
                  className="text-amber-400 hover:text-white text-xs underline cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="m-6 mb-0 bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-white text-xs underline cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Conteúdo com Scroll da Playlist, Busca ou TetStats */}
            <main
              ref={mainScrollRef as React.RefObject<HTMLDivElement>}
              inert={isNowPlayingOpen && !isDrawerClosing ? true : undefined}
              onScroll={(e) => {
                playlistScrollPosRef.current = e.currentTarget.scrollTop;
              }}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar block"
            >
              {activeTab === "library" && (
                <>
                  {selectedPlaylist ? (
                    <PlaylistDetailView
                      playlist={selectedPlaylist}
                      tracks={playlistTracks}
                      isLoadingTracks={isLoadingPlaylistTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      loadingTrackId={loadingTrackId}
                      onBack={handleBackToPlaylists}
                      onPlayPlaylist={(customTracks) => {
                        const queue = customTracks && customTracks.length > 0 ? customTracks : playlistTracks;
                        if (queue.length > 0) {
                          markPlaylistListened(selectedPlaylist.id);
                          playTrackWithQueue(
                            queue[0],
                            queue,
                            0,
                            selectedPlaylist.id
                          );
                        }
                      }}
                      onPlayTrack={(track, idx, customQueue) =>
                        playTrackWithQueue(
                          track,
                          customQueue || playlistTracks,
                          idx,
                          selectedPlaylist.id
                        )
                      }
                      onTogglePlayPause={togglePlayPause}
                      scrollRef={mainScrollRef}
                    />
                  ) : selectedAlbum ? (
                    <AlbumDetailView
                      album={selectedAlbum}
                      albumDetail={albumDetail}
                      isLoading={isLoadingAlbumDetail}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      loadingTrackId={loadingTrackId}
                      onBack={handleBackToAlbums}
                      onPlayAlbum={handlePlayAlbum}
                      onPlayTrack={handlePlayAlbumTrack}
                      onTogglePlayPause={togglePlayPause}
                      onSelectRelatedAlbum={handleSelectAlbum}
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Segmented Control da Biblioteca: Playlists vs Álbuns */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                          <button
                            onClick={() => setLibrarySection("playlists")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                              librarySection === "playlists"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                                : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            <ListMusic className="w-4 h-4" />
                            Playlists
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-neutral-300">
                              {playlists.length}
                            </span>
                          </button>

                          <button
                            onClick={() => setLibrarySection("albums")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                              librarySection === "albums"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                                : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
                            }`}
                          >
                            <Disc3 className="w-4 h-4" />
                            Álbuns
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-neutral-300">
                              {albums.length}
                            </span>
                          </button>
                        </div>
                      </div>

                      {librarySection === "playlists" ? (
                        <PlaylistGridView
                          playlists={playlists}
                          isLoadingPlaylists={isLoadingPlaylists}
                          pinnedPlaylistIds={pinnedPlaylistIds}
                          onSelectPlaylist={handleSelectPlaylist}
                          onTogglePinPlaylist={handleTogglePinPlaylist}
                        />
                      ) : (
                        <AlbumGridView
                          albums={albums}
                          isLoading={isLoadingAlbums}
                          onRefresh={loadAlbums}
                          onSelectAlbum={handleSelectAlbum}
                          onPlayAlbumQuick={handlePlayAlbumQuick}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === "search" && (
                <SearchView
                  searchQuery={searchQuery}
                  setSearchQuery={(q) => {
                    setSearchQuery(q);
                    if (!q.trim()) {
                      setSearchResults([]);
                      setHasSearched(false);
                    }
                  }}
                  onSearch={handleSearch}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  loadingTrackId={loadingTrackId}
                  onPlayTrack={(track, idx) =>
                    playTrackWithQueue(track, searchResults, idx)
                  }
                  onTogglePlayPause={togglePlayPause}
                  scrollRef={mainScrollRef}
                  hasSearched={hasSearched}
                />
              )}

              {activeTab === "stats" && (
                <StatsView
                  onPlayTrack={(track) =>
                    playTrackWithQueue(track, [track], 0)
                  }
                />
              )}
            </main>

            {/* Gaveta de Reprodução */}
            {(isNowPlayingOpen || showLyrics || isDrawerClosing) && <NowPlayingDrawer />}
          </div>
        </div>

        {/* Player Inferior Persistente */}
        <PlayerBar />
      </div>

      {/* Modal de Nova Atualização na Branch Main */}
      {updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setUpdateInfo(null)}
        />
      )}

      {/* Modal Central de Configurações */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        auth={auth}
        isCheckingAuth={isCheckingAuth}
        onRefreshAuth={handleRefreshAuth}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onForceAnonymous={handleGoogleLogout}
      />
    </div>
  );
}
