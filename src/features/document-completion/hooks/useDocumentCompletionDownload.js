import { useCallback, useState } from 'react';
import { downloadCompletedDocument, exportDocumentCompletionPdf } from '../api/documentCompletionApi.js';

export const useDocumentCompletionDownload = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = useCallback(async ({ documentId, fileName, ensureExport = true }) => {
    setError('');
    setDownloading(true);
    try {
      if (ensureExport) {
        await exportDocumentCompletionPdf(documentId);
      }
      await downloadCompletedDocument(documentId, fileName);
      return true;
    } catch (err) {
      setError(err?.message || 'Téléchargement impossible.');
      return false;
    } finally {
      setDownloading(false);
    }
  }, []);

  return { download, downloading, error, setError };
};
