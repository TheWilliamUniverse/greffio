import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth.js';
import { attachCompletedDocumentToDossier } from '../utils/dossierAttach.js';
import { useDocumentCompletionDownload } from './useDocumentCompletionDownload.js';

export const useDocumentCompletionDossierActions = (dossierId) => {
  const { currentUser } = useAuth();
  const { download, downloading, error: downloadError } = useDocumentCompletionDownload();
  const [exportDone, setExportDone] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [attached, setAttached] = useState(false);

  const handleDownload = useCallback(async ({ documentId, fileName }) => {
    const ok = await download({ documentId, fileName, ensureExport: true });
    if (ok) setExportDone(true);
    return ok;
  }, [download]);

  const handleAttachToDossier = useCallback(async ({ documentId, fileName }) => {
    if (!dossierId) return false;
    setAttachError('');
    setAttaching(true);
    try {
      await attachCompletedDocumentToDossier({
        documentId,
        dossierId,
        fileName,
        ownerFirstName: currentUser?.firstName || '',
        ownerLastName: currentUser?.lastName || '',
      });
      setAttached(true);
      setExportDone(true);
      toast.success('PDF ajouté au dossier.');
      return true;
    } catch (err) {
      const message = err?.message || 'Impossible d’ajouter le PDF au dossier.';
      setAttachError(message);
      toast.error(message);
      return false;
    } finally {
      setAttaching(false);
    }
  }, [currentUser?.firstName, currentUser?.lastName, dossierId]);

  return {
    handleDownload,
    handleAttachToDossier,
    downloading,
    attaching,
    downloadError,
    attachError,
    exportDone,
    attached,
  };
};
