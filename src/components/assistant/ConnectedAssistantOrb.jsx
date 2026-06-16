import React from 'react';
import { useLocation } from 'react-router-dom';
import { GreffioAssistantOrb } from '@/components/assistant/GreffioAssistantOrb.jsx';
import { useAuth } from '@/hooks/useAuth.js';

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

export const ConnectedAssistantOrb = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const path = location.pathname;

  if (!isAuthenticated) return null;
  if (path === '/' || path === '/simulateur' || path.startsWith('/service/')) return null;
  if (HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) return null;

  return <GreffioAssistantOrb />;
};
