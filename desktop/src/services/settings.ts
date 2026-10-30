export type PlaylistEnqueueMode = "replace" | "append";
export type VisualizerStyle = "bars" | "blocks" | "gradient" | "pulse" | "wave";
export type CloseAction = "tray" | "exit";
export type AccentTheme =
  | "chameleon"
  | "ruby"
  | "rose"
  | "indigo"
  | "ocean"
  | "emerald"
  | "lime"
  | "amber"
  | "sunset"
  | "monochrome";

export interface ThemeColorTokens {
  primary: string;
  hover: string;
  active: string;
  text: string;
  subtle: string;
  border: string;
  glow: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
}

export const THEME_PALETTES: Record<AccentTheme, ThemeColorTokens> = {
  chameleon: {
    primary: "#ef4444",
    hover: "#dc2626",
    active: "#b91c1c",
    text: "#f87171",
    subtle: "rgba(239, 68, 68, 0.16)",
    border: "rgba(239, 68, 68, 0.40)",
    glow: "rgba(239, 68, 68, 0.85)",
    gradientFrom: "#ef4444",
    gradientVia: "#8b5cf6",
    gradientTo: "#0ea5e9",
  },
  ruby: {
    primary: "#ef4444",
    hover: "#dc2626",
    active: "#b91c1c",
    text: "#f87171",
    subtle: "rgba(239, 68, 68, 0.16)",
    border: "rgba(239, 68, 68, 0.40)",
    glow: "rgba(239, 68, 68, 0.85)",
    gradientFrom: "#ef4444",
    gradientVia: "#f43f5e",
    gradientTo: "#fb923c",
  },
  indigo: {
    primary: "#8b5cf6",
    hover: "#7c3aed",
    active: "#6d28d9",
    text: "#a78bfa",
    subtle: "rgba(139, 92, 246, 0.18)",
    border: "rgba(139, 92, 246, 0.42)",
    glow: "rgba(139, 92, 246, 0.85)",
    gradientFrom: "#8b5cf6",
    gradientVia: "#a855f7",
    gradientTo: "#ec4899",
  },
  emerald: {
    primary: "#10b981",
    hover: "#059669",
    active: "#047857",
    text: "#34d399",
    subtle: "rgba(16, 185, 129, 0.18)",
    border: "rgba(16, 185, 129, 0.42)",
    glow: "rgba(16, 185, 129, 0.85)",
    gradientFrom: "#10b981",
    gradientVia: "#14b8a6",
    gradientTo: "#06b6d4",
  },
  ocean: {
    primary: "#0ea5e9",
    hover: "#0284c7",
    active: "#0369a1",
    text: "#38bdf8",
    subtle: "rgba(14, 165, 233, 0.18)",
    border: "rgba(14, 165, 233, 0.42)",
    glow: "rgba(14, 165, 233, 0.85)",
    gradientFrom: "#0ea5e9",
    gradientVia: "#38bdf8",
    gradientTo: "#6366f1",
  },
  rose: {
    primary: "#ec4899",
    hover: "#db2777",
    active: "#be185d",
    text: "#f472b6",
    subtle: "rgba(236, 72, 153, 0.18)",
    border: "rgba(236, 72, 153, 0.42)",
    glow: "rgba(236, 72, 153, 0.85)",
    gradientFrom: "#ec4899",
    gradientVia: "#f43f5e",
    gradientTo: "#a855f7",
  },
  amber: {
    primary: "#eab308",
    hover: "#ca8a04",
    active: "#a16207",
    text: "#facc15",
    subtle: "rgba(234, 179, 8, 0.18)",
    border: "rgba(234, 179, 8, 0.45)",
    glow: "rgba(234, 179, 8, 0.85)",
    gradientFrom: "#eab308",
    gradientVia: "#f59e0b",
    gradientTo: "#ea580c",
  },
  sunset: {
    primary: "#f97316",
    hover: "#ea580c",
    active: "#c2410c",
    text: "#fb923c",
    subtle: "rgba(249, 115, 22, 0.18)",
    border: "rgba(249, 115, 22, 0.42)",
    glow: "rgba(249, 115, 22, 0.85)",
    gradientFrom: "#f97316",
    gradientVia: "#fb7185",
    gradientTo: "#e11d48",
  },
  lime: {
    primary: "#84cc16",
    hover: "#65a30d",
    active: "#4d7c0f",
    text: "#a3e635",
    subtle: "rgba(132, 204, 22, 0.18)",
    border: "rgba(132, 204, 22, 0.42)",
    glow: "rgba(132, 204, 22, 0.85)",
    gradientFrom: "#84cc16",
    gradientVia: "#a3e635",
    gradientTo: "#10b981",
  },
  monochrome: {
    // Fallback/alias transparente que mapeia para Cyber Lime
    primary: "#84cc16",
    hover: "#65a30d",
    active: "#4d7c0f",
    text: "#a3e635",
    subtle: "rgba(132, 204, 22, 0.18)",
    border: "rgba(132, 204, 22, 0.42)",
    glow: "rgba(132, 204, 22, 0.85)",
    gradientFrom: "#84cc16",
    gradientVia: "#a3e635",
    gradientTo: "#10b981",
  },
};

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
  waveformSeekbar: boolean;

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
  waveformSeekbar: true,
  closeAction: "tray",
};

