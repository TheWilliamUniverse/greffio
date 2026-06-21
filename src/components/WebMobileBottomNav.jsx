import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { MOBILE_AUTH_TABS_WEB } from '@/config/mobileNavigation.js';
import { isCapacitorNative, shouldUseMobileWebShell } from '@/utils/platform.js';

const HIDE_ON_PREFIXES = [
  '/paiement',
  '/signature/',
];

const ITEMS = MOBILE_AUTH_TABS_WEB;

const isActive = (pathname, to) => {
  if (to === '/dashboard') return pathname === '/dashboard';
  if (to.startsWith('/questionnaire')) {
    return pathname === '/questionnaire' || pathname.startsWith('/questionnaire');
  }
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
      className="greffio-mobile-floating-nav fixed z-40 md:hidden"
      aria-label="Navigation cockpit mobile"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(location.pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-1 py-2 transition ${
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
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      active ? 'bg-secondary text-[hsl(var(--greffio-blue))]' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.4 : 2} />
                  </span>
                )}
                <span className="greffio-mobile-floating-nav-label">{item.label}</span>
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
