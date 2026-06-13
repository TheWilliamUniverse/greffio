import React from 'react';
import { isOpsMobileViewport } from '@/utils/platform.js';
import { OpsMobileGuardPage } from '@/pages/ops/OpsMobileGuardPage.jsx';

export const OpsMobileEntry = ({ children }) => (
  isOpsMobileViewport() ? <OpsMobileGuardPage /> : children
);
