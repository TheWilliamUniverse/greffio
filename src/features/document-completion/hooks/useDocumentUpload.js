import { useCallback, useState } from 'react';
import { uploadDocumentForCompletion } from '../api/documentCompletionApi.js';
import { documentCompletionConfig } from '../config.js';

export const useDocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = useCallback(async (file) => {
    setError('');
    if (!file) {
      setError('Sélectionnez un fichier PDF.');
      return null;
    }
    if (file.type !== 'application/pdf') {
      setError('Format accepté : PDF uniquement.');
      return null;
    }
    if (file.size > documentCompletionConfig.maxFileSizeBytes) {
      setError(`Taille maximale : ${documentCompletionConfig.maxFileSizeMb} Mo.`);
      return null;
    }
    setUploading(true);
    try {
      const result = await uploadDocumentForCompletion(file);
      return result;
    } catch (err) {
      setError(err?.message || 'Import impossible.');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, setError };
};
