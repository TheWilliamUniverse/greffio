import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, FolderKanban, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { loadDossiersSnapshot, cacheDossiersSnapshot } from '@/utils/mobileOffline.js';
import { MobileDocumentScanner } from '@/mobile/MobileDocumentScanner.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { Button } from '@/components/ui/button.jsx';

export const MobileHomePage = () => {
  const { currentUser } = useAuth();
  const [dossiers, setDossiers] = useState([]);
  const [cachedAt, setCachedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setError('');
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
        if (!cached?.dossiers?.length) {
          setError('Impossible de charger vos dossiers pour le moment.');
        }
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
  const actionLabel = useMemo(() => {
    if (!primaryDossier) return 'Commencez une simulation pour créer votre première démarche.';
    if (/document|pièce|piece/i.test(String(primaryDossier.status || ''))) {
      return 'Ajoutez les documents demandés pour continuer.';
    }
    return `Progression ${progress}% — ${primaryDossier.status || 'En cours'}`;
  }, [primaryDossier, progress]);

  if (loading) return <MobilePageSkeleton />;

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="space-y-1">
        <p className="text-sm text-muted-foreground">Bonjour {currentUser?.firstName || 'Bienvenue'}</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
          Voici l’état de vos démarches.
        </h1>
      </section>

      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-secondary/30 to-white p-5 shadow-[0_8px_30px_rgba(15,39,80,0.08)]">
        <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Action requise</p>
        <h2 className="mt-1 text-lg font-extrabold text-foreground">
          {primaryDossier?.companyName || 'Aucun dossier actif'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{actionLabel}</p>
        <Button asChild className="mt-4 h-11 w-full text-base">
          <Link to={primaryDossier ? `/dossier/${primaryDossier.id}` : '/simulateur'}>
            {primaryDossier ? 'Continuer mon dossier' : 'Commencer'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {cachedAt ? (
          <p className="mt-3 text-xs text-amber-700">Données hors ligne — dernière sync {new Date(cachedAt).toLocaleString('fr-FR')}</p>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {[
          { to: '/dossiers', icon: FolderKanban, label: 'Dossiers', hint: 'Suivi formalités' },
          { to: '/documents', icon: FileText, label: 'Documents', hint: 'Pièces & PDF' },
          { to: '/mobile/search', icon: MessageSquareText, label: 'Assistant', hint: 'Aide rapide' },
          { to: '/mobile/account', icon: ArrowRight, label: 'Compte', hint: 'Profil & réglages' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="min-h-[108px] rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition active:scale-[0.98]"
          >
            <item.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-bold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </Link>
        ))}
      </section>

      {primaryDossier ? (
        <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-extrabold">Envoi mobile</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Photographiez une pièce — conversion PDF optimisée avant envoi.
          </p>
          <div className="mt-4">
            <MobileDocumentScanner dossierId={primaryDossier.id} docKey="identity_proof" label="Scanner & envoyer" />
          </div>
        </section>
      ) : null}
    </div>
  );
};
