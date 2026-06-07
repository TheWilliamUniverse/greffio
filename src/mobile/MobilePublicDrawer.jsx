import React, { useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import {
  MOBILE_PUBLIC_DRAWER_ITEMS,
  isMobileDrawerNavActive,
} from '@/config/mobileNavigation.js';
import { useAuth } from '@/hooks/useAuth.js';

/**
 * Menu ☰ simplifié pour visiteurs (landing et pages publiques mobile).
 */
export const MobilePublicDrawer = ({ open, onClose, className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const items = MOBILE_PUBLIC_DRAWER_ITEMS.map((item) => (
    item.to === '/login' && currentUser
      ? { ...item, to: '/dashboard', label: 'Mon espace' }
      : item
  ));

  const handleNavigate = useCallback((to) => {
    onClose?.();
    if (isMobileDrawerNavActive(location.pathname, to)) return;
    navigate(to);
  }, [location.pathname, navigate, onClose]);

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
      <aside className="absolute left-0 top-0 flex h-full w-[88%] max-w-[300px] flex-col bg-white shadow-elevation-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <GreffioLogo variant="full" className="h-7" />
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
          <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Navigation</p>
          <div className="space-y-1">
            {items.map((item) => {
              const active = isMobileDrawerNavActive(location.pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate(item.to);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-[hsl(var(--greffio-blue))] text-white shadow-elevation-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </div>
  );
};
