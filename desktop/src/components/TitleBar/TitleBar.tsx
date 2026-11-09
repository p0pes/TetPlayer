import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Minus,
  Copy,
  Square,
  X,
  ArrowDownToDot,
  WifiOff,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { AuthSession, Playlist, Track, ActiveTab, NowPlayingTab, Album } from "../../types";
import { useNetworkStatus } from "../../services/network";
import { SettingsService } from "../../services/settings";

interface TitleBarProps {
  auth: AuthSession | null;
  activeTab: ActiveTab;
  selectedPlaylist: Playlist | null;
  selectedAlbum?: Album | null;
  selectedArtist?: { id?: string; name: string } | null;
  currentTrack: Track | null;
  isNowPlayingOpen: boolean;
  nowPlayingTab: NowPlayingTab;
  showLyrics: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  isHeaderScrolled?: boolean;
  onOpenCommandPalette?: () => void;
}

export const TitleBar = React.memo(function TitleBar({
  activeTab,
  selectedPlaylist,
  selectedAlbum,
  selectedArtist,
  isNowPlayingOpen,
  nowPlayingTab,
  showLyrics,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  isHeaderScrolled = false,
  onOpenCommandPalette,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const { isOnline, isSimulatedOffline, showRestoredNotice, toggleSimulatedOffline } = useNetworkStatus();

  useEffect(() => {
    checkMaximizedState();

    const handleResize = () => {
      checkMaximizedState();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function checkMaximizedState() {
    try {
      const maximized = await invoke<boolean>("is_window_maximized");
      setIsMaximized(maximized);
    } catch {
      // ignore
    }
  }

  async function handleMinimize() {
    try {
      await invoke("minimize_window");
    } catch (err) {
      console.error("Erro ao minimizar janela:", err);
    }
  }

  async function handleHideToTray() {
    try {
      await invoke("hide_to_tray");
    } catch (err) {
      console.error("Erro ao ocultar na bandeja:", err);
    }
  }

  async function handleToggleMaximize() {
    try {
      const maximized = await invoke<boolean>("toggle_maximize_window");
      setIsMaximized(maximized);
    } catch (err) {
      console.error("Erro ao alternar maximizar/modo janela:", err);
    }
  }

  async function handleClose() {
    try {
      const closeAction = SettingsService.getSetting("closeAction");
      if (closeAction === "tray") {
        await invoke("hide_to_tray");
      } else {
        await invoke("close_window");
      }
    } catch (err) {
      console.error("Erro ao fechar/ocultar aplicação:", err);
      try {
        await invoke("close_window");
      } catch {
        // ignore
      }
    }
  }

  const pendingMaxDragRef = React.useRef<{ x: number; y: number } | null>(null);

  async function handleStartDrag(e: React.MouseEvent) {
    if (e.button === 0) {
      if (e.detail > 1) {
        pendingMaxDragRef.current = null;
        return;
      }
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("select") ||
        target.closest("[data-no-drag]")
      ) {
        return;
      }
      if (isMaximized) {
        pendingMaxDragRef.current = { x: e.screenX, y: e.screenY };
        return;
      }
      try {
        await invoke("start_drag_window");
      } catch {
        // ignore fallback fora do Tauri
      }
    }
  }

  async function handleMouseMoveDrag(e: React.MouseEvent) {
    if (!pendingMaxDragRef.current) return;
    if ((e.buttons & 1) === 0) {
      pendingMaxDragRef.current = null;
      return;
    }
    const dx = Math.abs(e.screenX - pendingMaxDragRef.current.x);
    const dy = Math.abs(e.screenY - pendingMaxDragRef.current.y);
    if (dx > 3 || dy > 3) {
      pendingMaxDragRef.current = null;
      setIsMaximized(false);
      try {
        await invoke("start_drag_window");
      } catch {
        // ignore fallback fora do Tauri
      }
    }
  }

  function handleMouseUpDrag() {
    pendingMaxDragRef.current = null;
  }

  const isCollectionDetailView =
    !isNowPlayingOpen &&
    !showLyrics &&
    activeTab === "library" &&
    Boolean(selectedPlaylist || selectedAlbum || selectedArtist);

  const hideRedundantTitle = isCollectionDetailView && !isHeaderScrolled;

  const breadcrumbText = isNowPlayingOpen
    ? nowPlayingTab === "queue"
      ? "Fila de Reprodução"
      : "Letras Sincronizadas"
    : showLyrics
      ? "Letras Sincronizadas"
      : activeTab === "library"
        ? selectedArtist
          ? selectedArtist.name
          : selectedPlaylist
            ? selectedPlaylist.title
            : selectedAlbum
              ? selectedAlbum.title
              : "Biblioteca"
        : activeTab === "search"
          ? "Busca"
          : "Estatísticas";

  return (
    <header
      onMouseDown={handleStartDrag}
      onMouseMove={handleMouseMoveDrag}
      onMouseUp={handleMouseUpDrag}
      onDoubleClick={handleToggleMaximize}
      className="h-10 border-b border-white/[0.06] bg-[#0b0d13]/85 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-50 cursor-default"
    >
      {/* Esquerda: Logo TetPlayer limpo alinhado à largura da sidebar */}
      <div
        className="flex items-center gap-2.5 px-4 w-64 shrink-0 h-full border-r border-white/[0.06]"
      >
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] pointer-events-none" />
        <span className="font-bold text-xs tracking-wide text-white/90 pointer-events-none">
          TetPlayer
        </span>
      </div>

      {/* Centro: Navegação Histórico + Contexto Conciso */}
      <div className="flex-1 flex items-center px-3 h-full min-w-0 overflow-hidden gap-2">
        <div data-no-drag className="flex items-center gap-0.5 shrink-0 pointer-events-auto">
          <button
            type="button"
            data-no-drag
            onClick={onGoBack}
            disabled={!canGoBack}
            title="Voltar (Alt+← / Mouse 4)"
            aria-label="Voltar para a tela anterior"
            className={`p-1 rounded-md transition-all cursor-pointer ${canGoBack
                ? "text-[#8c91a4] hover:text-white hover:bg-white/[0.08] active:scale-95"
                : "text-[#8c91a4]/20 cursor-not-allowed"
              }`}
          >
            <ChevronLeft className="w-4 h-4 pointer-events-none" />
          </button>
          <button
            type="button"
            data-no-drag
            onClick={onGoForward}
            disabled={!canGoForward}
            title="Avançar (Alt+→ / Mouse 5)"
            aria-label="Avançar para a próxima tela"
            className={`p-1 rounded-md transition-all cursor-pointer ${canGoForward
                ? "text-[#8c91a4] hover:text-white hover:bg-white/[0.08] active:scale-95"
                : "text-[#8c91a4]/20 cursor-not-allowed"
              }`}
          >
            <ChevronRight className="w-4 h-4 pointer-events-none" />
          </button>
        </div>

        <span
          key={breadcrumbText}
          className={`text-xs font-medium text-[#8c91a4] truncate transition-opacity duration-200 inline-block pointer-events-none ${hideRedundantTitle ? "opacity-0" : "opacity-100 animate-breadcrumb-fade"
            }`}
        >
          {breadcrumbText}
        </span>
      </div>

      {/* Direita: Atalho Command Palette (Ctrl+K) + Indicador Compacto de Rede + Controles de Janela */}
      <div className="flex items-center h-full shrink-0">
        {onOpenCommandPalette && (
          <button
            type="button"
            data-no-drag
            onClick={onOpenCommandPalette}
            title="Paleta de Comandos e Busca Rápida (Ctrl+K)"
            aria-label="Abrir paleta de comandos rápidos"
            className="hidden sm:inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[var(--accent-border)] text-[#8c91a4] hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-medium mr-2 transition-colors cursor-pointer"
          >
            <Search className="w-3 h-3 text-[var(--accent-text)]" />
            <span>Ir para...</span>
            <kbd className="text-[10px] font-mono text-[#63697e] bg-black/30 px-1 rounded border border-white/[0.05]">
              Ctrl+K
            </kbd>
          </button>
        )}
        {/* Toggle Dev de Simulação Offline (Apenas em Modo Desenvolvimento) */}
        {import.meta.env.DEV && !isOnline && isSimulatedOffline && (
          <button
            data-no-drag
            onClick={toggleSimulatedOffline}
            title="Dev: Conexão cortada para testes offline. Clique para RESTABELECER a conexão com a internet (Ctrl+Alt+O)."
            className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mr-2 transition-all cursor-pointer"
          >
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>Dev: Offline</span>
          </button>
        )}
        {!isOnline && !isSimulatedOffline && (
          <span
            data-no-drag
            role="status"
            aria-live="polite"
            title="Modo offline (sem conexão com a internet) — Exibindo apenas playlists e álbuns disponíveis offline"
            className="inline-flex items-center gap-1.5 bg-amber-950/70 text-amber-300 border border-amber-700/40 px-2.5 py-0.5 rounded-full text-[11px] font-medium mr-2.5"
          >
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </span>
        )}
        {import.meta.env.DEV && isOnline && (
          <button
            data-no-drag
            onClick={toggleSimulatedOffline}
            title="Dev: Cortar conexão da aplicação para testar reprodução e cache offline (Ctrl+Alt+O)"
            className="hidden sm:inline-flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.07] text-[#71778c] hover:text-white border border-white/[0.06] px-2 py-0.5 rounded-md text-[10px] font-mono mr-2 transition-all cursor-pointer"
          >
            <Wifi className="w-2.5 h-2.5 text-emerald-400/80" />
            <span>Dev</span>
          </button>
        )}
        {isOnline && showRestoredNotice && (
          <span
            data-no-drag
            title="Conexão com a internet restaurada"
            className="inline-flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 rounded-full text-[11px] font-medium mr-2.5 transition-all"
          >
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </span>
        )}

        {/* Controles Nativos da Janela (Bandeja, Minimizar, Maximizar/Restaurar, Fechar) */}
        <div data-no-drag className="flex items-center h-full">
          <button
            onClick={handleHideToTray}
            title="Minimizar para a Bandeja do Windows (System Tray)"
            aria-label="Minimizar para bandeja"
            className="w-10 h-full flex items-center justify-center text-[#8c91a4] hover:text-amber-400 hover:bg-[#1f232e] transition-colors cursor-pointer"
          >
            <ArrowDownToDot className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleMinimize}
            title="Minimizar"
            aria-label="Minimizar"
            className="w-11 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleMaximize}
            title={isMaximized ? "Restaurar (Modo Janela)" : "Maximizar"}
            aria-label={isMaximized ? "Restaurar" : "Maximizar"}
            className="w-12 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#1f232e] transition-colors cursor-pointer"
          >
            {isMaximized ? (
              <Copy className="w-3 h-3" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={handleClose}
            title="Fechar"
            aria-label="Fechar"
            className="w-12 h-full flex items-center justify-center text-[#8c91a4] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
});
