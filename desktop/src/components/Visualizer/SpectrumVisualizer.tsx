import { useEffect, useRef, useState, useMemo, memo } from "react";
import { SettingsService, VisualizerStyle } from "../../services/settings";
import { usePlaybackProgress } from "../../context/PlayerContext";
import { getCachedLyrics, parseLrc } from "../../hooks/useLyrics";
import { nativeAudioEngine } from "../../services/audioEngine";
import { Track, LyricLine } from "../../types";

interface SpectrumVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  variant?: "mini" | "inline" | "full";
  style?: VisualizerStyle;
  className?: string;
  track?: Track | null;
}

/**
 * Gera um BPM determinístico e características rítmicas baseadas na faixa
 */
function getTrackTempo(trackId?: string): { bpm: number; groove: number } {
  if (!trackId) return { bpm: 126, groove: 0.6 };
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const bpm = 118 + (absHash % 24); // 118 a 142 BPM
  const groove = 0.45 + ((absHash % 10) / 20); // 0.45 a 0.95
  return { bpm, groove };
}

/**
 * Busca binária O(log N) em linhas pré-parseadas para detectar voz sem sobrecarga de CPU no loop rAF
 */
function isVocalAtTime(lyrics: LyricLine[], time: number): boolean {
  if (!lyrics || lyrics.length === 0 || time <= 0) return false;
  let low = 0;
  let high = lyrics.length - 1;
  let bestIdx = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= time) {
      bestIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (bestIdx >= 0) {
    const line = lyrics[bestIdx];
    const nextLineTime = bestIdx < lyrics.length - 1 ? lyrics[bestIdx + 1].time : line.time + 5;
    const duration = Math.min(8, Math.max(2, nextLineTime - line.time));
    return time >= line.time && time < line.time + duration && Boolean(line.text.trim());
  }
  return false;
}

