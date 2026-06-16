import React, { useEffect, useRef, useState } from 'react';

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

export const OnlyOfficeEditor = ({
  documentServerUrl,
  config,
  onError,
  className = '',
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
        editorRef.current = new DocsAPI.DocEditor(containerRef.current.id, config);
        if (!cancelled) setLoading(false);
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
  }, [config, documentServerUrl, onError]);

  return (
    <div className={`relative min-h-[70vh] w-full overflow-hidden rounded-md border border-border bg-white ${className}`}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-muted-foreground">
          Chargement de l’éditeur…
        </div>
      ) : null}
      {errorMessage ? (
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {errorMessage}
        </div>
      ) : (
        <div id="onlyoffice-editor-container" ref={containerRef} className="h-[75vh] w-full" />
      )}
    </div>
  );
};
