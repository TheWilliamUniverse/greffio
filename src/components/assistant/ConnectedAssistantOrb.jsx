import React from 'react';
import { useLocation } from 'react-router-dom';
import { GreffioAssistantOrb } from '@/components/assistant/GreffioAssistantOrb.jsx';
import { useAuth } from '@/hooks/useAuth.js';

const ALLOWED_EXACT = new Set([
  '/dashboard',
  '/documents',
  '/questionnaire',
  '/paiement',
  '/paiement/verification',
]);

const ALLOWED_PREFIXES = [
  '/dossier/',
  '/dossiers',
];

const HIDDEN_PREFIXES = [
  '/ops',
  '/ops-legacy',
  '/ops-observability',
  '/signature/',
  '/login',
  '/signup',
  '/password-reset',
  '/auth/',
];

const isAssistantRoute = (path) => {
  if (path === '/' || path === '/simulateur' || path.startsWith('/service/')) return false;
  if (HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) return false;
  if (ALLOWED_EXACT.has(path)) return true;
  if (ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) return true;
  if (path.startsWith('/paiement')) return true;
  return false;
};

export const ConnectedAssistantOrb = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;
  if (!isAssistantRoute(location.pathname)) return null;

  return <GreffioAssistantOrb />;
};
