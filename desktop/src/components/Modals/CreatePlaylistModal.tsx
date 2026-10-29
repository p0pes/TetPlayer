import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Loader2, Lock, Globe, EyeOff } from "lucide-react";
import { useModalAnimation } from "../../hooks/useModalAnimation";
import { humanizeApiError } from "../../utils/errors";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  initialTitle?: string;
  onClose: () => void;
  onCreate: (title: string, description?: string, privacy?: string) => Promise<void>;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  initialTitle,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"PRIVATE" | "UNLISTED" | "PUBLIC">("PRIVATE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { shouldRender, requestClose, backdropClassName, modalClassName } =
    useModalAnimation(isOpen, onClose, 140);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      setDescription("");
      setPrivacy("PRIVATE");
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialTitle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, requestClose]);

  if (!shouldRender) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Por favor, digite um título para a playlist.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate(trimmedTitle, description.trim() || undefined, privacy);
      requestClose();
    } catch (err) {
      setError(humanizeApiError(err, "Falha ao criar playlist no YouTube Music."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-playlist-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) requestClose();
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none cursor-pointer ${backdropClassName}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md bg-[#12141f]/95 border border-[#272c3f] rounded-2xl p-6 shadow-2xl relative cursor-default space-y-5 ${modalClassName}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212638] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-playlist-title" className="text-base font-bold text-white">
                Nova Playlist
              </h2>
              <p className="text-xs text-[#8c91a4]">
                Sincronizada diretamente com o YouTube Music
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-view-fade">
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="playlist-title" className="text-xs font-semibold text-[#c4c8d8]">
              Título <span className="text-[var(--accent-text)]">*</span>
            </label>
            <input
              id="playlist-title"
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Minha Playlist Favorita"
              maxLength={150}
              disabled={isSubmitting}
              className="w-full bg-[#181c28] text-white text-xs px-3.5 py-2.5 rounded-xl border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="playlist-desc" className="text-xs font-semibold text-[#c4c8d8]">
              Descrição <span className="text-[10px] text-[#71778c]">(opcional)</span>
            </label>
            <textarea
              id="playlist-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma breve descrição sobre as músicas..."
              maxLength={500}
              disabled={isSubmitting}
              className="w-full bg-[#181c28] text-white text-xs px-3.5 py-2 rounded-xl border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Privacidade */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#c4c8d8]">Privacidade</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("PRIVATE")}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  privacy === "PRIVATE"
                    ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                    : "bg-[#181c28] border-[#272d40] text-[#8c91a4] hover:text-white hover:border-[#384056]"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[11px]">Privada</span>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy("UNLISTED")}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  privacy === "UNLISTED"
                    ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                    : "bg-[#181c28] border-[#272d40] text-[#8c91a4] hover:text-white hover:border-[#384056]"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="text-[11px]">Não listada</span>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy("PUBLIC")}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  privacy === "PUBLIC"
                    ? "bg-[var(--accent-subtle)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]"
                    : "bg-[#181c28] border-[#272d40] text-[#8c91a4] hover:text-white hover:border-[#384056]"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-[11px]">Pública</span>
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#212638]">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white shadow-lg shadow-[var(--accent-glow)] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar Playlist</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
