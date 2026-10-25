import { describe, it, expect } from "vitest";
import { APP_VERSION, isNewerVersion } from "../updater";

describe("updater (Verificação SemVer e Atualizações)", () => {
  it("deve reportar a versão atual como 1.0.0", () => {
    expect(APP_VERSION).toBe("1.0.0");
  });

  it("deve detectar corretamente quando uma versão remota é mais recente", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(true);
    expect(isNewerVersion("v1.0.1", "v1.0.0")).toBe(true);
  });

  it("deve detectar quando a versão remota é igual ou mais antiga", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("0.9.9", "1.0.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("v1.0.0", "1.0.0")).toBe(false);
  });
});
