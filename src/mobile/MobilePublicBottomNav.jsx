import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleUserRound, Home, LayoutGrid, Receipt, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';

const buildPublicItems = () => {
  const homePath = isCapacitorNative() ? '/app/home' : '/';
  return [
    {
      to: homePath,
      label: 'Accueil',
      icon: Home,
      match: (path) => path === '/' || path === '/app/home' || path === '/app/welcome',
    },
    { to: '/simulateur', label: 'Simuler', icon: Sparkles, match: (path) => path.startsWith('/simulateur') },
    { to: '/services', label: 'Services', icon: LayoutGrid, match: (path) => path.startsWith('/services') || path.startsWith('/service/') },
    { to: '/tarifs', label: 'Tarifs', icon: Receipt, match: (path) => path.startsWith('/tarifs') },
    { to: '/login', label: 'Compte', icon: CircleUserRound, match: (path) => path.startsWith('/login') || path.startsWith('/signup') },
  ];
};

export const MobilePublicBottomNav = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  if (currentUser) return null;

  const publicItems = buildPublicItems();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-white/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(10,18,32,0.08)] backdrop-blur md:hidden"
      aria-label="Navigation mobile publique"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {publicItems.map((item) => {
          const active = item.match(location.pathname);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition ${
                  active ? 'text-[hsl(var(--greffio-blue))]' : 'text-muted-foreground'
                }`}
              >
                <span className={`rounded-xl p-1.5 ${active ? 'bg-secondary text-primary' : ''}`}>
                  <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
