import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
import { cn } from '@/lib/utils.js';

export const ConfirmActionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  destructive = false,
  loading = false,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[1.75rem] border border-border/80 bg-white p-5 shadow-[0_24px_70px_rgba(15,52,96,0.22)]">
      <AlertDialogHeader className="text-left">
        <span className={cn(
          'mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl',
          destructive ? 'bg-red-50 text-red-600' : 'bg-secondary text-primary',
        )}>
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <AlertDialogTitle className="font-display text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-6 text-muted-foreground">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-2 gap-2 sm:space-x-0">
        <AlertDialogCancel className="mt-0 h-11 rounded-2xl bg-white">
          {cancelLabel}
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={loading}
          onClick={(event) => {
            event.preventDefault();
            onConfirm?.();
          }}
          className={cn(
            'h-11 rounded-2xl',
            destructive && 'bg-red-600 text-white hover:bg-red-700',
          )}
        >
          {loading ? 'Traitement…' : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
