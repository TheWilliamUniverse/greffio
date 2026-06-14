import { useCallback, useEffect, useState } from 'react';
import { fetchDossierDocumentBlob, savePdfBlobToDevice } from '@/utils/dossierDocumentFile.js';

export const useDossierDocumentPreview = () => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [loadingDocKey, setLoadingDocKey] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const closePreview = useCallback(() => {
    setPreviewDoc((current) => {
      if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
      return null;
    });
  }, []);

  useEffect(() => () => {
    if (previewDoc?.blobUrl) URL.revokeObjectURL(previewDoc.blobUrl);
  }, [previewDoc?.blobUrl]);

  const openPreview = useCallback(async ({ dossierId, docKey, label }) => {
    if (!dossierId || !docKey) return false;
    setLoadingDocKey(docKey);
    try {
      const { filename, blob } = await fetchDossierDocumentBlob({ dossierId, docKey, inline: true });
      setPreviewDoc((current) => {
        if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
        return {
          dossierId,
          docKey,
          label: label || filename,
          filename,
          blob,
          blobUrl: URL.createObjectURL(blob),
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
  };
};
