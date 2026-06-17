import React from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const BlueIdleLockScreen = ({ onReconnect }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#021428]/80 p-6 text-white backdrop-blur-md"
  >
    <motion.div
      initial={{ scale: 0.96, y: 12 }}
      animate={{ scale: 1, y: 0 }}
      className="w-full max-w-md rounded-[28px] border border-white/20 bg-[#0a2a5c]/50 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15"
      >
        <LockKeyhole className="h-8 w-8" />
      </motion.div>
      <h2 className="text-2xl font-extrabold">Session verrouillée</h2>
      <p className="mt-3 text-sm leading-6 text-white/80">
        Vous avez été inactif pendant 30 minutes. Pour protéger vos dossiers et le cockpit ops,
        reconnectez-vous via Sésame.
      </p>
      <Button
        className="mt-6 h-11 w-full bg-white text-[#0a2a5c] hover:bg-white/90"
        onClick={onReconnect}
      >
        Se reconnecter
      </Button>
    </motion.div>
  </motion.div>
);
