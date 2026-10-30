import { useEffect, useRef, useState, memo } from "react";
import { SettingsService, VisualizerStyle } from "../../services/settings";
import { usePlaybackProgress } from "../../context/PlayerContext";
import { getCachedLyrics, parseLrc } from "../../hooks/useLyrics";
import { nativeAudioEngine } from "../../services/audioEngine";
import { Track } from "../../types";

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
 * Verifica se no segundo atual existe voz/estrofe ativa a partir das letras em cache
 */
function checkVocalActive(trackId: string | undefined, time: number): boolean {
  if (!trackId) return false;
  try {
    const cached = getCachedLyrics(trackId);
    if (!cached?.synced) return false;
    const lyrics = parseLrc(cached.synced);
    if (lyrics.length === 0) return false;

    for (let i = 0; i < lyrics.length; i++) {
      const line = lyrics[i];
      const nextLineTime = i < lyrics.length - 1 ? lyrics[i + 1].time : line.time + 5;
      const duration = Math.min(8, Math.max(2, nextLineTime - line.time));
      if (time >= line.time && time < line.time + duration) {
        return Boolean(line.text.trim());
      }
    }
  } catch {
    // Silencia qualquer erro em ambiente de teste
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

  // Relógio contínuo de alta resolução para eliminar tremidas/glitches entre ticks de 80ms
  const lastReportedTimeRef = useRef(0);
  const lastReportedTimestampRef = useRef(performance.now());

  useEffect(() => {
    let animId: number | null = null;

    if (!isPlaying) {
      setHeights(Array.from({ length: barCount }, () => 12));
      return;
    }

    let lastFrameTime = performance.now();
    const updateSpectrum = (now: number) => {
      // Otimização (Item 72): suspende cálculos e renderização quando a janela estiver minimizada
      if (typeof document !== "undefined" && document.hidden) {
        animId = requestAnimationFrame(updateSpectrum);
        return;
      }

      // Intervalo de ~30ms (~33fps) ideal para fluidez visual extrema sem consumo de CPU (< 0.2%)
      if (now - lastFrameTime >= 30) {
        lastFrameTime = now;

        // 1. Tenta obter o espectro de frequências real (FFT) do Web Audio se disponível
        const realData = nativeAudioEngine.getSpectrumData(barCount);
        if (realData && realData.some((v) => v > 15)) {
          setHeights((prev) =>
            Array.from({ length: barCount }, (_, i) => {
              // Sensibilidade amplificada para maior impacto e energia visual
              const rawTarget = realData[i] ?? 12;
              const target = Math.min(100, Math.round(rawTarget * 1.25));
              const prevH = prev[i] ?? 12;
              const factor = target > prevH ? 0.78 : 0.22;
              return Math.round(prevH + (target - prevH) * factor);
            })
          );
          animId = requestAnimationFrame(updateSpectrum);
          return;
        }

        // 2. Modelo Rítmico e Acústico de Alta Energia Sincronizado à Música
        // Interpolação temporal contínua: calcula tempo contínuo suave entre os saltos de 80ms do timer
        const rawTime = progressRef.current.currentTime;
        if (rawTime !== lastReportedTimeRef.current) {
          lastReportedTimeRef.current = rawTime;
          lastReportedTimestampRef.current = now;
        }
        const deltaSec = (now - lastReportedTimestampRef.current) / 1000;
        // Permite avanço contínuo de até 150ms sem travar nem dar pulos bruscos
        const continuousTime = rawTime + Math.min(0.15, Math.max(0, deltaSec));

        const currentTrackObj = trackRef.current;
        const trackDur = progressRef.current.duration;
        const { bpm, groove } = getTrackTempo(currentTrackObj?.id);
        const bps = bpm / 60;
        const beatIndex = continuousTime * bps;
        const beatPhase = beatIndex % 1.0;
        const measureBeat = Math.floor(beatIndex) % 4;

        // Macro-dinâmica estrutural da música (intro, verso, refrão, clímax) com amplitudes elevadas
        const progress = trackDur > 0 ? continuousTime / trackDur : 0.25;
        const isIntro = progress < 0.05 || continuousTime < 7;
        const isOutro = progress > 0.95;
        const isChorus = (progress > 0.22 && progress < 0.45) || (progress > 0.58 && progress < 0.82);
        const macroDynamic = isIntro ? 0.65 : isOutro ? 0.60 : isChorus ? 1.35 : 1.05;

        // Detecção de voz ativa pelas letras sincronizadas
        const hasVocal = checkVocalActive(currentTrackObj?.id, continuousTime);
        const vocalBoost = hasVocal ? 0.45 : 0;

        // Transiente de bumbo (kick drum): pulso firme com ataque instantâneo e decaimento acústico
        const kickTransient = Math.pow(Math.max(0, 1.0 - beatPhase * 3.0), 1.6);

        // Transiente de caixa (snare): tempos 2 e 4 do compasso 4/4
        const isSnareTempo = measureBeat === 1 || measureBeat === 3;
        const snareTransient = isSnareTempo ? Math.pow(Math.max(0, 1.0 - beatPhase * 3.4), 1.5) : 0;

        // Hi-hats e pratos: ritmos de colcheia e semicolcheia com agilidade
        const eighthPhase = (beatIndex * 2) % 1.0;
        const sixteenthPhase = (beatIndex * 4) % 1.0;
        const hiHatTransient = Math.pow(Math.max(0, 1.0 - eighthPhase * 4.0), 1.5) * 0.8;
        const sixteenthTransient = Math.pow(Math.max(0, 1.0 - sixteenthPhase * 4.5), 1.3) * 0.5;

        setHeights((prev) =>
          Array.from({ length: barCount }, (_, i) => {
            const freqPos = i / (barCount - 1 || 1); // 0.0 (sub-grave) a 1.0 (agudo)
            let val = 0.25;

            if (freqPos < 0.25) {
              // BANDA 1: Sub-Graves e Graves (Bumbo potente e Bassline pulsante)
              const bassBase = 0.22 + Math.sin(continuousTime * 3.2 + i * 0.35) * 0.14;
              val = (bassBase + kickTransient * 0.82 + Math.sin(beatIndex * Math.PI) * 0.22) * macroDynamic;
            } else if (freqPos < 0.50) {
              // BANDA 2: Médio-Graves e Caixa (Snare estalado, Toms e Groove de bateria)
              const midBase = 0.24 + Math.cos(continuousTime * 3.6 + i * 0.45) * 0.16;
              val = (midBase + snareTransient * 0.78 + groove * 0.22) * macroDynamic;
            } else if (freqPos < 0.75) {
              // BANDA 3: Médios e Vocais (Voz do artista com vibrato, guitarras e teclados)
              const vocalBase = 0.22 + Math.sin(continuousTime * 4.8 + i * 0.6) * 0.24 + Math.sin(continuousTime * 9.5) * 0.10;
              val = (vocalBase + vocalBoost + snareTransient * 0.28) * macroDynamic;
            } else {
              // BANDA 4: Agudos e Presença (Hi-hats vívidos, pratos e sintetizadores)
              const highBase = 0.18 + Math.sin(continuousTime * 6.5 + i * 0.8) * 0.15;
              val = (highBase + hiHatTransient * 0.65 + sixteenthTransient * 0.42) * macroDynamic;
            }

            // Mapeia para amplitude cheia (14% a 100%)
            const target = Math.max(14, Math.min(100, Math.round(val * 100)));
            const prevH = prev[i] ?? 14;
            // Ataque rápido para impacto e decaimento gradual com física orgânica
            const factor = target > prevH ? 0.78 : 0.22;
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
  }, [isPlaying, barCount]);

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
