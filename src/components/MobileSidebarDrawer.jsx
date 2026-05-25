import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Building2,
  FileSignature,
  FileText,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isInternalUser } from '@/utils/roles.js';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/team', icon: MessageSquareText, label: 'Messages' },
  { to: '/simulateur', icon: FileSignature, label: 'Nouvelle démarche' },
  { to: '/profil', icon: UserRound, label: 'Mon profil' },
  { to: '/analytics', icon: BarChart3, label: 'Pilotage' },
  { to: '/chat', icon: Bot, label: 'Assistant Greffio' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
  { to: '/contact', icon: HelpCircle, label: 'Aide / support' },
];

/**
 * Drawer mobile/tablette pour le cockpit Greffio.
 *
 * Affiché uniquement sous le breakpoint md (la sidebar `Sidebar.jsx` reste
 * affichée en desktop). On reprend exactement le même style premium que
 * la sidebar afin de conserver l'identité visuelle.
 */
export const MobileSidebarDrawer = ({ open, onClose, className }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const company = currentUser?.company || {};
  const internalView = isInternalUser(currentUser);

  const items = internalView
    ? [...NAV_ITEMS.slice(0, 5), { to: '/interfaces', icon: Building2, label: 'Interfaces' }, ...NAV_ITEMS.slice(5)]
    : NAV_ITEMS;

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Ferme automatiquement quand on navigue
  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', className)} role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        className="absolute inset-0 bg-[#0a1220]/45 backdrop-blur-[2px]"
      />
      <aside className="absolute left-0 top-0 flex h-full w-[88%] max-w-[320px] flex-col bg-white shadow-elevation-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(var(--greffio-blue))] text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{company.name || 'Projet à créer'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {company.legalStructure || 'Dossier'} · {company.siren || 'Espace client'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Espace opérationnel</p>
          <div className="space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[hsl(var(--greffio-blue))] text-white shadow-elevation-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <item.icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t border-border p-4">
          <Link
            to="/questionnaire"
            onClick={onClose}
            className="block rounded-md bg-secondary p-3 text-sm font-semibold text-foreground"
          >
            <div className="mb-1 flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              Équipe Greffio
            </div>
            Démarrer une nouvelle formalité accompagnée.
          </Link>
        </div>
      </aside>
    </div>
  );
};

/**
 * Bouton hamburger qui contrôle le drawer mobile. À placer dans le header
 * d'une page authentifiée (cockpit / dashboard / dossiers / etc.).
 */
export const MobileSidebarTrigger = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Ouvrir le menu de navigation"
    className={cn(
      'inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted md:hidden',
      className,
    )}
  >
    <Menu className="h-5 w-5" />
  </button>
);
