import { useEffect, useRef } from "react";
import { Track } from "../types";
import { ColorWorkerResponse, ColorWorkerResult, ColorRgb } from "../workers/colorWorker";
import { upgradeArtworkQuality } from "../utils/artwork";
import { SettingsService, ThemeColorTokens } from "../services/settings";

const PALETTE_CACHE_KEY = "tetplayer_palette_cache";

export function colorRgbToThemeTokens(c1: ColorRgb, c2: ColorRgb, c3: ColorRgb): ThemeColorTokens {
  let { r, g, b } = c1;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 90) {
    const factor = Math.min(2.5, 120 / Math.max(lum, 10));
    r = Math.min(255, Math.round(r * factor + 30));
    g = Math.min(255, Math.round(g * factor + 30));
    b = Math.min(255, Math.round(b * factor + 30));
  } else if (lum > 235) {
    const factor = 200 / lum;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  }

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const primary = `#${hex(r)}${hex(g)}${hex(b)}`;
  const hover = `#${hex(Math.min(255, Math.round(r * 1.15)))}${hex(Math.min(255, Math.round(g * 1.15)))}${hex(Math.min(255, Math.round(b * 1.15)))}`;
  const active = `#${hex(Math.max(0, Math.round(r * 0.85)))}${hex(Math.max(0, Math.round(g * 0.85)))}${hex(Math.max(0, Math.round(b * 0.85)))}`;
  const text = `#${hex(Math.min(255, Math.round(r * 1.25 + 20)))}${hex(Math.min(255, Math.round(g * 1.25 + 20)))}${hex(Math.min(255, Math.round(b * 1.25 + 20)))}`;

  return {
    primary,
    hover,
    active,
    text,
    subtle: `rgba(${r}, ${g}, ${b}, 0.18)`,
    border: `rgba(${r}, ${g}, ${b}, 0.45)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.85)`,
    gradientFrom: primary,
    gradientVia: `#${hex(c2.r)}${hex(c2.g)}${hex(c2.b)}`,
    gradientTo: `#${hex(c3.r)}${hex(c3.g)}${hex(c3.b)}`,
  };
}

function applyPaletteToRoot(c1: ColorRgb, c2: ColorRgb, c3: ColorRgb) {
  const root = document.documentElement;
  root.style.setProperty("--aurora-1", `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.45)`);
  root.style.setProperty("--aurora-2", `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.35)`);
  root.style.setProperty("--aurora-3", `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.28)`);
  root.style.setProperty("--aurora-1-glow", `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.88)`);
  root.style.setProperty("--aurora-2-glow", `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.78)`);
  root.style.setProperty("--aurora-3-glow", `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.68)`);

  const tokens = colorRgbToThemeTokens(c1, c2, c3);
  SettingsService.applyChameleonTokens(tokens);
}

function computeFallbackPalette(track: Track): ColorWorkerResult {
  let hash = 0;
  const str = track.id + track.artist;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 70) % 360;
  const hue3 = (hue1 + 190) % 360;

  // Converte HSL para RGB para manter interpolação contínua e sem degraus de espaço de cor
  const hslToRgb = (h: number, s: number, l: number): ColorRgb => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4)),
    };
  };

  return {
    c1: hslToRgb(hue1, 85, 52),
    c2: hslToRgb(hue2, 80, 48),
    c3: hslToRgb(hue3, 75, 45),
  };
}

function loadInitialPaletteCache(): Record<string, ColorWorkerResult> {
  try {
    const saved = localStorage.getItem(PALETTE_CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Pré-carregamento de imagem e cores da arte para a próxima faixa da fila
 */
export function prefetchArtworkColors(track: Track): void {
  if (!track || !track.artwork_url) return;
  try {
    const highResUrl = upgradeArtworkQuality(track.artwork_url, track.id);
    const img = new Image();
    img.src = highResUrl;
  } catch {
    // ignore
  }
}

export function useAuroraColor(currentTrack: Track | null) {
  const workerRef = useRef<Worker | null>(null);
  const activeTrackIdRef = useRef<string | null>(null);

  const paletteCacheRef = useRef<Record<string, ColorWorkerResult>>(loadInitialPaletteCache());

  useEffect(() => {
    // Inicializar Web Worker com suporte nativo do Vite
    try {
      workerRef.current = new Worker(
        new URL("../workers/colorWorker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e: MessageEvent<ColorWorkerResponse>) => {
        const { trackId, result } = e.data;
        if (!result) return;

        // Persistir no cache de paletas para futuras transições em 0ms (com teto de 150 faixas)
        paletteCacheRef.current[trackId] = result;
        const keys = Object.keys(paletteCacheRef.current);
        if (keys.length > 150) {
          const toRemove = keys.slice(0, keys.length - 150);
          for (const k of toRemove) {
            delete paletteCacheRef.current[k];
          }
        }
        try {
          localStorage.setItem(
            PALETTE_CACHE_KEY,
            JSON.stringify(paletteCacheRef.current)
          );
        } catch {
          // ignore
        }

        // Apenas aplica se for a música atualmente selecionada (evita race conditions)
        if (activeTrackIdRef.current === trackId) {
          applyPaletteToRoot(result.c1, result.c2, result.c3);
        }
      };
    } catch (err) {
      console.warn("Web Worker de amostragem de cores indisponível:", err);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!currentTrack) return;

    const trackId = currentTrack.id;
    activeTrackIdRef.current = trackId;

    // 1. Se já está no cache local, aplica a paleta real instantaneamente com transição suave
    const cached = paletteCacheRef.current[trackId];
    if (cached) {
      applyPaletteToRoot(cached.c1, cached.c2, cached.c3);
      return;
    }

    // 2. Se não está no cache, NÃO sobrescreve imediatamente com hash arbitrário
    // (isso elimina o efeito de piscar/salto brusco). Mantém a cor atual enquanto a imagem carrega
    const imgUrl = upgradeArtworkQuality(currentTrack.artwork_url, trackId);

    if (!imgUrl) {
      const fallback = computeFallbackPalette(currentTrack);
      applyPaletteToRoot(fallback.c1, fallback.c2, fallback.c3);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onerror = () => {
      // Somente se a imagem falhar completamente, aplica o fallback determinístico
      if (activeTrackIdRef.current === trackId) {
        const fallback = computeFallbackPalette(currentTrack);
        applyPaletteToRoot(fallback.c1, fallback.c2, fallback.c3);
      }
    };

    img.onload = () => {
      // Se o usuário já tiver trocado para outra música enquanto a imagem baixava, ignora
      if (activeTrackIdRef.current !== trackId) return;

      try {
        let imageData: ImageData | null = null;

        if (typeof OffscreenCanvas !== "undefined") {
          const offscreen = new OffscreenCanvas(64, 64);
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 64, 64);
            imageData = ctx.getImageData(0, 0, 64, 64);
          }
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, 64, 64);
            imageData = ctx.getImageData(0, 0, 64, 64);
          }
        }

        if (imageData && workerRef.current) {
          workerRef.current.postMessage({
            trackId,
            data: imageData.data,
            width: 64,
            height: 64,
          });
        }
      } catch {
        // Fallback em caso de cross-origin restrito
        if (activeTrackIdRef.current === trackId) {
          const fallback = computeFallbackPalette(currentTrack);
          applyPaletteToRoot(fallback.c1, fallback.c2, fallback.c3);
        }
      }
    };

    img.src = imgUrl;
  }, [currentTrack?.id]);
}
