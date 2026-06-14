import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { findOpsMemberByEmail } from '@/config/opsTeam.js';

export const OpsTopbar = ({
  title,
  subtitle,
  user,
  onRefresh,
  refreshing = false,
  onOpenSearch,
  onOpenMenu,
  headerSummary,
}) => {
  const member = findOpsMemberByEmail(user?.email);
  const displayName = member?.name || user?.name || user?.email || 'Équipe Greffio';
  const initials = member?.initials || displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {onOpenMenu ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mt-0.5 shrink-0 bg-white sm:hidden"
              onClick={onOpenMenu}
              aria-label="Ouvrir le menu ops"
            >
              <Menu className="h-4 w-4" />
            </Button>
          ) : null}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio · Ops</p>
            <h1 className="truncate text-xl font-extrabold text-slate-900 sm:text-2xl">{title}</h1>
            {subtitle ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button type="button" variant="outline" className="bg-white" onClick={onOpenSearch}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Rechercher</span>
            <kbd className="ml-1 hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 sm:inline">
              ⌘K
            </kbd>
          </Button>
          <Button type="button" variant="outline" className="bg-white" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Espace client</span>
            </Link>
          </Button>
        </div>
      </div>

      {headerSummary ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:grid-cols-4 sm:gap-3 sm:px-6">
          {[
            ['À traiter', headerSummary.toProcessToday],
            ['En retard', headerSummary.late],
            ['Docs à valider', headerSummary.documentsToValidate],
            ['Prêts dépôt', headerSummary.readyForDeposit],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="text-xl font-extrabold text-slate-900">{value ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
};
