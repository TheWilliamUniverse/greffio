import React from 'react';
import { GreffioAppLoader } from '@/components/system/GreffioAppLoader.jsx';

export const RouteSuspenseFallback = ({ label = 'Chargement de la page…' }) => (
  <GreffioAppLoader label={label} fullScreen />
);
