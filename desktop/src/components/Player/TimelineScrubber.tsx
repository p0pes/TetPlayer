import { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import { usePlaybackProgress } from "../../context/PlayerContext";
import { formatTime, getCachedLyrics, parseLrc } from "../../hooks/useLyrics";
import { SettingsService } from "../../services/settings";
import { Track, LyricLine } from "../../types";

export interface TimelineScrubberProps {
  disabled?: boolean;
  onSeek: (seconds: number) => void;
  currentTrack?: Track | null;
}

/**
 * Gera um envelope de pseudo-waveform de 64 micro-barras determinístico
 * baseado no ID da faixa. Custo computacional O(1) < 0.1ms, zero alocação de RAM pesada.
 */
function generateDeterministicWaveform(trackId?: string): number[] {
  const bars = 64;
  if (!trackId) {
    return Array.from({ length: bars }, () => 0.35);
  }

  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash << 5) - hash + trackId.charCodeAt(i);
    hash |= 0;
  }

  const result: number[] = [];
  for (let i = 0; i < bars; i++) {
    // Envelope natural de música: curva suave com elevação no meio e picos rítmicos
    const progress = i / bars;
    const baseEnvelope = Math.sin(progress * Math.PI) * 0.5 + 0.35;
    const pseudoRandom = Math.abs(Math.sin((hash + i * 37) * 0.123));
    const height = Math.min(1.0, Math.max(0.18, baseEnvelope * (0.6 + pseudoRandom * 0.65)));
    result.push(Number(height.toFixed(2)));
  }
  return result;
}

/**
 * Busca binária O(log N) para encontrar a estrofe correspondente ao timestamp
 */
function findLyricSnippetForTime(lyrics: LyricLine[], time: number): string | null {
  if (!lyrics || lyrics.length === 0) return null;

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
    // Se a estrofe for muito antiga em relação ao ponto (ex: intro sem letra nos primeiros 30s), ignora
    if (time - line.time < 12 && line.text.trim()) {
      return line.text.trim();
    }
  }
  return null;
}

/**
 * Componente atômico e memoizado para a linha do tempo / scrubber de reprodução.
 * Consome isoladamente o PlaybackProgressContext para impedir que o PlayerBar
 * e seus elementos filhos (botões centrais, capa, volume) re-renderizem nos ticks de áudio.
 *
 * Suporta Waveform Seekbar com Tooltip de Letras no Hover (Item 1.4).
 */
