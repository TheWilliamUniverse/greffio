import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import {
  LazyDocumentsPage,
  LazyMobileDocumentsPage,
  withSuspense,
} from '@/routes/lazyPages.jsx';

export const DocumentsEntry = () => (
  isCapacitorNative() || isMobileBrowserViewport()
    ? withSuspense(LazyMobileDocumentsPage, 'Chargement des documents…')
    : withSuspense(LazyDocumentsPage, 'Chargement des documents…')
);
