import React from 'react';
import { isCapacitorNative } from '@/utils/platform.js';
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
  ClipboardList,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { useAuth } from '@/hooks/useAuth.js';
import { isInternalUser } from '@/utils/roles.js';
import { useEffect, useState } from 'react';
import { listDossiers } from '@/api/dossiers.js';

export const Sidebar = ({ className }) => {
  const { currentUser } = useAuth();
  const [dossiersCount, setDossiersCount] = useState(0);
  const company = currentUser?.company || {};

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await listDossiers();
        if (!mounted) return;
        setDossiersCount(Array.isArray(payload?.dossiers) ? payload.dossiers.length : 0);
      } catch (_error) {
        if (!mounted) return;
        setDossiersCount(0);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const internalView = isInternalUser(currentUser);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/simulateur', icon: FileSignature, label: 'Nouvelle démarche' },
    { to: '/dossiers', icon: FolderKanban, label: 'Dossiers', badge: dossiersCount },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/boutique', icon: ShoppingBag, label: 'Boutique' },
    { to: '/team', icon: MessageSquareText, label: 'Équipe & clients' },
    ...(internalView ? [
      { to: '/ops/cockpit', icon: ClipboardList, label: 'Cockpit Ops' },
      { to: '/interfaces', icon: Network, label: 'Interfaces' },
      { to: '/ops-observability', icon: Activity, label: 'Ops observabilité' },
    ] : []),
    { to: '/analytics', icon: BarChart3, label: 'Pilotage' },
    { to: '/statuts', icon: ScrollText, label: 'Statuts' },
    { to: '/chat', icon: Bot, label: 'Assistant Greffio' },
    { to: '/profil', icon: UserRound, label: 'Mon profil' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  if (isCapacitorNative()) return null;

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
            {dossiersCount ? 'L’équipe Greffio suit vos formalités et reçoit vos messages depuis l’espace partagé.' : 'Une équipe sera assignée dès l’ouverture d’un dossier.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
