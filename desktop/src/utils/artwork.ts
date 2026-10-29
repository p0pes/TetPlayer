import React from "react";

/**
 * Eleva a resolução das capas do YouTube Music e YouTube para alta definição.
 * Elimina o aspecto borrado de miniaturas comprimidas (w60-h60, w120-h120, hqdefault).
 * 
 * - "high": 800x800 / maxresdefault (headers de playlists, álbuns e drawer tocando agora)
 * - "card": 540x540 / sddefault (cards de álbuns, playlists e visualizações de grid)
 * - "thumb": 120x120 / hqdefault (linhas de lista de faixas e miniaturas da sidebar)
 */
export function upgradeArtworkQuality(
  url?: string | null,
  videoId?: string,
  variant: "high" | "card" | "thumb" = "high"
): string {
  if (!url) {
    if (!videoId) return "";
    if (variant === "thumb") {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    if (variant === "card") {
      return `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
    }
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }

  let clean = url.startsWith("//") ? `https:${url}` : url;

  // 1. Google User Content / GGPHT / YouTube Music CDN:
  if (clean.includes("googleusercontent.com") || clean.includes("ggpht.com")) {
    const lastEqIndex = clean.lastIndexOf("=");
    if (lastEqIndex !== -1) {
      const suffix = clean.substring(lastEqIndex);
      if (suffix.startsWith("=w") || suffix.startsWith("=s")) {
        const replacement =
          variant === "thumb"
            ? "=w120-h120-l90-rj"
            : variant === "card"
            ? "=w540-h540-l90-rj"
            : "=w800-h800-l90-rj";
        clean = clean.substring(0, lastEqIndex) + replacement;
      }
    }
  }

  // 2. YouTube Video Thumbnails (i.ytimg.com / img.youtube.com):
  if (clean.includes("i.ytimg.com/vi/") || clean.includes("img.youtube.com/vi/")) {
    if (variant === "thumb") {
      clean = clean
        .replace("/maxresdefault.jpg", "/hqdefault.jpg")
        .replace("/sddefault.jpg", "/hqdefault.jpg")
        .replace("/mqdefault.jpg", "/hqdefault.jpg")
        .replace("/default.jpg", "/hqdefault.jpg");
    } else if (variant === "card") {
      clean = clean
        .replace("/maxresdefault.jpg", "/sddefault.jpg")
        .replace("/hqdefault.jpg", "/sddefault.jpg")
        .replace("/mqdefault.jpg", "/sddefault.jpg")
        .replace("/default.jpg", "/sddefault.jpg");
    } else {
      clean = clean
        .replace("/hqdefault.jpg", "/maxresdefault.jpg")
        .replace("/mqdefault.jpg", "/maxresdefault.jpg")
        .replace("/default.jpg", "/maxresdefault.jpg");
    }
  }

  return clean;
}

/**
 * Fallback resiliente para o evento onError de imagens de capa:
 * Se maxresdefault.jpg (1280x720) não existir para vídeos antigos (404),
 * cai progressivamente para sddefault (640x480) e hqdefault (480x360).
 */
export function handleArtworkError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  videoId?: string
) {
  const img = e.currentTarget;
  const currentSrc = img.src;

  if (currentSrc.includes("maxresdefault.jpg")) {
    img.src = videoId
      ? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`
      : currentSrc.replace("maxresdefault.jpg", "sddefault.jpg");
  } else if (currentSrc.includes("sddefault.jpg")) {
    img.src = videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : currentSrc.replace("sddefault.jpg", "hqdefault.jpg");
  } else if (videoId && !currentSrc.includes("hqdefault.jpg")) {
    img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  } else {
    // Fallback terminal: todas as resoluções falharam (vídeo privado, apagado ou 404)
    img.style.display = "none";
    img.setAttribute("data-artwork-failed", "true");
  }
}
