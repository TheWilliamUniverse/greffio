import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MessageSquareText, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';

export const Header = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = currentUser?.firstName || 'Greffio';
  const lastName = currentUser?.lastName || '';
  const companyName = currentUser?.company?.name || 'Projet à créer';
  const notificationCount = 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 md:px-6">
        <Link to="/" className="mr-6 flex items-center">
          <GreffioLogo variant="full" className="scale-75 origin-left" />
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Espace client connecté à l’équipe Greffio
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button variant="outline" size="sm" asChild className="hidden bg-white md:inline-flex">
                <Link to="/team">
                  <MessageSquareText className="h-4 w-4" />
                  Équipe
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 ? (
                  <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-destructive" />
                ) : null}
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
