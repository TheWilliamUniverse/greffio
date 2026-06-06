import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Search, X } from 'lucide-react';
import { searchSiteIndex } from '@/config/siteSearchIndex.js';
import { Input } from '@/components/ui/input.jsx';

export const SiteSearchDialog = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

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

  const results = useMemo(() => searchSiteIndex(query), [query]);

  if (!open) return null;

  const goTo = (to) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche sur le site"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une page, un service, une formalité…"
            className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fermer la recherche"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              Saisissez au moins 2 caractères pour rechercher dans Greffio (tarifs, dossiers, statuts, services…).
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={`${item.to}-${item.title}`}>
                  <button
                    type="button"
                    onClick={() => goTo(item.to)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-muted/60"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.description}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Astuce : recherchez « statuts », « tarifs », « sas », « documents » ou « contact ».
          {' '}
          <Link to="/ressources" className="font-semibold text-primary hover:underline" onClick={onClose}>
            Voir toutes les ressources
          </Link>
        </div>
      </div>
    </div>
  );
};
