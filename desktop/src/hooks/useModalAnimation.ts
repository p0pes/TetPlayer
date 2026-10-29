import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook reutilizável de animação de entrada e saída (mount/unmount suave) para modais.
 * Elimina o fechamento abrupto (unmount em 0ms) sem exigir bibliotecas externas pesadas.
 */
export function useModalAnimation(
  isOpen: boolean,
  onClose: () => void,
  durationMs = 140
) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender && !isClosing) {
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, durationMs);
    }
  }, [isOpen, shouldRender, isClosing, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
    timerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, durationMs);
  }, [isClosing, onClose, durationMs]);

  return {
    shouldRender,
    isClosing,
    requestClose,
    backdropClassName: isClosing ? "animate-backdrop-out" : "animate-backdrop-in",
    modalClassName: isClosing ? "animate-modal-out" : "animate-modal-in",
  };
}
