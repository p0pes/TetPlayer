import { useEffect, useRef, useState, memo } from "react";
import { SettingsService, VisualizerStyle } from "../../services/settings";

interface SpectrumVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  variant?: "mini" | "inline" | "full";
  style?: VisualizerStyle;
  className?: string;
}

export const SpectrumVisualizer = memo(function SpectrumVisualizer({
  isPlaying,
  barCount = 5,
  variant = "mini",
  style: propStyle,
  className = "",
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

  const visualizerStyleRef = useRef(visualizerStyle);
  visualizerStyleRef.current = visualizerStyle;

  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 15)
  );
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setHeights(Array.from({ length: barCount }, () => 12));
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const updateSpectrum = (time: number) => {
      // Otimização (Item 72): suspende cálculos e re-renderização caso a janela esteja oculta/minimizada
      if (typeof document !== "undefined" && document.hidden) {
        animFrameRef.current = requestAnimationFrame(updateSpectrum);
        return;
      }

      if (time - lastTime >= 50) {
        lastTime = time;
        setHeights(
          Array.from({ length: barCount }, (_, i) => {
            const phase = time * 0.005 + i * 0.75;
            const primaryWave = Math.sin(phase) * 0.35 + Math.cos(phase * 1.6) * 0.25;
            const subHarmonic = Math.sin(time * 0.009 + i * 1.3) * 0.16;
            const normalized = Math.max(0.12, Math.min(1.0, 0.52 + primaryWave + subHarmonic));
            return Math.round(normalized * 100);
          })
        );
      }
      animFrameRef.current = requestAnimationFrame(updateSpectrum);
    };

    animFrameRef.current = requestAnimationFrame(updateSpectrum);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
