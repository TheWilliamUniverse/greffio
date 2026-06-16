import { useCallback, useEffect, useState } from 'react';
import {
  createPdfPreviewSource,
  fetchDossierDocumentBlob,
  mapDocumentPreviewError,
  openCachedPdfInSystemViewer,
  savePdfBlobToDevice,
} from '@/utils/dossierDocumentFile.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { openDocumentViewerTab } from '@/pages/DocumentViewerTab.jsx';

const releasePreview = (preview) => {
  if (!preview) return;
  if (preview.cleanup) preview.cleanup();
};

export const useDossierDocumentPreview = () => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loadingDocKey, setLoadingDocKey] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const closePreview = useCallback(() => {
    setPreviewError('');
    setPreviewDoc((current) => {
      releasePreview(current);
      return null;
    });
  }, []);

  useEffect(() => () => {
    releasePreview(previewDoc);
  }, [previewDoc]);

  const openPreview = useCallback(async ({ dossierId, docKey, label }) => {
    if (!dossierId || !docKey) return { ok: false, error: 'Paramètres document manquants.' };
    setLoadingDocKey(docKey);
    setPreviewError('');
    if (!isCapacitorNative()) {
      openDocumentViewerTab({ dossierId, docKey });
    }
    setPreviewDoc((current) => {
      releasePreview(current);
      return {
        dossierId,
        docKey,
        label: label || docKey,
        filename: `${docKey}.pdf`,
        blob: null,
        arrayBuffer: null,
        previewSrc: null,
        nativePreview: isCapacitorNative(),
        cachePath: null,
        cacheDirectory: null,
        loading: true,
        cleanup: () => {},
      };
    });
    try {
      const { filename, blob } = await fetchDossierDocumentBlob({ dossierId, docKey, inline: true });
      const previewSource = await createPdfPreviewSource(blob, filename);
      setPreviewDoc((current) => {
        releasePreview(current);
        return {
          dossierId,
          docKey,
          label: label || filename,
          filename,
          blob: previewSource.blob,
          arrayBuffer: previewSource.arrayBuffer,
          previewSrc: previewSource.src,
          nativePreview: previewSource.nativePreview,
          cachePath: previewSource.cachePath,
          cacheDirectory: previewSource.cacheDirectory,
          loading: false,
          cleanup: previewSource.cleanup,
        };
      });
      return { ok: true };
    } catch (error) {
      const message = mapDocumentPreviewError(error);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[DossierDocumentPreview] open failed', {
          docKey,
          dossierId,
          code: error?.code || error?.message,
          contentType: error?.contentType,
        });
      }
      setPreviewDoc(null);
      setPreviewError(message);
      return { ok: false, error: message };
    } finally {
      setLoadingDocKey(null);
    }
  }, []);

  const downloadPreview = useCallback(async () => {
    if (!previewDoc?.blob) return { ok: false, error: 'Aucun document à télécharger.' };
    setDownloading(true);
    try {
      const cached = await savePdfBlobToDevice(previewDoc.blob, previewDoc.filename, {
        cachePath: previewDoc.cachePath,
        cacheDirectory: previewDoc.cacheDirectory,
        dossierId: previewDoc.dossierId,
        docKey: previewDoc.docKey,
      });
      if (cached?.path) {
        setPreviewDoc((current) => (current ? {
          ...current,
          cachePath: cached.path,
          cacheDirectory: cached.directory,
        } : current));
      }
      return { ok: true };
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[DossierDocumentPreview] download failed', error);
      }
      return { ok: false, error: mapDocumentPreviewError(error) };
    } finally {
      setDownloading(false);
    }
  }, [previewDoc]);

  const openPreviewInSystemViewer = useCallback(async () => {
    if (!previewDoc) return { ok: false, error: 'Aucun document à ouvrir.' };
    setDownloading(true);
    try {
      const cached = await openCachedPdfInSystemViewer({
        path: previewDoc.cachePath,
        directory: previewDoc.cacheDirectory,
        filename: previewDoc.filename,
        blob: previewDoc.blob,
        dossierId: previewDoc.dossierId,
        docKey: previewDoc.docKey,
      });
      if (cached?.path) {
        setPreviewDoc((current) => (current ? {
          ...current,
          cachePath: cached.path,
          cacheDirectory: cached.directory,
        } : current));
      }
      return { ok: true };
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[DossierDocumentPreview] open external failed', error);
      }
      return { ok: false, error: mapDocumentPreviewError(error) };
    } finally {
      setDownloading(false);
    }
  }, [previewDoc]);

  return {
    previewDoc,
    previewError,
    loadingDocKey,
    downloading,
    openPreview,
    closePreview,
    downloadPreview,
    openPreviewInSystemViewer,
    isNativePreview: isCapacitorNative(),
  };
};
