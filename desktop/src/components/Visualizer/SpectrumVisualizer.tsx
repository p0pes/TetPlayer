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
  if (!trackId) return { bpm: 124, groove: 0.5 };
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const bpm = 115 + (absHash % 25); // 115 a 139 BPM
  const groove = 0.4 + ((absHash % 10) / 25);
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
    Array.from({ length: barCount }, () => 15)
  );

  // Consome isoladamente o progresso da música sem causar re-render em componentes pais
  const { currentTime, duration } = usePlaybackProgress();
  const progressRef = useRef({ currentTime: 0, duration: 0 });
  progressRef.current = { currentTime, duration };

  const trackRef = useRef(track);
  trackRef.current = track;

  useEffect(() => {
    let animId: number | null = null;

    if (!isPlaying) {
      setHeights(Array.from({ length: barCount }, () => 12));
      return;
    }

    let lastFrameTime = performance.now();
    const updateSpectrum = (time: number) => {
      // Otimização (Item 72): suspende cálculos e renderização quando a janela estiver minimizada
      if (typeof document !== "undefined" && document.hidden) {
        animId = requestAnimationFrame(updateSpectrum);
        return;
      }

      // Intervalo de ~35ms (~30fps) para fluidez visual a custo de CPU < 0.2%
      if (time - lastFrameTime >= 35) {
        lastFrameTime = time;

        // 1. Tenta obter o espectro de frequências real (FFT) do Web Audio se disponível
        const realData = nativeAudioEngine.getSpectrumData(barCount);
        if (realData && realData.some((v) => v > 15)) {
          setHeights((prev) =>
            Array.from({ length: barCount }, (_, i) => {
              const target = realData[i] ?? 12;
              const prevH = prev[i] ?? 12;
              const factor = target > prevH ? 0.65 : 0.28;
              return Math.round(prevH + (target - prevH) * factor);
            })
          );
          animId = requestAnimationFrame(updateSpectrum);
          return;
        }

        // 2. Modelo Rítmico e Acústico Sincronizado à Música (via currentTime, BPM e Letras)
        const currentTrackObj = trackRef.current;
        const { currentTime: trackTime, duration: trackDur } = progressRef.current;
        const { bpm, groove } = getTrackTempo(currentTrackObj?.id);
        const bps = bpm / 60;
        const beatIndex = trackTime * bps;
        const beatPhase = beatIndex % 1.0;
        const measureBeat = Math.floor(beatIndex) % 4;

        // Macro-dinâmica estrutural da música (intro, verso, refrão, clímax)
        const progress = trackDur > 0 ? trackTime / trackDur : 0.2;
        const isIntro = progress < 0.06 || trackTime < 8;
        const isOutro = progress > 0.94;
        const isChorus = (progress > 0.25 && progress < 0.45) || (progress > 0.60 && progress < 0.80);
        const macroDynamic = isIntro ? 0.55 : isOutro ? 0.5 : isChorus ? 1.25 : 0.85;

        // Detecção de voz ativa pelas letras sincronizadas
        const hasVocal = checkVocalActive(currentTrackObj?.id, trackTime);
        const vocalBoost = hasVocal ? 0.35 : 0;

        // Transiente de bumbo (kick drum): pulso instantâneo a cada batida com decaimento exponencial
        const kickTransient = Math.pow(Math.max(0, 1.0 - beatPhase * 3.8), 2.2);

        // Transiente de caixa (snare): tempos 2 e 4 do compasso (measureBeat 1 e 3)
        const isSnareTempo = measureBeat === 1 || measureBeat === 3;
        const snareTransient = isSnareTempo ? Math.pow(Math.max(0, 1.0 - beatPhase * 4.2), 2.0) : 0;

        // Hi-hats e pratos: tempos de colcheia e semicolcheia
        const eighthPhase = (beatIndex * 2) % 1.0;
        const sixteenthPhase = (beatIndex * 4) % 1.0;
        const hiHatTransient = Math.pow(Math.max(0, 1.0 - eighthPhase * 4.5), 1.8) * 0.7;
        const sixteenthTransient = Math.pow(Math.max(0, 1.0 - sixteenthPhase * 5.0), 1.5) * 0.4;

        setHeights((prev) =>
          Array.from({ length: barCount }, (_, i) => {
            const freqPos = i / (barCount - 1 || 1); // 0.0 (sub-grave) a 1.0 (agudo)
            let val = 0.2;

            if (freqPos < 0.25) {
              // BANDA 1: Sub-Graves e Graves (Bumbo e Linha de Baixo)
              const bassBase = 0.30 + Math.sin(trackTime * 2.5 + i * 0.4) * 0.15;
              val = (bassBase + kickTransient * 0.65 + Math.sin(beatIndex * Math.PI) * 0.15) * macroDynamic;
            } else if (freqPos < 0.50) {
              // BANDA 2: Médio-Graves e Caixa (Snare, Tom-toms e Ritmo)
              const midBase = 0.28 + Math.cos(trackTime * 3.0 + i * 0.5) * 0.14;
              val = (midBase + snareTransient * 0.55 + groove * 0.15) * macroDynamic;
            } else if (freqPos < 0.75) {
              // BANDA 3: Médios e Vocais (Voz do cantor, guitarras e teclados)
              const vocalBase = 0.25 + Math.sin(trackTime * 4.0 + i * 0.7) * 0.18 + Math.cos(trackTime * 7.5) * 0.08;
              val = (vocalBase + vocalBoost + snareTransient * 0.2) * macroDynamic;
            } else {
              // BANDA 4: Agudos e Presença (Hi-hats, pratos, brilho e sintetizadores)
              const highBase = 0.22 + Math.sin(trackTime * 5.5 + i * 0.9) * 0.12;
              val = (highBase + hiHatTransient * 0.5 + sixteenthTransient * 0.3) * macroDynamic;
            }

            const target = Math.max(12, Math.min(100, Math.round(val * 100)));
            const prevH = prev[i] ?? 12;
            const factor = target > prevH ? 0.6 : 0.25;
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
    // 1. Estilo BLOCKS: Blocos de LED segmentados estilo Hi-Fi Vintage
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
                        boxShadow: isActive ? "0 0 4px var(--accent-glow)" : undefined,
                        transition: isPlaying
                          ? "background-color 50ms ease-out"
                          : "background-color 200ms ease-in",
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
              transform: `scaleY(${isPlaying ? Math.max(0.2, h / 100) : 0.2})`,
              transformOrigin: isPulse ? "center" : "bottom",
              transition: isPlaying ? "transform 60ms ease-out" : "transform 250ms ease-in",
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
                        boxShadow: isActive ? "0 0 4px var(--accent-glow)" : undefined,
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
              transition: isPlaying ? "transform 70ms ease-out" : "transform 300ms ease-in",
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
          className="absolute inset-0 opacity-30 pointer-events-none"
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
                            ? "0 0 10px var(--accent-glow)"
                            : "0 0 5px var(--accent-glow)"
                          : undefined,
                        border: isActive ? undefined : "1px solid rgba(255, 255, 255, 0.03)",
                        transition: isPlaying
                          ? "background-color 55ms ease-out, box-shadow 55ms ease-out"
                          : "background-color 300ms ease-in",
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
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="flex items-end gap-1.5 h-14 w-full justify-center max-w-md z-10">
          {heights.map((h, i) => {
            const scaledH = isPlaying ? Math.max(10, h) : 10;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full max-w-[14px]"
              >
                <span
                  style={{
                    height: `${scaledH}%`,
                    transition: isPlaying
                      ? "height 65ms cubic-bezier(0.2, 0.8, 0.2, 1)"
                      : "height 400ms ease-out",
                    background:
                      "linear-gradient(to top, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))",
                    boxShadow: isPlaying ? "0 0 14px var(--accent-glow)" : undefined,
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
            const scaledH = isPlaying ? Math.max(12, h) : 12;
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center h-full max-w-[14px]"
              >
                <span
                  style={{
                    height: `${scaledH}%`,
                    transition: isPlaying ? "height 60ms ease-out" : "height 400ms ease-out",
                    background:
                      "linear-gradient(to bottom, var(--accent-gradient-to), var(--accent-gradient-from), var(--accent-gradient-to))",
                    boxShadow: isPlaying ? "0 0 16px var(--accent-glow)" : undefined,
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

  // ESTILO 4 (PADRÃO): BARRAS DE ESTÚDIO (Clássico vertical com reflexo de console)
  return (
    <div
      className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
        }}
      />
      <div className="flex items-end gap-1.5 h-14 w-full justify-center max-w-md z-10">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full max-w-[14px]"
          >
            <span
              style={{
                transform: `scaleY(${isPlaying ? Math.max(0.1, h / 100) : 0.1})`,
                transformOrigin: "bottom",
                transition: isPlaying
                  ? "transform 65ms cubic-bezier(0.2, 0.8, 0.2, 1)"
                  : "transform 400ms ease-out",
                background: "linear-gradient(to top, var(--accent-gradient-from), var(--accent))",
                boxShadow: isPlaying ? "0 0 10px var(--accent-glow)" : undefined,
              }}
              className="w-full h-full rounded-t-xs will-change-transform"
            />
            {/* Reflexo inferior do console */}
            <span
              style={{
                transform: `scaleY(${isPlaying ? Math.max(0.04, (h * 0.25) / 100) : 0.04})`,
                transformOrigin: "top",
                transition: isPlaying
                  ? "transform 65ms cubic-bezier(0.2, 0.8, 0.2, 1)"
                  : "transform 400ms ease-out",
                background: "linear-gradient(to bottom, var(--accent-subtle), transparent)",
              }}
              className="w-full h-3 rounded-b-xs opacity-40 will-change-transform"
            />
          </div>
        ))}
      </div>
    </div>
  );
});
