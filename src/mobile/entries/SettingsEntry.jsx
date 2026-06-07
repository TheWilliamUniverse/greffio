import { Navigate } from 'react-router-dom';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { SettingsPage } from '@/pages/SettingsPage.jsx';

export const SettingsEntry = () => {
  if (isCapacitorNative() || isMobileBrowserViewport()) {
    return <Navigate to="/mobile/account" replace />;
  }
  return <SettingsPage />;
};
