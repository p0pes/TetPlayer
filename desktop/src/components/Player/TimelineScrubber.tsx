import { memo, useCallback, useState, useRef, useEffect, useMemo } from "react";
import { usePlaybackProgress } from "../../context/PlayerContext";
import { formatTime, getCachedLyrics, parseLrc } from "../../hooks/useLyrics";
import { Track, LyricLine } from "../../types";

export interface TimelineScrubberProps {
  disabled?: boolean;
  onSeek: (seconds: number) => void;
  currentTrack?: Track | null;
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
 * Mantém a barra reta e contínua com tooltip informativo de letras no hover.
 */
export const TimelineScrubber = memo(function TimelineScrubber({
  disabled = false,
  onSeek,
  currentTrack,
}: TimelineScrubberProps) {
  const { currentTime, duration } = usePlaybackProgress();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  // Tooltip flutuante no Hover (Timestamp + Trecho da Letra)
  const [hoverState, setHoverState] = useState<{
    x: number;
    time: number;
    lyric: string | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(0);

  const displayTime = isDragging ? dragValue : currentTime;

  // Letras em cache para o tooltip do hover
  const parsedLyrics = useMemo<LyricLine[]>(() => {
    if (!currentTrack?.id) return [];
    const cached = getCachedLyrics(currentTrack.id);
    if (cached?.synced) {
      return parseLrc(cached.synced);
    }
    return [];
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

        {/* Barra Linear Reta Clássica */}
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
      </div>

      <span data-testid="scrubber-duration" className="w-8 text-left">
        {formatTime(duration)}
      </span>
    </div>
  );
});
