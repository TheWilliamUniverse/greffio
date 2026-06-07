import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, FolderKanban, LayoutDashboard, MessageSquareText, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative, shouldUseMobileWebShell } from '@/utils/platform.js';

const HIDE_ON_PREFIXES = [
  '/paiement',
  '/signature/',
];

const ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
  { to: '/questionnaire', icon: Plus, label: 'Nouveau', primary: true },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/team', icon: MessageSquareText, label: 'Messages' },
];

const isActive = (pathname, to) => {
  if (to === '/dashboard') return pathname === '/dashboard';
  return pathname === to || pathname.startsWith(`${to}/`);
};

/**
 * Bottom navigation 5 icônes pour le site web sur mobile/tablette.
 *
 * - cachée sur desktop (md+)
 * - cachée hors zone cockpit
 * - cachée quand on tourne dans l'app native (la shell Capacitor a déjà sa
 *   propre bottom nav).
 *
 * Le padding-bottom des pages cockpit est géré automatiquement via le hook
 * `useWebMobileBottomNavPadding`.
 */
export const WebMobileBottomNav = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  if (isCapacitorNative()) return null;
  if (!currentUser) return null;
  if (!shouldUseMobileWebShell(location.pathname)) return null;
  if (HIDE_ON_PREFIXES.some((prefix) => location.pathname === prefix || location.pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(10,18,32,0.08)] backdrop-blur md:hidden"
      aria-label="Navigation cockpit mobile"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(location.pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'text-[hsl(var(--greffio-blue))]' : 'text-muted-foreground'
                }`}
              >
                {item.primary ? (
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-elevation-sm transition ${
                      active ? 'bg-[hsl(var(--greffio-blue))]' : 'bg-[hsl(var(--greffio-blue))]/90'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.4} />
                  </span>
                ) : (
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                      active ? 'bg-secondary text-[hsl(var(--greffio-blue))]' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.4 : 2} />
                  </span>
                )}
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/**
 * Composant utilitaire à placer en bas des pages cockpit web pour réserver
 * l'espace nécessaire à la bottom navigation mobile (uniquement quand elle
 * est visible).
 */
export const WebMobileBottomNavSpacer = () => (
  <div className="h-20 md:hidden" aria-hidden="true" />
);
