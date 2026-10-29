import React, { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AlertCircle,
  AlertTriangle,
  ListMusic,
  Disc3,
  LayoutGrid,
  Grid3x3,
  Search,
  ArrowUpDown,
  ChevronDown,
  Check,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Playlist, Track, AuthSession, ActiveTab, Album, AlbumDetail, ArtistDetail } from "./types";
import { LocalCacheService } from "./services/cache";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { TitleBar } from "./components/TitleBar/TitleBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { PlaylistGridView, LibrarySortOption } from "./components/MainView/PlaylistGridView";
import { PlaylistDetailView } from "./components/MainView/PlaylistDetailView";
import { AlbumGridView } from "./components/MainView/AlbumGridView";
import { AlbumDetailView } from "./components/MainView/AlbumDetailView";
import { ArtistDetailView } from "./components/MainView/ArtistDetailView";
import { GridDensity } from "./components/MainView/AlbumCard";
import { LibraryOverview } from "./components/MainView/LibraryOverview";
import { SearchView } from "./components/MainView/SearchView";
import { StatsView } from "./components/StatsView/StatsView";
import { PlayerBar } from "./components/Player/PlayerBar";
import { NowPlayingDrawer } from "./components/NowPlayingDrawer/NowPlayingDrawer";
import { MiniPlayer } from "./components/MiniPlayer/MiniPlayer";
import { UpdateInfo, checkForAppUpdates } from "./services/updater";
import { UpdateModal } from "./components/UpdateModal/UpdateModal";
import { SettingsModal } from "./components/SettingsModal/SettingsModal";
import { CreatePlaylistModal } from "./components/Modals/CreatePlaylistModal";
import { AddToPlaylistModal } from "./components/Modals/AddToPlaylistModal";
import { EditPlaylistModal } from "./components/Modals/EditPlaylistModal";
import { ConfirmDeleteModal } from "./components/Modals/ConfirmDeleteModal";
import {
  CollectionContextMenu,
  CollectionContextItem,
} from "./components/ContextMenu/CollectionContextMenu";
import { SettingsService } from "./services/settings";
import { PerformanceTelemetry } from "./services/telemetry";
import { humanizeApiError } from "./utils/errors";

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

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

  const markPlaylistListened = useCallback((playlistId?: string) => {
    if (!playlistId) {
      setActiveCollectionId(null);
      return;
    }
    setActiveCollectionId(playlistId);
    // Salva o histórico de recentes silenciosamente no localStorage sem reordenar a lista ao vivo.
    // A ordem visual só será atualizada quando a tela recarregar ou ao clicar no botão de Sincronizar.
    try {
      const saved = localStorage.getItem("tetplayer_playlist_history");
      const current: Record<string, number> = saved ? JSON.parse(saved) : {};
      const updated = { ...current, [playlistId]: Date.now() };
      localStorage.setItem("tetplayer_playlist_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const syncPlaylistHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem("tetplayer_playlist_history");
      if (saved) {
        setPlaylistHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <PlayerProvider onMarkPlaylistListened={markPlaylistListened}>
      <AppContent
        playlistHistory={playlistHistory}
        markPlaylistListened={markPlaylistListened}
        syncPlaylistHistory={syncPlaylistHistory}
        activeCollectionId={activeCollectionId}
      />
    </PlayerProvider>
  );
}

interface AppContentProps {
  playlistHistory: Record<string, number>;
  markPlaylistListened: (playlistId?: string) => void;
  syncPlaylistHistory: () => void;
  activeCollectionId: string | null;
}

function AppContent({
  playlistHistory,
  markPlaylistListened,
  syncPlaylistHistory,
  activeCollectionId,
}: AppContentProps) {
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
    handleAddTracksToQueue,
    togglePlayPause,
    isPlaying,
    loadingTrackId,
    mainScrollRef,
    playlistScrollPosRef,
    isMiniPlayer,
  } = usePlayer();

  // Navegação: 'library', 'search' ou 'stats'
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [librarySection, setLibrarySection] = useState<"all" | "playlists" | "albums">("all");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [librarySortBy, setLibrarySortBy] = useState<LibrarySortOption>("recent");
  const [isLibrarySortOpen, setIsLibrarySortOpen] = useState(false);
  const librarySortDropdownRef = useRef<HTMLDivElement>(null);
  const [libraryDensity, setLibraryDensity] = useState<GridDensity>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_library_density");
      return saved === "compact" ? "compact" : "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const handleSetLibraryDensity = useCallback((density: GridDensity) => {
    setLibraryDensity(density);
    try {
      localStorage.setItem("tetplayer_library_density", density);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLibrarySortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        librarySortDropdownRef.current &&
        !librarySortDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLibrarySortOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLibrarySortOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLibrarySortOpen]);

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

  // Artista & Perfil Dedicado (com Cache Local Stale-While-Revalidate)
  const [selectedArtist, setSelectedArtist] = useState<{ id?: string; name: string } | null>(null);
  const [artistDetail, setArtistDetail] = useState<ArtistDetail | null>(null);
  const [isLoadingArtistDetail, setIsLoadingArtistDetail] = useState(false);

  // Controle de posição de rolagem prévia da biblioteca e proteção contra Race Conditions
  const libraryScrollPosRef = useRef<number>(0);
  const activeAlbumRequestIdRef = useRef<string | null>(null);
  const activeArtistRequestIdRef = useRef<string | null>(null);
  const activePlaylistRequestIdRef = useRef<string | null>(null);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Coleção Fixada (Playlists + Álbuns unificados na ordem customizada do usuário)
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tetplayer_pinned_playlists");
      return saved ? JSON.parse(saved) : ["VLLM"];
    } catch {
      return ["VLLM"];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(pinnedPlaylistIds));
    } catch {
      // ignore
    }
  }, [pinnedPlaylistIds]);

  // Verificação de Atualizações no GitHub (branch main)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  // Alerta de aplicativo já em execução (Single Instance)
  const [singleInstanceNotice, setSingleInstanceNotice] = useState<string | null>(null);

  // Modais de Manipulação de Playlist (Sugestão 2.4)
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [createPlaylistInitialTitle, setCreatePlaylistInitialTitle] = useState("");
  const [pendingTracksForNewPlaylist, setPendingTracksForNewPlaylist] = useState<Track[] | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [addToPlaylistBatch, setAddToPlaylistBatch] = useState<{
    tracks: Track[];
    albumTitle?: string;
  } | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<Playlist | null>(null);
  const [collectionMenuState, setCollectionMenuState] = useState<{
    item: CollectionContextItem;
    position: { x: number; y: number };
  } | null>(null);
  const [playlistToast, setPlaylistToast] = useState<string | null>(null);

  const showPlaylistToast = useCallback((msg: string) => {
    setPlaylistToast(msg);
    setTimeout(() => {
      setPlaylistToast((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

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
    syncPlaylistHistory();
    setIsLoadingPlaylists(true);
    try {
      const res = await invoke<Playlist[]>("get_user_playlists");
      if (res && res.length > 1) {
        setPlaylists(res);
        LocalCacheService.saveCachedPlaylists(res);
      } else if (res && res.length === 1 && res[0].id === "VLLM") {
        // Se a rede retornou apenas a playlist padrão de Curtidas, preserva playlists em cache se existirem
        setPlaylists((prev) => (prev.length > 1 ? prev : res));
      } else if (res && res.length > 0) {
        setPlaylists(res);
        LocalCacheService.saveCachedPlaylists(res);
      }
    } catch (err) {
      console.warn("Falha ao carregar playlists da rede, mantendo cache local:", err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, [syncPlaylistHistory]);

  // Carregamento de Álbuns com Stale-While-Revalidate (0ms de espera)
  const loadAlbums = useCallback(async () => {
    syncPlaylistHistory();
    setIsLoadingAlbums(true);
    try {
      const res = await invoke<Album[]>("get_user_albums");
      if (res && res.length > 0) {
        setAlbums(res);
        LocalCacheService.saveCachedAlbums(res);
      }
    } catch (err) {
      console.warn("Falha ao carregar álbuns da rede, mantendo cache local:", err);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, [syncPlaylistHistory]);

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
    if (!selectedPlaylistRef.current && !selectedAlbumRef.current && !selectedArtist) {
      libraryScrollPosRef.current = mainScrollRef.current?.scrollTop || 0;
    }
    activePlaylistRequestIdRef.current = playlist.id;
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedPlaylist(playlist);
    setSelectedAlbum(null);
    setAlbumDetail(null);
    setSelectedArtist(null);
    setArtistDetail(null);
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
      if (activePlaylistRequestIdRef.current === playlist.id) {
        setPlaylistTracks(tracks);
        LocalCacheService.saveCachedPlaylistTracks(playlist.id, tracks);
      }
    } catch (err) {
      if (activePlaylistRequestIdRef.current === playlist.id) {
        if (cachedTracks && cachedTracks.length > 0) {
          console.warn("Falha ao revalidar playlist pela rede, mantendo cache local offline:", err);
        } else {
          setErrorMessage(`Erro ao carregar músicas da playlist: ${String(err)}`);
        }
      }
    } finally {
      if (activePlaylistRequestIdRef.current === playlist.id) {
        setIsLoadingPlaylistTracks(false);
      }
    }
  }, [mainScrollRef, playlistScrollPosRef, setErrorMessage, closeNowPlaying, selectedArtist]);

  // Selecionar Álbum com Stale-While-Revalidate (0ms instant display)
  const handleSelectAlbum = useCallback(async (album: Album) => {
    if (!selectedPlaylistRef.current && !selectedAlbumRef.current && !selectedArtist) {
      libraryScrollPosRef.current = mainScrollRef.current?.scrollTop || 0;
    }
    activeAlbumRequestIdRef.current = album.id;
    playlistScrollPosRef.current = 0;
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setSelectedAlbum(album);
    setSelectedPlaylist(null);
    setSelectedArtist(null);
    setArtistDetail(null);
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
      if (activeAlbumRequestIdRef.current !== album.id) return;
      const enrichedDetail: AlbumDetail = {
        ...detail,
        artwork_url: detail.artwork_url || album.artwork_url,
        title:
          detail.title && detail.title !== "Álbum"
            ? detail.title
            : album.title && album.title !== "Álbum"
            ? album.title
            : detail.title,
        artist:
          detail.artist && detail.artist !== "Artista"
            ? detail.artist
            : album.artist && album.artist !== "Artista"
            ? album.artist
            : detail.artist,
      };
      setAlbumDetail(enrichedDetail);
      LocalCacheService.saveCachedAlbumDetail(album.id, enrichedDetail);
    } catch (err) {
      if (activeAlbumRequestIdRef.current === album.id) {
        if (cachedDetail) {
          console.warn("Falha ao revalidar álbum pela rede, mantendo cache local offline:", err);
        } else {
          setErrorMessage(`Erro ao carregar detalhes do álbum: ${String(err)}`);
        }
      }
    } finally {
      if (activeAlbumRequestIdRef.current === album.id) {
        setIsLoadingAlbumDetail(false);
      }
    }
  }, [mainScrollRef, playlistScrollPosRef, setErrorMessage, closeNowPlaying, selectedArtist]);

  // Selecionar Artista com Stale-While-Revalidate (0ms instant display)
  const handleSelectArtist = useCallback(
    async (artist: { id?: string; name: string }) => {
      if (!artist.name || artist.name === "Artista") return;
      if (!selectedPlaylistRef.current && !selectedAlbumRef.current && !selectedArtist) {
        libraryScrollPosRef.current = mainScrollRef.current?.scrollTop || 0;
      }
      const cacheKey = artist.id || artist.name.trim().toLowerCase();
      activeArtistRequestIdRef.current = cacheKey;
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
      setSelectedArtist(artist);
      setActiveTab("library");
      closeNowPlaying();

      const cached = LocalCacheService.getCachedArtistDetail(cacheKey);
      if (cached) {
        setArtistDetail(cached);
      } else {
        setArtistDetail(null);
      }

      setIsLoadingArtistDetail(true);
      setErrorMessage(null);

      try {
        const detail = await invoke<ArtistDetail>("get_artist_details", {
          artistId: artist.id || null,
          artistName: artist.name,
        });
        if (activeArtistRequestIdRef.current !== cacheKey) return;
        setArtistDetail(detail);
        LocalCacheService.saveCachedArtistDetail(cacheKey, detail);
        if (detail.id) {
          LocalCacheService.saveCachedArtistDetail(detail.id, detail);
        }
      } catch (err) {
        if (activeArtistRequestIdRef.current === cacheKey) {
          if (cached) {
            console.warn("Falha ao revalidar artista pela rede, mantendo cache local offline:", err);
          } else {
            setErrorMessage(`Erro ao carregar informações do artista: ${String(err)}`);
          }
        }
      } finally {
        if (activeArtistRequestIdRef.current === cacheKey) {
          setIsLoadingArtistDetail(false);
        }
      }
    },
    [mainScrollRef, setErrorMessage, closeNowPlaying, selectedArtist]
  );

  // Escuta evento de abertura de perfil do artista
  useEffect(() => {
    function handleSearchArtistEvent(e: Event) {
      const customEvent = e as CustomEvent<{ query: string; artistId?: string }>;
      const artist = customEvent.detail?.query;
      const artistId = customEvent.detail?.artistId;
      if (artist) {
        handleSelectArtist({ id: artistId, name: artist });
      }
    }

    window.addEventListener("tetplayer:search-artist", handleSearchArtistEvent);
    return () => window.removeEventListener("tetplayer:search-artist", handleSearchArtistEvent);
  }, [handleSelectArtist]);

  // Escuta evento de abertura de álbum (via Menu de Contexto ou Drawer)
  useEffect(() => {
    async function handleOpenAlbumEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        albumId?: string;
        albumTitle?: string;
        artist?: string;
        artworkUrl?: string;
      }>;
      const { albumId, albumTitle, artist, artworkUrl } = customEvent.detail || {};

      if (albumId) {
        const existing = albums.find((a) => a.id === albumId);
        const targetAlbum: Album = existing
          ? { ...existing, artwork_url: existing.artwork_url || artworkUrl }
          : {
              id: albumId,
              title: albumTitle || "Álbum",
              artist: artist || "Artista",
              year: "",
              artwork_url: artworkUrl || "",
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

  // Manipulação de Playlists: Criar, Adicionar, Remover, Editar, Excluir (Sugestão 2.4)
  const handleCreatePlaylist = useCallback(
    async (title: string, description?: string, privacy?: string) => {
      try {
        const newPlaylist = await invoke<Playlist>("create_playlist", {
          title,
          description: description || null,
          privacyStatus: privacy || "PRIVATE",
        });

        setPlaylists((prev) => {
          const updated = [newPlaylist, ...prev.filter((p) => p.id !== newPlaylist.id)];
          LocalCacheService.saveCachedPlaylists(updated);
          return updated;
        });

        if (pendingTracksForNewPlaylist && pendingTracksForNewPlaylist.length > 0) {
          const tracksToAdd = [...pendingTracksForNewPlaylist];
          setPendingTracksForNewPlaylist(null);
          setCreatePlaylistInitialTitle("");
          showPlaylistToast(`Adicionando ${tracksToAdd.length} faixas à nova playlist...`);
          for (const t of tracksToAdd) {
            try {
              await invoke("add_track_to_playlist", {
                playlistId: newPlaylist.id,
                videoId: t.id,
              });
            } catch (addErr) {
              console.error("Erro ao adicionar faixa na playlist recém-criada:", addErr);
            }
          }
          LocalCacheService.saveCachedPlaylistTracks(newPlaylist.id, tracksToAdd);
          showPlaylistToast(`Playlist "${title}" criada com ${tracksToAdd.length} faixas do álbum!`);
        } else {
          showPlaylistToast(`Playlist "${title}" criada com sucesso no YouTube Music!`);
        }
        handleSelectPlaylist(newPlaylist);
      } catch (err) {
        setErrorMessage(`Erro ao criar playlist: ${String(err)}`);
        throw err;
      }
    },
    [handleSelectPlaylist, showPlaylistToast, setErrorMessage, pendingTracksForNewPlaylist]
  );

  const handleAddTrackToPlaylist = useCallback(
    async (playlist: Playlist, track: Track) => {
      try {
        await invoke("add_track_to_playlist", {
          playlistId: playlist.id,
          videoId: track.id,
        });

        if (selectedPlaylistRef.current?.id === playlist.id) {
          setPlaylistTracks((prev) => {
            const updated = [...prev, track];
            LocalCacheService.saveCachedPlaylistTracks(playlist.id, updated);
            return updated;
          });
        }

        showPlaylistToast(`"${track.title}" adicionada a "${playlist.title}"!`);
      } catch (err) {
        setErrorMessage(`Erro ao adicionar à playlist: ${String(err)}`);
        throw err;
      }
    },
    [showPlaylistToast, setErrorMessage]
  );

  const handleRemoveTrackFromPlaylist = useCallback(
    async (track: Track, playlistId: string) => {
      const previousTracks = [...playlistTracks];
      // 0ms Optimistic UI removal
      setPlaylistTracks((prev) =>
        prev.filter((t) =>
          t.set_video_id && track.set_video_id
            ? t.set_video_id !== track.set_video_id
            : t.id !== track.id
        )
      );

      try {
        await invoke("remove_track_from_playlist", {
          playlistId,
          videoId: track.id,
          setVideoId: track.set_video_id || null,
        });

        setPlaylistTracks((current) => {
          LocalCacheService.saveCachedPlaylistTracks(playlistId, current);
          return current;
        });

        showPlaylistToast(`"${track.title}" removida da playlist.`);
      } catch (err) {
        // Rollback on network failure
        setPlaylistTracks(previousTracks);
        setErrorMessage(`Erro ao remover música da playlist: ${String(err)}`);
      }
    },
    [playlistTracks, showPlaylistToast, setErrorMessage]
  );

  const handleReorderPlaylistTrack = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const playlist = selectedPlaylistRef.current;
      if (
        !playlist ||
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= playlistTracks.length ||
        toIndex >= playlistTracks.length
      ) {
        return;
      }

      const playlistId = playlist.id;
      const previousTracks = [...playlistTracks];
      const reordered = [...previousTracks];
      const [movedTrack] = reordered.splice(fromIndex, 1);
      if (!movedTrack) return;
      reordered.splice(toIndex, 0, movedTrack);

      // 0ms Optimistic UI update (sem flicker ou espera de rede)
      setPlaylistTracks(reordered);
      LocalCacheService.saveCachedPlaylistTracks(playlistId, reordered);

      try {
        let workingMoved = movedTrack;
        let workingReordered = reordered;

        // Se o cache local for antigo e não tiver set_video_id, sincroniza uma vez antes de enviar a reordenação
        if (!workingMoved.set_video_id) {
          const fresh = await invoke<Track[]>("get_playlist_tracks", { playlistId });
          if (fresh && fresh.length === previousTracks.length) {
            const enrichedPrev = previousTracks.map((t, idx) => ({
              ...t,
              set_video_id: fresh[idx]?.id === t.id ? fresh[idx]?.set_video_id : t.set_video_id,
            }));
            const enrichedReordered = [...enrichedPrev];
            const [enrichedMoved] = enrichedReordered.splice(fromIndex, 1);
            enrichedReordered.splice(toIndex, 0, enrichedMoved);
            workingMoved = enrichedMoved;
            workingReordered = enrichedReordered;
            setPlaylistTracks(enrichedReordered);
            LocalCacheService.saveCachedPlaylistTracks(playlistId, enrichedReordered);
          }
        }

        const setVideoId = workingMoved.set_video_id;
        if (!setVideoId) {
          throw new Error("Identificador da faixa na playlist (setVideoId) indisponível para sincronizar.");
        }

        const successorSetVideoId =
          toIndex < workingReordered.length - 1
            ? workingReordered[toIndex + 1]?.set_video_id || null
            : null;
        const predecessorSetVideoId =
          toIndex === workingReordered.length - 1
            ? workingReordered[toIndex - 1]?.set_video_id || null
            : null;
        const wasAdjacentToEnd = fromIndex === workingReordered.length - 2;

        await invoke("reorder_playlist_track", {
          playlistId,
          setVideoId,
          successorSetVideoId,
          predecessorSetVideoId,
          wasAdjacentToEnd,
        });
      } catch (err) {
        setPlaylistTracks(previousTracks);
        LocalCacheService.saveCachedPlaylistTracks(playlistId, previousTracks);
        setErrorMessage(`Erro ao reordenar música na playlist: ${String(err)}`);
      }
    },
    [playlistTracks, setErrorMessage]
  );

  const handleEditPlaylistMetadata = useCallback(
    async (playlistId: string, title: string, description?: string) => {
      try {
        await invoke("edit_playlist_metadata", {
          playlistId,
          title,
          description: description || null,
        });

        setPlaylists((prev) => {
          const updated = prev.map((p) =>
            p.id === playlistId ? { ...p, title, description } : p
          );
          LocalCacheService.saveCachedPlaylists(updated);
          return updated;
        });

        if (selectedPlaylistRef.current?.id === playlistId) {
          setSelectedPlaylist((prev) => (prev ? { ...prev, title, description } : null));
        }

        showPlaylistToast(`Playlist atualizada para "${title}"!`);
      } catch (err) {
        setErrorMessage(`Erro ao editar playlist: ${String(err)}`);
        throw err;
      }
    },
    [showPlaylistToast, setErrorMessage]
  );

  const handleConfirmDeletePlaylist = useCallback(async () => {
    if (!deletingPlaylist) return;
    const target = deletingPlaylist;

    try {
      await invoke("delete_playlist", { playlistId: target.id });

      setPlaylists((prev) => {
        const updated = prev.filter((p) => p.id !== target.id);
        LocalCacheService.saveCachedPlaylists(updated);
        return updated;
      });

      setPinnedPlaylistIds((prev) => {
        const updated = prev.filter((id) => id !== target.id);
        try {
          localStorage.setItem("tetplayer_pinned_playlists", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      if (selectedPlaylistRef.current?.id === target.id) {
        setSelectedPlaylist(null);
      }

      showPlaylistToast(`Playlist "${target.title}" removida da sua biblioteca com sucesso.`);
    } catch (err) {
      setErrorMessage(`Erro ao excluir playlist: ${String(err)}`);
      throw err;
    }
  }, [deletingPlaylist, showPlaylistToast, setErrorMessage]);

  // Escuta eventos globais de adicionar/remover de playlists
  useEffect(() => {
    const handleOpenAddToPlaylist = (e: Event) => {
      const customEvent = e as CustomEvent<{ track: Track }>;
      if (customEvent.detail?.track) {
        setAddToPlaylistTrack(customEvent.detail.track);
      }
    };

    const handleRemoveFromPlaylist = (e: Event) => {
      const customEvent = e as CustomEvent<{ track: Track; playlistId: string }>;
      if (customEvent.detail?.track && customEvent.detail?.playlistId) {
        handleRemoveTrackFromPlaylist(customEvent.detail.track, customEvent.detail.playlistId);
      }
    };

    const handleOpenAddTracksToPlaylist = (e: Event) => {
      const customEvent = e as CustomEvent<{ tracks: Track[]; albumTitle?: string }>;
      if (customEvent.detail?.tracks && customEvent.detail.tracks.length > 0) {
        setAddToPlaylistBatch({
          tracks: customEvent.detail.tracks,
          albumTitle: customEvent.detail.albumTitle,
        });
      }
    };

    const handleCollectionContextMenu = (e: Event) => {
      const customEvent = e as CustomEvent<{
        x: number;
        y: number;
        item: CollectionContextItem;
      }>;
      if (customEvent.detail?.item) {
        setCollectionMenuState({
          position: { x: customEvent.detail.x, y: customEvent.detail.y },
          item: customEvent.detail.item,
        });
      }
    };

    window.addEventListener("tetplayer:open-add-to-playlist", handleOpenAddToPlaylist);
    window.addEventListener("tetplayer:open-add-tracks-to-playlist", handleOpenAddTracksToPlaylist);
    window.addEventListener("tetplayer:remove-from-playlist", handleRemoveFromPlaylist);
    window.addEventListener("tetplayer:collection-context-menu", handleCollectionContextMenu);

    return () => {
      window.removeEventListener("tetplayer:open-add-to-playlist", handleOpenAddToPlaylist);
      window.removeEventListener("tetplayer:open-add-tracks-to-playlist", handleOpenAddTracksToPlaylist);
      window.removeEventListener("tetplayer:remove-from-playlist", handleRemoveFromPlaylist);
      window.removeEventListener("tetplayer:collection-context-menu", handleCollectionContextMenu);
    };
  }, [handleRemoveTrackFromPlaylist]);

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
    setSelectedPlaylist(null);
    closeNowPlaying();
    requestAnimationFrame(() => {
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = libraryScrollPosRef.current;
    });
  }, [mainScrollRef, playlistScrollPosRef, closeNowPlaying]);

  const handleBackToAlbums = useCallback(() => {
    playlistScrollPosRef.current = 0;
    setSelectedAlbum(null);
    setAlbumDetail(null);
    closeNowPlaying();
    requestAnimationFrame(() => {
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = libraryScrollPosRef.current;
    });
  }, [mainScrollRef, playlistScrollPosRef, closeNowPlaying]);

  const handleBackFromArtist = useCallback(() => {
    setSelectedArtist(null);
    setArtistDetail(null);
    closeNowPlaying();
    requestAnimationFrame(() => {
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = libraryScrollPosRef.current;
    });
  }, [mainScrollRef, closeNowPlaying]);

  const handleSidebarTabChange = useCallback((tab: ActiveTab) => {
    playlistScrollPosRef.current = 0;
    setActiveTab(tab);
    setSelectedArtist(null);
    setArtistDetail(null);
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

  const handlePlayPlaylistQuick = useCallback(
    async (playlist: Playlist, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const cached = LocalCacheService.getCachedPlaylistTracks(playlist.id);
        if (cached && cached.length > 0) {
          playTrackWithQueue(cached[0], cached, 0, playlist.id);
          return;
        }
        const tracks = await invoke<Track[]>("get_playlist_tracks", {
          playlistId: playlist.id,
        });
        if (tracks && tracks.length > 0) {
          LocalCacheService.saveCachedPlaylistTracks(playlist.id, tracks);
          playTrackWithQueue(tracks[0], tracks, 0, playlist.id);
        }
      } catch (err) {
        console.error("Erro ao reproduzir playlist rapidamente:", err);
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

  // Handlers para Ações do Menu de Contexto de Coleção (Playlists e Álbuns)
  const handlePlayCollectionFromMenu = useCallback(
    async (item: CollectionContextItem, shuffle = false) => {
      if (item.kind === "playlist") {
        try {
          const cached = LocalCacheService.getCachedPlaylistTracks(item.playlist.id);
          let tracks = cached;
          if (!tracks || tracks.length === 0) {
            tracks = await invoke<Track[]>("get_playlist_tracks", {
              playlistId: item.playlist.id,
            });
            if (tracks && tracks.length > 0) {
              LocalCacheService.saveCachedPlaylistTracks(item.playlist.id, tracks);
            }
          }
          if (tracks && tracks.length > 0) {
            let queue = [...tracks];
            let startIdx = 0;
            if (shuffle) {
              for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
              }
            }
            playTrackWithQueue(queue[0], queue, startIdx, item.playlist.id);
          }
        } catch (err) {
          console.error("Erro ao reproduzir playlist via menu de contexto:", err);
        }
      } else {
        try {
          const cached = LocalCacheService.getCachedAlbumDetail(item.album.id);
          let tracks = cached?.tracks;
          if (!tracks || tracks.length === 0) {
            const detail = await invoke<AlbumDetail>("get_album_details", {
              browseId: item.album.id,
            });
            if (detail && detail.tracks && detail.tracks.length > 0) {
              LocalCacheService.saveCachedAlbumDetail(item.album.id, detail);
              tracks = detail.tracks;
            }
          }
          if (tracks && tracks.length > 0) {
            handlePlayAlbum(tracks, 0, shuffle);
          }
        } catch (err) {
          console.error("Erro ao reproduzir álbum via menu de contexto:", err);
        }
      }
    },
    [playTrackWithQueue, handlePlayAlbum]
  );

  const handleAddToQueueFromMenu = useCallback(
    async (item: CollectionContextItem) => {
      if (item.kind === "playlist") {
        try {
          const cached = LocalCacheService.getCachedPlaylistTracks(item.playlist.id);
          let tracks = cached;
          if (!tracks || tracks.length === 0) {
            tracks = await invoke<Track[]>("get_playlist_tracks", {
              playlistId: item.playlist.id,
            });
            if (tracks && tracks.length > 0) {
              LocalCacheService.saveCachedPlaylistTracks(item.playlist.id, tracks);
            }
          }
          if (tracks && tracks.length > 0) {
            handleAddTracksToQueue(tracks);
          }
        } catch (err) {
          console.error("Erro ao adicionar playlist à fila:", err);
        }
      } else {
        try {
          const cached = LocalCacheService.getCachedAlbumDetail(item.album.id);
          let tracks = cached?.tracks;
          if (!tracks || tracks.length === 0) {
            const detail = await invoke<AlbumDetail>("get_album_details", {
              browseId: item.album.id,
            });
            if (detail && detail.tracks && detail.tracks.length > 0) {
              LocalCacheService.saveCachedAlbumDetail(item.album.id, detail);
              tracks = detail.tracks;
            }
          }
          if (tracks && tracks.length > 0) {
            handleAddTracksToQueue(tracks);
          }
        } catch (err) {
          console.error("Erro ao adicionar álbum à fila:", err);
        }
      }
    },
    [handleAddTracksToQueue]
  );

  const handleTogglePinFromMenu = useCallback(
    (item: CollectionContextItem) => {
      handleTogglePinPlaylist(
        item.kind === "playlist" ? item.playlist.id : item.album.id
      );
    },
    [handleTogglePinPlaylist]
  );

  const handleAddAlbumToPlaylistFromMenu = useCallback(
    async (album: Album) => {
      try {
        const cached = LocalCacheService.getCachedAlbumDetail(album.id);
        let tracks = cached?.tracks;
        if (!tracks || tracks.length === 0) {
          const detail = await invoke<AlbumDetail>("get_album_details", {
            browseId: album.id,
          });
          if (detail && detail.tracks) {
            LocalCacheService.saveCachedAlbumDetail(album.id, detail);
            tracks = detail.tracks;
          }
        }
        if (tracks && tracks.length > 0) {
          setAddToPlaylistBatch({
            tracks,
            albumTitle: album.title,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar faixas do álbum para adicionar à playlist:", err);
      }
    },
    []
  );

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
            onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={handleSelectPlaylist}
            albums={albums}
            isLoadingAlbums={isLoadingAlbums}
            onRefreshAlbums={loadAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={handleSelectAlbum}
            onPlayPlaylistQuick={handlePlayPlaylistQuick}
            onPlayAlbumQuick={handlePlayAlbumQuick}
            activeCollectionId={activeCollectionId}
            isPlaying={isPlaying}
            onTogglePlayPause={togglePlayPause}
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
              <div className="m-6 mb-0 bg-red-950/40 border border-red-800/60 text-red-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 animate-view-fade">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="flex-1">{humanizeApiError(errorMessage)}</span>
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
              <div
                key={
                  activeTab === "library"
                    ? selectedArtist
                      ? `artist-${selectedArtist.id || selectedArtist.name}`
                      : selectedPlaylist
                      ? `playlist-${selectedPlaylist.id}`
                      : selectedAlbum
                      ? `album-${selectedAlbum.id}`
                      : `library-${librarySection}`
                    : activeTab
                }
                className="animate-view-fade space-y-6"
              >
              {activeTab === "library" && (
                <>
                  {selectedArtist ? (
                    <ArtistDetailView
                      artistName={selectedArtist.name}
                      artistId={selectedArtist.id}
                      artistDetail={artistDetail}
                      isLoading={isLoadingArtistDetail}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      loadingTrackId={loadingTrackId}
                      onBack={handleBackFromArtist}
                      onPlayArtistTracks={handlePlayAlbum}
                      onPlayTrack={(track, idx, customQueue) =>
                        playTrackWithQueue(
                          track,
                          customQueue || artistDetail?.tracks || [track],
                          idx,
                          artistDetail?.id || selectedArtist.id
                        )
                      }
                      onTogglePlayPause={togglePlayPause}
                      onSelectAlbum={handleSelectAlbum}
                      onPlayAlbumQuick={handlePlayAlbumQuick}
                      pinnedAlbumIds={pinnedPlaylistIds}
                      onTogglePinAlbum={handleTogglePinPlaylist}
                    />
                  ) : selectedPlaylist ? (
                    <PlaylistDetailView
                      playlist={selectedPlaylist}
                      tracks={playlistTracks}
                      isLoadingTracks={isLoadingPlaylistTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      loadingTrackId={loadingTrackId}
                      onBack={handleBackToPlaylists}
                      onEditPlaylist={(pl) => setEditingPlaylist(pl)}
                      onDeletePlaylist={(pl) => setDeletingPlaylist(pl)}
                      onReorderTrack={handleReorderPlaylistTrack}
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
                      onPlayAlbumQuick={handlePlayAlbumQuick}
                      pinnedAlbumIds={pinnedPlaylistIds}
                      onTogglePinAlbum={handleTogglePinPlaylist}
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Barra de Ferramentas Unificada da Biblioteca (Eixo 2) */}
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-white/5">
                        {/* Segmented Control: Tudo | Playlists | Álbuns (Animação de Slide 144 FPS) */}
                        <div className="relative inline-flex items-center p-1 bg-[#12141f] border border-[#272c3f] rounded-xl select-none self-start">
                          <div
                            className="absolute top-1 bottom-1 w-32 rounded-lg bg-[var(--accent)] shadow-md shadow-[var(--accent-glow)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                            style={{
                              transform:
                                librarySection === "all"
                                  ? "translate3d(0px, 0, 0)"
                                  : librarySection === "playlists"
                                  ? "translate3d(128px, 0, 0)"
                                  : "translate3d(256px, 0, 0)",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => setLibrarySection("all")}
                            className={`relative z-10 w-32 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                              librarySection === "all"
                                ? "text-white font-bold"
                                : "text-[#8c91a4] hover:text-white"
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Tudo</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                                librarySection === "all"
                                  ? "bg-white/20 text-white font-bold"
                                  : "bg-white/5 text-[#8c91a4]"
                              }`}
                            >
                              {playlists.length + albums.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLibrarySection("playlists")}
                            className={`relative z-10 w-32 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                              librarySection === "playlists"
                                ? "text-white font-bold"
                                : "text-[#8c91a4] hover:text-white"
                            }`}
                          >
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>Playlists</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                                librarySection === "playlists"
                                  ? "bg-white/20 text-white font-bold"
                                  : "bg-white/5 text-[#8c91a4]"
                              }`}
                            >
                              {playlists.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLibrarySection("albums")}
                            className={`relative z-10 w-32 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                              librarySection === "albums"
                                ? "text-white font-bold"
                                : "text-[#8c91a4] hover:text-white"
                            }`}
                          >
                            <Disc3 className="w-3.5 h-3.5" />
                            <span>Álbuns</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                                librarySection === "albums"
                                  ? "bg-white/20 text-white font-bold"
                                  : "bg-white/5 text-[#8c91a4]"
                              }`}
                            >
                              {albums.length}
                            </span>
                          </button>
                        </div>

                        {/* Controles Unificados: Busca Instantânea + Ordenação Customizada + Densidade + Ações */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Busca Instantânea Unificada */}
                          <div className="relative flex-1 sm:flex-initial sm:w-56">
                            <Search className="w-3.5 h-3.5 text-[#63697e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={librarySearchQuery}
                              onChange={(e) => setLibrarySearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setLibrarySearchQuery("");
                              }}
                              placeholder={
                                librarySection === "playlists"
                                  ? "Filtrar playlists..."
                                  : librarySection === "albums"
                                  ? "Filtrar álbuns ou artistas..."
                                  : "Filtrar playlists e álbuns..."
                              }
                              aria-label="Filtrar na biblioteca"
                              className="w-full bg-[#131622] border border-[#232738] focus:border-[var(--accent)] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#63697e] outline-none transition-colors"
                            />
                            {librarySearchQuery && (
                              <button
                                type="button"
                                onClick={() => setLibrarySearchQuery("")}
                                aria-label="Limpar busca da biblioteca"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#63697e] hover:text-white p-0.5 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Seletor de Ordenação Customizado da Biblioteca */}
                          <div
                            ref={librarySortDropdownRef}
                            className="relative flex items-center gap-1.5"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-[#71778c] shrink-0" />
                            <button
                              type="button"
                              onClick={() => setIsLibrarySortOpen((prev) => !prev)}
                              aria-label="Ordenar biblioteca por"
                              aria-expanded={isLibrarySortOpen}
                              aria-haspopup="listbox"
                              className={`flex items-center justify-between gap-2 min-w-[155px] bg-[#131622] hover:bg-[#191d2c] border rounded-xl px-3 py-1.5 text-xs font-medium text-white transition-all cursor-pointer select-none ${
                                isLibrarySortOpen
                                  ? "border-[var(--accent)] ring-1 ring-[var(--accent-glow)]/40"
                                  : "border-[#232738] hover:border-[#323850]"
                              }`}
                            >
                              <span className="truncate">
                                {(
                                  [
                                    { value: "recent", label: "Recentes / Padrão" },
                                    { value: "title", label: "Título (A-Z)" },
                                    { value: "artist", label: "Artista / Autor (A-Z)" },
                                    { value: "count_desc", label: "Mais faixas / Ano" },
                                  ] as const
                                ).find((o) => o.value === librarySortBy)?.label ||
                                  "Recentes / Padrão"}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-[#8c91a4] transition-transform duration-200 shrink-0 ${
                                  isLibrarySortOpen
                                    ? "rotate-180 text-[var(--accent-text)]"
                                    : ""
                                }`}
                              />
                            </button>

                            {isLibrarySortOpen && (
                              <div
                                role="listbox"
                                aria-label="Opções de ordenação da biblioteca"
                                className="absolute right-0 top-full mt-1.5 z-50 min-w-[205px] bg-[#12141f]/95 backdrop-blur-2xl border border-[#272c3f] rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
                              >
                                {(
                                  [
                                    { value: "recent", label: "Recentes / Padrão" },
                                    { value: "title", label: "Título (A-Z)" },
                                    { value: "artist", label: "Artista / Autor (A-Z)" },
                                    { value: "count_desc", label: "Mais faixas / Ano" },
                                  ] as const
                                ).map((opt) => {
                                  const isSelected = librarySortBy === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => {
                                        setLibrarySortBy(opt.value);
                                        setIsLibrarySortOpen(false);
                                      }}
                                      className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left ${
                                        isSelected
                                          ? "bg-[var(--accent-subtle)] text-white border border-[var(--accent-border)] font-semibold shadow-sm"
                                          : "text-[#c4c8d8] hover:text-white hover:bg-white/5 border border-transparent"
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Alternador de Densidade da Grade: Confortável vs Compacto */}
                          <div
                            role="group"
                            aria-label="Densidade da grade"
                            className="inline-flex items-center p-0.5 bg-[#131622] border border-[#232738] rounded-xl"
                          >
                            <button
                              type="button"
                              onClick={() => handleSetLibraryDensity("comfortable")}
                              title="Grade Padrão (Cards maiores)"
                              aria-label="Grade padrão"
                              aria-pressed={libraryDensity === "comfortable"}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                libraryDensity === "comfortable"
                                  ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] shadow-sm"
                                  : "text-[#71778c] hover:text-white border border-transparent"
                              }`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetLibraryDensity("compact")}
                              title="Grade Compacta (Mais itens por linha)"
                              aria-label="Grade compacta"
                              aria-pressed={libraryDensity === "compact"}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                libraryDensity === "compact"
                                  ? "bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] shadow-sm"
                                  : "text-[#71778c] hover:text-white border border-transparent"
                              }`}
                            >
                              <Grid3x3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Botão Criar Nova Playlist */}
                          <button
                            type="button"
                            onClick={() => setIsCreatePlaylistOpen(true)}
                            title="Criar nova playlist no YouTube Music"
                            aria-label="Nova playlist"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] hover:opacity-90 text-xs font-semibold cursor-pointer transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Nova Playlist</span>
                          </button>

                          {/* Botão Atualizar Biblioteca */}
                          <button
                            type="button"
                            onClick={() => {
                              loadPlaylists();
                              loadAlbums();
                            }}
                            disabled={isLoadingPlaylists || isLoadingAlbums}
                            title="Sincronizar playlists e álbuns"
                            aria-label="Sincronizar biblioteca"
                            className="p-2 rounded-xl bg-[#131622] hover:bg-[#1a1e2c] border border-[#232738] text-[#8c91a4] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isLoadingPlaylists || isLoadingAlbums
                                  ? "animate-spin text-[var(--accent)]"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {librarySection === "all" ? (
                        <LibraryOverview
                          playlists={playlists}
                          isLoadingPlaylists={isLoadingPlaylists}
                          albums={albums}
                          isLoadingAlbums={isLoadingAlbums}
                          onRefreshAlbums={loadAlbums}
                          pinnedIds={pinnedPlaylistIds}
                          playlistHistory={playlistHistory}
                          activeCollectionId={activeCollectionId}
                          isPlaying={isPlaying}
                          onSelectPlaylist={handleSelectPlaylist}
                          onSelectAlbum={handleSelectAlbum}
                          onPlayPlaylistQuick={handlePlayPlaylistQuick}
                          onPlayAlbumQuick={handlePlayAlbumQuick}
                          onTogglePin={handleTogglePinPlaylist}
                          onTogglePlayPause={togglePlayPause}
                          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                          onSwitchSection={(sec) => setLibrarySection(sec)}
                          searchQuery={librarySearchQuery}
                          sortBy={librarySortBy}
                          density={libraryDensity}
                        />
                      ) : librarySection === "playlists" ? (
                        <PlaylistGridView
                          playlists={playlists}
                          isLoadingPlaylists={isLoadingPlaylists}
                          pinnedPlaylistIds={pinnedPlaylistIds}
                          onSelectPlaylist={handleSelectPlaylist}
                          onTogglePinPlaylist={handleTogglePinPlaylist}
                          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                          onPlayPlaylistQuick={handlePlayPlaylistQuick}
                          activeCollectionId={activeCollectionId}
                          isPlaying={isPlaying}
                          onTogglePlayPause={togglePlayPause}
                          playlistHistory={playlistHistory}
                          searchQuery={librarySearchQuery}
                          sortBy={librarySortBy}
                          density={libraryDensity}
                          hideHeader={true}
                        />
                      ) : (
                        <AlbumGridView
                          albums={albums}
                          isLoading={isLoadingAlbums}
                          onRefresh={loadAlbums}
                          onSelectAlbum={handleSelectAlbum}
                          onPlayAlbumQuick={handlePlayAlbumQuick}
                          pinnedAlbumIds={pinnedPlaylistIds}
                          onTogglePinAlbum={handleTogglePinPlaylist}
                          activeCollectionId={activeCollectionId}
                          isPlaying={isPlaying}
                          onTogglePlayPause={togglePlayPause}
                          playlistHistory={playlistHistory}
                          externalSearchQuery={librarySearchQuery}
                          externalSortBy={librarySortBy}
                          density={libraryDensity}
                          hideToolbar={true}
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
              </div>
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

      {/* Modais de Manipulação de Playlists (Sugestão 2.4) */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        initialTitle={createPlaylistInitialTitle}
        onClose={() => {
          setIsCreatePlaylistOpen(false);
          setCreatePlaylistInitialTitle("");
          setPendingTracksForNewPlaylist(null);
        }}
        onCreate={handleCreatePlaylist}
      />

      <AddToPlaylistModal
        isOpen={!!addToPlaylistTrack || !!addToPlaylistBatch}
        track={addToPlaylistTrack}
        tracks={addToPlaylistBatch?.tracks}
        sourceAlbumTitle={addToPlaylistBatch?.albumTitle}
        playlists={playlists}
        onClose={() => {
          setAddToPlaylistTrack(null);
          setAddToPlaylistBatch(null);
        }}
        onAddToPlaylist={handleAddTrackToPlaylist}
        onCreateNewPlaylist={(suggestedTitle, albumTracks) => {
          setAddToPlaylistTrack(null);
          setAddToPlaylistBatch(null);
          setCreatePlaylistInitialTitle(suggestedTitle || "");
          setPendingTracksForNewPlaylist(albumTracks || null);
          setIsCreatePlaylistOpen(true);
        }}
      />

      <CollectionContextMenu
        item={collectionMenuState?.item || null}
        position={collectionMenuState?.position || null}
        onClose={() => setCollectionMenuState(null)}
        onPlay={handlePlayCollectionFromMenu}
        onAddToQueue={handleAddToQueueFromMenu}
        onTogglePin={handleTogglePinFromMenu}
        onAddAlbumToPlaylist={handleAddAlbumToPlaylistFromMenu}
        onEditPlaylist={(pl) => setEditingPlaylist(pl)}
        onDeletePlaylist={(pl) => setDeletingPlaylist(pl)}
      />

      <EditPlaylistModal
        isOpen={!!editingPlaylist}
        playlist={editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onSave={handleEditPlaylistMetadata}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingPlaylist}
        title="Excluir Playlist"
        itemName={deletingPlaylist?.title || ""}
        onClose={() => setDeletingPlaylist(null)}
        onConfirm={handleConfirmDeletePlaylist}
      />

      {/* Toast Feedback de Manipulação de Playlist */}
      {playlistToast && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#12141f] border border-[var(--accent)] text-white text-xs font-semibold shadow-2xl shadow-[var(--accent-glow)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>{playlistToast}</span>
        </div>
      )}
    </div>
  );
}
