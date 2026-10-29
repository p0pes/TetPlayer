import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Loader2, Trash2 } from "lucide-react";
import { useModalAnimation } from "../../hooks/useModalAnimation";
import { humanizeApiError } from "../../utils/errors";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  description,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { shouldRender, requestClose, backdropClassName, modalClassName } =
    useModalAnimation(isOpen, onClose, 140);

  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, requestClose]);

  if (!shouldRender) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await onConfirm();
      requestClose();
    } catch (err) {
      setError(humanizeApiError(err, "Falha ao excluir item."));
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) requestClose();
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
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 id="confirm-delete-title" className="text-base font-bold text-white">
                {title}
              </h2>
              <p className="text-xs text-[#8c91a4]">Ação irreversível</p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isDeleting}
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

        {/* Body content */}
        <div className="space-y-2">
          <p className="text-xs text-[#c4c8d8] leading-relaxed">
            Tem certeza que deseja excluir{" "}
            <span className="font-bold text-white">"{itemName}"</span>?
          </p>
          <p className="text-[11px] text-[#71778c] leading-relaxed">
            {description ||
              "Esta playlist será removida permanentemente da sua biblioteca e da sua conta do YouTube Music."}
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#212638]">
          <button
            type="button"
            onClick={requestClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#8c91a4] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Definitivamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
