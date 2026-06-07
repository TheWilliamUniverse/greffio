import React from 'react';
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
        <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
        <AlertDialogDescription>
          Vous quitterez votre espace client Greffio. Vos dossiers restent enregistrés.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
        <AlertDialogCancel className="mt-0 h-11 w-full rounded-2xl">Annuler</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="h-11 w-full rounded-2xl bg-red-600 hover:bg-red-700"
        >
          Se déconnecter
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