const SETTINGS_STORAGE_KEY = "tetplayer_app_settings";
const SETTINGS_EVENT = "tetplayer:settings-changed";

type SettingsListener = (settings: AppSettings, keyChanged?: keyof AppSettings) => void;
const listeners = new Set<SettingsListener>();
let activeChameleonTokens: ThemeColorTokens | null = null;


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
      const parsed = JSON.parse(saved);
      if (parsed.visualizerStyle === "wave") {
        parsed.visualizerStyle = "blocks";
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
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

    // Tema de Cores e Acento (Ruby, Cyber Indigo, Emerald Wave, Ocean Blue, Neon Rose, Solar Gold, Sunset Orange, Cyber Lime)
    const currentTheme = settings.accentTheme || "ruby";
    root.setAttribute("data-theme", currentTheme);

    const palette =
      currentTheme === "chameleon" && activeChameleonTokens
        ? activeChameleonTokens
        : THEME_PALETTES[currentTheme] || THEME_PALETTES.ruby;
    root.style.setProperty("--accent", palette.primary);
    root.style.setProperty("--accent-primary", palette.primary);
    root.style.setProperty("--accent-hover", palette.hover);
    root.style.setProperty("--accent-active", palette.active);
    root.style.setProperty("--accent-text", palette.text);
    root.style.setProperty("--accent-subtle", palette.subtle);
    root.style.setProperty("--accent-border", palette.border);
    root.style.setProperty("--accent-glow", palette.glow);
    root.style.setProperty("--accent-gradient-from", palette.gradientFrom);
    root.style.setProperty("--accent-gradient-via", palette.gradientVia);
    root.style.setProperty("--accent-gradient-to", palette.gradientTo);

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

  applyChameleonTokens(tokens: ThemeColorTokens): void {
    activeChameleonTokens = tokens;
    if (typeof document === "undefined") return;
    if (this.getSetting("accentTheme") !== "chameleon") return;

    const root = document.documentElement;
    root.style.setProperty("--accent", tokens.primary);
    root.style.setProperty("--accent-primary", tokens.primary);
    root.style.setProperty("--accent-hover", tokens.hover);
    root.style.setProperty("--accent-active", tokens.active);
    root.style.setProperty("--accent-text", tokens.text);
    root.style.setProperty("--accent-subtle", tokens.subtle);
    root.style.setProperty("--accent-border", tokens.border);
    root.style.setProperty("--accent-glow", tokens.glow);
    root.style.setProperty("--accent-gradient-from", tokens.gradientFrom);
    root.style.setProperty("--accent-gradient-via", tokens.gradientVia);
    root.style.setProperty("--accent-gradient-to", tokens.gradientTo);
  },

  getActiveChameleonTokens(): ThemeColorTokens | null {
    return activeChameleonTokens;
  },

  subscribe(listener: SettingsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
