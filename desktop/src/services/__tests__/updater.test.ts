import { describe, it, expect, vi } from "vitest";
import {
  APP_VERSION,
  isNewerVersion,
  formatBytes,
  getActiveNativeUpdate,
  setActiveNativeUpdate,
  downloadAndInstallInAppUpdate,
  UpdateInfo,
  UpdateProgress,
} from "../updater";

describe("updater (Verificação SemVer e Atualizações)", () => {
  it("deve reportar a versão atual como 1.3.3", () => {
    expect(APP_VERSION).toBe("1.3.3");
  });

  it("deve detectar corretamente quando uma versão remota é mais recente", () => {
    expect(isNewerVersion("1.3.4", "1.3.3")).toBe(true);
    expect(isNewerVersion("1.4.0", "1.3.3")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.3.3")).toBe(true);
    expect(isNewerVersion("v1.3.4", "v1.3.3")).toBe(true);
  });

  it("deve detectar quando a versão remota é igual ou mais antiga", () => {
    expect(isNewerVersion("1.3.3", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.3.2", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.3.1", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.3.0", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.2.1", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.2.0", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.1.0", "1.3.3")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.3.3")).toBe(false);
    expect(isNewerVersion("v1.3.3", "v1.3.3")).toBe(false);
  });

  it("deve formatar o tamanho dos instaladores e pacotes corretamente", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1048576 * 50)).toBe("50.0 MB");
    expect(formatBytes(0)).toBe("");
  });

  it("deve permitir obter e definir o update nativo ativo", () => {
    expect(getActiveNativeUpdate()).toBeNull();

    const mockUpdate = { version: "1.3.0", body: "Novidades" } as any;
    setActiveNativeUpdate(mockUpdate);
    expect(getActiveNativeUpdate()).toBe(mockUpdate);

    setActiveNativeUpdate(null);
    expect(getActiveNativeUpdate()).toBeNull();
  });

  it("deve cair no fallback sem lançar exceções quando activeNativeUpdate é nulo", async () => {
    setActiveNativeUpdate(null);
    const mockInfo: UpdateInfo = {
      hasUpdate: true,
      currentVersion: "1.2.1",
      latestVersion: "1.3.0",
      releaseUrl: "https://github.com/p0pes/TetPlayer/releases",
    };

    const progressLogs: UpdateProgress[] = [];
    const result = await downloadAndInstallInAppUpdate(mockInfo, (p) => progressLogs.push(p));

    expect(result).toBe(false);
    expect(progressLogs.length).toBe(0);
  });

  it("deve notificar o callback de progresso quando o update nativo emite eventos", async () => {
    const mockDownloadAndInstall = vi.fn(async (cb: (event: any) => void) => {
      cb({ event: "Started", data: { contentLength: 1000 } });
      cb({ event: "Progress", data: { chunkLength: 500 } });
      cb({ event: "Progress", data: { chunkLength: 500 } });
      cb({ event: "Finished" });
    });

    const mockUpdate = {
      version: "1.3.0",
      downloadAndInstall: mockDownloadAndInstall,
    } as any;

    setActiveNativeUpdate(mockUpdate);

    const mockInfo: UpdateInfo = {
      hasUpdate: true,
      currentVersion: "1.2.1",
      latestVersion: "1.3.0",
      releaseUrl: "https://github.com/p0pes/TetPlayer/releases",
      isNativeUpdater: true,
    };

    const progressLogs: UpdateProgress[] = [];
    const result = await downloadAndInstallInAppUpdate(mockInfo, (p) => progressLogs.push(p));

    expect(result).toBe(true);
    expect(mockDownloadAndInstall).toHaveBeenCalledTimes(1);

    expect(progressLogs.some((p) => p.status === "downloading")).toBe(true);
    expect(progressLogs.some((p) => p.percent === 100)).toBe(true);
    expect(progressLogs.some((p) => p.status === "ready")).toBe(true);

    setActiveNativeUpdate(null);
  });
});
