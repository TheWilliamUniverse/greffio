import { Navigate } from 'react-router-dom';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { ProfilePage } from '@/pages/ProfilePage.jsx';

export const ProfileEntry = () => {
  if (isCapacitorNative() || isMobileBrowserViewport()) {
    return <Navigate to="/mobile/account" replace />;
  }
  return <ProfilePage />;
};
