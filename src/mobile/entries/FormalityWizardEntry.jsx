import { FormalityWizardPage } from '@/pages/FormalityWizardPage.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

export const FormalityWizardEntry = () => (
  <FormalityWizardPage presentation={isCapacitorNative() || isMobileBrowserViewport() ? 'mobile' : 'desktop'} />
);
