import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

const loadOnlyOfficeScript = (documentServerUrl) => new Promise((resolve, reject) => {
  const base = String(documentServerUrl || '').replace(/\/$/, '');
  if (!base) {
    reject(new Error('ONLYOFFICE_URL_MISSING'));
    return;
  }
  const existing = document.querySelector('script[data-onlyoffice-api="1"]');
  if (existing && window.DocsAPI) {
    resolve(window.DocsAPI);
    return;
  }
  const script = document.createElement('script');
  script.src = `${base}/web-apps/apps/api/documents/api.js`;
  script.async = true;
  script.dataset.onlyofficeApi = '1';
  script.onload = () => {
    if (window.DocsAPI) resolve(window.DocsAPI);
    else reject(new Error('ONLYOFFICE_API_UNAVAILABLE'));
  };
  script.onerror = () => reject(new Error('ONLYOFFICE_SCRIPT_LOAD_FAILED'));
  document.body.appendChild(script);
});

const resolveFriendlyOnlyOfficeError = (event) => {
  const code = Number(event?.data?.errorCode || event?.data?.error || 0);
  if (code === -82 || code === -83) {
    return 'Le fichier ouvert n’est pas un document Word valide. Relancez l’édition pour régénérer le DOCX.';
  }
  if (code === -4) {
    return 'ONLYOFFICE n’a pas pu télécharger le document. Vérifiez la connexion serveur puis réessayez.';
  }
  if (code === -20) {
    return 'La session d’édition a expiré. Fermez puis rouvrez l’éditeur.';
  }
  return 'L’éditeur ONLYOFFICE a rencontré un problème. Réessayez dans un instant.';
};

export const OnlyOfficeEditor = ({
  documentServerUrl,
  config,
  onError,
  onReady,
  onRetry,
  className = '',
  fullViewport = false,
}) => {
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [bootKey, setBootKey] = useState(0);
  const isMobilePresentation = isCapacitorNative() || isMobileBrowserViewport();

  const handleRetry = useCallback(() => {
    setErrorMessage('');
    setLoading(true);
    setBootKey((value) => value + 1);
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!config || !documentServerUrl) {
        setErrorMessage('Configuration ONLYOFFICE indisponible.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage('');
      try {
        const DocsAPI = await loadOnlyOfficeScript(documentServerUrl);
        if (cancelled || !containerRef.current) return;
        if (editorRef.current?.destroyEditor) {
          editorRef.current.destroyEditor();
        }
        containerRef.current.innerHTML = '';
        const editorConfig = {
          ...config,
          type: isMobilePresentation ? 'mobile' : (config.type || 'desktop'),
          height: '100%',
          width: '100%',
          events: {
            onDocumentReady: () => {
              if (cancelled) return;
              setLoading(false);
              onReady?.();
            },
            onError: (event) => {
              if (cancelled) return;
              const message = resolveFriendlyOnlyOfficeError(event);
              setErrorMessage(message);
              setLoading(false);
              onError?.(event);
            },
          },
        };
        editorRef.current = new DocsAPI.DocEditor(containerRef.current.id, editorConfig);
      } catch (error) {
        if (cancelled) return;
        const message = error?.message === 'ONLYOFFICE_SCRIPT_LOAD_FAILED'
          ? 'Impossible de charger ONLYOFFICE. Vérifiez ONLYOFFICE_URL et la connectivité réseau.'
          : 'L’éditeur ONLYOFFICE n’est pas disponible pour le moment.';
        setErrorMessage(message);
        setLoading(false);
        onError?.(error);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (editorRef.current?.destroyEditor) {
        editorRef.current.destroyEditor();
      }
    };
  }, [config, documentServerUrl, onError, onReady, bootKey, isMobilePresentation]);

  const shellClassName = fullViewport || isMobilePresentation
    ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-white sm:rounded-md sm:border sm:border-border'
    : `relative min-h-[70vh] w-full overflow-hidden rounded-md border border-border bg-white ${className}`;

  return (
    <div className={shellClassName}>
      {loading && !errorMessage ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de l’éditeur ONLYOFFICE…</p>
        </div>
      ) : null}
      {errorMessage ? (
        <div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold text-foreground">Éditeur indisponible</p>
            <p className="text-sm leading-6 text-muted-foreground">{errorMessage}</p>
          </div>
          <Button type="button" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      ) : (
        <div
          id={containerId}
          ref={containerRef}
          className={fullViewport || isMobilePresentation ? 'h-[calc(100dvh-12rem)] w-full sm:h-[75vh]' : 'h-[75vh] w-full'}
        />
      )}
    </div>
  );
};
