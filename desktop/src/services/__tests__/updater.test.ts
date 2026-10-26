import { describe, it, expect } from "vitest";
import { APP_VERSION, isNewerVersion, formatBytes } from "../updater";

describe("updater (Verificação SemVer e Atualizações)", () => {
  it("deve reportar a versão atual como 1.1.0", () => {
    expect(APP_VERSION).toBe("1.1.0");
  });

  it("deve detectar corretamente quando uma versão remota é mais recente", () => {
    expect(isNewerVersion("1.1.1", "1.1.0")).toBe(true);
    expect(isNewerVersion("1.2.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("v1.1.1", "v1.1.0")).toBe(true);
  });

  it("deve detectar quando a versão remota é igual ou mais antiga", () => {
    expect(isNewerVersion("1.1.0", "1.1.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
    expect(isNewerVersion("0.9.9", "1.1.0")).toBe(false);
    expect(isNewerVersion("v1.1.0", "1.1.0")).toBe(false);
  });

  it("deve formatar o tamanho dos instaladores e pacotes corretamente", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1048576 * 50)).toBe("50.0 MB");
    expect(formatBytes(0)).toBe("");
  });
});
