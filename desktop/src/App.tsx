import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Playlist, Track, AuthSession, ActiveTab } from "./types";
import { LocalCacheService } from "./services/cache";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { PlaylistGridView } from "./components/MainView/PlaylistGridView";
import { PlaylistDetailView } from "./components/MainView/PlaylistDetailView";
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
    nowPlayingTab,
    showLyrics,
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
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [isLoadingPlaylistTracks, setIsLoadingPlaylistTracks] = useState(false);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
    });

    loadAuthStatus();
    loadPlaylists();

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

  const handleRefreshAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await invoke<AuthSession>("refresh_auth");
      setAuth(res);
      await loadPlaylists();
    } catch (err) {
      setErrorMessage(`Erro ao recarregar cookies: ${String(err)}`);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

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

  // Selecionar Playlist com Stale-While-Revalidate e tolerância offline
  const handleSelectPlaylist = useCallback(async (playlist: Playlist) => {
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedPlaylist(playlist);
    setActiveTab("library");

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
  }, [mainScrollRef, playlistScrollPosRef, setErrorMessage]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
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
  }, [mainScrollRef, playlistScrollPosRef]);

  const handleSidebarTabChange = useCallback((tab: ActiveTab) => {
    playlistScrollPosRef.current = 0;
    setActiveTab(tab);
    if (tab === "library") setSelectedPlaylist(null);
  }, [playlistScrollPosRef]);

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
              onScroll={(e) => {
                if (!isNowPlayingOpen && !showLyrics) {
                  playlistScrollPosRef.current = e.currentTarget.scrollTop;
                }
              }}
              className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar ${
                isNowPlayingOpen || showLyrics ? "hidden" : "block"
              }`}
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
                      onPlayPlaylist={() => {
                        if (playlistTracks.length > 0) {
                          markPlaylistListened(selectedPlaylist.id);
                          playTrackWithQueue(
                            playlistTracks[0],
                            playlistTracks,
                            0,
                            selectedPlaylist.id
                          );
                        }
                      }}
                      onPlayTrack={(track, idx) =>
                        playTrackWithQueue(
                          track,
                          playlistTracks,
                          idx,
                          selectedPlaylist.id
                        )
                      }
                      onTogglePlayPause={togglePlayPause}
                      scrollRef={mainScrollRef}
                    />
                  ) : (
                    <PlaylistGridView
                      playlists={playlists}
                      isLoadingPlaylists={isLoadingPlaylists}
                      pinnedPlaylistIds={pinnedPlaylistIds}
                      onSelectPlaylist={handleSelectPlaylist}
                      onTogglePinPlaylist={handleTogglePinPlaylist}
                    />
                  )}
                </>
              )}

              {activeTab === "search" && (
                <SearchView
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
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
            {(isNowPlayingOpen || showLyrics) && <NowPlayingDrawer />}
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
        onForceAnonymous={() => setAuth(null)}
      />
    </div>
  );
}
