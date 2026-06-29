import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calculator,
  ChevronDown,
  FileCheck2,
  Landmark,
  Menu,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { SiteSearchDialog } from '@/components/SiteSearchDialog.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { GREFFIO_MARKETING_HOME, GREFFIO_BRAND_HOME_LABEL } from '@/utils/greffioBrandNavigation.js';

const buildMenuColumns = (profileLink) => [
  {
    title: 'Formalités',
    links: [
      { label: 'Catalogue complet', to: '/services' },
      { label: 'Nouvelle formalité', to: '/simulateur' },
      { label: 'Création EI / Micro', to: '/simulateur?formality=ei' },
      { label: 'Création SAS / SASU', to: '/simulateur?formality=sas' },
      { label: 'Modification', to: '/simulateur?type=modification' },
    ],
  },
  {
    title: 'Espace client',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Dossiers', to: '/dossiers' },
      { label: 'Documents', to: '/documents' },
      { label: 'Mon profil', to: profileLink },
      { label: 'Assistant Greffio', to: '/chat' },
    ],
  },
  {
    title: 'Informations',
    links: [
      { label: 'Ressources', to: '/ressources' },
      { label: 'Guide', to: '/guide' },
      { label: 'Tarifs', to: '/tarifs' },
      { label: 'Contact', to: '/contact' },
      { label: 'App mobile', to: '/app' },
    ],
  },
];

const resources = [
  { icon: Calculator, label: 'Simulateur de statut', to: '/ressources' },
  { icon: ShieldCheck, label: 'Checklist conformité', to: '/ressources' },
  { icon: Landmark, label: 'Compte pro et dépôt de capital', to: '/ressources' },
];

export const NavbarDropdown = () => {
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const profileLink = isAuthenticated ? '/profil' : '/login';
  const menuColumns = buildMenuColumns(profileLink);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#c5d2e6] bg-white shadow-[0_1px_0_rgba(10,18,32,0.1),0_8px_24px_rgba(10,18,32,0.08)]">
      <div className="mx-auto flex min-h-[84px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to={GREFFIO_MARKETING_HOME} className="flex items-center" aria-label={GREFFIO_BRAND_HOME_LABEL}>
          <GreffioLogo variant="full" />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setIsServicesOpen(true)}
            onMouseLeave={() => setIsServicesOpen(false)}
          >
            <Link to="/services" className="flex items-center gap-1 text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">
              Services
              <ChevronDown className={`h-4 w-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
            </Link>

            <AnimatePresence>
              {isServicesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-1/2 top-full mt-5 w-[820px] -translate-x-1/2 rounded-md border border-border bg-white p-6 shadow-elevation-lg"
                >
                  <div className="grid grid-cols-[1fr_1fr_1fr_260px] gap-6">
                    {menuColumns.map((column) => (
                      <div key={column.title}>
                        <p className="mb-3 text-sm font-bold text-foreground">{column.title}</p>
                        <div className="space-y-2">
                          {column.links.map((item) => (
                            <Link
                              key={item.label}
                              to={item.to}
                              className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-4 text-white">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-white/12">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold">Espace entrepreneur complet</p>
                      <p className="mt-2 text-sm text-white/78">Dossiers, documents, signature, échéances et assistant propulsé par ChatGPT dans un seul cockpit.</p>
                      <Button asChild variant="secondary" size="sm" className="mt-5 w-full justify-between">
                        <Link to="/simulateur">
                          Démarrer
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5">
                    {resources.map((item) => (
                      <Link key={item.label} to={item.to} className="flex items-center gap-3 rounded-md bg-muted px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                        <item.icon className="h-4 w-4 text-primary" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a href="#platform" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">Plateforme</a>
          <Link to="/tarifs" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">Tarifs</Link>
          <Link to="/ressources" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">Ressources</Link>
          <Link to="/guide" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">Guide</Link>
          <Link to="/contact" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">Contact</Link>
          <Link to="/app" className="text-sm font-semibold text-[#0a1220] transition-colors hover:text-primary">App</Link>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <Button variant="outline" size="sm" asChild className="bg-white">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" asChild className="bg-white">
              <Link to="/login" aria-label="Connexion">
                <User className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant="outline" size="icon" className="bg-white" aria-label="Recherche" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
          {isAuthenticated ? (
            <Button asChild className="gap-2 bg-[#0f1f3d] hover:bg-[#0f1f3d]/92">
              <Link to="/simulateur">
                Nouvelle démarche
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2 bg-[#0f1f3d] hover:bg-[#0f1f3d]/92">
              <Link to="/signup">
                Créer mon espace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Recherche sur le site"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted"
          >
            <Search className="h-4 w-4" />
          </button>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden h-9 items-center gap-1 rounded-md border border-border bg-white px-3 text-xs font-semibold text-[#0a1220] transition hover:bg-muted sm:inline-flex"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              aria-label="Connexion"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted"
            >
              <User className="h-4 w-4" />
            </Link>
          )}
          {!isAuthenticated ? (
            <Link
              to="/signup"
              className="hidden h-9 items-center gap-1 rounded-md bg-[#0f1f3d] px-3 text-xs font-semibold text-white transition hover:bg-[#0f1f3d]/92 sm:inline-flex"
            >
              Créer mon espace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          <button
            onClick={() => setIsMobileOpen((value) => !value)}
            aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-white lg:hidden"
          >
            <div className="space-y-4 px-4 py-5">
              {menuColumns.flatMap((column) => column.links).map((item) => (
                <Link key={item.label} to={item.to} className="flex items-center justify-between rounded-md bg-muted px-3 py-3 text-sm font-semibold text-foreground">
                  {item.label}
                  <FileCheck2 className="h-4 w-4 text-primary" />
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" asChild className="bg-white">
                  <Link to="/login" onClick={() => setIsMobileOpen(false)}>
                    <User className="h-4 w-4" />
                    Connexion
                  </Link>
                </Button>
                <Button asChild className="bg-[#0f1f3d] hover:bg-[#0f1f3d]/92">
                  <Link to="/signup" onClick={() => setIsMobileOpen(false)}>
                    Créer mon espace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
};
