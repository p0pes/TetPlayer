import { memo, useCallback, useState } from "react";
import { usePlaybackProgress } from "../../context/PlayerContext";
import { formatTime } from "../../hooks/useLyrics";

export interface TimelineScrubberProps {
  disabled?: boolean;
  onSeek: (seconds: number) => void;
}

/**
 * Componente atômico e memoizado para a linha do tempo / scrubber de reprodução.
 * Consome isoladamente o PlaybackProgressContext para impedir que o PlayerBar
 * e seus elementos filhos (botões centrais, capa, volume) re-renderizem nos ticks de áudio.
 */
export const TimelineScrubber = memo(function TimelineScrubber({
  disabled = false,
  onSeek,
}: TimelineScrubberProps) {
  const { currentTime, duration } = usePlaybackProgress();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayTime = isDragging ? dragValue : currentTime;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDragValue(val);
      onSeek(val);
    },
    [onSeek]
  );

  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
    setDragValue(currentTime);
  }, [currentTime]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      data-testid="timeline-scrubber"
      className="w-full flex items-center gap-3 text-[10px] text-[#71778c] font-mono select-none"
    >
      <span data-testid="scrubber-current-time" className="w-8 text-right">
        {formatTime(displayTime)}
      </span>
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
        className="flex-1 h-1 bg-[#232733] rounded-full accent-red-500 cursor-pointer disabled:cursor-not-allowed"
      />
      <span data-testid="scrubber-duration" className="w-8 text-left">
        {formatTime(duration)}
      </span>
    </div>
  );
});
