import React from 'react';
import {
  BookOpen,
  FileBadge,
  FilePenLine,
  FolderOpen,
  Search,
  Stamp,
} from 'lucide-react';
import { QUICK_ACCESS } from '@/config/resourceServices.js';
import { cn } from '@/lib/utils';

const ICONS = {
  'file-badge': FileBadge,
  'file-pen': FilePenLine,
  stamp: Stamp,
  search: Search,
  folder: FolderOpen,
  book: BookOpen,
};

export const ResourceQuickAccess = ({ onQuickAccess, isAuthenticated }) => (
  <section className="mt-10">
    <h2 className="text-lg font-extrabold text-foreground">Accès rapides</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {QUICK_ACCESS.filter((entry) => !entry.requiresAuth || isAuthenticated).map((entry) => {
        const Icon = ICONS[entry.icon] || Search;
        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onQuickAccess(entry)}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border bg-white p-4 text-left shadow-elevation-sm',
              'transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevation-md',
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold leading-snug">{entry.label}</span>
          </button>
        );
      })}
    </div>
  </section>
);
