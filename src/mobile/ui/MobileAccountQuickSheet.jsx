import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Moon, Settings, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet.jsx';
import { useAuth } from '@/hooks/useAuth.js';

/** Sheet compte – miroir du dropdown desktop `Header.jsx`. */
export const MobileAccountQuickSheet = ({ open, onOpenChange, onLogoutRequest, onSleepRequest }) => {
  const { currentUser } = useAuth();
  const firstName = currentUser?.firstName || 'Greffio';
  const lastName = currentUser?.lastName || '';
  const companyName = currentUser?.company?.name || 'Projet à créer';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(100vw,24rem)]">
        <SheetHeader>
          <SheetTitle>Mon compte</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {firstName.charAt(0) || 'G'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{firstName} {lastName}</p>
            <p className="truncate text-xs text-muted-foreground">{currentUser?.email || 'Compte Greffio'}</p>
            <p className="mt-2 truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{companyName}</p>
          </div>
        </div>

        <ul className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-white">
          <li className="border-b border-border/60">
            <Link
              to="/profil"
              onClick={() => onOpenChange(false)}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3 text-sm font-semibold"
            >
              <User className="h-4 w-4 text-primary" />
              Mon profil
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              onClick={() => onOpenChange(false)}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3 text-sm font-semibold"
            >
              <Settings className="h-4 w-4 text-primary" />
              Paramètres
            </Link>
          </li>
        </ul>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSleepRequest?.();
            }}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/40 text-sm font-semibold text-foreground"
          >
            <Moon className="h-4 w-4" />
            Mettre en veille
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onLogoutRequest?.();
            }}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border bg-white text-sm font-semibold text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
