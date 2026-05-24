import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { formatResourcePrice, POPULAR_SEARCHES } from '@/config/resourceServices.js';
import { cn } from '@/lib/utils';

export const ResourcesSearchBar = ({
  query,
  onQueryChange,
  onSearch,
  searchResults,
  onSelectResult,
  onSelectSuggestion,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      onSearch?.(query);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [query, onSearch]);

  const hasResults = searchResults?.total > 0;
  const showEmpty = query.trim().length >= 2 && !hasResults;

  return (
    <div ref={containerRef} className="relative max-w-2xl">
      <label htmlFor="resources-search" className="sr-only">
        Rechercher un document, une formalité ou une ressource
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="resources-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Rechercher un document, une formalité ou une ressource…"
          className="h-12 w-full rounded-xl border border-border bg-white pl-12 pr-4 text-sm shadow-elevation-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
        />
      </div>

      {!query && (
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSelectSuggestion?.(suggestion)}
              className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {open && (hasResults || showEmpty) && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white shadow-elevation-lg">
          {showEmpty && (
            <div className="p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Aucun résultat exact.</p>
              <p className="mt-1">
                Essayez : Kbis, statuts, certificat, modification, dirigeant.
              </p>
            </div>
          )}
          {hasResults && searchResults.groups.map((group) => (
            <div key={group.kind} className="border-t border-border first:border-t-0">
              <p className="bg-muted/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul>
                {group.items.slice(0, 6).map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/60',
                      )}
                      onClick={() => {
                        onSelectResult?.(result);
                        setOpen(false);
                      }}
                    >
                      <span>
                        <span className="font-semibold text-foreground">{result.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">
                          {result.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {result.priceTtc > 0 ? formatResourcePrice(result.priceTtc) : result.kindLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
