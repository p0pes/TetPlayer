import { openUrl } from "@tauri-apps/plugin-opener";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export const APP_VERSION = "1.2.1";
export const GITHUB_REPO = "p0pes/TetPlayer";
const MAIN_BRANCH_PACKAGE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/desktop/package.json`;
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_WEB_URL = `https://github.com/${GITHUB_REPO}/releases`;

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
  isNativeUpdater?: boolean;
}

export type UpdateInstallStatus = "idle" | "downloading" | "installing" | "ready" | "error";

export interface UpdateProgress {
  status: UpdateInstallStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes?: number;
  error?: string;
}

// Guarda a referência ativa do Update nativo para download
let activeNativeUpdate: Update | null = null;

/**
 * Retorna o Update nativo do Tauri em cache (se houver)
 */
export function getActiveNativeUpdate(): Update | null {
  return activeNativeUpdate;
}

/**
 * Limpa ou define o Update nativo (usado para testes ou reset)
 */
export function setActiveNativeUpdate(update: Update | null): void {
  activeNativeUpdate = update;
}

/**
 * Formata bytes em formato legível (KB, MB, GB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Compara versões no padrão SemVer (ex: "1.1.0" > "1.0.0")
 * Retorna true se remote for estritamente mais recente que current.
 */
export function isNewerVersion(remote: string, current: string): boolean {
  try {
    const cleanRemote = remote.replace(/^v/i, "").trim();
    const cleanCurrent = current.replace(/^v/i, "").trim();

    const [rMajor = 0, rMinor = 0, rPatch = 0] = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
    const [cMajor = 0, cMinor = 0, cPatch = 0] = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0);

    if (rMajor > cMajor) return true;
    if (rMajor < cMajor) return false;

    if (rMinor > cMinor) return true;
    if (rMinor < cMinor) return false;

    return rPatch > cPatch;
  } catch {
    return false;
  }
}

/**
 * Checa por atualizações usando prioritariamente o plugin oficial do Tauri (@tauri-apps/plugin-updater).
 * Caso não haja endpoint configurado ou ocorra falha (ex: dev / web / vitest), executa fallback para a API do GitHub.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const defaultResult: UpdateInfo = {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    releaseUrl: RELEASES_WEB_URL,
    isNativeUpdater: false,
  };

  // 1. Tentar primeiro o plugin oficial do Tauri (In-App Auto-Updater)
  try {
    const update = await check();
    if (update && isNewerVersion(update.version, APP_VERSION)) {
      activeNativeUpdate = update;
      return {
        hasUpdate: true,
        currentVersion: APP_VERSION,
        latestVersion: update.version,
        releaseUrl: RELEASES_WEB_URL,
        releaseNotes: update.body || undefined,
        publishedAt: update.date || undefined,
        isNativeUpdater: true,
      };
    }
  } catch {
    // Fallback gracioso para a verificação direta no GitHub caso o endpoint nativo falhe ou não esteja pronto
    activeNativeUpdate = null;
  }

  // 2. Fallback: Checa na branch main e nas releases do GitHub
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let remoteVersion: string | null = null;
    let releaseUrl = RELEASES_WEB_URL;
    let releaseNotes: string | undefined = undefined;
    let publishedAt: string | undefined = undefined;
    let downloadUrl: string | undefined = undefined;
    let assetName: string | undefined = undefined;
    let assetSize: number | undefined = undefined;

    // Tentar ler da branch main no GitHub (com cache buster)
    try {
      const mainResponse = await fetch(`${MAIN_BRANCH_PACKAGE_URL}?t=${Date.now()}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (mainResponse.ok) {
        const data = await mainResponse.json();
        if (typeof data.version === "string") {
          remoteVersion = data.version;
        }
      }
    } catch {
      // Ignora falha na main e tenta releases
    }

    // Buscar detalhes da release mais recente no GitHub
    try {
      const releaseResponse = await fetch(RELEASES_API_URL, {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github.v3+json" },
      });

      if (releaseResponse.ok) {
        const releaseData = await releaseResponse.json();
        if (releaseData.html_url) {
          releaseUrl = releaseData.html_url;
        }
        if (releaseData.body) {
          releaseNotes = releaseData.body;
        }
        if (releaseData.published_at) {
          publishedAt = releaseData.published_at;
        }
        if (!remoteVersion && releaseData.tag_name) {
          remoteVersion = releaseData.tag_name.replace(/^v/i, "");
        }

        // Procura instalador compatível (.exe, .msi)
        if (Array.isArray(releaseData.assets)) {
          const installer = releaseData.assets.find(
            (a: ReleaseAsset) => a.name.endsWith(".exe") || a.name.endsWith(".msi")
          );
          if (installer) {
            downloadUrl = installer.browser_download_url;
            assetName = installer.name;
            assetSize = installer.size;
          }
        }
      }
    } catch {
      // Fallback silencioso
    } finally {
      clearTimeout(timeoutId);
    }

    if (remoteVersion && isNewerVersion(remoteVersion, APP_VERSION)) {
      return {
        hasUpdate: true,
        currentVersion: APP_VERSION,
        latestVersion: remoteVersion,
        releaseUrl,
        releaseNotes,
        publishedAt,
        downloadUrl,
        assetName,
        assetSize,
        isNativeUpdater: false,
      };
    }

    return defaultResult;
  } catch (error) {
    console.warn("[Updater] Não foi possível verificar atualizações no momento:", error);
    return defaultResult;
  }
}

/**
 * Executa o download e instalação da atualização silenciosamente dentro do próprio aplicativo.
 * Notifica o callback de progresso a cada chunk recebido e reinicia o app via relaunch() ao concluir.
 * Retorna true se a instalação nativa foi iniciada com sucesso, ou false caso caia no fallback.
 */
