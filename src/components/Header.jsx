import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MessageSquareText, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { useNotificationsSummary } from '@/hooks/useNotificationsSummary.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { cn } from '@/lib/utils.js';
import { GREFFIO_MARKETING_HOME, GREFFIO_BRAND_HOME_LABEL } from '@/utils/greffioBrandNavigation.js';
import { Button } from '@/components/ui/button.jsx';
import { CountBadge, countBadgeHostClass } from '@/components/ui/count-badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';

export const Header = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { unreadCount } = useNotificationsSummary();
  const navigate = useNavigate();
  const firstName = currentUser?.firstName || 'Greffio';
  const lastName = currentUser?.lastName || '';
  const companyName = currentUser?.company?.name || 'Projet à créer';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 md:px-6">
        <Link
          to={GREFFIO_MARKETING_HOME}
          className="mr-6 flex w-[5.5rem] shrink-0 items-center overflow-hidden sm:w-auto sm:max-w-[9rem]"
          aria-label={GREFFIO_BRAND_HOME_LABEL}
        >
          <GreffioLogo variant="full" className="origin-left scale-75" />
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Espace client connecté à l’équipe Greffio
        </div>

        <div className="ml-auto flex items-center gap-2 overflow-visible pr-0.5">
          {isAuthenticated ? (
            <>
              <Button variant="outline" size="sm" asChild className={cn(countBadgeHostClass, 'hidden bg-white md:inline-flex')}>
                <Link to="/dashboard" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                  <CountBadge count={unreadCount} className="bg-red-500" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden bg-white md:inline-flex">
                <Link to="/team">
                  <MessageSquareText className="h-4 w-4" />
                  Équipe
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20">
                    <span className="text-sm font-bold text-primary">
                      {firstName.charAt(0) || 'G'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="p-3">
                    <p className="text-sm font-bold">{firstName} {lastName}</p>
                    <p className="truncate text-xs text-muted-foreground">{currentUser?.email || 'Compte Greffio'}</p>
                    <p className="mt-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{companyName}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profil" className="flex w-full cursor-pointer items-center">
                      <User className="mr-2 h-4 w-4" /> Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex w-full cursor-pointer items-center">
                      <User className="mr-2 h-4 w-4" /> Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive data-[highlighted]:text-destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <nav className="flex items-center gap-3">
              <Link to="/guide" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:block">
                Guide
              </Link>
              <Link to="/login" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:block">
                Connexion
              </Link>
              <Button asChild>
                <Link to="/signup">Créer mon espace</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};
