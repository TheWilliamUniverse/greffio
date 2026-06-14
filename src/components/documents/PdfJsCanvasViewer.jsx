import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const PdfJsCanvasViewer = ({
  arrayBuffer = null,
  blobUrl = '',
  className = '',
}) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return undefined;

    const render = async () => {
      setLoading(true);
      setError('');
      container.innerHTML = '';

      try {
        let data = arrayBuffer;
        if (!data && blobUrl) {
          const response = await fetch(blobUrl);
          data = await response.arrayBuffer();
        }
        if (!data || data.byteLength === 0) {
          throw new Error('PDF_EMPTY');
        }

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        const scale = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? 1.35 : 1.15;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'mx-auto mb-3 block max-w-full rounded-lg bg-white shadow-sm';
          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (renderError) {
        if (!cancelled) {
          setError('Impossible de rendre ce PDF dans l’application.');
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[PdfJsCanvasViewer]', renderError);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void render();

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [arrayBuffer, blobUrl]);

  if (error) {
    return (
      <div className={`flex flex-1 items-center justify-center px-6 text-center text-sm text-red-200 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 ${className}`}>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/80">
          <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden="true" />
        </div>
      ) : null}
      <div ref={containerRef} className="mx-auto w-full max-w-3xl" />
    </div>
  );
};
