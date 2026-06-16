import { useCallback, useEffect, useRef, useState } from 'react';
import {
  exportDocumentCompletionPdf,
  getDocumentCompletionStatus,
} from '../api/documentCompletionApi.js';
import { documentCompletionConfig, PROCESSING_STATUSES, TERMINAL_STATUSES } from '../config.js';
import { isPageVisible } from '@/utils/pageVisibility.js';

const ANALYSIS_POLL_BACKOFF_MS = [2500, 4000, 7000, 12000];

export const useDocumentAnalysisStatus = (documentId) => {
  const [document, setDocument] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const backoffIndexRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!documentId) return null;
    if (!isPageVisible()) return null;
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

    let cancelled = false;

    const clearPoll = () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };

    const schedulePoll = () => {
      clearPoll();
      const delay = ANALYSIS_POLL_BACKOFF_MS[
        Math.min(backoffIndexRef.current, ANALYSIS_POLL_BACKOFF_MS.length - 1)
      ] || documentCompletionConfig.pollIntervalMs;
      pollRef.current = window.setTimeout(async () => {
        if (cancelled) return;
        if (!isPageVisible()) {
          schedulePoll();
          return;
        }
        const payload = await refresh();
        if (cancelled) return;
        const status = payload?.document?.status;
        if (status && TERMINAL_STATUSES.has(status)) {
          clearPoll();
          return;
        }
        backoffIndexRef.current = Math.min(
          backoffIndexRef.current + 1,
          ANALYSIS_POLL_BACKOFF_MS.length - 1,
        );
        schedulePoll();
      }, delay);
    };

    void refresh();
    schedulePoll();

    const onVisible = () => {
      if (isPageVisible() && !cancelled) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearPoll();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [documentId, refresh]);

  useEffect(() => {
    if (!document?.status) return;
    if (TERMINAL_STATUSES.has(document.status) && pollRef.current) {
      window.clearTimeout(pollRef.current);
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
