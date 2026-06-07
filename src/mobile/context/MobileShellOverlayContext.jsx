import React, { createContext, useContext, useMemo, useState } from 'react';

const MobileShellOverlayContext = createContext(null);

export const MobileShellOverlayProvider = ({ children }) => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const value = useMemo(() => ({
    accountOpen,
    setAccountOpen,
    logoutOpen,
    setLogoutOpen,
    searchOpen,
    setSearchOpen,
  }), [accountOpen, logoutOpen, searchOpen]);

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
    };
  }
  return ctx;
};
