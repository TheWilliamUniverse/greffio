import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { TeamPage } from '@/pages/TeamPage.jsx';
import { MobileTeamPage } from '@/mobile/MobileTeamPage.jsx';

export const TeamEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileTeamPage />
    : <TeamPage />
);
