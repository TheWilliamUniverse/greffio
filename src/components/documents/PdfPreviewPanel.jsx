import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const isMobilePreview = () => (
  typeof window !== 'undefined'
  && window.matchMedia('(max-width: 767px)').matches
);

export const PdfPreviewPanel = ({
  title = 'Prévisualisation PDF',
  blobUrl = '',
  filename = 'document.pdf',
  emptyMessage = 'Générez l’aperçu pour afficher le document ici.',
  expanded = false,
  className = '',
}) => {
  const [mobile, setMobile] = useState(isMobilePreview);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setMobile(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const openPreview = () => {
    if (!blobUrl && !onOpen) return;
    if (onOpen) {
      onOpen();
      return;
    }
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (mobile) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className={`flex flex-col bg-[#1e293b] ${expanded ? 'min-h-0 flex-1' : 'min-h-[280px] md:min-h-[420px]'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        {blobUrl || onOpen ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 bg-white/10 text-white hover:bg-white/20"
            onClick={openPreview}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir
          </Button>
        ) : null}
      </div>
      {blobUrl || onOpen ? (
        mobile ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="h-12 w-12 text-white/50" />
            <p className="text-sm leading-6 text-white/80">
              Sur mobile, ouvrez le PDF dans un nouvel onglet pour un affichage fiable.
            </p>
            <Button type="button" className="bg-white text-[#0f172a] hover:bg-white/90" onClick={openPreview}>
              <ExternalLink className="h-4 w-4" />
              Ouvrir le PDF
            </Button>
          </div>
        ) : (
          <iframe
            title={title}
            src={blobUrl}
            className={`w-full flex-1 bg-[#334155] ${expanded ? 'min-h-0' : 'min-h-[360px]'}`}
          />
        )
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/70">
          {emptyMessage}
        </div>
      )}
    </section>
  );
};