export const TimelineScrubber = memo(function TimelineScrubber({
  disabled = false,
  onSeek,
  currentTrack,
}: TimelineScrubberProps) {
  const { currentTime, duration } = usePlaybackProgress();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  // Estado de Waveform Seekbar das Configurações
  const [isWaveformEnabled, setIsWaveformEnabled] = useState(() =>
    SettingsService.getSetting("waveformSeekbar")
  );

  useEffect(() => {
    return SettingsService.subscribe((settings, key) => {
      if (!key || key === "waveformSeekbar") {
        setIsWaveformEnabled(settings.waveformSeekbar);
      }
    });
  }, []);

  // Tooltip flutuante no Hover
  const [hoverState, setHoverState] = useState<{
    x: number;
    time: number;
    lyric: string | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(0);

  const displayTime = isDragging ? dragValue : currentTime;
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, displayTime / duration)) : 0;

  // Letras em cache para o tooltip do hover
  const parsedLyrics = useMemo<LyricLine[]>(() => {
    if (!currentTrack?.id) return [];
    const cached = getCachedLyrics(currentTrack.id);
    if (cached?.synced) {
      return parseLrc(cached.synced);
    }
    return [];
  }, [currentTrack?.id]);

  // Waveform memoizada (calculada apenas quando a faixa muda)
  const waveformHeights = useMemo(() => {
    return generateDeterministicWaveform(currentTrack?.id);
  }, [currentTrack?.id]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      dragValueRef.current = val;
      setDragValue(val);

      if (!isDraggingRef.current) {
        onSeek(val);
      }
    },
    [onSeek]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLInputElement>) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignorado em ambientes de teste sem suporte
      }
      isDraggingRef.current = true;
      dragValueRef.current = currentTime;
      setIsDragging(true);
      setDragValue(currentTime);
    },
    [currentTime]
  );

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onSeek(dragValueRef.current);
    }
  }, [onSeek]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || duration <= 0 || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ratio = relativeX / rect.width;
      const targetSec = ratio * duration;

      const snippet = findLyricSnippetForTime(parsedLyrics, targetSec);
      setHoverState({
        x: relativeX,
        time: targetSec,
        lyric: snippet,
      });
    },
    [disabled, duration, parsedLyrics]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverState(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleWindowPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        onSeek(dragValueRef.current);
      }
    };
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isDragging, onSeek]);

  return (
    <div
      data-testid="timeline-scrubber"
      className="w-full flex items-center gap-3 text-[10px] text-[#71778c] font-mono select-none"
    >
      <span data-testid="scrubber-current-time" className="w-8 text-right">
        {formatTime(displayTime)}
      </span>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 py-2 flex items-center group cursor-pointer"
      >
        {/* Tooltip de Preview no Hover (Timestamp + Trecho da Letra) */}
        {hoverState && !disabled && (
          <div
            className="absolute bottom-full mb-2 z-50 pointer-events-none transform -translate-x-1/2 flex flex-col items-center animate-view-fade"
            style={{ left: `${hoverState.x}px` }}
          >
            <div className="bg-[#12141c]/95 border border-[#2b3042] text-white px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/60 flex flex-col items-center gap-1 max-w-[200px] text-center backdrop-blur-md">
              <span className="font-mono text-[11px] font-bold text-[var(--accent-text)]">
                {formatTime(hoverState.time)}
              </span>
              {hoverState.lyric && (
                <span className="text-[10px] text-[#d1d5db] font-sans leading-tight line-clamp-2">
                  &ldquo;{hoverState.lyric}&rdquo;
                </span>
              )}
            </div>
            {/* Triângulo indicador do balão */}
            <div className="w-2 h-2 bg-[#12141c] border-r border-b border-[#2b3042] transform rotate-45 -mt-1" />
          </div>
        )}

        {/* Modo Waveform Seekbar Dinâmico */}
        {isWaveformEnabled ? (
          <div className="relative w-full h-4 flex items-center">
            {/* Barras de Amplitude de Fundo */}
            <div className="absolute inset-0 flex items-center justify-between gap-[2px] pointer-events-none overflow-hidden">
              {waveformHeights.map((h, idx) => {
                const barRatio = idx / waveformHeights.length;
                const isPlayed = barRatio <= progressRatio;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-full transition-colors duration-100 ease-out"
                    style={{
                      height: `${Math.round(h * 100)}%`,
                      backgroundColor: isPlayed ? "var(--accent)" : "#232733",
                      opacity: isPlayed ? 1 : 0.65,
                    }}
                  />
                );
              })}
            </div>

            {/* Input Range transparente sobreposto para manter acessibilidade e ergonomia */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={displayTime}
              onChange={handleInputChange}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              disabled={disabled}
              aria-label="Posição da música na linha do tempo"
              data-testid="scrubber-range-input"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
          </div>
        ) : (
          /* Modo Clássico / Minimalista (Barra Linear) */
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={displayTime}
            onChange={handleInputChange}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            disabled={disabled}
            aria-label="Posição da música na linha do tempo"
            data-testid="scrubber-range-input"
            className="w-full h-1 hover:h-1.5 bg-[#232733] hover:bg-[#2e3344] rounded-full accent-[var(--accent)] cursor-pointer disabled:cursor-not-allowed transition-all duration-150 ease-out"
          />
        )}
      </div>

      <span data-testid="scrubber-duration" className="w-8 text-left">
        {formatTime(duration)}
      </span>
    </div>
  );
});
