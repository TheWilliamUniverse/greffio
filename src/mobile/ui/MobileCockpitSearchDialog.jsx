import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, FolderKanban, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { searchSiteIndex } from '@/config/siteSearchIndex.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';

export const MobileCockpitSearchDialog = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const { data: dossiers = [] } = useDossiersQuery(currentUser?.id);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  const cockpitResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2 || !isAuthenticated) return { dossiers: [], documents: [] };

    const matchedDossiers = dossiers.filter((item) => {
      const haystack = [
        item.companyName,
        item.denomination,
        item.status,
        item.service,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);

    const documentHits = [];
    dossiers.forEach((dossier) => {
      const docs = Array.isArray(dossier.documents) ? dossier.documents : [];
      docs.forEach((doc) => {
        const label = getDocumentTypeLabel(doc.docKey, doc.label);
        if (label.toLowerCase().includes(q) || String(doc.docKey || '').includes(q)) {
          documentHits.push({
            id: `${dossier.id}-${doc.docKey}`,
            dossierId: dossier.id,
            dossierName: dossier.companyName || dossier.denomination || 'Dossier',
            label,
          });
        }
      });
    });

    return { dossiers: matchedDossiers, documents: documentHits.slice(0, 8) };
  }, [query, dossiers, isAuthenticated]);

  const siteResults = useMemo(() => searchSiteIndex(query, 8), [query]);

  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 p-3 pt-[calc(5.5rem+env(safe-area-inset-top))]" onClick={onClose}>
      <div
        className="flex max-h-[min(78vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche Greffio"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Dossiers, documents, pages…"
            className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isAuthenticated && query.trim().length >= 2 ? (
            <>
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Votre cockpit</p>
              {cockpitResults.dossiers.length ? (
                <ul className="mb-3 space-y-1">
                  {cockpitResults.dossiers.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(`/dossier/${item.id}`)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                      >
                        <FolderKanban className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.companyName || item.denomination || 'Dossier'}</span>
                          <span className="block text-xs text-muted-foreground">Ouvrir le dossier</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {cockpitResults.documents.length ? (
                <ul className="mb-3 space-y-1">
                  {cockpitResults.documents.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo('/documents')}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.dossierName}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!cockpitResults.dossiers.length && !cockpitResults.documents.length ? (
                <p className="mb-3 px-2 text-sm text-muted-foreground">Aucun dossier ou document correspondant.</p>
              ) : null}
            </>
          ) : null}

          <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Site Greffio</p>
          {siteResults.length ? (
            <ul className="space-y-1">
              {siteResults.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted"
                  >
                    <Search className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              {query.trim().length < 2 ? 'Saisissez au moins 2 caractères.' : 'Aucune page trouvée.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
