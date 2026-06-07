import React, { createContext, useContext, useEffect, useState } from 'react';

const MobileShellScrollContext = createContext(false);

export const MobileShellScrollProvider = ({ scrollRef, children }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = scrollRef?.current;
    if (!node) return undefined;

    const handler = () => setScrolled(node.scrollTop > 6);
    handler();
    node.addEventListener('scroll', handler, { passive: true });
    return () => node.removeEventListener('scroll', handler);
  }, [scrollRef]);

  return (
    <MobileShellScrollContext.Provider value={scrolled}>
      {children}
    </MobileShellScrollContext.Provider>
  );
};

export const useMobileShellScroll = () => useContext(MobileShellScrollContext);
