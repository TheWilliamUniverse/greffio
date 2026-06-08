import React from 'react';
import { Power } from 'lucide-react';
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

export const MobileLogoutConfirmDialog = ({ open, onOpenChange, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="max-w-[min(100vw-2rem,24rem)] rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0a1220]">
            <Power className="h-5 w-5 stroke-[2.5]" />
          </span>
          Mettre en veille ?
        </AlertDialogTitle>
        <AlertDialogDescription>
          Vous quitterez votre session Greffio. Vos dossiers restent enregistrés — reconnectez-vous pour reprendre.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
        <AlertDialogCancel className="mt-0 h-11 w-full rounded-2xl">Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="h-11 w-full rounded-2xl bg-red-600 hover:bg-red-700"
        >
          Mettre en veille
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
