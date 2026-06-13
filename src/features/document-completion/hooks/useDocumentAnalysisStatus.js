import { useCallback, useEffect, useRef, useState } from 'react';
import {
  exportDocumentCompletionPdf,
  getDocumentCompletionStatus,
} from '../api/documentCompletionApi.js';
import { documentCompletionConfig, PROCESSING_STATUSES, TERMINAL_STATUSES } from '../config.js';

export const useDocumentAnalysisStatus = (documentId) => {
  const [document, setDocument] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!documentId) return null;
    setLoading(true);
    try {
      const payload = await getDocumentCompletionStatus(documentId);
      setDocument(payload.document);
      setFields(payload.fields || []);
      setError('');
      return payload;
    } catch (err) {
      setError(err?.message || 'Impossible de récupérer le statut.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return undefined;
    void refresh();
    pollRef.current = window.setInterval(() => {
      void refresh();
    }, documentCompletionConfig.pollIntervalMs);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [documentId, refresh]);

  useEffect(() => {
    if (!document?.status) return;
    if (TERMINAL_STATUSES.has(document.status) && pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [document?.status]);

  const ensureExported = useCallback(async () => {
    if (!documentId) return null;
    if (document?.status === 'exported') return document;
    try {
      const payload = await exportDocumentCompletionPdf(documentId);
      setDocument(payload.document);
      setFields(payload.fields || []);
      return payload.document;
    } catch (err) {
      setError(err?.message || 'Export impossible.');
      return null;
    }
  }, [document?.status, documentId]);

  const isProcessing = document ? PROCESSING_STATUSES.has(document.status) : false;

  return {
    document,
    fields,
    loading,
    error,
    refresh,
    ensureExported,
    isProcessing,
  };
};
