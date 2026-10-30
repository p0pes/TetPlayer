import React, { useState, useEffect, useCallback } from "react";
import { useModalAnimation } from "../../hooks/useModalAnimation";
import {
  X,
  Volume2,
  Sliders,
  Palette,
  Monitor,
  Database,
  Info,
  Radio,
  Layers,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Command,
  Flame,
  Music2,
  SlidersHorizontal,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Download,
  ExternalLink,
  Folder,
  FolderOpen,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  SettingsService,
  AppSettings,
  VisualizerStyle,
  AccentTheme,
} from "../../services/settings";
import { LocalCacheService } from "../../services/cache";
import { AuthSession } from "../../types";
import { SpectrumVisualizer } from "../Visualizer/SpectrumVisualizer";
import {
  checkForAppUpdates,
  downloadAndInstallUpdate,
  downloadAndInstallInAppUpdate,
  formatBytes,
  openReleasePage,
  UpdateInfo,
  UpdateProgress,
  APP_VERSION,
} from "../../services/updater";

export type SettingsTabId = "audio" | "appearance" | "system" | "storage" | "about";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthSession | null;
  isCheckingAuth: boolean;
  onRefreshAuth: () => Promise<void>;
  onForceAnonymous?: () => void;
  onGoogleLogin?: () => Promise<void>;
  onGoogleLogout?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  auth,
  isCheckingAuth,
  onRefreshAuth,
  onForceAnonymous,
  onGoogleLogin,
  onGoogleLogout,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("audio");
  const [settings, setSettings] = useState<AppSettings>(() => SettingsService.getSettings());
  const { shouldRender, requestClose, backdropClassName, modalClassName } =
    useModalAnimation(isOpen, onClose, 140);
  const [cacheSize, setCacheSize] = useState<string>("Calculando...");
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);

  // Estados reativos do Auto-Update Manual nas Configurações (Item 4.10)
  const [manualUpdateState, setManualUpdateState] = useState<"idle" | "checking" | "upToDate" | "available">("idle");
  const [manualUpdateInfo, setManualUpdateInfo] = useState<UpdateInfo | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [inAppProgress, setInAppProgress] = useState<UpdateProgress | null>(null);
  const [appStoragePath, setAppStoragePath] = useState<string>("");

  const handleOpenStorageFolder = useCallback(async () => {
    try {
      await invoke("open_app_storage_dir");
    } catch (err) {
      console.error("[Settings] Erro ao abrir pasta de armazenamento:", err);
    }
  }, []);

  const handleStartUpdate = useCallback(async (info: UpdateInfo) => {
    if (info.isNativeUpdater) {
      setInAppProgress({
        status: "downloading",
        percent: 0,
        downloadedBytes: 0,
      });
      await downloadAndInstallInAppUpdate(info, (prog) => {
        setInAppProgress(prog);
      });
    } else {
      await downloadAndInstallUpdate(info);
    }
  }, []);

  const handleManualCheckUpdates = useCallback(async () => {
    setManualUpdateState("checking");
    try {
      const info = await checkForAppUpdates();
      setLastCheckedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (info.hasUpdate) {
        setManualUpdateInfo(info);
        setManualUpdateState("available");
      } else {
        setManualUpdateState("upToDate");
      }
    } catch {
      setManualUpdateState("upToDate");
    }
  }, []);

  // Recarrega configurações sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      setSettings(SettingsService.getSettings());
      setCacheSize(LocalCacheService.getEstimatedCacheSize());
      setCacheClearSuccess(false);

      invoke<{ storageDir?: string }>("get_app_storage_info")
        .then((info) => {
          if (info?.storageDir) setAppStoragePath(info.storageDir);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Listener para fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      SettingsService.updateSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  async function handleClearCache() {
    setIsClearingCache(true);
    try {
      await LocalCacheService.clearCache();
      setCacheSize(LocalCacheService.getEstimatedCacheSize());
      setCacheClearSuccess(true);
      setTimeout(() => setCacheClearSuccess(false), 3000);
    } finally {
      setIsClearingCache(false);
    }
  }

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none cursor-pointer ${backdropClassName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className={`w-full max-w-2xl h-[580px] bg-[#0d0f17] border border-[#232838] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white cursor-default ${modalClassName}`}>
        {/* Cabeçalho do Modal */}
        <div className="h-14 px-6 border-b border-[#1f2434] flex items-center justify-between shrink-0 bg-[#111420]/80">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-[var(--accent)]" />
            <h2 id="settings-modal-title" className="text-base font-bold text-white tracking-tight">
              Configurações do TetPlayer
            </h2>
          </div>
          <button
            onClick={requestClose}
            aria-label="Fechar configurações"
            className="p-1.5 rounded-xl text-[#8c91a4] hover:text-white hover:bg-[#1f2436] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Dividido: Abas Laterais e Conteúdo */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Navegação por Abas Verticais à Esquerda */}
          <aside className="w-48 bg-[#0b0c13] border-r border-[#1f2434] p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveTab("audio")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "audio"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-subtle)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Áudio & Fila</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "appearance"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-subtle)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Aparência</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("system")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "system"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-subtle)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Sistema & Atalhos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("storage")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "storage"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-subtle)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Sessão & Cache</span>
            </button>

            <div className="my-1 border-t border-[#1f2434]" />

            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                activeTab === "about"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-subtle)]"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>Sobre o App</span>
            </button>
          </aside>

          {/* Painel de Conteúdo da Aba Ativa */}
          <main key={activeTab} className="flex-1 p-6 overflow-y-auto space-y-6 animate-view-fade">
            {/* ============================================================== */}
            {/* ABA 1: ÁUDIO & REPRODUÇÃO                                      */}
            {/* ============================================================== */}
            {activeTab === "audio" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[var(--accent-text)]" />
                    Transição Suave (Crossfade)
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Faz a transição gradual e contínua do volume entre o final da música atual e o
                    início da próxima.
                  </p>

                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={settings.crossfadeSeconds}
                      onChange={(e) => updateSetting("crossfadeSeconds", parseInt(e.target.value, 10))}
                      className="flex-1 h-1.5 bg-[#1f2436] rounded-full accent-[var(--accent)] cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] min-w-[70px] text-center">
                      {settings.crossfadeSeconds === 0 ? "Desligado" : `${settings.crossfadeSeconds}s`}
                    </span>
                  </div>

                  {/* Predefinições Rápidas */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {[0, 2, 3, 5, 8, 12].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => updateSetting("crossfadeSeconds", sec)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer ${
                          settings.crossfadeSeconds === sec
                            ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white font-bold shadow-sm"
                            : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                        }`}
                      >
                        {sec === 0 ? "Off" : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Radio className="w-4 h-4 text-[var(--accent-text)]" />
                        Autoplay Infinito & Rádio Contínua
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Gera recomendações automáticas baseadas na música atual quando a fila terminar,
                        mantendo a reprodução sem pausas.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={settings.isAutoplayRadio}
                        onChange={(e) => updateSetting("isAutoplayRadio", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--accent-text)]" />
                        Normalização de Volume (ReplayGain)
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Ajusta suavemente o ganho de volume para evitar disparidades bruscas entre
                        músicas gravadas em intensidades diferentes.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={settings.normalizeVolume}
                        onChange={(e) => updateSetting("normalizeVolume", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--accent-text)]" />
                    Ao Reproduzir uma Playlist
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Escolha como o player deve gerenciar a fila atual ao dar play em uma nova playlist.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateSetting("playlistEnqueueMode", "replace")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.playlistEnqueueMode === "replace"
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-sm"
                          : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">Substituir Fila (Padrão)</p>
                      <p className="text-[11px] text-[#8c91a4] mt-0.5">
                        Limpa a fila ativa e toca imediatamente a nova playlist.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSetting("playlistEnqueueMode", "append")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.playlistEnqueueMode === "append"
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-sm"
                          : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">Adicionar ao Final</p>
                      <p className="text-[11px] text-[#8c91a4] mt-0.5">
                        Preserva a reprodução em curso e anexa a playlist ao fim.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 2: APARÊNCIA & EFEITOS VISUAIS                             */}
            {/* ============================================================== */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Item 3.2: Temas de Cores Customizáveis (Accent Themes) */}
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--accent-text)]" />
                    Variação de Cores & Tema de Acento
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Personalize o visual e todos os detalhes do TetPlayer com paletas vibrantes e distintas.
                  </p>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        {
                          id: "chameleon",
                          name: "Camaleão (Dinâmico)",
                          desc: "Muda com a capa da música",
                          color: "linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #0ea5e9 100%)",
                          glowColor: "rgba(139, 92, 246, 0.55)",
                          borderClass: "border-purple-500",
                          activeBg: "bg-purple-950/40",
                        },
                        {
                          id: "ruby",
                          name: "Vermelho",
                          desc: "Vermelho vibrante clássico",
                          color: "#ef4444",
                          glowColor: "rgba(239, 68, 68, 0.45)",
                          borderClass: "border-red-500",
                          activeBg: "bg-red-950/40",
                        },
                        {
                          id: "rose",
                          name: "Rosa Choque",
                          desc: "Rosa elétrico com magenta",
                          color: "#ec4899",
                          glowColor: "rgba(236, 72, 153, 0.45)",
                          borderClass: "border-pink-500",
                          activeBg: "bg-pink-950/40",
                        },
                        {
                          id: "indigo",
                          name: "Roxo",
                          desc: "Roxo e violeta neon",
                          color: "#8b5cf6",
                          glowColor: "rgba(139, 92, 246, 0.45)",
                          borderClass: "border-violet-500",
                          activeBg: "bg-violet-950/40",
                        },
                        {
                          id: "ocean",
                          name: "Azul Claro",
                          desc: "Azul piscina e turquesa",
                          color: "#0ea5e9",
                          glowColor: "rgba(14, 165, 233, 0.45)",
                          borderClass: "border-sky-500",
                          activeBg: "bg-sky-950/40",
                        },
                        {
                          id: "emerald",
                          name: "Verde Claro",
                          desc: "Verde esmeralda fresco",
                          color: "#10b981",
                          glowColor: "rgba(16, 185, 129, 0.45)",
                          borderClass: "border-emerald-500",
                          activeBg: "bg-emerald-950/40",
                        },
                        {
                          id: "lime",
                          name: "Verde Limão",
                          desc: "Verde limão elétrico",
                          color: "#84cc16",
                          glowColor: "rgba(132, 204, 22, 0.45)",
                          borderClass: "border-lime-500",
                          activeBg: "bg-lime-950/40",
                        },
                        {
                          id: "amber",
                          name: "Amarelo",
                          desc: "Amarelo solar e âmbar",
                          color: "#f59e0b",
                          glowColor: "rgba(245, 158, 11, 0.45)",
                          borderClass: "border-amber-500",
                          activeBg: "bg-amber-950/40",
                        },
                        {
                          id: "sunset",
                          name: "Laranja",
                          desc: "Laranja pôr do sol",
                          color: "#f97316",
                          glowColor: "rgba(249, 115, 22, 0.45)",
                          borderClass: "border-orange-500",
                          activeBg: "bg-orange-950/40",
                        },
                      ] as Array<{
                        id: AccentTheme;
                        name: string;
                        desc: string;
                        color: string;
                        glowColor: string;
                        borderClass: string;
                        activeBg: string;
                      }>
                    ).map((theme) => {
                      const isSelected = settings.accentTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            updateSetting("accentTheme", theme.id);
                          }}
                          className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                            isSelected
                              ? `${theme.activeBg} ${theme.borderClass} shadow-md`
                              : "bg-[#141724] border-[#202534] hover:border-[#2e3549] text-[#8c91a4] hover:text-white"
                          }`}
                          style={{
                            boxShadow: isSelected ? `0 0 16px ${theme.glowColor}` : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                              style={{
                                background: theme.color,
                                boxShadow: `0 0 8px ${theme.glowColor}`,
                              }}
                            />
                            {isSelected && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 text-white font-mono">
                                Ativo
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-white transition-colors">
                              {theme.name}
                            </p>
                            <p className="text-[10px] text-[#8c91a4] mt-0.5 leading-tight">
                              {theme.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
                        Intensidade do Aurora Glow Dinâmico
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Controla a luminosidade das auras difusas no fundo sincronizadas com a capa do álbum.
                        Em 0%, desativa o efeito difuso para visual ultra limpo e economia de GPU.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={settings.auroraGlowIntensity}
                      onChange={(e) => updateSetting("auroraGlowIntensity", parseInt(e.target.value, 10))}
                      className="flex-1 h-1.5 bg-[#1f2436] rounded-full accent-[var(--accent)] cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] min-w-[65px] text-center">
                      {settings.auroraGlowIntensity === 0 ? "Mínimo (0%)" : `${settings.auroraGlowIntensity}%`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[var(--accent-text)]" />
                        Capas Animadas 3D (Motion Cover)
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Perspectiva tridimensional interativa estilo Apple Music com amortecimento suave
                        ao passar o mouse e feixe de luz especular.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={settings.motionCoverEnabled}
                        onChange={(e) => updateSetting("motionCoverEnabled", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                    </label>
                  </div>
                </div>


                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--accent-text)]" />
                    Estilo do Visualizador de Espectro
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Escolha a renderização gráfica do equalizador de áudio na gaveta de reprodução (cores sincronizadas com seu tema).
                  </p>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "bars", label: "Barras de Estúdio", desc: "Clássico vertical com reflexo espelhado" },
                      { id: "blocks", label: "Blocos Hi-Fi", desc: "LEDs segmentados estilo receiver vintage" },
                      { id: "gradient", label: "Gradiente Neon", desc: "Transição vibrante de cores aurora" },
                      { id: "pulse", label: "Pulso Central", desc: "Expansão simétrica a partir do centro" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateSetting("visualizerStyle", item.id as VisualizerStyle)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                          settings.visualizerStyle === item.id
                            ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-sm"
                            : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-white transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-[#8c91a4] mt-1 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-center w-full min-h-[22px]">
                          <SpectrumVisualizer isPlaying={true} variant="mini" style={item.id as VisualizerStyle} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[var(--accent-text)]" />
                        Redução de Movimento (Bateria & Conforto)
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Desativa animações contínuas e transições complexas para maximizar a autonomia
                        da bateria em notebooks.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => updateSetting("reducedMotion", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 3: SISTEMA & ATALHOS GLOBAIS                               */}
            {/* ============================================================== */}
            {activeTab === "system" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[var(--accent-text)]" />
                    Ação ao Clicar no Botão Fechar [X]
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Determine se a janela deve minimizar para a bandeja do sistema ou fechar totalmente o app.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateSetting("closeAction", "tray")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.closeAction === "tray"
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-sm"
                          : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white">Minimizar para a Bandeja</p>
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8c91a4] mt-1">
                        A música continua tocando em segundo plano. O app pode ser reaberto pelo ícone do relógio.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateSetting("closeAction", "exit")}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.closeAction === "exit"
                          ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-sm"
                          : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">Encerrar a Aplicação</p>
                      <p className="text-[11px] text-[#8c91a4] mt-1">
                        Interrompe o áudio imediatamente e encerra todos os processos nativos.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Command className="w-4 h-4 text-[var(--accent-text)]" />
                    Atalhos de Teclado Globais do TetPlayer
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "Espaço", desc: "Reproduzir / Pausar áudio" },
                      { key: "J / K", desc: "Faixa Anterior / Próxima Faixa" },
                      { key: "S", desc: "Alternar Modo Aleatório (Shuffle)" },
                      { key: "R", desc: "Ciclar Modo Repetição (Off/All/One)" },
                      { key: "Q", desc: "Abrir / Fechar Fila de Reprodução" },
                      { key: "L", desc: "Abrir / Fechar Letras Sincronizadas" },
                      { key: "M", desc: "Ativar / Desativar Mudo" },
                      { key: "Shift + ↑ / Esc", desc: "Expandir / Recolher Gaveta" },
                      { key: "Ctrl + M", desc: "Alternar Mini Player Flutuante (PiP)" },
                      { key: "Ctrl + ,", desc: "Abrir este painel de Configurações" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#141724] border border-[#202534]"
                      >
                        <span className="text-[#8c91a4] text-[11px] truncate">{item.desc}</span>
                        <kbd className="px-2 py-0.5 rounded bg-[#1f2436] text-white font-mono text-[10px] font-bold border border-[#2e344a] shrink-0 ml-2">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 4: CONTA GOOGLE & ARMAZENAMENTO (Item 4.9)                 */}
            {/* ============================================================== */}
            {activeTab === "storage" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-text)]" />
                    Conta Google & YouTube Music
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Conexão direta através da janela de autenticação segura do Google para sincronização de playlists e reprodução sem limites.
                  </p>

                  <div className="mt-3 p-4 rounded-xl bg-[#141724] border border-[#202534] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {auth?.is_authenticated && auth.avatar_url ? (
                        <img
                          src={auth.avatar_url}
                          alt="Avatar Google"
                          className="w-11 h-11 rounded-full border border-emerald-500/50 object-cover shadow-md shadow-emerald-950/40"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center font-bold text-white shadow-md shadow-[var(--accent-subtle)] shrink-0">
                          {auth?.is_authenticated ? (auth?.user_name?.[0] || "G") : <User className="w-5 h-5" />}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">
                            {auth?.is_authenticated ? (auth.user_name || "Conta Google Conectada") : "Modo Visitante / Anônimo"}
                          </p>
                          {auth?.is_authenticated && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Sessão Ativa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8c91a4] mt-0.5">
                          {auth?.is_authenticated
                            ? (auth.email || "Acesso total às suas playlists, favoritos e histórico do YouTube Music.")
                            : "Faça login com sua conta do Google para carregar suas músicas curtidas e biblioteca."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {auth?.is_authenticated ? (
                        <>
                          <button
                            type="button"
                            onClick={onRefreshAuth}
                            disabled={isCheckingAuth}
                            title="Atualizar sessão e dados de perfil"
                            className="px-3 py-2 rounded-xl bg-[#1e2334] hover:bg-[#282f46] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAuth ? "animate-spin text-[var(--accent)]" : ""}`} />
                            <span>Atualizar</span>
                          </button>
                          {(onGoogleLogout || onForceAnonymous) && (
                            <button
                              type="button"
                              onClick={onGoogleLogout || onForceAnonymous}
                              className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-red-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5 text-red-400" />
                              <span>Sair da Conta</span>
                            </button>
                          )}
                        </>
                      ) : (
                        onGoogleLogin && (
                          <button
                            type="button"
                            onClick={onGoogleLogin}
                            disabled={isCheckingAuth}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 hover:from-indigo-600 to-purple-600 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Fazer Login com Google</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-[var(--accent-text)]" />
                    Gerenciamento do Cache Local
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    O cache armazena temporariamente metadados de playlists e cores de álbuns para exibição instantânea a 0ms.
                  </p>

                  <div className="mt-3 p-3.5 rounded-xl bg-[#141724] border border-[#202534] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">Espaço Estimado em Disco:</p>
                      <p className="text-base font-extrabold font-mono text-emerald-400 mt-0.5">{cacheSize}</p>
                      <p className="text-[10px] text-[#8c91a4] mt-1">
                        Playlists em cache, paletas de cores da Aurora e histórico temporário.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={isClearingCache}
                      className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-800/50 text-red-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>{isClearingCache ? "Limpando..." : "Limpar Cache Temporário"}</span>
                    </button>
                  </div>

                  {cacheClearSuccess && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cache limpo com sucesso! As próximas listas serão recarregadas sob demanda.</span>
                    </div>
                  )}
                </div>

                {/* Local dos Arquivos e Instalação (Armazenamento Portável) */}
                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[var(--accent-text)]" />
                    Local dos Arquivos & Armazenamento da Instalação
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Todos os dados do TetPlayer (banco SQLite, login salvo, estatísticas e músicas offline) ficam centralizados na pasta de instalação, permitindo controle total do espaço em disco.
                  </p>

                  <div className="mt-3 p-3.5 rounded-xl bg-[#141724] border border-[#202534] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">Pasta de Armazenamento:</p>
                      <p className="text-xs font-mono text-indigo-400 mt-0.5 truncate select-all" title={appStoragePath || "Pasta da Instalação/data"}>
                        {appStoragePath || "Pasta da Instalação/data"}
                      </p>
                      <p className="text-[10px] text-[#8c91a4] mt-1">
                        Permanência garantida: seus dados e sessão de login nunca são deletados ao atualizar o aplicativo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenStorageFolder}
                      className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-800/50 text-indigo-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Abrir Pasta de Dados</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 5: SOBRE & ATUALIZAÇÕES DO TETPLAYER (Item 4.10)           */}
            {/* ============================================================== */}
            {activeTab === "about" && (
              <div className="space-y-5 flex flex-col items-center justify-center text-center py-2 animate-in fade-in duration-150">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--accent)] via-[var(--accent-hover)] to-[var(--accent-glow)] flex items-center justify-center shadow-[0_0_25px_var(--accent-glow)] ring-1 ring-white/10">
                  <Music2 className="w-8 h-8 text-white" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">TetPlayer</h3>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] text-[10px] font-mono font-bold tracking-wider">
                      Desktop
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Versão Instalada: <strong>v{APP_VERSION}</strong></span>
                  </div>
                </div>

                {/* Card Reativo de Verificação e Auto-Update (Item 4.10) */}
                <div className="w-full max-w-md p-4 rounded-2xl bg-[#141724] border border-[#202534] text-left">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Atualizações do Sistema
                    </span>
                    {lastCheckedTime && (
                      <span className="text-[10px] text-[#71778c] font-mono">
                        Checado às {lastCheckedTime}
                      </span>
                    )}
                  </div>

                  {manualUpdateState === "idle" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#8c91a4] leading-relaxed">
                        Verifique lançamentos e novas compilações oficiais no GitHub.
                      </p>
                      <button
                        type="button"
                        onClick={handleManualCheckUpdates}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Verificar Atualizações Agora</span>
                      </button>
                    </div>
                  )}

                  {manualUpdateState === "checking" && (
                    <div className="flex items-center gap-3 py-2 text-xs text-indigo-300">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                      <span>🔄 Verificando atualizações no GitHub...</span>
                    </div>
                  )}

                  {manualUpdateState === "upToDate" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>✅ Você está usando a versão mais recente (v{APP_VERSION})</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleManualCheckUpdates}
                        className="text-xs text-[#8c91a4] hover:text-white underline cursor-pointer shrink-0"
                      >
                        Checar novamente
                      </button>
                    </div>
                  )}

                  {manualUpdateState === "available" && manualUpdateInfo && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>🚀 Nova versão v{manualUpdateInfo.latestVersion} disponível!</span>
                        </div>
                        {manualUpdateInfo.assetSize && (
                          <span className="text-[11px] font-mono text-zinc-400">
                            {formatBytes(manualUpdateInfo.assetSize)}
                          </span>
                        )}
                      </div>

                      {manualUpdateInfo.releaseNotes && (
                        <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 text-[11px] text-zinc-300 max-h-20 overflow-y-auto custom-scrollbar">
                          {manualUpdateInfo.releaseNotes}
                        </div>
                      )}

                      {inAppProgress ? (
                        <div className="space-y-2 bg-black/40 border border-white/10 rounded-xl p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-200">
                              {inAppProgress.status === "downloading" && "Baixando pacote oficial..."}
                              {inAppProgress.status === "installing" && "Instalando nova versão..."}
                              {inAppProgress.status === "ready" && "Pronto! Reiniciando o TetPlayer..."}
                              {inAppProgress.status === "error" && "Falha na atualização automática"}
                            </span>
                            <span className="font-mono text-indigo-400 font-bold">
                              {inAppProgress.percent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 ease-out"
                              style={{ width: `${inAppProgress.percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            <span>
                              {formatBytes(inAppProgress.downloadedBytes)}
                              {inAppProgress.totalBytes ? ` de ${formatBytes(inAppProgress.totalBytes)}` : ""}
                            </span>
                            {inAppProgress.status === "error" && (
                              <button
                                type="button"
                                onClick={() => downloadAndInstallUpdate(manualUpdateInfo)}
                                className="text-xs text-indigo-400 hover:underline"
                              >
                                Baixar pelo Navegador
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => openReleasePage(manualUpdateInfo.releaseUrl)}
                            className="text-xs text-zinc-400 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Ver no GitHub</span>
                            <ExternalLink size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartUpdate(manualUpdateInfo)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 hover:from-indigo-600 to-purple-600 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
                          >
                            <Download size={14} />
                            <span>Atualizar Agora</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#8c91a4] max-w-sm leading-relaxed">
                  Reprodutor de música desktop de alta fidelidade desenvolvido com <strong>Tauri v2 (Rust)</strong>,{" "}
                  <strong>React 19</strong> e <strong>Tailwind CSS v4</strong>.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="h-12 px-6 border-t border-[#1f2434] bg-[#0c0e15] flex items-center justify-between shrink-0 text-xs text-[#71778c]">
          <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-[#1a1e2d] text-white font-mono text-[10px]">Esc</kbd> para fechar</span>
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