export const SpectrumVisualizer = memo(function SpectrumVisualizer({
  isPlaying,
  barCount = 5,
  variant = "mini",
  style: propStyle,
  className = "",
  track,
}: SpectrumVisualizerProps) {
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>(
    propStyle || SettingsService.getSetting("visualizerStyle")
  );

  useEffect(() => {
    if (propStyle) {
      setVisualizerStyle(propStyle);
      return;
    }
    return SettingsService.subscribe((settings, key) => {
      if (!key || key === "visualizerStyle") {
        setVisualizerStyle(settings.visualizerStyle);
      }
    });
  }, [propStyle]);

  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 14)
  );

  // Consome isoladamente o progresso da música sem causar re-render em componentes pais
  const { currentTime, duration } = usePlaybackProgress();
  const progressRef = useRef({ currentTime: 0, duration: 0 });
  progressRef.current = { currentTime, duration };

  const trackRef = useRef(track);
  trackRef.current = track;

  // Parse das letras memoizado uma única vez na troca de faixa (evita regex e GC no rAF)
  const parsedLyrics = useMemo<LyricLine[]>(() => {
    if (!track?.id || variant !== "full") return [];
    try {
      const cached = getCachedLyrics(track.id);
      if (cached?.synced) {
        return parseLrc(cached.synced);
      }
    } catch {
      // ignore
    }
    return [];
  }, [track?.id, variant]);

  const lyricsRef = useRef<LyricLine[]>(parsedLyrics);
  lyricsRef.current = parsedLyrics;

  // Relógio contínuo com acumulação de fase pura: elimina 100% de qualquer tremor, salto ou glitch
  const continuousTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    let animId: number | null = null;

    if (!isPlaying) {
      setHeights(Array.from({ length: barCount }, () => 14));
      return;
    }

    lastFrameTimeRef.current = performance.now();
    const updateSpectrum = (now: number) => {
      // Suspende cálculos e renderização quando a janela estiver minimizada (zero CPU)
      if (typeof document !== "undefined" && document.hidden) {
        animId = requestAnimationFrame(updateSpectrum);
        return;
      }

      // Intervalo de ~30ms (~33fps) ideal para fluidez visual e leveza máxima (< 0.1% CPU)
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed >= 30) {
        const dt = Math.min(0.08, elapsed / 1000);
        lastFrameTimeRef.current = now;

        // 1. Tenta obter o espectro de frequências real (FFT) do Web Audio se disponível
        const realData = nativeAudioEngine.getSpectrumData(barCount);
        if (realData && realData.some((v) => v > 15)) {
          setHeights((prev) =>
            Array.from({ length: barCount }, (_, i) => {
              const rawTarget = realData[i] ?? 14;
              const target = Math.min(100, Math.round(rawTarget * 1.25));
              const prevH = prev[i] ?? 14;
              const factor = target > prevH ? 0.78 : 0.22;
              return Math.round(prevH + (target - prevH) * factor);
            })
          );
          animId = requestAnimationFrame(updateSpectrum);
          return;
        }

        // 2. Modelo Rítmico e Acústico de Alta Energia Sincronizado à Música
        // Relógio contínuo suave: avança continuamente e alinha deriva suavemente sem sobressaltos
        const targetTime = progressRef.current.currentTime;
        if (targetTime === 0 || Math.abs(continuousTimeRef.current - targetTime) > 0.45) {
          continuousTimeRef.current = targetTime;
        } else {
          const drift = targetTime - continuousTimeRef.current;
          continuousTimeRef.current += dt + drift * 0.06;
        }
        const continuousTime = continuousTimeRef.current;

        const currentTrackObj = trackRef.current;
        const trackDur = progressRef.current.duration;
        const { bpm } = getTrackTempo(currentTrackObj?.id);
        const bps = bpm / 60;
        const beatIndex = continuousTime * bps;
        const beatPhase = beatIndex % 1.0;
        const measureBeat = Math.floor(beatIndex) % 4;

        // Macro-dinâmica estrutural da música (intro, verso, refrão, clímax)
        const progress = trackDur > 0 ? continuousTime / trackDur : 0.25;
        const isIntro = progress < 0.05 || continuousTime < 7;
        const isOutro = progress > 0.95;
        const isChorus = (progress > 0.22 && progress < 0.45) || (progress > 0.58 && progress < 0.82);
        const macroDynamic = isIntro ? 0.80 : isOutro ? 0.75 : isChorus ? 1.25 : 1.05;

        // Detecção O(log N) ultra-leve sem parsing em tempo real
        const hasVocal = variant === "full" ? isVocalAtTime(lyricsRef.current, continuousTime) : false;
        const vocalActive = hasVocal ? 0.35 : 0;

        // Bumbo (kick drum): pulso firme e encorpado nos tempos 0 e 2
        const isDownbeat = measureBeat === 0 || measureBeat === 2;
        const kickPulse = Math.pow(Math.max(0, 1.0 - beatPhase * 2.8), 1.6) * (isDownbeat ? 1.0 : 0.72);

        // Caixa (snare): pulso estalado nos tempos 1 e 3
        const isSnareBeat = measureBeat === 1 || measureBeat === 3;
        const snarePulse = isSnareBeat ? Math.pow(Math.max(0, 1.0 - beatPhase * 3.2), 1.5) : 0;

        // Hi-hats e chimbais rápidos (16th e 8th notes)
        const eighthPhase = (beatIndex * 2.0) % 1.0;
        const sixteenthPhase = (beatIndex * 4.0) % 1.0;
        const hihatPulse =
          Math.pow(Math.max(0, 1.0 - eighthPhase * 3.8), 1.4) * 0.55 +
          Math.pow(Math.max(0, 1.0 - sixteenthPhase * 4.2), 1.3) * 0.38;

        setHeights((prev) =>
          Array.from({ length: barCount }, (_, i) => {
            const x = i / (barCount - 1 || 1); // 0.0 a 1.0 através das barras

            // Onda viajante contínua positiva (onda que corre sob a capa sem cancelar barras)
            const waveTravel = 0.5 + 0.5 * Math.sin(continuousTime * 4.0 - x * Math.PI * 2.5);

            let val = 0.35;
            if (x < 0.25) {
              // BANDA 1: Graves (0 a 3) - Bumbo potente e baixo pulsante
              const base = 0.32 + 0.15 * (0.5 + 0.5 * Math.sin(continuousTime * 2.2 + x * 2.0));
              val = (base + kickPulse * 0.55 + waveTravel * 0.18) * macroDynamic;
            } else if (x < 0.50) {
              // BANDA 2: Médios-Graves (4 a 7) - Caixa, percussão e corpo rítmico
              const base = 0.34 + 0.14 * (0.5 + 0.5 * Math.cos(continuousTime * 2.8 + x * 2.5));
              val = (base + snarePulse * 0.52 + kickPulse * 0.25 + waveTravel * 0.18) * macroDynamic;
            } else if (x < 0.75) {
              // BANDA 3: Médios e Vocais (8 a 11) - Voz do artista, instrumentos melódicos
              const vocalVibrato = 0.5 + 0.5 * Math.sin(continuousTime * 5.0 + x * 3.0);
              const base = 0.35 + 0.15 * vocalVibrato;
              val = (base + vocalActive + snarePulse * 0.22 + waveTravel * 0.18) * macroDynamic;
            } else {
              // BANDA 4: Agudos e Presença (12 a 15) - Chimbais rápidos, pratos e ar
              const base = 0.30 + 0.12 * (0.5 + 0.5 * Math.sin(continuousTime * 6.0 + x * 4.0));
              val = (base + hihatPulse * 0.52 + waveTravel * 0.16) * macroDynamic;
            }

            // Mapeia para amplitude cheia (18% a 100%)
            const target = Math.max(18, Math.min(100, Math.round(val * 100)));
            const prevH = prev[i] ?? 18;
            // Ataque rápido para impacto (0.76) e decaimento gradual balístico (0.22)
            const factor = target > prevH ? 0.76 : 0.22;
            return Math.round(prevH + (target - prevH) * factor);
          })
        );
      }

      animId = requestAnimationFrame(updateSpectrum);
    };

    animId = requestAnimationFrame(updateSpectrum);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, barCount, variant]);

  // ==========================================
  // VARIANT: MINI (PlayerBar / MiniPlayer / Chips)
  // ==========================================
  if (variant === "mini") {
    if (visualizerStyle === "blocks" || visualizerStyle === "wave") {
      const blockCount = 4;
      return (
        <div
          className={`flex items-end gap-1 h-3.5 px-0.5 ${className}`}
          aria-hidden="true"
          title={isPlaying ? "Tocando áudio (Blocos Hi-Fi)" : "Pausado"}
        >
          {heights.slice(0, 4).map((h, colIdx) => {
            const activeBlocks = isPlaying
              ? Math.max(1, Math.min(blockCount, Math.round((h / 100) * blockCount)))
              : 1;
            return (
              <div key={colIdx} className="flex flex-col-reverse gap-0.5 h-full justify-start w-1">
                {Array.from({ length: blockCount }, (_, bIdx) => {
                  const isActive = bIdx < activeBlocks;
                  return (
                    <span
                      key={bIdx}
                      style={{
                        backgroundColor: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.08)",
                        boxShadow: isActive ? "0 0 5px var(--accent-glow)" : undefined,
                        transition: isPlaying ? "none" : "background-color 250ms ease-in",
                      }}
                      className="w-full h-0.75 rounded-xs"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    const isPulse = visualizerStyle === "pulse";
    const isGradient = visualizerStyle === "gradient";

    return (
      <div
        className={`flex ${isPulse ? "items-center" : "items-end"} gap-1 h-3.5 px-1 ${className}`}
        aria-hidden="true"
        title={isPlaying ? "Tocando áudio" : "Pausado"}
      >
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              transform: `scaleY(${isPlaying ? Math.max(0.18, h / 100) : 0.18})`,
              transformOrigin: isPulse ? "center" : "bottom",
              transition: isPlaying ? "none" : "transform 250ms ease-in",
              background: isGradient
                ? "linear-gradient(to top, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))"
                : isPulse
                ? "linear-gradient(to bottom, var(--accent-gradient-to), var(--accent-gradient-from), var(--accent-gradient-to))"
                : "var(--accent)",
              boxShadow: isPlaying ? "0 0 6px var(--accent-glow)" : undefined,
            }}
            className={`w-0.75 h-full will-change-transform ${
              isPulse ? "rounded-full" : isGradient ? "rounded-t-full" : "rounded-t-xs"
            }`}
          />
        ))}
      </div>
    );
  }

  // ==========================================
  // VARIANT: INLINE (Chips / Controles compactos)
  // ==========================================
  if (variant === "inline") {
    if (visualizerStyle === "blocks" || visualizerStyle === "wave") {
      const totalBlocks = 5;
      return (
        <div
          className={`flex items-center gap-1 h-6 px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/5 ${className}`}
          aria-hidden="true"
        >
          {heights.slice(0, 8).map((h, colIdx) => {
            const activeBlocks = isPlaying
              ? Math.max(1, Math.min(totalBlocks, Math.round((h / 100) * totalBlocks)))
              : 1;
            return (
              <div key={colIdx} className="flex flex-col-reverse gap-0.5 h-full justify-start w-1.5">
                {Array.from({ length: totalBlocks }, (_, bIdx) => {
                  const isActive = bIdx < activeBlocks;
                  return (
                    <span
                      key={bIdx}
                      style={{
                        backgroundColor: isActive ? "var(--accent)" : "rgba(255, 255, 255, 0.08)",
                        boxShadow: isActive ? "0 0 5px var(--accent-glow)" : undefined,
                        transition: isPlaying ? "none" : "background-color 250ms ease-in",
                      }}
                      className="w-full h-1 rounded-xs"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    const isPulse = visualizerStyle === "pulse";
    const isGradient = visualizerStyle === "gradient";

    return (
      <div
        className={`flex ${isPulse ? "items-center" : "items-end"} gap-1.5 h-6 px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/5 ${className}`}
        aria-hidden="true"
      >
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              transform: `scaleY(${isPlaying ? Math.max(0.15, h / 100) : 0.15})`,
              transformOrigin: isPulse ? "center" : "bottom",
              transition: isPlaying ? "none" : "transform 300ms ease-in",
              background: isGradient
                ? "linear-gradient(to top, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))"
                : isPulse
                ? "linear-gradient(to bottom, var(--accent-gradient-to), var(--accent-gradient-from), var(--accent-gradient-to))"
                : "var(--accent)",
              boxShadow: isPlaying ? "0 0 8px var(--accent-glow)" : undefined,
            }}
            className={`w-1 h-full will-change-transform ${
              isPulse ? "rounded-full" : isGradient ? "rounded-t-full" : "rounded-t-xs"
            }`}
          />
        ))}
      </div>
    );
  }

  // ==========================================
  // VARIANT: FULL (NowPlayingDrawer / Telas Imersivas)
  // ==========================================

  // ESTILO 1: BLOCOS HI-FI (LEDs segmentados estilo receiver vintage)
  if (visualizerStyle === "blocks" || visualizerStyle === "wave") {
    const totalBlocks = 8;
    return (
      <div
        className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="flex items-end gap-1.5 h-14 w-full justify-center max-w-md z-10">
          {heights.map((h, colIdx) => {
            const activeBlocks = isPlaying
              ? Math.max(1, Math.min(totalBlocks, Math.round((h / 100) * totalBlocks)))
              : 1;
            return (
              <div
                key={colIdx}
                className="flex-1 flex flex-col-reverse gap-1 h-full justify-start max-w-[14px]"
              >
                {Array.from({ length: totalBlocks }, (_, bIdx) => {
                  const isActive = bIdx < activeBlocks;
                  const isTopPeak = isActive && bIdx === activeBlocks - 1 && bIdx >= totalBlocks - 2;
                  return (
                    <span
                      key={bIdx}
                      style={{
                        backgroundColor: isActive
                          ? isTopPeak
                            ? "var(--accent-text)"
                            : "var(--accent)"
                          : "rgba(255, 255, 255, 0.06)",
                        boxShadow: isActive
                          ? isTopPeak
                            ? "0 0 12px var(--accent-glow)"
                            : "0 0 6px var(--accent-glow)"
                          : undefined,
                        border: isActive ? undefined : "1px solid rgba(255, 255, 255, 0.03)",
                        transition: isPlaying ? "none" : "background-color 300ms ease-in",
                      }}
                      className="w-full h-1.5 rounded-[2px] will-change-transform"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ESTILO 2: GRADIENTE NEON (Colunas com Aurora vibrante limpa)
  if (visualizerStyle === "gradient") {
    return (
      <div
        className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="flex items-end gap-1.5 h-14 w-full justify-center max-w-md z-10">
          {heights.map((h, i) => {
            const scaledH = isPlaying ? Math.max(12, h) : 12;
            const isHighPeak = h > 75;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full max-w-[14px]"
              >
                <span
                  style={{
                    height: `${scaledH}%`,
                    transition: isPlaying ? "none" : "height 350ms ease-out",
                    background:
                      "linear-gradient(to top, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))",
                    boxShadow: isPlaying
                      ? isHighPeak
                        ? "0 0 18px var(--accent-glow), 0 0 6px var(--accent-text)"
                        : "0 0 10px var(--accent-glow)"
                      : undefined,
                  }}
                  className="w-full rounded-t-full will-change-transform"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ESTILO 3: PULSO CENTRAL (Expansão simétrica a partir da linha central)
  if (visualizerStyle === "pulse") {
    return (
      <div
        className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-35 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="flex items-center gap-1.5 h-14 w-full justify-center max-w-md z-10">
          {heights.map((h, i) => {
            const scaledH = isPlaying ? Math.max(14, h) : 14;
            const isHighPeak = h > 75;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center h-full max-w-[14px]"
              >
                <span
                  style={{
                    height: `${scaledH}%`,
                    transition: isPlaying ? "none" : "height 350ms ease-out",
                    background:
                      "linear-gradient(to bottom, var(--accent-gradient-to), var(--accent-gradient-from), var(--accent-gradient-to))",
                    boxShadow: isPlaying
                      ? isHighPeak
                        ? "0 0 18px var(--accent-glow), 0 0 6px var(--accent-text)"
                        : "0 0 10px var(--accent-glow)"
                      : undefined,
                  }}
                  className="w-full rounded-full will-change-transform"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ESTILO 4 (PADRÃO): BARRAS DE ESTÚDIO (Clássico vertical com reflexo de console e neon)
  return (
    <div
      className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
        }}
      />
      <div className="flex items-end gap-1.5 h-14 w-full justify-center max-w-md z-10">
        {heights.map((h, i) => {
          const isHighPeak = h > 75;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full max-w-[14px]"
            >
              <span
                style={{
                  transform: `scaleY(${isPlaying ? Math.max(0.12, h / 100) : 0.12})`,
                  transformOrigin: "bottom",
                  transition: isPlaying ? "none" : "transform 350ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  background: isHighPeak
                    ? "linear-gradient(to top, var(--accent-gradient-from), var(--accent-text))"
                    : "linear-gradient(to top, var(--accent-gradient-from), var(--accent))",
                  boxShadow: isPlaying
                    ? isHighPeak
                      ? "0 0 16px var(--accent-glow), 0 0 5px var(--accent-text)"
                      : "0 0 8px var(--accent-glow)"
                    : undefined,
                }}
                className="w-full h-full rounded-t-xs will-change-transform"
              />
              {/* Reflexo inferior do console */}
              <span
                style={{
                  transform: `scaleY(${isPlaying ? Math.max(0.04, (h * 0.25) / 100) : 0.04})`,
                  transformOrigin: "top",
                  transition: isPlaying ? "none" : "transform 350ms ease-out",
                  background: "linear-gradient(to bottom, var(--accent-subtle), transparent)",
                }}
                className="w-full h-3 rounded-b-xs opacity-40 will-change-transform"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
