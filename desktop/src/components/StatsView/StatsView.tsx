import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BarChart3,
  Flame,
  Clock,
  Music,
  Users,
  Play,
  Trash2,
  Loader2,
  Sparkles,
  Share2,
} from "lucide-react";
import { PlaybackStats, Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { StatsShareModal } from "./StatsShareModal";

interface StatsViewProps {
  onPlayTrack: (track: Track) => void;
}

export const StatsView = React.memo(function StatsView({ onPlayTrack }: StatsViewProps) {
  const [timeframe, setTimeframe] = useState<number | null>(30); // 7, 30, null (tudo)
  const [stats, setStats] = useState<PlaybackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    loadStats();
  }, [timeframe]);

  async function loadStats() {
    setIsLoading(true);
    try {
      const data = await invoke<PlaybackStats>("get_playback_stats", {
        timeframeDays: timeframe,
      });
      setStats(data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearStats() {
    if (
      window.confirm(
        "Tem certeza que deseja apagar todo o seu histórico de estatísticas de reprodução?"
      )
    ) {
      try {
        await invoke("clear_playback_stats");
        await loadStats();
      } catch (err) {
        console.error("Erro ao limpar estatísticas:", err);
      }
    }
  }

  function formatDurationTotal(seconds: number): string {
    if (!seconds || seconds <= 0) return "0 min";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
    }
    return `${mins} min`;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header do TetStats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[var(--accent-subtle)] via-[#191c28] to-[#12141c] border border-[var(--accent-border)] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-wider bg-[var(--accent-subtle)] px-2.5 py-1 rounded-md border border-[var(--accent-border)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              Resumo Semanal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Flame className="w-7 h-7 text-[var(--accent)] fill-current" />
            Estatísticas de Reprodução
          </h1>
          <p className="text-xs text-[#8c91a4]">
            Análise local contínua persistida no seu SQLite do TetPlayer.
          </p>
        </div>

        {/* Filtros de Período e Limpar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#141724] p-1 rounded-xl border border-[#232736]">
            <button
              onClick={() => setTimeframe(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === 7
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "text-[#8c91a4] hover:text-white"
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setTimeframe(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === 30
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "text-[#8c91a4] hover:text-white"
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setTimeframe(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === null
                  ? "bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)]"
                  : "text-[#8c91a4] hover:text-white"
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={handleClearStats}
            title="Limpar Histórico de Estatísticas"
            className="p-2 rounded-xl text-[#71778c] hover:text-[var(--accent-text)] hover:bg-[var(--accent-subtle)] border border-[#232736] transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {stats && stats.total_plays > 0 && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              title="Compartilhar Cartão de Resumo nas Redes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--accent)] hover:opacity-90 shadow-md shadow-[var(--accent-glow)] border border-[var(--accent-border)] transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhar</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#71778c]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm">Carregando métricas do SQLite...</p>
        </div>
      ) : !stats || stats.total_plays === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center text-[#71778c] bg-[#12141c]/40 rounded-2xl border border-dashed border-[#1f2434]">
          <BarChart3 className="w-12 h-12 text-[#3b4156]" />
          <p className="text-base font-semibold text-white">Nenhum dado registrado ainda</p>
          <p className="text-xs text-[#8c91a4] max-w-sm">
            Suas estatísticas serão geradas automaticamente conforme você ouvir músicas no TetPlayer Desktop.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grade de 4 Cards de Métricas Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#141724] border border-[#212638] space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[#71778c]">
                <span className="text-xs font-semibold uppercase">Reproduções</span>
                <Music className="w-4 h-4 text-[var(--accent-text)]" />
              </div>
              <p className="text-2xl font-black text-white">{stats.total_plays}</p>
              <p className="text-[11px] text-[#8c91a4]">músicas tocadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141724] border border-[#212638] space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[#71778c]">
                <span className="text-xs font-semibold uppercase">Tempo Total</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">
                {formatDurationTotal(stats.total_time_seconds)}
              </p>
              <p className="text-[11px] text-[#8c91a4]">de música reproduzida</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141724] border border-[#212638] space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[#71778c]">
                <span className="text-xs font-semibold uppercase">Artistas</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats.unique_artists}</p>
              <p className="text-[11px] text-[#8c91a4]">artistas distintos</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#141724] border border-[#212638] space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[#71778c]">
                <span className="text-xs font-semibold uppercase">Faixas Únicas</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats.unique_tracks}</p>
              <p className="text-[11px] text-[#8c91a4]">faixas exploradas</p>
            </div>
          </div>

          {/* Seção Dividida: Top Artistas (Esq) & Top Músicas (Dir) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Artistas */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--accent-text)]" />
                  Top Artistas Mais Ouvidos
                </h3>
              </div>

              <div className="space-y-2">
                {stats.top_artists.map((artist, idx) => {
                  const medalColors =
                    idx === 0
                      ? "text-amber-300 bg-amber-950/60 border-amber-500/40"
                      : idx === 1
                      ? "text-slate-200 bg-slate-800/60 border-slate-400/40"
                      : idx === 2
                      ? "text-amber-600 bg-amber-950/40 border-amber-700/40"
                      : "text-[#71778c] bg-[#141724] border-[#202536]";

                  return (
                    <div
                      key={`artist-${artist.artist}-${idx}`}
                      onClick={() => {
                        if (artist.artist) {
                          window.dispatchEvent(
                            new CustomEvent("tetplayer:search-artist", {
                              detail: { query: artist.artist },
                            })
                          );
                        }
                      }}
                      title={`Ir para o artista ${artist.artist}`}
                      className="p-3 rounded-xl bg-[#12141c] border border-[#1f232e] hover:border-[var(--accent-border)] hover:bg-[#161925] transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${medalColors}`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {artist.artist}
                          </p>
                          <p className="text-xs text-[#71778c]">
                            {artist.track_count} faixa{artist.track_count > 1 ? "s" : ""} ouvida{artist.track_count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-[var(--accent-text)] font-semibold bg-[var(--accent-subtle)] px-2 py-1 rounded-md border border-[var(--accent-border)] shrink-0">
                        {artist.play_count} plays
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Faixas Mais Tocadas */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--accent)]" />
                  Top Músicas Mais Tocadas
                </h3>
              </div>

              <div className="space-y-2">
                {stats.top_tracks.map((track, idx) => (
                  <div
                    key={`top-${track.track_id}-${idx}`}
                    className="p-2.5 rounded-xl bg-[#12141c] border border-[#1f232e] hover:border-[#2f3548] hover:bg-[#161924] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-center text-xs font-mono text-[#5e6479] group-hover:text-[var(--accent-text)] shrink-0">
                        {idx + 1}
                      </span>

                      <div className="w-10 h-10 rounded-lg bg-[#1a1d28] overflow-hidden shrink-0 border border-[#222736]">
                        <img
                          src={upgradeArtworkQuality(track.artwork_url, track.track_id)}
                          alt={track.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleArtworkError(e, track.track_id)}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-[var(--accent-text)]">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-[#8c91a4] truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <span className="text-xs font-mono text-[#8c91a4] font-medium bg-[#1a1d2a] px-2 py-0.5 rounded-md border border-[#23283a]">
                        {track.play_count} {track.play_count === 1 ? "vez" : "vezes"}
                      </span>

                      <button
                        onClick={() =>
                          onPlayTrack({
                            id: track.track_id,
                            title: track.title,
                            artist: track.artist,
                            album: track.album,
                            artwork_url: track.artwork_url,
                          })
                        }
                        title={`Tocar ${track.title}`}
                        className="w-8 h-8 rounded-full bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center shadow-md shadow-[var(--accent-glow)] transition-transform active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {stats && stats.total_plays > 0 && (
        <StatsShareModal
          stats={stats}
          timeframe={timeframe}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
});
