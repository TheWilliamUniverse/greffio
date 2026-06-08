import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { mobileDevLog } from '@/utils/mobileDevLog.js';

const MobileShellOverlayContext = createContext(null);

export const MobileShellOverlayProvider = ({ children }) => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const signatureOverlayOpenRef = useRef(false);
  const signatureOverlayCloseRef = useRef(null);

  const registerSignatureOverlay = useCallback((open, onClose) => {
    signatureOverlayOpenRef.current = Boolean(open);
    signatureOverlayCloseRef.current = open && typeof onClose === 'function' ? onClose : null;
  }, []);

  /** Fermeture overlay Android — priorité : veille > compte > notifications > recherche > dossier > signature > drawer */
  const closeTopOverlay = useCallback(() => {
    let topOverlay = null;
    let action = null;

    if (logoutOpen) {
      topOverlay = 'logoutDialog';
      action = 'closeLogoutDialog';
      setLogoutOpen(false);
    } else if (accountOpen) {
      topOverlay = 'accountSheet';
      action = 'closeAccountSheet';
      setAccountOpen(false);
    } else if (notificationsOpen) {
      topOverlay = 'notificationsSheet';
      action = 'closeNotificationsSheet';
      setNotificationsOpen(false);
    } else if (searchOpen) {
      topOverlay = 'searchDialog';
      action = 'closeSearchDialog';
      setSearchOpen(false);
    } else if (vaultPickerOpen) {
      topOverlay = 'vaultPicker';
      action = 'closeVaultPicker';
      setVaultPickerOpen(false);
    } else if (signatureOverlayOpenRef.current && signatureOverlayCloseRef.current) {
      topOverlay = 'signatureSheet';
      action = 'closeSignatureSheet';
      signatureOverlayCloseRef.current();
    } else if (drawerOpen) {
      topOverlay = 'drawer';
      action = 'closeDrawer';
      setDrawerOpen(false);
    }

    if (topOverlay) {
      mobileDevLog('backOverlay', { topOverlay, action });
      return true;
    }
    return false;
  }, [
    accountOpen,
    drawerOpen,
    logoutOpen,
    notificationsOpen,
    searchOpen,
    vaultPickerOpen,
  ]);

  const getTopOverlayName = useCallback(() => {
    if (logoutOpen) return 'logoutDialog';
    if (accountOpen) return 'accountSheet';
    if (notificationsOpen) return 'notificationsSheet';
    if (searchOpen) return 'searchDialog';
    if (vaultPickerOpen) return 'vaultPicker';
    if (signatureOverlayOpenRef.current) return 'signatureSheet';
    if (drawerOpen) return 'drawer';
    return null;
  }, [
    accountOpen,
    drawerOpen,
    logoutOpen,
    notificationsOpen,
    searchOpen,
    vaultPickerOpen,
  ]);

  const value = useMemo(() => ({
    accountOpen,
    setAccountOpen,
    logoutOpen,
    setLogoutOpen,
    searchOpen,
    setSearchOpen,
    drawerOpen,
    setDrawerOpen,
    vaultPickerOpen,
    setVaultPickerOpen,
    notificationsOpen,
    setNotificationsOpen,
    registerSignatureOverlay,
    closeTopOverlay,
    getTopOverlayName,
  }), [
    accountOpen,
    logoutOpen,
    searchOpen,
    drawerOpen,
    vaultPickerOpen,
    notificationsOpen,
    registerSignatureOverlay,
    closeTopOverlay,
    getTopOverlayName,
  ]);

  return (
    <MobileShellOverlayContext.Provider value={value}>
      {children}
    </MobileShellOverlayContext.Provider>
  );
};

export const useMobileShellOverlay = () => {
  const ctx = useContext(MobileShellOverlayContext);
  if (!ctx) {
    return {
      accountOpen: false,
      setAccountOpen: () => {},
      logoutOpen: false,
      setLogoutOpen: () => {},
      searchOpen: false,
      setSearchOpen: () => {},
      drawerOpen: false,
      setDrawerOpen: () => {},
      vaultPickerOpen: false,
      setVaultPickerOpen: () => {},
      notificationsOpen: false,
      setNotificationsOpen: () => {},
      registerSignatureOverlay: () => {},
      closeTopOverlay: () => false,
      getTopOverlayName: () => null,
    };
  }
  return ctx;
};
