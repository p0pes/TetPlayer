import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Minus,
  Copy,
  Square,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowDownToDot,
  WifiOff,
  Wifi,
} from "lucide-react";
import { AuthSession, Playlist, Track, ActiveTab, NowPlayingTab } from "../../types";
import { useNetworkStatus } from "../../services/network";
import { SettingsService } from "../../services/settings";
import { APP_VERSION } from "../../services/updater";

interface TitleBarProps {
  auth: AuthSession | null;
  activeTab: ActiveTab;
  selectedPlaylist: Playlist | null;
  currentTrack: Track | null;
  isNowPlayingOpen: boolean;
  nowPlayingTab: NowPlayingTab;
  showLyrics: boolean;
}

export const TitleBar = React.memo(function TitleBar({
  auth,
  activeTab,
  selectedPlaylist,
  currentTrack,
  isNowPlayingOpen,
  nowPlayingTab,
  showLyrics,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const { isOnline, showRestoredNotice } = useNetworkStatus();

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

  async function handleStartDrag(e: React.MouseEvent) {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("select")
      ) {
        return;
      }
      try {
        await invoke("start_drag_window");
      } catch {
        // ignore fallback fora do Tauri
      }
    }
  }

  const breadcrumbText = isNowPlayingOpen
    ? `Reprodução > ${nowPlayingTab === "queue" ? "Fila de Reprodução" : "Letras"} > ${currentTrack?.title || "Música Atual"}`
    : showLyrics
    ? `Letras Sincronizadas > ${currentTrack?.title || "Música Atual"}`
    : activeTab === "library"
    ? selectedPlaylist
      ? `Biblioteca > ${selectedPlaylist.title}`
      : "Biblioteca de Playlists"
    : activeTab === "search"
    ? "Busca de Músicas"
    : "Estatísticas de Reprodução";

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleStartDrag}
      onDoubleClick={handleToggleMaximize}
      className="h-10 border-b border-[#1f232e] bg-[#0c0e14]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-50 cursor-default"
    >
      {/* Esquerda: Logo TetPlayer alinhado à largura da sidebar */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2.5 px-4 w-64 shrink-0 h-full border-r border-[#1f232e]"
      >
        <div className="w-3 h-3 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] animate-pulse" />
        <span className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5 pointer-events-none">
          TetPlayer{" "}
          <span className="text-[9px] bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent-border)] px-1.5 py-0.5 rounded font-medium tracking-normal">
            v{APP_VERSION}
          </span>
        </span>
      </div>

      {/* Centro: Breadcrumbs / Título da Visualização Ativa */}
      <div data-tauri-drag-region className="flex-1 flex items-center px-4 h-full pointer-events-none min-w-0 overflow-hidden">
        <span
          key={breadcrumbText}
          className="text-xs text-[#8c91a4] truncate animate-breadcrumb-fade inline-block"
        >
          {breadcrumbText}
        </span>
      </div>

      {/* Direita: Status de Conectividade + Status de Sessão + Controles de Janela Colados no Canto */}
      <div className="flex items-center h-full shrink-0">
        {!isOnline && (
          <span className="inline-flex items-center gap-1.5 bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            Modo Offline
          </span>
        )}
        {isOnline && showRestoredNotice && (
          <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none transition-all">
            <Wifi className="w-3.5 h-3.5" />
            Conexão Restaurada
          </span>
        )}

        {auth?.is_authenticated ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Google: {auth.user_name || "Conectado"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-amber-950/70 text-amber-300 border border-amber-800/50 px-2.5 py-0.5 rounded-full text-xs mr-3 pointer-events-none">
            <AlertCircle className="w-3.5 h-3.5" />
            Modo Visitante
          </span>
        )}

        {/* Menu de Navegação / Janela do Windows (Minimizar para Bandeja, Minimizar, Modo Janela, Fechar) */}
        <div className="flex items-center h-full">
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
