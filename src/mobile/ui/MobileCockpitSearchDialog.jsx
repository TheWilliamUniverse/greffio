import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, FolderKanban, Search, Sparkles, X, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { searchSiteIndex } from '@/config/siteSearchIndex.js';
import { runMobileSearch } from '@/api/mobile.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { getDocumentTypeLabel } from '@/utils/documentStatusLabels.js';

const COCKPIT_DOCUMENT_KEYS = [
  'identity_proof',
  'address_proof',
  'proxy_mandate',
  'legal_notice_certificate',
  'registered_office_proof',
  'ubo_declaration',
  'manager_non_conviction',
  'subscribers_list',
  'formality_powers',
  'regulated_activity_proof',
  'minor_emancipation_order',
  'minor_parental_authorization',
  'signed_statutes',
  'capital_certificate',
];

const resolveSearchPlaceholder = (pathname) => {
  const path = String(pathname || '');
  if (path === '/dossiers' || path.startsWith('/dossier/')) return 'Rechercher un dossier, SIREN…';
  if (path === '/documents' || path.startsWith('/documents/')) return 'Rechercher un document, type de pièce…';
  if (path === '/team') return 'Rechercher un dossier ou un message…';
  if (path === '/dashboard') return 'Rechercher un dossier, document, SIREN…';
  return 'Rechercher un dossier, document, page…';
};

export const MobileCockpitSearchDialog = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [apiPayload, setApiPayload] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const inputRef = useRef(null);
  const { data: dossiers = [] } = useDossiersQuery(currentUser?.id);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setApiPayload(null);
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

  useEffect(() => {
    const q = query.trim();
    if (!open || !isAuthenticated || q.length < 2) {
      setApiPayload(null);
      setApiLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setApiLoading(true);
      try {
        const payload = await runMobileSearch({ query: q });
        if (!cancelled) setApiPayload(payload);
      } catch (_error) {
        if (!cancelled) setApiPayload(null);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, isAuthenticated]);

  const localDossierResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2 || !isAuthenticated) return [];

    return dossiers.filter((item) => {
      const haystack = [
        item.companyName,
        item.denomination,
        item.status,
        item.service,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);
  }, [query, dossiers, isAuthenticated]);

  const documentTypeResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    return COCKPIT_DOCUMENT_KEYS
      .map((docKey) => ({
        id: docKey,
        docKey,
        label: getDocumentTypeLabel(docKey),
        path: '/documents',
      }))
      .filter((item) => item.label.toLowerCase().includes(q) || item.docKey.includes(q))
      .slice(0, 8);
  }, [query]);

  const dossierResults = useMemo(() => {
    if (apiPayload?.results?.length) {
      return apiPayload.results.map((item) => ({
        id: item.id,
        label: item.label,
        hint: item.hint || 'Ouvrir le dossier',
        path: item.path,
      }));
    }
    return localDossierResults.map((item) => ({
      id: item.id,
      label: item.companyName || item.denomination || 'Dossier',
      hint: `${item.service || 'Formalité'} · ${item.status || 'En cours'}`,
      path: `/dossier/${item.id}`,
    }));
  }, [apiPayload, localDossierResults]);

  const quickActions = useMemo(() => {
    if (!isAuthenticated || query.trim().length < 2) return [];
    return (apiPayload?.actions || []).slice(0, 4);
  }, [apiPayload, isAuthenticated, query]);

  const siteResults = useMemo(() => searchSiteIndex(query, 8), [query]);
  const searchPlaceholder = resolveSearchPlaceholder(location.pathname);

  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  const hasCockpitHits = dossierResults.length || documentTypeResults.length || quickActions.length;

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
            placeholder={searchPlaceholder}
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
              {apiLoading ? (
                <p className="mb-3 px-2 text-sm text-muted-foreground">Recherche en cours…</p>
              ) : null}
              {apiPayload?.summary ? (
                <p className="mb-3 rounded-xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {apiPayload.summary}
                </p>
              ) : null}
              {quickActions.length ? (
                <ul className="mb-3 space-y-1">
                  {quickActions.map((action) => (
                    <li key={`${action.path}-${action.label}`}>
                      <button
                        type="button"
                        onClick={() => goTo(action.path)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                      >
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{action.label}</span>
                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {dossierResults.length ? (
                <ul className="mb-3 space-y-1">
                  {dossierResults.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(item.path)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                      >
                        <FolderKanban className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {documentTypeResults.length ? (
                <ul className="mb-3 space-y-1">
                  {documentTypeResults.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(item.path)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">Mes documents</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!hasCockpitHits && !apiLoading ? (
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
                    <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground" />
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
