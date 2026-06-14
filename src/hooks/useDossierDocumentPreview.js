import { useCallback, useEffect, useState } from 'react';
import {
  createPdfPreviewSource,
  fetchDossierDocumentBlob,
  openCachedPdfInSystemViewer,
  savePdfBlobToDevice,
} from '@/utils/dossierDocumentFile.js';
import { isCapacitorNative } from '@/utils/platform.js';

const releasePreview = (preview) => {
  if (!preview) return;
  if (preview.cleanup) preview.cleanup();
};

export const useDossierDocumentPreview = () => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loadingDocKey, setLoadingDocKey] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const closePreview = useCallback(() => {
    setPreviewDoc((current) => {
      releasePreview(current);
      return null;
    });
  }, []);

  useEffect(() => () => {
    releasePreview(previewDoc);
  }, [previewDoc]);

  const openPreview = useCallback(async ({ dossierId, docKey, label }) => {
    if (!dossierId || !docKey) return false;
    setLoadingDocKey(docKey);
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
          previewSrc: previewSource.src,
          cachePath: previewSource.cachePath,
          cacheDirectory: previewSource.cacheDirectory,
          cleanup: previewSource.cleanup,
        };
      });
      return true;
    } catch (_error) {
      return false;
    } finally {
      setLoadingDocKey(null);
    }
  }, []);

  const downloadPreview = useCallback(async () => {
    if (!previewDoc?.blob) return false;
    setDownloading(true);
    try {
      await savePdfBlobToDevice(previewDoc.blob, previewDoc.filename, {
        cachePath: previewDoc.cachePath,
        cacheDirectory: previewDoc.cacheDirectory,
      });
      return true;
    } catch (_error) {
      return false;
    } finally {
      setDownloading(false);
    }
  }, [previewDoc]);

  const openPreviewInSystemViewer = useCallback(async () => {
    if (!previewDoc) return false;
    setDownloading(true);
    try {
      if (previewDoc.cachePath) {
        await openCachedPdfInSystemViewer({
          path: previewDoc.cachePath,
          directory: previewDoc.cacheDirectory,
        });
        return true;
      }
      await savePdfBlobToDevice(previewDoc.blob, previewDoc.filename);
      return true;
    } catch (_error) {
      return false;
    } finally {
      setDownloading(false);
    }
  }, [previewDoc]);

  return {
    previewDoc,
    loadingDocKey,
    downloading,
    openPreview,
    closePreview,
    downloadPreview,
    openPreviewInSystemViewer,
    isNativePreview: isCapacitorNative(),
  };
};
