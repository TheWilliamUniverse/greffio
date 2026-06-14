import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const resolveContainerWidth = (container) => {
  if (!container) return 0;
  const direct = container.clientWidth;
  if (direct > 0) return direct;
  const parent = container.parentElement?.clientWidth || 0;
  if (parent > 0) return parent - 24;
  if (typeof window !== 'undefined') return Math.max(window.innerWidth - 32, 280);
  return 280;
};

const resolveRenderScale = (page, containerWidth) => {
  const width = Math.max(containerWidth || 0, 280);
  const baseViewport = page.getViewport({ scale: 1 });
  const cssScale = width / baseViewport.width;
  const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const pixelRatio = isMobile
    ? Math.min(Math.max(deviceRatio * 1.35, 3), 4.5)
    : Math.min(Math.max(deviceRatio * 1.15, 2.5), 4);
  const viewport = page.getViewport({ scale: cssScale });
  return { viewport, pixelRatio };
};

export const PdfJsCanvasViewer = ({
  blob = null,
  arrayBuffer = null,
  blobUrl = '',
  className = '',
}) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      setLayoutTick((tick) => tick + 1);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
        if (!data && blob instanceof Blob) {
          data = await blob.arrayBuffer();
        }
        if (!data && blobUrl) {
          const response = await fetch(blobUrl);
          data = await response.arrayBuffer();
        }
        if (!data || data.byteLength === 0) {
          throw new Error('PDF_EMPTY');
        }

        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        if (cancelled) return;

        const pdfData = data.slice(0);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        if (cancelled) return;

        const containerWidth = resolveContainerWidth(container);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const { viewport, pixelRatio } = resolveRenderScale(page, containerWidth);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });
          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'mx-auto mb-3 block max-w-full rounded-lg bg-white shadow-sm';
          container.appendChild(canvas);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          await page.render({
            canvasContext: context,
            viewport,
            intent: 'display',
          }).promise;
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
  }, [arrayBuffer, blob, blobUrl, layoutTick]);

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
