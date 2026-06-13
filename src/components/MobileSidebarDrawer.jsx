import React, { useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Menu, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import {
  buildMobileDrawerNavGroups,
  isMobileDrawerNavActive,
} from '@/config/mobileNavigation.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import { isInternalUser } from '@/utils/roles.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';

/**
 * Drawer mobile/tablette pour le cockpit Greffio.
 */
export const MobileSidebarDrawer = ({ open, onClose, className }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const company = currentUser?.company || {};
  const internalView = isInternalUser(currentUser);
  const groups = buildMobileDrawerNavGroups(internalView);
  const showNavHint = isCapacitorNative() || isMobileBrowserViewport();

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
    <div className={cn('fixed inset-0 z-50', className)} role="dialog" aria-modal="true">
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

        {showNavHint ? (
          <p className="border-b border-border/70 bg-secondary/30 px-5 py-2.5 text-xs leading-5 text-muted-foreground">
            Messages, pilotage et statuts sont accessibles via ce menu ☰
            {isCapacitorNative() ? ' – l’onglet Compte remplace Messages sur l’app.' : '.'}
          </p>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
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
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            to={QUESTIONNAIRE_NEW_PATH}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(QUESTIONNAIRE_NEW_PATH);
            }}
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

export const MobileSidebarTrigger = ({ onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Ouvrir le menu de navigation"
    className={cn(
      'inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white text-[#0a1220] transition hover:bg-muted active:scale-[0.97]',
      className,
    )}
  >
    <Menu className="h-5 w-5" />
  </button>
);