export async function downloadAndInstallInAppUpdate(
  updateInfo: UpdateInfo,
  onProgress?: (progress: UpdateProgress) => void
): Promise<boolean> {
  if (activeNativeUpdate) {
    try {
      let totalBytes: number | undefined = undefined;
      let downloadedBytes = 0;

      onProgress?.({
        status: "downloading",
        percent: 0,
        downloadedBytes: 0,
      });

      await activeNativeUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          onProgress?.({
            status: "downloading",
            percent: 0,
            downloadedBytes: 0,
            totalBytes,
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const percent = totalBytes && totalBytes > 0
            ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            : 0;
          onProgress?.({
            status: "downloading",
            percent,
            downloadedBytes,
            totalBytes,
          });
        } else if (event.event === "Finished") {
          onProgress?.({
            status: "installing",
            percent: 100,
            downloadedBytes,
            totalBytes,
          });
        }
      });

      onProgress?.({
        status: "ready",
        percent: 100,
        downloadedBytes,
        totalBytes,
      });

      // Aguarda 1s para o usuário visualizar o feedback e reinicia
      setTimeout(async () => {
        try {
          await relaunch();
        } catch (err) {
          console.warn("[Updater] Relaunch automático falhou (normal no Windows se o instalador fechar o processo):", err);
        }
      }, 1200);

      return true;
    } catch (err) {
      console.error("[Updater] Falha no download/instalação in-app:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      onProgress?.({
        status: "error",
        percent: 0,
        downloadedBytes: 0,
        error: errMsg,
      });
      return false;
    }
  }

  // Fallback se não for nativo: abre o navegador ou link direto do instalador
  await downloadAndInstallUpdate(updateInfo);
  return false;
}

/**
 * Fallback tradicional: Inicia o download abrindo o link do instalador ou a página da release no navegador
 */
export async function downloadAndInstallUpdate(updateInfo: UpdateInfo): Promise<void> {
  const targetUrl = updateInfo.downloadUrl || updateInfo.releaseUrl || RELEASES_WEB_URL;
  try {
    await openUrl(targetUrl);
  } catch (err) {
    console.error("[Updater] Erro ao abrir download de atualização:", err);
    window.open(targetUrl, "_blank");
  }
}

/**
 * Abre o link da release no navegador padrão do sistema
 */
export async function openReleasePage(url: string): Promise<void> {
  try {
    await openUrl(url || RELEASES_WEB_URL);
  } catch (err) {
    console.error("[Updater] Erro ao abrir página de download:", err);
    window.open(url || RELEASES_WEB_URL, "_blank");
  }
}
