import { openUrl } from "@tauri-apps/plugin-opener";

export const APP_VERSION = "1.0.0";
export const GITHUB_REPO = "p0pes/TetPlayer";
const MAIN_BRANCH_PACKAGE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/desktop/package.json`;
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_WEB_URL = `https://github.com/${GITHUB_REPO}/releases`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
}

/**
 * Compara versões no padrão SemVer (ex: "0.1.1" > "0.1.0")
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
 * Checa na branch main do GitHub se há uma versão mais nova.
 * Inclui tratamento de timeout e erros para jamais comprometer a execução do app.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const defaultResult: UpdateInfo = {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    releaseUrl: RELEASES_WEB_URL,
  };

  try {
    // 1. Tentar ler diretamente da branch main no GitHub (com cache buster)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let remoteVersion: string | null = null;
    let releaseUrl = RELEASES_WEB_URL;
    let releaseNotes: string | undefined = undefined;

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
      // Ignora falha na main e tenta fallback
    }

    // 2. Tentar buscar detalhes da release no GitHub (para pegar notas de versão e links de asset se existirem)
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
        // Se a busca da branch main não retornou, usa a tag_name da release
        if (!remoteVersion && releaseData.tag_name) {
          remoteVersion = releaseData.tag_name.replace(/^v/i, "");
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
      };
    }

    return defaultResult;
  } catch (error) {
    console.warn("[Updater] Não foi possível verificar atualizações no momento:", error);
    return defaultResult;
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
    // Fallback para window.open
    window.open(url || RELEASES_WEB_URL, "_blank");
  }
}
