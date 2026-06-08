import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const MobileShellOverlayContext = createContext(null);

export const MobileShellOverlayProvider = ({ children }) => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  /** Fermeture overlay Android — priorité : dialog > sheet > recherche > choix dossier > drawer */
  const closeTopOverlay = useCallback(() => {
    if (logoutOpen) {
      setLogoutOpen(false);
      return true;
    }
    if (accountOpen) {
      setAccountOpen(false);
      return true;
    }
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return true;
    }
    if (searchOpen) {
      setSearchOpen(false);
      return true;
    }
    if (vaultPickerOpen) {
      setVaultPickerOpen(false);
      return true;
    }
    if (drawerOpen) {
      setDrawerOpen(false);
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
    closeTopOverlay,
  }), [
    accountOpen,
    logoutOpen,
    searchOpen,
    drawerOpen,
    vaultPickerOpen,
    notificationsOpen,
    closeTopOverlay,
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
      closeTopOverlay: () => false,
    };
  }
  return ctx;
};
