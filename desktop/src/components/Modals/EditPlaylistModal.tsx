import React, { useState, useEffect, useRef } from "react";
import { Edit3, X, Loader2 } from "lucide-react";
import { Playlist } from "../../types";

interface EditPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onSave: (playlistId: string, title: string, description?: string) => Promise<void>;
}

export const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || "");
      setError(null);
      setIsSubmitting(false);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, playlist]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("O título da playlist não pode ficar em branco.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(playlist.id, trimmedTitle, description.trim() || undefined);
      onClose();
    } catch (err) {
      setError(String(err) || "Falha ao salvar detalhes da playlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-playlist-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#12141f]/95 border border-[#272c3f] rounded-2xl p-6 shadow-2xl relative cursor-default space-y-5 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212638] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-text)]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="edit-playlist-title" className="text-base font-bold text-white">
                Editar Playlist
              </h2>
              <p className="text-xs text-[#8c91a4]">
                Atualiza os detalhes no YouTube Music
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-playlist-name" className="text-xs font-semibold text-[#c4c8d8]">
              Título <span className="text-[var(--accent-text)]">*</span>
            </label>
            <input
              id="edit-playlist-name"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da Playlist"
              maxLength={150}
              disabled={isSubmitting}
              className="w-full bg-[#181c28] text-white text-xs px-3.5 py-2.5 rounded-xl border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-playlist-description" className="text-xs font-semibold text-[#c4c8d8]">
              Descrição <span className="text-[10px] text-[#71778c]">(opcional)</span>
            </label>
            <textarea
              id="edit-playlist-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma breve descrição sobre as músicas..."
              maxLength={500}
              disabled={isSubmitting}
              className="w-full bg-[#181c28] text-white text-xs px-3.5 py-2 rounded-xl border border-[#272d40] hover:border-[#384056] focus:border-[var(--accent)] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#212638]">
            <button
              type="button"
              onClick={onClose}
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
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Alterações</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

