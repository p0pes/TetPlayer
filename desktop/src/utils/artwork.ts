import React from "react";

/**
 * Eleva a resolução das capas do YouTube Music e YouTube para alta definição (800x800 ou HD 720p/1080p).
 * Elimina o aspecto borrado de miniaturas comprimidas (w60-h60, w120-h120, hqdefault).
 */
export function upgradeArtworkQuality(url?: string | null, videoId?: string): string {
  if (!url) {
    return videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : "";
  }

  let clean = url.startsWith("//") ? `https:${url}` : url;

  // 1. Google User Content / GGPHT / YouTube Music CDN:
  // Transforma sufixos como =w60-h60-p-l90-rj ou =s120 em =w800-h800-l90-rj
  if (clean.includes("googleusercontent.com") || clean.includes("ggpht.com")) {
    const lastEqIndex = clean.lastIndexOf("=");
    if (lastEqIndex !== -1) {
      const suffix = clean.substring(lastEqIndex);
      if (suffix.startsWith("=w") || suffix.startsWith("=s")) {
        clean = clean.substring(0, lastEqIndex) + "=w800-h800-l90-rj";
      }
    }
  }

  // 2. YouTube Video Thumbnails (i.ytimg.com / img.youtube.com):
  // Substitui hqdefault (480x360 com letterbox) por maxresdefault (1280x720 Full HD)
  if (clean.includes("i.ytimg.com/vi/") || clean.includes("img.youtube.com/vi/")) {
    clean = clean
      .replace("/hqdefault.jpg", "/maxresdefault.jpg")
      .replace("/mqdefault.jpg", "/maxresdefault.jpg")
      .replace("/default.jpg", "/maxresdefault.jpg");
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
  }
}
