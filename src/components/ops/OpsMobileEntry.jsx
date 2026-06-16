import React from 'react';
import { isOpsMobileViewport } from '@/utils/platform.js';
import { OpsMobileGuardPage } from '@/pages/ops/OpsMobileGuardPage.jsx';

/** Bloque le cockpit ops sur mobile natif et web <768px. */
export const OpsMobileEntry = ({ children }) => {
  if (isOpsMobileViewport()) return <OpsMobileGuardPage />;
  return children;
};
