import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FolderKanban, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';

export const OpsSearchDialog = ({ open, onClose, dossiers = [] }) => {
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return dossiers
      .filter((item) => {
        const haystack = [
          item.companyName,
          item.reference,
          item.id,
          item.legalForm,
          item.status,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [dossiers, query]);

  if (!open) return null;

  const goTo = (dossierId) => {
    onClose();
    navigate(`/ops/dossiers/${dossierId}`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dossiers ops"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un dossier, une société, une référence…"
            className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-sm text-slate-500">
              Saisissez au moins 2 caractères. Raccourci : Ctrl+K ou ⌘K.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-sm text-slate-500">Aucun dossier pour « {query} ».</p>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.id)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {item.companyName || 'Sans dénomination'}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {item.reference || item.id} · {item.legalForm || '–'} · {item.status}
                      </span>
                    </span>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
