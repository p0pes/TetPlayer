import { describe, it, expect } from "vitest";
import { parseLrc, formatTime } from "../useLyrics";

describe("useLyrics utils", () => {
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
});
