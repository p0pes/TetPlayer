/**
 * Utilitário central de sanitização e humanização de erros de rede e APIs externas (YouTube Music, LRCLIB, etc).
 * Impede a exposição de mensagens técnicas cruas (como JSONs com status 403, 404, 500) para o usuário.
 */
export function humanizeApiError(error: unknown, fallbackMessage = "Ocorreu um erro ao processar sua solicitação."): string {
  if (!error) return fallbackMessage;

  const raw = typeof error === "string" ? error : (error as { message?: string })?.message || String(error);

  // 1. YouTube Music: 403 Forbidden / PERMISSION_DENIED (Tentativa de deletar ou editar playlists de terceiros/comunidade)
  if (
    raw.includes("403") ||
    raw.includes("PERMISSION_DENIED") ||
    raw.includes("The caller does not have permission") ||
    raw.includes("Forbidden")
  ) {
    return "Permissão negada pelo YouTube Music: esta playlist pertence a outro canal ou não foi criada por esta conta. Playlists de terceiros só podem ser desvinculadas pelo YouTube Music.";
  }

  // 2. Erros de Autenticação / Sessão Expirada
  if (
    raw.includes("401") ||
    raw.includes("UNAUTHENTICATED") ||
    raw.includes("Usuário não autenticado") ||
    raw.includes("sessão")
  ) {
    return "Sessão expirada ou não autenticada. Por favor, reconecte sua conta do Google nas Configurações.";
  }

  // 3. Item não encontrado (404)
  if (raw.includes("404") || raw.includes("NOT_FOUND")) {
    return "O item solicitado não foi encontrado ou não está mais disponível no YouTube Music.";
  }

  // 4. Falha de conexão / Offline
  if (
    raw.includes("Failed to fetch") ||
    raw.includes("NetworkError") ||
    raw.includes("conexão") ||
    raw.includes("offline")
  ) {
    return "Falha de conexão com a rede. Verifique sua conexão com a internet e tente novamente.";
  }

  // Se o erro for um JSON crú, limpa
  if (raw.trim().startsWith("{") && raw.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) {
        return humanizeApiError(parsed.error.message, fallbackMessage);
      }
    } catch {
      // ignore
    }
  }

  // Se for mensagem amigável comum de negócio, mantém sem prefixos técnicos de HTTP
  return raw.replace(/YouTube Music retornou status \d+.*?:/i, "").trim() || fallbackMessage;
}
