import { useEffect, useState } from "react";
import { Download, Copy, Check, X, Loader2, Share2 } from "lucide-react";
import { PlaybackStats } from "../../types";
import { SettingsService, THEME_PALETTES } from "../../services/settings";

interface StatsShareModalProps {
  stats: PlaybackStats;
  timeframe: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StatsShareModal({
  stats,
  timeframe,
  isOpen,
  onClose,
}: StatsShareModalProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const timeframeLabel =
    timeframe === 7
      ? "Últimos 7 dias"
      : timeframe === 30
      ? "Últimos 30 dias"
      : "Histórico Completo";

  function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "0 min";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ""}`;
    }
    return `${mins} min`;
  }

  useEffect(() => {
    if (!isOpen) {
      setImageBlob(null);
      setImageUrl(null);
      setCopied(false);
      setDownloaded(false);
      return;
    }

    generateCard();
  }, [isOpen, stats, timeframe]);

  // Fechar com a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function generateCard() {
    setIsGenerating(true);
    try {
      const activeThemeKey = SettingsService.getSetting("accentTheme") || "ruby";
      const theme = THEME_PALETTES[activeThemeKey] || THEME_PALETTES.ruby;

      const width = 1200;
      const height = 675;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Fundo escuro Obsidian
      ctx.fillStyle = "#0b0c10";
      ctx.fillRect(0, 0, width, height);

      // 2. Aurora Glows Tridimensionais com o tema ativo
      // Aurora Top-Left (Harmonizado com tema ativo)
      const gradTL = ctx.createRadialGradient(160, 140, 20, 160, 140, 480);
      gradTL.addColorStop(0, theme.glow.replace("0.85", "0.38"));
      gradTL.addColorStop(0.6, theme.subtle);
      gradTL.addColorStop(1, "rgba(11, 12, 16, 0)");
      ctx.fillStyle = gradTL;
      ctx.fillRect(0, 0, width, height);

      // Aurora Bottom-Right (Tom secundário do gradiente)
      const gradBR = ctx.createRadialGradient(1040, 520, 20, 1040, 520, 420);
      gradBR.addColorStop(0, theme.glow.replace("0.85", "0.28"));
      gradBR.addColorStop(0.7, theme.subtle);
      gradBR.addColorStop(1, "rgba(11, 12, 16, 0)");
      ctx.fillStyle = gradBR;
      ctx.fillRect(0, 0, width, height);

      // 3. Moldura Exterior com Vidro Escuro
      const pad = 32;
      const wInner = width - pad * 2;
      const hInner = height - pad * 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pad, pad, wInner, hInner, 24);
      ctx.stroke();

      // 4. Header: Badge Resumo Semanal
      ctx.fillStyle = theme.subtle;
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(64, 60, 175, 30, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.text;
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      ctx.fillText("🔥 RESUMO SEMANAL", 78, 80);

      // Logotipo TetPlayer no canto direito
      ctx.fillStyle = theme.primary;
      ctx.font = "bold 22px Inter, system-ui, sans-serif";
      ctx.fillText("TetPlayer", 1020, 82);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Inter, system-ui, sans-serif";
      ctx.fillText("•", 1120, 82);

      // Título Principal & Subtítulo
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px Inter, system-ui, sans-serif";
      ctx.fillText("Meu Resumo Musical", 64, 130);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Inter, system-ui, sans-serif";
      ctx.fillText(`Período: ${timeframeLabel} • Ouvido no TetPlayer Desktop v1.1.0`, 64, 158);

      // 5. Linha de Métricas (3 Cards)
      const metrics = [
        { label: "Músicas Reproduzidas", val: String(stats.total_plays), color: "#ffffff" },
        { label: "Tempo Total Ouvido", val: formatDuration(stats.total_time_seconds), color: "#fbbf24" },
        { label: "Artistas Distintos", val: String(stats.unique_artists), color: "#a5b4fc" },
      ];

      const cardW = 340;
      const cardH = 88;
      const cardY = 186;

      metrics.forEach((m, i) => {
        const cX = 64 + i * (cardW + 28);
        ctx.fillStyle = "rgba(18, 21, 32, 0.85)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cX, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#8c91a4";
        ctx.font = "12px Inter, system-ui, sans-serif";
        ctx.fillText(m.label.toUpperCase(), cX + 20, cardY + 30);

        ctx.fillStyle = m.color;
        ctx.font = "bold 28px Inter, system-ui, sans-serif";
        ctx.fillText(m.val, cX + 20, cardY + 66);
      });

      // 6. Colunas: Top Artistas (Esq) & Top Músicas (Dir)
      const colY = 300;
      const colW = 524;
      const colH = 265;

      // Coluna Esquerda: Top Artistas
      ctx.fillStyle = "rgba(16, 18, 28, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.roundRect(64, colY, colW, colH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText("👑 TOP ARTISTAS MAIS OUVIDOS", 84, colY + 34);

      const topArtists = stats.top_artists.slice(0, 3);
      topArtists.forEach((a, i) => {
        const rowY = colY + 54 + i * 62;
        ctx.fillStyle = "rgba(24, 28, 42, 0.7)";
        ctx.beginPath();
        ctx.roundRect(84, rowY, colW - 40, 50, 12);
        ctx.fill();

        // Medalha
        const medalColor = i === 0 ? "#f59e0b" : i === 1 ? "#e2e8f0" : "#d97706";
        ctx.fillStyle = medalColor;
        ctx.font = "bold 15px Inter, system-ui, sans-serif";
        ctx.fillText(`#${i + 1}`, 104, rowY + 31);

