import React, { useState } from 'react';
import { MobileSidebarDrawer, MobileSidebarTrigger } from '@/components/MobileSidebarDrawer.jsx';

/**
 * Enveloppe la navigation mobile authentifiée : drawer latéral (équivalent Sidebar desktop).
 */
export const MobileAuthenticatedNav = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileSidebarDrawer open={open} onClose={() => setOpen(false)} />
      {typeof children === 'function' ? children({ openMenu: () => setOpen(true) }) : children}
    </>
  );
};

export const MobileMenuButton = ({ onClick, className }) => (
  <MobileSidebarTrigger onClick={onClick} className={className} />
);
