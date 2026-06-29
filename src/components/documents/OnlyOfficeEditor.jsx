import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

const LOADING_TIMEOUT_MS = 45000;
const SCRIPT_LOAD_TIMEOUT_MS = 12000;
const EDITOR_HEIGHT_DESKTOP_PX = 720;
const EDITOR_HEIGHT_MOBILE_PX = 560;
const INVALID_DOCUMENT_SERVER_HOSTS = ['greffio.willentreprises.com', 'www.greffio.willentreprises.com', 'api.greffio.willentreprises.com'];

const resolveEditorHeightPx = (isMobilePresentation, fullViewport) => {
  if (typeof window === 'undefined') {
    return isMobilePresentation || fullViewport ? EDITOR_HEIGHT_MOBILE_PX : EDITOR_HEIGHT_DESKTOP_PX;
  }
  const ratio = isMobilePresentation || fullViewport ? 0.62 : 0.58;
  const cap = isMobilePresentation || fullViewport ? EDITOR_HEIGHT_MOBILE_PX : EDITOR_HEIGHT_DESKTOP_PX;
  return Math.min(Math.round(window.innerHeight * ratio), cap);
};

const normalizeDocumentServerUrl = (value = '') => String(value || '').trim().replace(/\/$/, '');

const isValidDocumentServerUrl = (documentServerUrl) => {
  const base = normalizeDocumentServerUrl(documentServerUrl);
  if (!base) return false;
  try {
    const host = new URL(base).hostname.toLowerCase();
    return !INVALID_DOCUMENT_SERVER_HOSTS.includes(host);
  } catch (_error) {
    return false;
  }
};

export const preloadOnlyOfficeAssets = (documentServerUrl) => {
  const base = normalizeDocumentServerUrl(documentServerUrl);
  if (!base || !isValidDocumentServerUrl(base)) return;
  const origin = (() => {
    try {
      return new URL(base).origin;
    } catch (_error) {
      return base;
    }
  })();
  if (!document.querySelector(`link[data-onlyoffice-preconnect="${origin}"]`)) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = origin;
    preconnect.crossOrigin = 'anonymous';
    preconnect.dataset.onlyofficePreconnect = origin;
    document.head.appendChild(preconnect);
  }
  const scriptHref = `${base}/web-apps/apps/api/documents/api.js`;
  if (!document.querySelector('link[data-onlyoffice-preload="1"]')) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'script';
    preload.href = scriptHref;
    preload.dataset.onlyofficePreload = '1';
    document.head.appendChild(preload);
  }
};

const parseConfigHeightPx = (config, isMobilePresentation, fullViewport, expanded = false) => {
  if (expanded && typeof window !== 'undefined') {
    return Math.max(520, Math.round(window.innerHeight - 72));
  }
  const raw = config?.height;
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d+(?:\.\d+)?)px$/);
    if (match) {
      const parsed = Math.round(Number(match[1]));
      if (parsed >= 320) return parsed;
    }
  }
  if (typeof raw === 'number' && raw >= 320) return Math.round(raw);
  return resolveEditorHeightPx(isMobilePresentation, fullViewport);
};