        // Nome do Artista
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px Inter, system-ui, sans-serif";
        const truncatedArtist = a.artist.length > 28 ? a.artist.substring(0, 26) + "..." : a.artist;
        ctx.fillText(truncatedArtist, 142, rowY + 31);

        // Contador de Plays
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 13px Inter, system-ui, sans-serif";
        ctx.fillText(`${a.play_count} plays`, 84 + colW - 120, rowY + 31);
      });

      // Coluna Direita: Top Músicas
      const colX2 = 612;
      ctx.fillStyle = "rgba(16, 18, 28, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.roundRect(colX2, colY, colW, colH, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText("🎵 TOP MÚSICAS MAIS TOCADAS", colX2 + 20, colY + 34);

      const topTracks = stats.top_tracks.slice(0, 3);
      topTracks.forEach((t, i) => {
        const rowY = colY + 54 + i * 62;
        ctx.fillStyle = "rgba(24, 28, 42, 0.7)";
        ctx.beginPath();
        ctx.roundRect(colX2 + 20, rowY, colW - 40, 50, 12);
        ctx.fill();

        // Índice
        ctx.fillStyle = "#71778c";
        ctx.font = "bold 14px Inter, system-ui, sans-serif";
        ctx.fillText(`${i + 1}`, colX2 + 40, rowY + 31);

        // Título e Artista
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px Inter, system-ui, sans-serif";
        const truncatedTitle = t.title.length > 25 ? t.title.substring(0, 23) + "..." : t.title;
        ctx.fillText(truncatedTitle, colX2 + 68, rowY + 23);

        ctx.fillStyle = "#8c91a4";
        ctx.font = "12px Inter, system-ui, sans-serif";
        const truncatedSub = t.artist.length > 30 ? t.artist.substring(0, 28) + "..." : t.artist;
        ctx.fillText(truncatedSub, colX2 + 68, rowY + 41);

        // Contador de Plays
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 13px Inter, system-ui, sans-serif";
        ctx.fillText(`${t.play_count}x`, colX2 + colW - 85, rowY + 31);
      });

      // Converte para Blob PNG
      canvas.toBlob((blob) => {
        if (blob) {
          setImageBlob(blob);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
        setIsGenerating(false);
      }, "image/png");
    } catch (err) {
      console.error("Falha ao gerar cartão de estatísticas:", err);
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!imageBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": imageBlob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("Falha ao copiar imagem para clipboard nativo:", err);
    }
  }

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `resumo-semanal-${timeframe ?? "tudo"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-3xl bg-[#0f111a] border border-[#23283a] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2436]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Compartilhar Resumo Semanal</h2>
              <p className="text-xs text-[#8c91a4]">
                Imagem em alta resolução pronta para compartilhar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#71778c] hover:text-white hover:bg-[#1a1e2d] transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pré-visualização do Cartão */}
        <div className="rounded-2xl overflow-hidden border border-[#232738] bg-[#0b0c10] shadow-xl flex items-center justify-center min-h-[300px]">
          {isGenerating || !imageUrl ? (
            <div className="flex flex-col items-center gap-3 text-[#71778c]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium">Renderizando cartão artístico...</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Cartão de Resumo Semanal"
              className="w-full h-auto object-contain max-h-[420px] select-none"
            />
          )}
        </div>

        {/* Ações de Download e Cópia */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-[#71778c]">
            {timeframeLabel} • Resolução 1200x675 PNG
          </span>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              disabled={isGenerating || !imageBlob}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/60"
                  : "bg-[#1a1e2e] hover:bg-[#252b40] text-white border border-[#2d344d]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copiado para Área de Transferência!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#8c91a4]" />
                  <span>Copiar Imagem</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating || !imageUrl}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                downloaded
                  ? "bg-emerald-600 text-white shadow-emerald-950/60"
                  : "bg-[var(--accent)] hover:opacity-90 text-white shadow-[var(--accent-glow)]"
              }`}
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Download Concluído!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Baixar PNG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
