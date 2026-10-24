import { useEffect, useRef, useState } from "react";
import { SettingsService, VisualizerStyle } from "../../services/settings";

interface SpectrumVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  variant?: "mini" | "inline" | "full";
  style?: VisualizerStyle;
  className?: string;
}

export function SpectrumVisualizer({
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
      // Atualiza a cada ~45ms para uma animação vibrante sem sobrecarregar a GPU
      if (time - lastTime > 45) {
        lastTime = time;
        setHeights(
          Array.from({ length: barCount }, (_, i) => {
            // Curva harmônica combinando senos de frequências diferentes com ruído dinâmico
            const phase = time * 0.005 + i * 0.8;
            const wave = Math.sin(phase) * 0.35 + Math.cos(phase * 1.6) * 0.25;
            const noise = (Math.random() - 0.5) * 0.4;
            const normalized = Math.max(0.15, Math.min(1.0, 0.55 + wave + noise));
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

  if (variant === "mini") {
    return (
      <div
        className={`flex items-end gap-1 h-3.5 px-1 ${className}`}
        aria-hidden="true"
        title={isPlaying ? "Tocando áudio" : "Pausado"}
      >
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              transform: `scaleY(${isPlaying ? Math.max(0.18, h / 100) : 0.2})`,
              transformOrigin: "bottom",
              transition: isPlaying ? "transform 60ms ease-out" : "transform 250ms ease-in",
            }}
            className="w-0.75 h-full bg-gradient-to-t from-red-600 to-red-400 rounded-full will-change-transform"
          />
        ))}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`flex items-end gap-1.5 h-6 px-2 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/5 ${className}`}
        aria-hidden="true"
      >
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              transform: `scaleY(${isPlaying ? Math.max(0.15, h / 100) : 0.15})`,
              transformOrigin: "bottom",
              transition: isPlaying ? "transform 70ms ease-out" : "transform 300ms ease-in",
            }}
            className="w-1 h-full bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)] will-change-transform"
          />
        ))}
      </div>
    );
  }

  // Variant === "full" (Waveform imersiva de alta resolução acelerada por GPU)
  return (
    <div
      className={`relative w-full flex items-center justify-center p-3 rounded-2xl bg-[#0c0e15]/70 border border-[#1f2434] shadow-inner backdrop-blur-md overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Glow de fundo */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--aurora-1-glow) 0%, transparent 70%)",
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
                transition: isPlaying ? "transform 65ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "transform 400ms ease-out",
              }}
              className={`w-full h-full will-change-transform ${
                visualizerStyle === "wave"
                  ? "bg-gradient-to-t from-indigo-600 via-purple-500 to-pink-400 rounded-t-full shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                  : visualizerStyle === "gradient"
                  ? "bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 rounded-t-md shadow-[0_0_12px_rgba(45,212,191,0.6)]"
                  : "bg-gradient-to-t from-red-600 via-red-500 to-amber-300 rounded-t-sm shadow-[0_0_12px_rgba(239,68,68,0.6)]"
              }`}
            />
            {/* Espelho invertido / Reflexo */}
            <span
              style={{
                transform: `scaleY(${isPlaying ? Math.max(0.04, (h * 0.25) / 100) : 0.04})`,
                transformOrigin: "top",
                transition: isPlaying ? "transform 65ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "transform 400ms ease-out",
              }}
              className="w-full h-3 bg-gradient-to-b from-red-600/40 to-transparent rounded-b-sm opacity-40 will-change-transform"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