const loadOnlyOfficeScript = (documentServerUrl) => new Promise((resolve, reject) => {
  const base = normalizeDocumentServerUrl(documentServerUrl);
  if (!base) {
    reject(new Error('ONLYOFFICE_URL_MISSING'));
    return;
  }
  if (!isValidDocumentServerUrl(base)) {
    reject(new Error('ONLYOFFICE_URL_INVALID'));
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
  const scriptTimeout = window.setTimeout(() => {
    script.onerror = null;
    script.onload = null;
    reject(new Error('ONLYOFFICE_SCRIPT_LOAD_FAILED'));
  }, SCRIPT_LOAD_TIMEOUT_MS);
  script.onload = () => {
    window.clearTimeout(scriptTimeout);
    if (window.DocsAPI) resolve(window.DocsAPI);
    else reject(new Error('ONLYOFFICE_API_UNAVAILABLE'));
  };
  script.onerror = () => {
    window.clearTimeout(scriptTimeout);
    reject(new Error('ONLYOFFICE_SCRIPT_LOAD_FAILED'));
  };
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
  if (code === -71 || code === -13) {
    return 'Une version plus récente du document est disponible. Rechargez l’éditeur pour travailler sur la dernière version.';
  }
  return 'L’éditeur ONLYOFFICE a rencontré un problème. Réessayez dans un instant.';
};

/** ONLYOFFICE JWT signs the full config server-side — client passes token + events only. */
const buildDocEditorConfig = (config, events, isMobilePresentation, fullViewport) => {
  if (config?.token) {
    return { token: config.token, events };
  }
  return {
    ...config,
    type: isMobilePresentation ? 'mobile' : (config.type || 'desktop'),
    height: `${resolveEditorHeightPx(isMobilePresentation, fullViewport)}px`,
    width: '100%',
    events,
  };
};

const resolveBootErrorMessage = (error) => {
  if (error?.message === 'ONLYOFFICE_SCRIPT_LOAD_FAILED') {
    return 'Impossible de charger ONLYOFFICE. Vérifiez ONLYOFFICE_URL et la connectivité réseau.';
  }
  if (error?.message === 'ONLYOFFICE_URL_INVALID') {
    return 'ONLYOFFICE_URL est mal configuré (doit pointer vers office.greffio…, pas l’API ni le site web).';
  }
  if (error?.message === 'ONLYOFFICE_LOAD_TIMEOUT') {
    return 'L’éditeur ONLYOFFICE met trop de temps à démarrer. Le document source est peut-être inaccessible.';
  }
  return 'L’éditeur ONLYOFFICE n’est pas disponible pour le moment.';
};

export const OnlyOfficeEditor = ({
  documentServerUrl,
  config,
  onError,
  onReady,
  onDocumentSaved,
  onRetry,
  onUnavailable,
  className = '',
  fullViewport = false,
  expanded = false,
}) => {
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const documentDirtyRef = useRef(false);
  const saveNotifyTimerRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [bootKey, setBootKey] = useState(0);
  const isMobilePresentation = isCapacitorNative() || isMobileBrowserViewport();

  const failWithMessage = useCallback((message, error = null) => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setErrorMessage(message);
    setLoading(false);
    if (error) onError?.(error);
    onUnavailable?.(message);
  }, [onError, onUnavailable]);

  const handleRetry = useCallback(() => {
    setErrorMessage('');
    setLoading(true);
    setBootKey((value) => value + 1);
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    let cancelled = false;

    const clearLoadTimeout = () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };

    const boot = async () => {
      if (!config || !documentServerUrl) {
        failWithMessage('Configuration ONLYOFFICE indisponible.');
        return;
      }
      if (!isValidDocumentServerUrl(documentServerUrl)) {
        failWithMessage('ONLYOFFICE_URL est mal configuré sur le serveur Greffio.');
        return;
      }

      setLoading(true);
      setErrorMessage('');
      clearLoadTimeout();
      loadTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        failWithMessage(resolveBootErrorMessage({ message: 'ONLYOFFICE_LOAD_TIMEOUT' }), new Error('ONLYOFFICE_LOAD_TIMEOUT'));
        if (editorRef.current?.destroyEditor) {
          editorRef.current.destroyEditor();
        }
      }, LOADING_TIMEOUT_MS);

      try {
        const DocsAPI = await loadOnlyOfficeScript(documentServerUrl);
        if (cancelled) return;
        if (!containerRef.current) {
          clearLoadTimeout();
          failWithMessage('Conteneur éditeur indisponible. Réessayez.');
          return;
        }
        if (editorRef.current?.destroyEditor) {
          editorRef.current.destroyEditor();
        }
        containerRef.current.innerHTML = '';
        const editorConfig = buildDocEditorConfig(config, {
          onDocumentReady: () => {
            if (cancelled) return;
            clearLoadTimeout();
            setLoading(false);
            window.requestAnimationFrame(() => {
              editorRef.current?.resizeEditor?.();
            });
            if (containerRef.current && typeof ResizeObserver !== 'undefined') {
              resizeObserverRef.current?.disconnect();
              resizeObserverRef.current = new ResizeObserver(() => {
                editorRef.current?.resizeEditor?.();
              });
              resizeObserverRef.current.observe(containerRef.current);
            }
            onReady?.();
          },
          onDocumentStateChange: (event) => {
            if (cancelled) return;
            const isDirty = Boolean(event?.data);
            if (isDirty) {
              documentDirtyRef.current = true;
              return;
            }
            if (!documentDirtyRef.current) return;
            documentDirtyRef.current = false;
            if (saveNotifyTimerRef.current) {
              clearTimeout(saveNotifyTimerRef.current);
            }
            saveNotifyTimerRef.current = setTimeout(() => {
              onDocumentSaved?.();
            }, 600);
          },
          onError: (event) => {
            if (cancelled) return;
            clearLoadTimeout();
            failWithMessage(resolveFriendlyOnlyOfficeError(event), event);
          },
          onWarning: (event) => {
            if (cancelled) return;
            const code = Number(event?.data?.warningCode || event?.data?.warning || 0);
            if (code === -101 || code === -102) {
              clearLoadTimeout();
              failWithMessage(
                'La configuration ONLYOFFICE (JWT) est invalide. Rechargez la page ou contactez le support.',
                event,
              );
            }
          },
        }, isMobilePresentation, fullViewport);
        editorRef.current = new DocsAPI.DocEditor(containerRef.current.id, editorConfig);
      } catch (error) {
        if (cancelled) return;
        clearLoadTimeout();
        failWithMessage(resolveBootErrorMessage(error), error);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      clearLoadTimeout();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (saveNotifyTimerRef.current) {
        clearTimeout(saveNotifyTimerRef.current);
      }
      if (editorRef.current?.destroyEditor) {
        editorRef.current.destroyEditor();
      }
    };
  }, [config, documentServerUrl, failWithMessage, onReady, onDocumentSaved, bootKey, isMobilePresentation, fullViewport]);

  const editorHeightPx = parseConfigHeightPx(config, isMobilePresentation, fullViewport, expanded);
  const editorHeightStyle = {
    height: `${editorHeightPx}px`,
    minHeight: `${editorHeightPx}px`,
  };

  useEffect(() => {
    window.requestAnimationFrame(() => {
      editorRef.current?.resizeEditor?.();
    });
  }, [expanded, editorHeightPx]);

  const shellClassName = fullViewport || isMobilePresentation
    ? 'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none border-0 bg-white sm:rounded-md sm:border sm:border-border'
    : `relative w-full overflow-hidden rounded-md border border-border bg-white ${className}`;

  return (
    <div className={shellClassName} style={editorHeightStyle}>
      {loading && !errorMessage ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Préparation de l’éditeur…</p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            Connexion au serveur document et ouverture de votre fichier Word.
          </p>
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
          aria-hidden={loading}
          className={`greffio-onlyoffice-host w-full flex-1 ${loading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          style={editorHeightStyle}
        />
      )}
    </div>
  );
};
