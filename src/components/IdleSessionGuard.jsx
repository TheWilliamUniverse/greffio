import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useIdleLock } from '@/hooks/useIdleLock.js';
import { BlueIdleLockScreen } from '@/components/auth/BlueIdleLockScreen.jsx';

export const IdleSessionGuard = ({ children }) => {
  const { locked, handleReconnect } = useIdleLock();

  return (
    <>
      {children}
      <AnimatePresence>
        {locked ? <BlueIdleLockScreen onReconnect={handleReconnect} /> : null}
      </AnimatePresence>
    </>
  );
};
