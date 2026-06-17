import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plug,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { GREFFIO_COMPANY } from '@/config/opsTeam.js';

const navItems = [
  { to: '/ops', label: 'Cockpit', icon: LayoutDashboard, end: true },
  { to: '/ops/dossiers', label: 'Dossiers', icon: FolderKanban },
  { to: '/ops/invoices', label: 'Factures', icon: FileText, roles: ['ADMIN', 'OPS'] },
  { to: '/ops/integrations', label: 'Intégrations', icon: Plug, roles: ['ADMIN', 'OPS'] },
  { to: '/ops/equipe', label: 'Équipe', icon: Users },
  { to: '/ops/audit', label: 'Journal', icon: ShieldCheck },
];

export const OpsSidebar = ({ collapsed = false, mobile = false, onClose, userRole = null }) => {
  const normalizedRole = String(userRole || '').toUpperCase();
  const visibleItems = navItems.filter((item) => {
    if (!item.roles?.length) return true;
    return item.roles.includes(normalizedRole);
  });

  return (
  <aside className={cn(
    'flex h-full flex-col border-r border-slate-800 bg-slate-950 text-slate-100',
    collapsed ? 'w-[72px]' : mobile ? 'w-[88%] max-w-[280px]' : 'w-64',
  )}>
    <div className={cn('border-b border-slate-800 px-4 py-5', collapsed ? 'px-3' : '')}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-slate-900">
          G
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">Greffio Ops</p>
            <p className="truncate text-[11px] text-slate-400">Command Center</p>
          </div>
        ) : null}
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu ops"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visibleItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={mobile ? onClose : undefined}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            isActive
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
          } ${collapsed ? 'justify-center px-2' : ''}`}
          title={label}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed ? <span>{label}</span> : null}
        </NavLink>
      ))}
    </nav>

    {!collapsed ? (
      <div className="border-t border-slate-800 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Société éditrice</p>
        <p className="mt-1 text-sm font-semibold text-white">{GREFFIO_COMPANY.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{GREFFIO_COMPANY.email}</p>
      </div>
    ) : null}
  </aside>
  );
};
