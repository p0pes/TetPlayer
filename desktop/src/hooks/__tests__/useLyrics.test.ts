import { describe, it, expect } from "vitest";
import {
  parseLrc,
  formatTime,
  getCachedLyrics,
  setCachedLyrics,
  clearLyricsCache,
  MAX_LYRICS_CACHE_ENTRIES,
  kineticEaseOut,
  kineticSpringBounce,
  calculateScrollDuration,
} from "../useLyrics";

describe("useLyrics utils", () => {
  describe("Kinetic Spring & Scroll Easing (Item 3.3)", () => {
    it("deve retornar 0 no início (t=0) e 1 no fim (t=1)", () => {
      expect(kineticEaseOut(0)).toBe(0);
      expect(kineticEaseOut(1)).toBe(1);
      expect(kineticSpringBounce(0)).toBe(0);
      expect(kineticSpringBounce(1)).toBe(1);
    });

    it("deve ter aceleração inicial e desaceleração progressiva (ease-out)", () => {
      const mid = kineticEaseOut(0.5);
      expect(mid).toBeGreaterThan(0.7);
      expect(mid).toBeLessThan(1);
    });

    it("deve calcular curva kineticSpringBounce com overshoot elástico sutil e orgânico", () => {
      const peak = kineticSpringBounce(0.7);
      expect(peak).toBeGreaterThan(1.0);
      expect(peak).toBeLessThan(1.05);
      expect(kineticSpringBounce(-0.2)).toBe(0);
      expect(kineticSpringBounce(1.2)).toBe(1);
    });

    it("deve limitar valores fora do intervalo [0, 1] com segurança", () => {
      expect(kineticEaseOut(-0.5)).toBe(0);
      expect(kineticEaseOut(1.5)).toBe(1);
    });

    it("deve calcular durações dinâmicas proporcionais para passagens normais e saltos de seek", () => {
      const shortStep = calculateScrollDuration(60, false);
      const normalStep = calculateScrollDuration(150, false);
      const directSeekLong = calculateScrollDuration(800, true);

      expect(shortStep).toBeGreaterThanOrEqual(300);
      expect(normalStep).toBeGreaterThan(shortStep);
      expect(directSeekLong).toBeGreaterThan(normalStep);
      expect(directSeekLong).toBeLessThanOrEqual(800);
    });
  });
  describe("formatTime", () => {
    it("deve formatar 0 segundos como 0:00", () => {
      expect(formatTime(0)).toBe("0:00");
    });

    it("deve formatar segundos com zero à esquerda", () => {
      expect(formatTime(5)).toBe("0:05");
      expect(formatTime(59)).toBe("0:59");
    });

    it("deve formatar minutos e segundos corretamente", () => {
      expect(formatTime(65)).toBe("1:05");
      expect(formatTime(120)).toBe("2:00");
      expect(formatTime(215)).toBe("3:35");
    });

    it("deve tratar NaN e números negativos com fallback seguro", () => {
      expect(formatTime(NaN)).toBe("0:00");
      expect(formatTime(-10)).toBe("0:00");
    });
  });

  describe("parseLrc", () => {
    it("deve processar letras LRC com timestamps simples", () => {
      const lrc = `
[00:10.50]Primeira estrofe
[00:25.00]Segunda estrofe
[01:05.10]Terceira estrofe
      `;
      const result = parseLrc(lrc);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ time: 10.5, text: "Primeira estrofe" });
      expect(result[1]).toEqual({ time: 25.0, text: "Segunda estrofe" });
      expect(result[2]).toEqual({ time: 65.1, text: "Terceira estrofe" });
    });

    it("deve converter linhas de pausa instrumental em símbolo ♪", () => {
      const lrc = `
[00:15.00]
[00:30.00]   
      `;
      const result = parseLrc(lrc);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("♪");
      expect(result[1].text).toBe("♪");
    });

    it("deve desmembrar múltiplos timestamps na mesma linha", () => {
      const lrc = "[00:05.00][00:20.00]Refrão repetido";
      const result = parseLrc(lrc);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ time: 5, text: "Refrão repetido" });
      expect(result[1]).toEqual({ time: 20, text: "Refrão repetido" });
    });

    it("deve ordenar as estrofes cronologicamente", () => {
      const lrc = `
[00:40.00]Estrofe tardia
[00:10.00]Estrofe inicial
      `;
      const result = parseLrc(lrc);
      expect(result[0].time).toBe(10);
      expect(result[1].time).toBe(40);
    });

    it("deve ignorar metadados sem timestamp de letra ou linhas vazias", () => {
      const lrc = `
[ar:Artista Famoso]
[ti:Nome da Música]

[00:12.00]Começo da letra
      `;
      const result = parseLrc(lrc);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ time: 12, text: "Começo da letra" });
    });
  });

  describe("Lyrics LRU Cache", () => {
    it("deve armazenar e recuperar letras do cache", () => {
      clearLyricsCache();
      const mockData = { synced: "[00:10.00]Olá", plain: "Olá", source: "lrclib" };
      setCachedLyrics("vid-1", mockData);

      expect(getCachedLyrics("vid-1")).toEqual(mockData);
      expect(getCachedLyrics("inexistente")).toBeUndefined();
    });

    it("deve respeitar a capacidade máxima de cache (LRU eviction)", () => {
      clearLyricsCache();
      for (let i = 0; i < MAX_LYRICS_CACHE_ENTRIES + 10; i++) {
        setCachedLyrics(`track-${i}`, { synced: "", plain: `Letra ${i}`, source: "lrclib" });
      }

      // Os primeiros 10 devem ter sido descartados por LRU
      expect(getCachedLyrics("track-0")).toBeUndefined();
      expect(getCachedLyrics("track-9")).toBeUndefined();
      // Os mais recentes devem continuar presentes
      expect(getCachedLyrics(`track-${MAX_LYRICS_CACHE_ENTRIES + 9}`)).toBeDefined();
    });

    it("deve limpar todas as entradas com clearLyricsCache", () => {
      clearLyricsCache();
      setCachedLyrics("vid-test", { synced: "", plain: "Teste", source: "lrclib" });
      expect(getCachedLyrics("vid-test")).toBeDefined();

      clearLyricsCache();
      expect(getCachedLyrics("vid-test")).toBeUndefined();
    });
  });
});

