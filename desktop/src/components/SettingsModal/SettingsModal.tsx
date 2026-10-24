import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  SettingsService,
  AppSettings,
  VisualizerStyle,
} from "../../services/settings";
import { LocalCacheService } from "../../services/cache";
import { AuthSession } from "../../types";

export type SettingsTabId = "audio" | "appearance" | "system" | "storage" | "about";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: AuthSession | null;
  isCheckingAuth: boolean;
  onRefreshAuth: () => Promise<void>;
  onForceAnonymous?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  auth,
  isCheckingAuth,
  onRefreshAuth,
  onForceAnonymous,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("audio");
  const [settings, setSettings] = useState<AppSettings>(() => SettingsService.getSettings());
  const [cacheSize, setCacheSize] = useState<string>("Calculando...");
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);

  // Recarrega configurações sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      setSettings(SettingsService.getSettings());
      setCacheSize(LocalCacheService.getEstimatedCacheSize());
      setCacheClearSuccess(false);
    }
  }, [isOpen]);

  // Listener para fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl h-[580px] bg-[#0d0f17] border border-[#232838] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="h-14 px-6 border-b border-[#1f2434] flex items-center justify-between shrink-0 bg-[#111420]/80">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-red-500" />
            <h2 id="settings-modal-title" className="text-base font-bold text-white tracking-tight">
              Configurações do TetPlayer
            </h2>
          </div>
          <button
            onClick={onClose}
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
                  ? "bg-red-600 text-white shadow-md shadow-red-950/60"
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
                  ? "bg-red-600 text-white shadow-md shadow-red-950/60"
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
                  ? "bg-red-600 text-white shadow-md shadow-red-950/60"
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
                  ? "bg-red-600 text-white shadow-md shadow-red-950/60"
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
                  ? "bg-red-600 text-white shadow-md shadow-red-950/60"
                  : "text-[#8c91a4] hover:text-white hover:bg-[#171a26]"
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>Sobre o App</span>
            </button>
          </aside>

          {/* Painel de Conteúdo da Aba Ativa */}
          <main className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* ============================================================== */}
            {/* ABA 1: ÁUDIO & REPRODUÇÃO                                      */}
            {/* ============================================================== */}
            {activeTab === "audio" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-red-400" />
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
                      className="flex-1 h-1.5 bg-[#1f2436] rounded-full accent-red-500 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#141724] border border-[#23283a] text-red-400 min-w-[70px] text-center">
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
                            ? "bg-red-950/80 border-red-700 text-white font-bold"
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
                        <Radio className="w-4 h-4 text-red-400" />
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
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-red-400" />
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
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-400" />
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
                          ? "bg-red-950/40 border-red-700 text-white shadow-sm"
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
                          ? "bg-red-950/40 border-red-700 text-white shadow-sm"
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
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-red-400" />
                        Intensidade do Aurora Glow Dinâmico
                      </h3>
                      <p className="text-xs text-[#8c91a4] mt-1">
                        Controla a luminosidade das auras difusas no fundo sincronizadas com a capa do álbum.
                        Em 0%, o app opera no modo OLED Preto Puro.
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
                      className="flex-1 h-1.5 bg-[#1f2436] rounded-full accent-red-500 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#141724] border border-[#23283a] text-red-400 min-w-[65px] text-center">
                      {settings.auroraGlowIntensity === 0 ? "OLED (0%)" : `${settings.auroraGlowIntensity}%`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-400" />
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
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                    </label>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-400" />
                    Estilo do Visualizador de Espectro
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Escolha a renderização gráfica do equalizador de áudio na gaveta de reprodução.
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    {[
                      { id: "bars", label: "Barras de Estúdio", desc: "Clássico vertical com reflexo espelhado" },
                      { id: "wave", label: "Onda Harmônica", desc: "Forma de onda contínua e suave" },
                      { id: "gradient", label: "Gradiente Neon", desc: "Transição vibrante de cores aurora" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateSetting("visualizerStyle", item.id as VisualizerStyle)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          settings.visualizerStyle === item.id
                            ? "bg-red-950/40 border-red-700 text-white shadow-sm"
                            : "bg-[#141724] border-[#202534] text-[#8c91a4] hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{item.label}</p>
                        <p className="text-[10px] text-[#8c91a4] mt-0.5 leading-tight">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-400" />
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
                      <div className="w-11 h-6 bg-[#1f2436] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
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
                    <Monitor className="w-4 h-4 text-red-400" />
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
                          ? "bg-red-950/40 border-red-700 text-white shadow-sm"
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
                          ? "bg-red-950/40 border-red-700 text-white shadow-sm"
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
                    <Command className="w-4 h-4 text-red-400" />
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
            {/* ABA 4: SESSÃO & ARMAZENAMENTO                                  */}
            {/* ============================================================== */}
            {activeTab === "storage" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-400" />
                    Sessão do YouTube Music
                  </h3>
                  <p className="text-xs text-[#8c91a4] mt-1">
                    Estado dos cookies e credenciais importados do seu navegador para reprodução ilimitada sem anúncios.
                  </p>

                  <div className="mt-3 p-3.5 rounded-xl bg-[#141724] border border-[#202534] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 font-bold">
                        YTM
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {auth?.is_authenticated ? `Sincronizado: ${auth.browser}` : "Modo Visitante / Anônimo"}
                        </p>
                        <p className="text-[11px] text-[#8c91a4] mt-0.5">
                          {auth?.is_authenticated
                            ? "Sessão ativa com acesso às suas playlists e histórico privado."
                            : "Apenas playlists públicas e buscas anônimas disponíveis."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onRefreshAuth}
                        disabled={isCheckingAuth}
                        className="px-3 py-1.5 rounded-lg bg-[#1e2334] hover:bg-[#282f46] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAuth ? "animate-spin text-red-400" : ""}`} />
                        <span>Re-sincronizar</span>
                      </button>

                      {onForceAnonymous && auth?.is_authenticated && (
                        <button
                          type="button"
                          onClick={onForceAnonymous}
                          className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-medium text-red-300 transition-colors cursor-pointer"
                        >
                          Modo Anônimo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1f2434] pt-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-red-400" />
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
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 5: SOBRE (APENAS VERSÃO INSTALADA CONFORME SOLICITADO)     */}
            {/* ============================================================== */}
            {activeTab === "about" && (
              <div className="space-y-6 flex flex-col items-center justify-center text-center py-6 animate-in fade-in duration-150">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                    <Music2 className="w-10 h-10 text-white" />
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-300 text-[10px] font-mono font-bold">
                    Desktop
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-xl font-extrabold text-white tracking-tight">TetPlayer Desktop</h3>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Versão Instalada: <strong>v0.2.0</strong></span>
                  </div>
                </div>

                <p className="text-xs text-[#8c91a4] max-w-sm leading-relaxed">
                  Reprodutor de música desktop de alta fidelidade desenvolvido com <strong>Tauri v2 (Rust)</strong>,{" "}
                  <strong>React 19</strong> e <strong>Tailwind CSS v4</strong>.
                </p>

                <div className="p-3 rounded-xl bg-[#141724] border border-[#202534] text-[11px] text-[#71778c] max-w-sm">
                  Licença aberta e compilação nativa de alta performance com zero telemetria invasiva.
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="h-12 px-6 border-t border-[#1f2434] bg-[#0c0e15] flex items-center justify-between shrink-0 text-xs text-[#71778c]">
          <span>Pressione <kbd className="px-1.5 py-0.5 rounded bg-[#1a1e2d] text-white font-mono text-[10px]">Esc</kbd> para fechar</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
