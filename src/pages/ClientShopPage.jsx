import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar.jsx';
import { MobileSidebarDrawer, MobileSidebarTrigger } from '@/components/MobileSidebarDrawer.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ResourcesSearchBar } from '@/components/resources/ResourcesSearchBar.jsx';
import { ResourceSectionGrid } from '@/components/resources/ResourceSectionGrid.jsx';
import { ServiceOrderDrawer } from '@/components/resources/ServiceOrderDrawer.jsx';
import { ShopCartButton } from '@/components/boutique/ShopCartButton.jsx';
import { ShopCartDrawer } from '@/components/boutique/ShopCartDrawer.jsx';
import { useShopCart } from '@/hooks/useShopCart.js';
import { getGuideById } from '@/config/resourceGuides.js';
import {
  CERTIFIED_COPIES,
  getCatalogItemById,
  isResourceOrderable,
  OFFICIAL_DOCUMENTS,
  PACKS,
  QUICK_TOOLS,
  sortFreeFirst,
} from '@/config/resourceServices.js';
import { searchResources } from '@/utils/resourceSearch.js';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';

/** Boutique de documents du cockpit client – catalogue payant des Ressources, dans le dashboard. */
export const ClientShopPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [userDossiers, setUserDossiers] = useState([]);
  const [orderService, setOrderService] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const {
    items: cartItems,
    itemCount,
    totalTtc,
    addItem,
    setQuantity,
    removeLine,
    clearCart,
    updateLineMeta,
  } = useShopCart();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
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

  const openService = useCallback((item) => {
    const catalogItem = item?.id ? getCatalogItemById(item.id) || item : item;
    setOrderService(catalogItem);
    setDrawerOpen(true);
  }, []);

  const handleAddToCart = useCallback((item) => {
    const catalogItem = item?.id ? getCatalogItemById(item.id) || item : item;
    if (!isResourceOrderable(catalogItem) || !catalogItem.priceTtc || Number(catalogItem.priceTtc) <= 0) {
      openService(catalogItem);
      return;
    }
    const added = addItem(catalogItem.id);
    if (added) {
      toast.success(`${catalogItem.title} ajouté au panier.`);
      setCartOpen(true);
    }
  }, [addItem, openService]);

  const handleResourceAction = useCallback((item) => {
    if (item.kind === 'guide') {
      const match = getGuideById(item.id);
      if (match) {
        navigate(`/ressources/guides/${match[1].slug}`);
        return;
      }
    }
    if (item.kind === 'tool' && item.toolRoute?.startsWith('/')) {
      navigate(item.toolRoute);
      return;
    }
    if (item.kind === 'dossier' && item.dossierId) {
      navigate(`/dossiers/${item.dossierId}`);
      return;
    }
    if (item.legacyLink) {
      navigate(item.legacyLink);
      return;
    }
    handleAddToCart(item);
  }, [navigate, handleAddToCart]);

  const handleSelectResult = useCallback((result) => {
    setQuery(result.title);
    handleResourceAction(result.item || result);
  }, [handleResourceAction]);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] bg-background">
      <Sidebar />
      <MobileSidebarDrawer open={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <main className="min-h-0 flex-1 overflow-y-auto p-5 pb-8 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center justify-between gap-3 md:hidden">
            <MobileSidebarTrigger onClick={() => setIsMobileNavOpen(true)} />
            <p className="truncate text-sm font-semibold text-muted-foreground">Boutique Greffio</p>
            <ShopCartButton itemCount={itemCount} onClick={() => setCartOpen(true)} className="h-9 px-3" />
          </div>

          <section className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                  <ShoppingBag className="h-4 w-4" />
                  Boutique
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
                  Documents officiels et packs
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ajoutez vos documents au panier, finalisez la commande et suivez le statut dans Mes commandes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ShopCartButton itemCount={itemCount} onClick={() => setCartOpen(true)} className="hidden md:inline-flex" />
                <Button asChild variant="outline" className="bg-white">
                  <Link to="/boutique/commandes">
                    <Package className="h-4 w-4" />
                    Mes commandes
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white">
                  <Link to="/ressources">
                    Guides gratuits
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-5">
              <ResourcesSearchBar
                query={query}
                onQueryChange={setQuery}
                onSearch={() => { /* résultats dérivés via useMemo */ }}
                searchResults={searchResults}
                onSelectResult={handleSelectResult}
                onSelectSuggestion={setQuery}
              />
            </div>
          </section>

          <ResourceSectionGrid
            id="boutique-outils-gratuits"
            title="Outils gratuits"
            subtitle="Complétez vos formulaires et préparez vos pièces sans frais supplémentaires."
            items={sortFreeFirst(QUICK_TOOLS.filter((tool) => tool.id === 'tool-pdf-completion'))}
            onAction={handleResourceAction}
            columns="md:grid-cols-1 lg:grid-cols-2"
            highlight
          />

          <ResourceSectionGrid
            id="boutique-documents-officiels"
            title="Documents officiels"
            subtitle="Extraits et attestations pour sécuriser vos démarches."
            items={sortFreeFirst(OFFICIAL_DOCUMENTS)}
            onAction={handleResourceAction}
            shopMode
            onQuickOrder={openService}
          />

          <ResourceSectionGrid
            id="boutique-copies-actes"
            title="Copies et actes"
            subtitle="Reproductions certifiées et pièces déposées au registre."
            items={sortFreeFirst(CERTIFIED_COPIES)}
            onAction={handleResourceAction}
            shopMode
            onQuickOrder={openService}
          />

          <ResourceSectionGrid
            id="boutique-packs"
            title="Packs Greffio"
            subtitle="Ensembles documentaires premium pour vos formalités récurrentes."
            items={sortFreeFirst(PACKS)}
            onAction={handleResourceAction}
            columns="md:grid-cols-2 xl:grid-cols-3"
            shopMode
            onQuickOrder={openService}
          />

          <section className="mt-14 rounded-xl border border-border bg-secondary/50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
                  Besoin d’un document introuvable ici ?
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  L’équipe Greffio peut obtenir la plupart des pièces auprès du greffe compétent. Décrivez votre besoin,
                  nous revenons vers vous avec un délai et un tarif.
                </p>
              </div>
              <Button asChild>
                <Link to="/contact">
                  Contacter l’équipe
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <ServiceOrderDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={orderService}
      />
      <ShopCartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartItems}
        totalTtc={totalTtc}
        setQuantity={setQuantity}
        removeLine={removeLine}
        clearCart={clearCart}
        updateLineMeta={updateLineMeta}
      />
    </div>
  );
};
