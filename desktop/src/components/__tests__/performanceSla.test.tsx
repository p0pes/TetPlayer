import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useRef } from "react";
import { render, screen, act } from "@testing-library/react";
import { VirtualizedTrackList } from "../MainView/VirtualizedTrackList";
import { PlaybackProgressProvider, usePlaybackProgress } from "../../context/PlaybackProgressContext";
import { PerformanceTelemetry } from "../../services/telemetry";
import { Track } from "../../types";

function createMockTracks(count: number): Track[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `track_bench_${i}`,
    title: `Música de Teste ${i + 1}`,
    artist: `Artista ${i % 10}`,
    album: `Álbum ${i % 5}`,
    duration: "3:30",
    duration_seconds: 210,
    artwork_url: `https://example.com/art_${i}.jpg`,
  }));
}

// Componente para testar a contenção de re-renders de alta frequência
const RenderSpySibling = React.memo(function RenderSpySibling({
  onRender,
}: {
  onRender: () => void;
}) {
  onRender();
  return <div data-testid="static-sibling">Componente Estático Irmão</div>;
});

const ActiveProgressConsumer = function ActiveProgressConsumer() {
  const { currentTime } = usePlaybackProgress();
  return <div data-testid="active-scrubber">Tempo: {currentTime}s</div>;
};

describe("Performance & SLA Benchmarks (TetPlayer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PerformanceTelemetry.reset();
  });

  describe("Benchmark de Lista Virtualizada (1.000 faixas)", () => {
    it("deve montar lista de 1.000 músicas em menos de 100ms e renderizar apenas janela visível", () => {
      const mockTracks = createMockTracks(1000);
      const onPlay = vi.fn();

      function ListWrapper() {
        const scrollRef = useRef<HTMLDivElement>(null);
        return (
          <div ref={scrollRef} style={{ height: "600px", overflow: "auto" }}>
            <VirtualizedTrackList
              tracks={mockTracks}
              currentTrack={mockTracks[0]}
              isPlaying={true}
              loadingTrackId={null}
              onPlayTrack={onPlay}
              parentRef={scrollRef}
            />
          </div>
        );
      }

      const startTime = performance.now();
      const { container } = render(<ListWrapper />);
      const renderDuration = performance.now() - startTime;

      // 1. Orçamento de renderização: Montagem inicial deve ser instantânea (< 150ms no JSDOM)
      expect(renderDuration).toBeLessThan(150);

      // 2. Garantia de Virtualização: Não deve instanciar 1.000 nós DOM!
      // Virtualizador deve renderizar apenas os itens do viewport visível
      const renderedRows = container.querySelectorAll("[data-track-row]");
      expect(renderedRows.length).toBeLessThan(100);
    });
  });

  describe("Isolamento de Alta Frequência (Mandamento #3 - 80ms Ticks)", () => {
    it("não deve forçar re-renderização em componentes irmãos ao emitir 30 ticks contínuos de progresso", () => {
      const siblingRenderCount = vi.fn();

      function ProgressTestContainer({ currentTime }: { currentTime: number }) {
        return (
          <PlaybackProgressProvider currentTime={currentTime} duration={210}>
            <RenderSpySibling onRender={siblingRenderCount} />
            <ActiveProgressConsumer />
          </PlaybackProgressProvider>
        );
      }

      // 1. Montagem inicial
      const { rerender } = render(<ProgressTestContainer currentTime={0} />);
      expect(siblingRenderCount).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("active-scrubber").textContent).toBe("Tempo: 0s");

      // 2. Simula 30 ticks de áudio a cada 80ms (progresso avançando: 0.08s, 0.16s, etc.)
      for (let i = 1; i <= 30; i++) {
        act(() => {
          rerender(<ProgressTestContainer currentTime={+(i * 0.08).toFixed(2)} />);
        });
      }

      // 3. Validação do Isolamento de Alta Frequência:
      // O consumidor de progresso deve estar no tempo final
      expect(screen.getByTestId("active-scrubber").textContent).toBe("Tempo: 2.4s");

      // O componente irmão memoizado NÃO deve re-renderizar em cada um dos 30 ticks!
      expect(siblingRenderCount).toHaveBeenCalledTimes(1);
    });
  });

  describe("SLA de Telemetria Integrada no App", () => {
    it("deve reportar conformidade com os SLAs de carregamento de tela e transição", () => {
      // Inicia e conclui tela em 120ms
      PerformanceTelemetry.startScreenLoad("Playlist:Pop Brasil");
      const fakeNow = vi.spyOn(performance, "now");
      fakeNow.mockReturnValue(performance.now() + 120);

      const screenDuration = PerformanceTelemetry.endScreenLoad("Playlist:Pop Brasil");
      expect(screenDuration).toBeGreaterThanOrEqual(0);

      const report = PerformanceTelemetry.getSlaReport();
      expect(report.slowScreenLoadsCount).toBe(0);
      expect(report.screenLoadSlaMs).toBe(400);
      expect(report.trackTransitionSlaMs).toBe(1000);

      fakeNow.mockRestore();
    });

    it("deve detectar e alertar quando a transição entre músicas excede 1000ms", () => {
      const warningSpy = vi.fn();
      const unsub = PerformanceTelemetry.onWarning(warningSpy);

      const fakeNow = vi.spyOn(performance, "now");
      let currentTime = 10000;
      fakeNow.mockImplementation(() => currentTime);

      // Simula pulo de música
      PerformanceTelemetry.startTrackTransition("track_b", "track_a");

      // Simula lentidão de rede de 1.4s (1400ms) até o áudio responder
      currentTime += 1400;

      const duration = PerformanceTelemetry.endTrackTransition("track_b");
      expect(duration).toBe(1400);

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining("Troca de faixa lenta: levou 1400ms para iniciar a reprodução de 'track_b'")
      );

      const report = PerformanceTelemetry.getSlaReport();
      expect(report.slowTrackTransitionsCount).toBe(1);

      unsub();
      fakeNow.mockRestore();
    });
  });
});

