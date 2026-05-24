import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, FileText, FolderKanban, MessageSquareText, Search, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { loadDossiersSnapshot, cacheDossiersSnapshot } from '@/utils/mobileOffline.js';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';

export const MobileHomePage = () => {
  const { currentUser } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [cachedAt, setCachedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await listDossiers();
        const items = Array.isArray(payload?.dossiers) ? payload.dossiers : [];
        if (!mounted) return;
        setDossiers(items);
        setCachedAt(null);
        if (currentUser?.id) {
          await cacheDossiersSnapshot({ userId: currentUser.id, dossiers: items });
        }
      } catch (_error) {
        if (!mounted) return;
        const cached = currentUser?.id ? await loadDossiersSnapshot(currentUser.id) : null;
        setDossiers(cached?.dossiers || []);
        setCachedAt(cached?.cachedAt || null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  const primaryDossier = dossiers[0];
  const progress = Number(primaryDossier?.progressPercent || 0);
  const quickResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return dossiers.filter((item) => [
      item.companyName,
      item.service,
      item.status,
      item.legalForm,
    ].some((part) => String(part || '').toLowerCase().includes(q))).slice(0, 4);
  }, [dossiers, query]);

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">Bonjour {currentUser?.firstName || 'Bienvenue'}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
          Votre espace mobile Greffio
        </h1>
        <p className="text-sm text-muted-foreground">
          Conçu pour agir vite : dossier, documents PDF, assistant et notifications en un geste.
        </p>
      </section>

      <section className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un dossier, un document, une action…"
          className="h-12 rounded-2xl border-border/80 bg-white pl-9 shadow-sm"
        />
        {quickResults.length ? (
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            {quickResults.map((item) => (
              <li key={item.id}>
                <Link to={`/dossier/${item.id}`} className="block px-4 py-3 text-sm hover:bg-muted/40">
                  <span className="font-semibold">{item.companyName || 'Dossier'}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.service || item.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-secondary/30 to-white p-5 shadow-[0_8px_30px_rgba(15,39,80,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Prochaine étape</p>
            <h2 className="mt-1 text-lg font-extrabold text-foreground">
              {primaryDossier?.companyName || 'Aucun dossier actif'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {primaryDossier
                ? `Progression ${progress}% — ${primaryDossier.status || 'En cours'}`
                : 'Lancez une formalité pour démarrer votre parcours mobile.'}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{progress}%</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={primaryDossier ? `/dossier/${primaryDossier.id}` : '/questionnaire'}>
              {primaryDossier ? 'Voir le dossier' : 'Nouvelle démarche'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="bg-white">
            <Link to="/mobile/search">
              <Sparkles className="h-4 w-4" />
              Assistant
            </Link>
          </Button>
        </div>
        {cachedAt ? (
          <p className="mt-3 text-xs text-amber-700">Données hors ligne — dernière sync {new Date(cachedAt).toLocaleString('fr-FR')}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { to: '/dossiers', icon: FolderKanban, label: 'Mes dossiers', hint: 'Suivi formalités' },
          { to: '/documents', icon: FileText, label: 'Documents', hint: 'PDF & pièces' },
          { to: '/team', icon: MessageSquareText, label: 'Équipe', hint: 'Messages Greffio' },
          { to: '/mobile/search', icon: Search, label: 'Assistant', hint: 'Recherche IA' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition active:scale-[0.98]"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-bold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-extrabold">Envoi mobile innovant</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Photographiez une pièce — Greffio la convertit automatiquement en PDF optimisé avant envoi au greffe.
        </p>
        <div className="mt-4">
          <MobileDocumentScanner dossierId={primaryDossier?.id} docKey="identity_proof" label="Scanner & envoyer un PDF" />
        </div>
      </section>

      {!loading && !dossiers.length ? (
        <p className="rounded-xl border border-dashed border-border bg-white p-4 text-center text-sm text-muted-foreground">
          Aucun dossier pour le moment. Créez votre première formalité depuis l’assistant ou le questionnaire.
        </p>
      ) : null}
    </div>
  );
};
