import React from 'react';
import { LogOut, Moon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';

const COPY = {
  logout: {
    icon: LogOut,
    title: 'Se déconnecter ?',
    description: 'Vous serez déconnecté de votre compte Greffio. Vos dossiers restent enregistrés – reconnectez-vous pour les retrouver.',
    action: 'Se déconnecter',
    actionClass: 'h-11 w-full rounded-2xl bg-red-600 hover:bg-red-700',
  },
  sleep: {
    icon: Moon,
    title: 'Mettre en veille ?',
    description: 'Votre session sera mise en veille de façon sécurisée, sans vous déconnecter. Déverrouillez pour reprendre là où vous étiez.',
    action: 'Mettre en veille',
    actionClass: 'h-11 w-full rounded-2xl',
  },
};

export const MobileLogoutConfirmDialog = ({ open, onOpenChange, onConfirm, mode = 'logout' }) => {
  const copy = COPY[mode] || COPY.logout;
  const Icon = copy.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[min(100vw-2rem,24rem)] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0a1220]">
              <Icon className="h-5 w-5 stroke-[2.5]" />
            </span>
            {copy.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {copy.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel className="mt-0 h-11 w-full rounded-2xl">Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={copy.actionClass}>
            {copy.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
