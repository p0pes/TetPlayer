export type PlaylistEnqueueMode = "replace" | "append";
export type VisualizerStyle = "bars" | "wave" | "gradient";
export type CloseAction = "tray" | "exit";
export type AccentTheme = "ruby" | "indigo" | "emerald" | "ocean" | "monochrome";

export interface AppSettings {
  // Aba 1: Áudio & Reprodução
  crossfadeSeconds: number; // 0 a 12s
  isAutoplayRadio: boolean;
  normalizeVolume: boolean;
  playlistEnqueueMode: PlaylistEnqueueMode;

  // Aba 2: Aparência & Efeitos Visuais (Item 3.2: Temas de Cores)
  accentTheme: AccentTheme;
  auroraGlowIntensity: number; // 0 a 100%
  motionCoverEnabled: boolean;
  visualizerStyle: VisualizerStyle;
  reducedMotion: boolean;

  // Aba 4: Sistema & Janela
  closeAction: CloseAction;
}

export const DEFAULT_SETTINGS: AppSettings = {
  crossfadeSeconds: 3,
  isAutoplayRadio: true,
  normalizeVolume: false,
  playlistEnqueueMode: "replace",
  accentTheme: "ruby",
  auroraGlowIntensity: 80,
  motionCoverEnabled: true,
  visualizerStyle: "bars",
  reducedMotion: false,
  closeAction: "tray",
};

const SETTINGS_STORAGE_KEY = "tetplayer_app_settings";
const SETTINGS_EVENT = "tetplayer:settings-changed";

type SettingsListener = (settings: AppSettings, keyChanged?: keyof AppSettings) => void;
const listeners = new Set<SettingsListener>();

export const SettingsService = {
  getSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) {
        // Fallbacks para chaves antigas caso já existam no localStorage
        const legacyCrossfade = localStorage.getItem("tetplayer_crossfade");
        const legacyMotion = localStorage.getItem("tetplayer_motion_cover_enabled");
        const crossfade = legacyCrossfade !== null ? parseInt(legacyCrossfade, 10) : DEFAULT_SETTINGS.crossfadeSeconds;
        const motion = legacyMotion !== null ? legacyMotion === "true" : DEFAULT_SETTINGS.motionCoverEnabled;

        return {
          ...DEFAULT_SETTINGS,
          crossfadeSeconds: !isNaN(crossfade) ? crossfade : DEFAULT_SETTINGS.crossfadeSeconds,
          motionCoverEnabled: motion,
        };
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.getSettings()[key];
  },

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const current = this.getSettings();
    const updated = { ...current, [key]: value };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

      // Sincroniza com chaves específicas legadas para máxima compatibilidade
      if (key === "crossfadeSeconds") {
        localStorage.setItem("tetplayer_crossfade", String(value));
      } else if (key === "motionCoverEnabled") {
        localStorage.setItem("tetplayer_motion_cover_enabled", String(value));
      }
    } catch (err) {
      console.warn("Erro ao salvar configuração local:", err);
    }

    this.applySettingsToDOM(updated);
    listeners.forEach((fn) => fn(updated, key));

    try {
      window.dispatchEvent(
        new CustomEvent(SETTINGS_EVENT, { detail: { settings: updated, key, value } })
      );
    } catch {
      // ignore
    }
  },

  resetSettings(): AppSettings {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem("tetplayer_crossfade", String(DEFAULT_SETTINGS.crossfadeSeconds));
      localStorage.setItem("tetplayer_motion_cover_enabled", String(DEFAULT_SETTINGS.motionCoverEnabled));
    } catch {
      // ignore
    }

    this.applySettingsToDOM(DEFAULT_SETTINGS);
    listeners.forEach((fn) => fn(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  },

  applySettingsToDOM(settings: AppSettings): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Tema de Cores e Acento (Item 3.2: TetPlayer Ruby, Cyber Indigo, Emerald Wave, Ocean Blue, Pure Dark OLED)
    const currentTheme = settings.accentTheme || "ruby";
    root.setAttribute("data-theme", currentTheme);

    const themePalettes: Record<AccentTheme, { primary: string; glow: string }> = {
      ruby: { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.85)" },
      indigo: { primary: "#8b5cf6", glow: "rgba(139, 92, 246, 0.85)" },
      emerald: { primary: "#10b981", glow: "rgba(16, 185, 129, 0.85)" },
      ocean: { primary: "#0ea5e9", glow: "rgba(14, 165, 233, 0.85)" },
      monochrome: { primary: "#f4f4f5", glow: "rgba(244, 244, 245, 0.7)" },
    };

    const palette = themePalettes[currentTheme] || themePalettes.ruby;
    root.style.setProperty("--accent-primary", palette.primary);
    root.style.setProperty("--accent-glow", palette.glow);

    if (currentTheme === "monochrome") {
      root.classList.add("theme-monochrome-oled");
    } else {
      root.classList.remove("theme-monochrome-oled");
    }

    // Intensidade da Aurora Boreal (0% a 100%)
    const opacityMultiplier = Math.max(0, Math.min(100, settings.auroraGlowIntensity)) / 100;
    root.style.setProperty("--aurora-glow-multiplier", String(opacityMultiplier));

    // Modo Movimento Reduzido
    if (settings.reducedMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  },

  subscribe(listener: SettingsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
