import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { DocumentsPage } from '@/pages/DocumentsPage.jsx';
import { MobileDocumentsPage } from '@/mobile/MobileDocumentsPage.jsx';

export const DocumentsEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? <MobileDocumentsPage />
    : <DocumentsPage />
);
