import { useEffect } from 'react';
import { useMobileShellOverlay } from '@/mobile/context/MobileShellOverlayContext.jsx';

/**
 * Enregistre un bottom sheet signature dans la pile Android back (Mixte).
 */
export const useMobileSignatureOverlay = (open, onClose) => {
  const { registerSignatureOverlay } = useMobileShellOverlay();

  useEffect(() => {
    if (!open || typeof onClose !== 'function') {
      registerSignatureOverlay(false, null);
      return undefined;
    }
    registerSignatureOverlay(true, onClose);
    return () => registerSignatureOverlay(false, null);
  }, [open, onClose, registerSignatureOverlay]);
};
