import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, ReceiptText, WalletCards } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ResourceHero } from '@/components/resources/ResourceHero.jsx';
import { ResourceQuickAccess } from '@/components/resources/ResourceQuickAccess.jsx';
import { ResourceSectionGrid } from '@/components/resources/ResourceSectionGrid.jsx';
import { ResourceEstimatorsSection } from '@/components/resources/ResourceEstimatorsSection.jsx';
import { ServiceOrderDrawer } from '@/components/resources/ServiceOrderDrawer.jsx';
import { getGuideById } from '@/config/resourceGuides.js';
import {
  CERTIFIED_COPIES,
  FREE_RESOURCE_HIGHLIGHTS,
  getCatalogItemById,
  GUIDES,
  OFFICIAL_DOCUMENTS,
  PACKS,
  QUICK_TOOLS,
  sortFreeFirst,
} from '@/config/resourceServices.js';
import { searchResources } from '@/utils/resourceSearch.js';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { SeoHead } from '@/components/seo/SeoHead.jsx';
import { SEO_PAGE_META } from '@/config/seoContent.js';

const transversal = [
  { title: 'Dépôt de capital', text: 'Préparation du dossier bancaire et suivi de l’attestation.', icon: Banknote },
  { title: 'Compte pro', text: 'Orientation vers compte professionnel selon profil, forme et calendrier.', icon: WalletCards },
  { title: 'Logiciel de facturation', text: 'Préparation factures, devis, numérotation et conformité TVA.', icon: ReceiptText },
];

const GUIDES_HELP = GUIDES.slice(0, 6);
const GUIDES_USEFUL = GUIDES.slice(6);

export const ResourcesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [userDossiers, setUserDossiers] = useState([]);
  const [orderService, setOrderService] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      try {
        const payload = await listDossiers();
        if (!cancelled) setUserDossiers(payload?.dossiers || payload || []);
      } catch (_error) {
        if (!cancelled) setUserDossiers([]);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const searchResults = useMemo(
    () => searchResources(query, { userDossiers }),
    [query, userDossiers],
  );

  const handleSearch = useCallback(() => {
    /* résultats dérivés via useMemo */
  }, []);

  const openService = useCallback((item) => {
    const catalogItem = item?.id ? getCatalogItemById(item.id) || item : item;
    setOrderService(catalogItem);
    setDrawerOpen(true);
  }, []);

  const handleResourceAction = useCallback((item) => {
    if (item.kind === 'guide') {
      const match = getGuideById(item.id);
      if (match) {
        navigate(`/ressources/guides/${match[1].slug}`);
        return;
      }
    }
    if (item.kind === 'tool') {
      if (item.toolRoute?.startsWith('/')) {
        navigate(item.toolRoute);
        return;
      }
      if (item.toolRoute === 'siren' || item.toolRoute === 'search') {
        setQuery(item.toolRoute === 'siren' ? 'SIREN' : 'recherche entreprise');
        document.getElementById('outils-rapides')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    if (item.kind === 'dossier' && item.dossierId) {
      navigate(`/dossiers/${item.dossierId}`);
      return;
    }
    if (item.legacyLink) {
      navigate(item.legacyLink);
      return;
    }
    openService(item);
  }, [navigate, openService]);

  const handleSelectResult = useCallback((result) => {
    setQuery(result.title);
    handleResourceAction(result.item || result);
  }, [handleResourceAction]);

  const handleQuickAccess = useCallback((entry) => {
    if (entry.serviceId) {
      const service = getCatalogItemById(entry.serviceId);
      if (service) openService(service);
      return;
    }
    if (entry.guideId) {
      const guide = getCatalogItemById(entry.guideId);
      if (guide) handleResourceAction(guide);
      return;
    }
    if (entry.toolId) {
      const tool = getCatalogItemById(entry.toolId);
      if (tool) handleResourceAction(tool);
    }
  }, [handleResourceAction, openService]);

  return (
    <>
      <SeoHead
        title={SEO_PAGE_META.ressources.title}
        description={SEO_PAGE_META.ressources.description}
        path={SEO_PAGE_META.ressources.path}
        jsonLdId="ressources"
      />
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button asChild>
            <Link to="/simulateur">
              Démarrer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ResourceHero
          query={query}
          onQueryChange={setQuery}
          onSearch={handleSearch}
          searchResults={searchResults}
          onSelectResult={handleSelectResult}
          onSelectSuggestion={setQuery}
          isAuthenticated={isAuthenticated}
        />

        <ResourceQuickAccess
          onQuickAccess={handleQuickAccess}
          isAuthenticated={isAuthenticated}
        />

        <ResourceSectionGrid
          id="gratuit"
          title="Gratuit pour démarrer"
          subtitle="Guides, outils et vérifications accessibles sans frais – commencez ici."
          items={FREE_RESOURCE_HIGHLIGHTS}
          onAction={handleResourceAction}
          columns="md:grid-cols-2 xl:grid-cols-4"
          highlight
        />

        <ResourceSectionGrid
          id="documents-officiels"
          title="Documents officiels"
          subtitle="Extraits et attestations pour sécuriser vos démarches, sans quitter Greffio."
          items={sortFreeFirst(OFFICIAL_DOCUMENTS)}
          onAction={handleResourceAction}
        />

        <ResourceSectionGrid
          id="copies-actes"
          title="Copies et actes"
          subtitle="Reproductions certifiées et pièces déposées au registre."
          items={sortFreeFirst(CERTIFIED_COPIES)}
          onAction={handleResourceAction}
        />

        <ResourceSectionGrid
          id="packs-greffio"
          title="Packs Greffio"
          subtitle="Ensembles documentaires premium pour vos formalités récurrentes."
          items={sortFreeFirst(PACKS)}
          onAction={handleResourceAction}
          columns="md:grid-cols-2 xl:grid-cols-3"
        />

        <ResourceSectionGrid
          id="guides-aide"
          title="Guides et aide"
          subtitle="Comprendre les documents officiels et préparer vos dépôts."
          items={GUIDES_HELP}
          onAction={handleResourceAction}
        />

        <div className="mt-14">
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight">Ressources utiles</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Parcours thématiques pour chaque formalité courante.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES_USEFUL.map((guide) => (
              <button
                key={guide.id}
                id={`guide-${guide.id}`}
                type="button"
                onClick={() => handleResourceAction(guide)}
                className="rounded-xl border border-border bg-white p-4 text-left shadow-elevation-sm transition hover:border-primary/30 hover:shadow-elevation-md"
              >
                <span className="text-sm font-bold text-primary">Guide</span>
                <h3 className="mt-1 font-extrabold">{guide.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{guide.description}</p>
              </button>
            ))}
          </div>
        </div>

        <ResourceSectionGrid
          id="outils-rapides"
          title="Outils rapides"
          subtitle="Vérifications et préparation avant de lancer une formalité."
          items={QUICK_TOOLS.filter((t) => !t.requiresAuth || isAuthenticated)}
          onAction={handleResourceAction}
          columns="md:grid-cols-2 lg:grid-cols-3"
        />

        <ResourceEstimatorsSection />

        <section className="mt-14 rounded-xl border border-border bg-white p-6 shadow-elevation-sm">
          <p className="text-sm font-bold uppercase text-primary">Services transversaux</p>
          <h2 className="mt-2 text-2xl font-extrabold">Activer les briques utiles autour du dossier</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {transversal.map((item) => (
              <div key={item.title} className="rounded-xl bg-muted p-5">
                <item.icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/contact">Demander l’activation</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <ServiceOrderDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={orderService}
      />
    </div>
    </>
  );
};
