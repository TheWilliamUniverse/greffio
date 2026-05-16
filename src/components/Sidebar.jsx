import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Building2,
  FileSignature,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Activity,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useAuth } from '@/hooks/useAuth.js';
import { getDocuments, getDossiers } from '@/utils/localStorage.js';

export const Sidebar = ({ className }) => {
  const { currentUser } = useAuth();
  const dossiers = getDossiers();
  const documents = getDocuments();
  const company = currentUser?.company || {};

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/simulateur', icon: FileSignature, label: 'Nouvelle démarche' },
    { to: '/dossiers', icon: FolderKanban, label: 'Dossiers', badge: dossiers.length },
    { to: '/documents', icon: FileText, label: 'Documents', badge: documents.length },
    { to: '/team', icon: MessageSquareText, label: 'Équipe & clients' },
    { to: '/interfaces', icon: Network, label: 'Interfaces' },
    { to: '/ops-observability', icon: Activity, label: 'Ops observabilité' },
    { to: '/analytics', icon: BarChart3, label: 'Pilotage' },
    { to: '/chat', icon: Bot, label: 'Assistant Greffio' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <aside className={cn('hidden h-full w-72 flex-col border-r border-border bg-white md:flex', className)}>
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--greffio-blue))] text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{company.name || 'Projet à créer'}</p>
            <p className="truncate text-xs text-muted-foreground">{company.legalStructure || 'Dossier'} · {company.siren || 'Espace client'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Espace opérationnel</p>
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
              {item.badge > 0 && (
                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-md bg-secondary p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Équipe Greffio assignée
          </div>
          <p className="text-sm text-muted-foreground">
            {dossiers.length ? 'L’équipe Greffio suit vos formalités et reçoit vos messages depuis l’espace partagé.' : 'Une équipe sera assignée dès l’ouverture d’un dossier.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
