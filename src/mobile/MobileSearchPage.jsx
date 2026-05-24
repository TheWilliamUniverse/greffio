import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { runMobileSearch } from '@/api/mobile.js';

const exampleQueries = [
  'Où en est mon dossier ?',
  'Quels documents manquent ?',
  'Créer une SASU',
  'Voir mes formalités en attente',
];

export const MobileSearchPage = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runSearch = async (forcedQuery) => {
    const q = String(forcedQuery ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = await runMobileSearch({ query: q });
      setResult(payload);
    } catch (_error) {
      setError('Recherche indisponible pour le moment. Utilisez l’assistant chat ou vos dossiers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 px-4 py-5">
      <section>
        <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Assistant Greffio</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">Recherche intelligente</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Posez une question naturelle. Greffio cherche dans vos dossiers et propose des actions directes.
        </p>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void runSearch();
          }}
          placeholder="Ex. : où en est ma création de SAS ?"
          className="h-12 rounded-2xl bg-white pl-9"
        />
      </div>

      <Button className="w-full rounded-2xl" disabled={loading || !query.trim()} onClick={() => void runSearch()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Rechercher
      </Button>

      <div className="flex flex-wrap gap-2">
        {exampleQueries.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setQuery(item);
              void runSearch(item);
            }}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            {item}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>
      ) : null}

      {result ? (
        <section className="space-y-3 rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
          {result.summary ? (
            <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {(result.actions || []).map((action) => (
              <Button key={action.path} asChild size="sm" variant="outline" className="bg-white">
                <Link to={action.path}>
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ))}
          </div>
          {(result.results || []).map((item) => (
            <div key={item.id || item.label} className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="font-semibold">{item.label}</p>
              {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <Button asChild variant="outline" className="w-full bg-white">
        <Link to="/chat">Ouvrir l’assistant conversationnel</Link>
      </Button>
    </div>
  );
};
