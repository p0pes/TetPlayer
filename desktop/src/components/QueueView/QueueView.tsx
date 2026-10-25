import { useState } from "react";
import { ChevronUp, ChevronDown, Play, Pause, Trash2, ListMusic, MoreVertical, GripVertical } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { formatTime } from "../../hooks/useLyrics";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";

export function QueueView() {
  const {
    currentTrack,
    pastTracks,
    upcomingTracks,
    showPastTracks,
    setShowPastTracks,
    isPlaying,
    duration,
    togglePlayPause,
    handlePlayFromQueue,
    handleRemoveFromQueue,
    handleClearUpcomingQueue,
    handleReorderQueue,
    currentQueueIndex,
    openContextMenu,
  } = usePlayer();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
      {/* 1. Músicas que já passaram (Tocadas Anteriormente) */}
      {pastTracks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <button
              onClick={() => setShowPastTracks((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#71778c] hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span>Músicas que Já Passaram ({pastTracks.length})</span>
              {showPastTracks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showPastTracks && (
            <div className="space-y-1 opacity-70 hover:opacity-100 transition-opacity">
              {pastTracks.map((track, idx) => (
                <div
                  key={`past-${track.id}-${idx}`}
                  onClick={() => handlePlayFromQueue(idx)}
                  onContextMenu={(e) => openContextMenu(e, track)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#12141c]/60 hover:bg-[#1a1e2c] border border-transparent hover:border-[#282d3d] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-[11px] font-mono text-[#52576b] group-hover:text-[#8c91a4]">
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-[#1a1d27] overflow-hidden shrink-0">
                      <img
                        src={upgradeArtworkQuality(track.artwork_url, track.id)}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleArtworkError(e, track.id)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#c4c8d8] truncate group-hover:text-white">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-[#71778c] truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {track.duration && (
                      <span className="text-[11px] font-mono text-[#52576b]">
                        {track.duration}
                      </span>
                    )}
                    <button
                      title="Mais opções"
                      aria-label="Mais opções"
                      onClick={(e) => openContextMenu(e, track)}
                      className="p-1 rounded-lg text-[#71778c] hover:text-white hover:bg-[#252b3d] opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Ouvir novamente"
                      aria-label={`Ouvir novamente: ${track.title}`}
                      className="p-1 rounded-lg text-[#71778c] hover:text-white hover:bg-[#252b3d] transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Faixa Atual: Tocando Agora */}
      {currentTrack && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
            Tocando Agora
          </span>
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent-subtle)] via-[#181a26] to-[#12141c] border border-[var(--accent-border)] shadow-lg shadow-[var(--accent-glow)]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#171a24] overflow-hidden shrink-0 border border-[var(--accent-border)]">
                <img
                  src={upgradeArtworkQuality(currentTrack.artwork_url, currentTrack.id)}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleArtworkError(e, currentTrack.id)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[var(--accent-text)] font-medium truncate">
                  {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-[#8c91a4]">
                {currentTrack.duration || formatTime(duration)}
              </span>
              <button
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pausar música" : "Reproduzir música"}
                className="w-8 h-8 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Próximas Músicas (A Seguir na Fila) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>A Seguir</span>
            <span className="text-[11px] text-[#71778c] font-normal lowercase">
              ({upcomingTracks.length} faixas restantes)
            </span>
          </span>

          {upcomingTracks.length > 0 && (
            <button
              onClick={handleClearUpcomingQueue}
              title="Remover todas as próximas faixas da fila"
              aria-label="Limpar todas as próximas músicas da fila"
              className="text-[11px] text-[#71778c] hover:text-[var(--accent-text)] font-medium transition-colors cursor-pointer"
            >
              Limpar Próximas
            </button>
          )}
        </div>

        {upcomingTracks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-[#71778c] bg-[#10121a]/50 rounded-2xl border border-dashed border-[#1f232e]">
            <ListMusic className="w-10 h-10 text-[#3b4154] mb-2" />
            <p className="text-sm font-semibold text-white">Fim da fila de reprodução</p>
            <p className="text-xs text-[#71778c] max-w-sm mt-1">
              Não há próximas músicas agendadas. Selecione uma playlist na biblioteca ou ative a repetição contínua.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {upcomingTracks.map((track, relativeIdx) => {
              const actualIdx = currentQueueIndex + 1 + relativeIdx;
              const isBeingDragged = draggedIdx === actualIdx;
              const isDragOver = dragOverIdx === actualIdx;

              return (
                <div
                  key={`upcoming-${track.id}-${actualIdx}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(actualIdx));
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedIdx(actualIdx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIdx !== actualIdx) {
                      setDragOverIdx(actualIdx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIdx === actualIdx) {
                      setDragOverIdx(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx =
                      draggedIdx ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
                    if (!isNaN(fromIdx) && fromIdx !== actualIdx) {
                      handleReorderQueue(fromIdx, actualIdx);
                    }
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                  onClick={() => handlePlayFromQueue(actualIdx)}
                  onContextMenu={(e) => openContextMenu(e, track)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                    isBeingDragged
                      ? "opacity-35 scale-[0.98] border-dashed border-[var(--accent)] bg-[#1e2334]"
                      : isDragOver
                      ? "border-t-2 border-t-[var(--accent)] bg-[#1c2030] shadow-lg shadow-[var(--accent-glow)]"
                      : "bg-[#141722]/70 hover:bg-[#1c2030] border border-[#1f2433] hover:border-[#2d3448]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Alça tátil de arrasto */}
                    <div
                      className="p-0.5 text-[#52576b] hover:text-[#c4c8d8] cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Segure e arraste para reordenar"
                      aria-label="Arrastar para reordenar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <span className="w-4 text-center text-xs font-mono text-[#71778c] group-hover:text-[var(--accent-text)] shrink-0">
                      {relativeIdx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-[#1a1d27] overflow-hidden shrink-0 border border-[#232838]">
                      <img
                        src={upgradeArtworkQuality(track.artwork_url, track.id)}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleArtworkError(e, track.id)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-[var(--accent-text)]">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-[#8c91a4] truncate">
                        {track.artist} {track.album ? `• ${track.album}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {track.duration && (
                      <span className="text-xs font-mono text-[#71778c]">
                        {track.duration}
                      </span>
                    )}

                    {/* Botão de Contexto / Mais Opções */}
                    <button
                      title="Mais opções"
                      aria-label="Mais opções"
                      onClick={(e) => {
                        e.stopPropagation();
                        openContextMenu(e, track);
                      }}
                      className="p-1.5 rounded-lg text-[#71778c] hover:text-white hover:bg-[#252b3d] opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Botão de Tocar Imediatamente com WAI-ARIA (Item #6) */}
                    <button
                      title="Tocar agora"
                      aria-label={`Tocar agora: ${track.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayFromQueue(actualIdx);
                      }}
                      className="p-1.5 rounded-lg text-[#71778c] hover:text-white hover:bg-[#252b3d] transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>

                    {/* Botão de Remover da Fila com WAI-ARIA (Item #6) */}
                    <button
                      title="Remover da fila"
                      aria-label={`Remover ${track.title} da fila`}
                      onClick={(e) => handleRemoveFromQueue(actualIdx, e)}
                      className="p-1.5 rounded-lg text-[#71778c] hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
