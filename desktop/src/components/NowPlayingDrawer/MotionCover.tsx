import React, { useState, useRef, useEffect } from "react";
import { Music, Sparkles, Image as ImageIcon } from "lucide-react";
import { Track } from "../../types";
import { upgradeArtworkQuality, handleArtworkError } from "../../utils/artwork";
import { SettingsService } from "../../services/settings";

interface MotionCoverProps {
  track: Track | null;
  isPlaying: boolean;
  className?: string;
}

export function MotionCover({ track, isPlaying, className = "" }: MotionCoverProps) {
  const [isMotionEnabled, setIsMotionEnabled] = useState<boolean>(() => {
    return SettingsService.getSetting("motionCoverEnabled");
  });

  useEffect(() => {
    return SettingsService.subscribe((settings, key) => {
      if (!key || key === "motionCoverEnabled") {
        setIsMotionEnabled(settings.motionCoverEnabled);
      }
    });
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function toggleMotionMode(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const current = SettingsService.getSetting("motionCoverEnabled");
    const next = !current;
    SettingsService.updateSetting("motionCoverEnabled", next);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isMotionEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Normaliza entre -1 e 1
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    // Inclinação sutil e elegante (máx 5.2 graus para suavidade)
    setTilt({
      x: -normY * 5.2,
      y: normX * 5.2,
    });
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  const artworkUrl = track?.artwork_url || track?.id
    ? upgradeArtworkQuality(track?.artwork_url, track?.id)
    : null;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 1. Halo Difuso e Brilho Radiante sob a Capa (Motion Aura) */}
      {artworkUrl && isMotionEnabled && (
        <div
          className={`absolute inset-0 -m-4 rounded-3xl overflow-hidden blur-2xl transition-all duration-1000 pointer-events-none ${
            isPlaying ? "opacity-65 scale-110" : "opacity-35 scale-100"
          }`}
          aria-hidden="true"
        >
          <img
            src={artworkUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 2. Container Card da Capa com Transform 3D e amortecimento elástico ultra suave */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: "1000px",
          transform: isMotionEnabled
            ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${
                isHovered ? "1.025" : isPlaying ? "1.01" : "1"
              }, ${isHovered ? "1.025" : isPlaying ? "1.01" : "1"}, 1)`
            : "none",
          transition: isHovered
            ? "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)"
            : "transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
        }}
        className="relative group/motion z-10 w-44 h-44 sm:w-60 sm:h-60 lg:w-72 lg:h-72 max-h-[32vh] aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/20 shrink-0 bg-[#141724] select-none"
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={track?.title || "Capa do álbum"}
            referrerPolicy="no-referrer"
            onError={(e) => handleArtworkError(e, track?.id)}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isMotionEnabled && isPlaying ? "scale-105" : "scale-100"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-[#5e6479]" />
          </div>
        )}

        {/* 3. Feixe de Luz Cinematográfico Contínuo (Kinetic Specular Sheen) */}
        {isMotionEnabled && (
          <div
            className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-500 ${
              isPlaying ? "opacity-100" : "opacity-30"
            }`}
          >
            <div
              className="absolute -inset-[150%] bg-gradient-to-r from-transparent via-white/12 to-transparent -rotate-45 motion-safe:animate-[shimmer_5s_infinite]"
              style={{
                transform: "translateX(-100%) rotate(25deg)",
                animation: isPlaying
                  ? "motionSweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite"
                  : "none",
              }}
            />
          </div>
        )}

        {/* 4. Reflexo de Vidro Fixo no Topo */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

        {/* 5. Badge Estilo Apple Music Motion Cover (Alternador) */}
        <button
          type="button"
          onClick={toggleMotionMode}
          onPointerDown={(e) => e.stopPropagation()}
          title={
            isMotionEnabled
              ? "Desativar Capa Animada (Motion Cover)"
              : "Ativar Capa Animada (Motion Cover estilo Apple Music)"
          }
          aria-label={isMotionEnabled ? "Capa animada ativada" : "Capa animada desativada"}
          className={`absolute top-2.5 right-2.5 z-30 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all backdrop-blur-md cursor-pointer select-none active:scale-95 ${
            isMotionEnabled
              ? "bg-black/60 text-white border border-white/30 shadow-lg shadow-black/50 hover:bg-black/80"
              : "bg-black/40 text-[#8c91a4] border border-white/10 hover:text-white hover:border-white/20"
          }`}
        >
          {isMotionEnabled ? (
            <>
              <Sparkles className="w-2.5 h-2.5 text-yellow-400 animate-pulse" />
              <span>Motion</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-2.5 h-2.5" />
              <span>Estática</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
