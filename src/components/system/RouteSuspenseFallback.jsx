import React from 'react';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';

export const RouteSuspenseFallback = ({ label = 'Chargement de la page…' }) => (
  <div className="min-h-[50vh] bg-background px-4 py-6">
    <p className="mb-4 text-sm font-medium text-muted-foreground">{label}</p>
    <MobilePageSkeleton />
  </div>
);
