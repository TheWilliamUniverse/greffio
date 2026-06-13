import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { DocumentCompletionPage } from '@/pages/DocumentCompletionPage.jsx';
import { MobileDocumentCompletionPage } from '@/mobile/MobileDocumentCompletionPage.jsx';

export const DocumentCompletionEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileDocumentCompletionPage />
    : <DocumentCompletionPage />
);
