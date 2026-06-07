import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  UserRound,
} from 'lucide-react';

/** Onglets cockpit web mobile (<768px, authentifié). */
export const MOBILE_AUTH_TABS_WEB = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
  { to: '/questionnaire', icon: Plus, label: 'Nouveau', primary: true },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/team', icon: MessageSquareText, label: 'Messages' },
];

/**
 * Onglets app native — alignés sur web sauf le 5e onglet (Compte vs Messages).
 * Assistant et Messages restent accessibles via le drawer.
 */
export const MOBILE_AUTH_TABS_NATIVE = [
  { id: 'home', label: 'Accueil', path: '/dashboard', icon: 'home' },
  { id: 'dossiers', label: 'Dossiers', path: '/dossiers', icon: 'folders' },
  { id: 'new', label: 'Nouveau', path: '/questionnaire', icon: 'plus' },
  { id: 'documents', label: 'Documents', path: '/documents', icon: 'files' },
  { id: 'account', label: 'Compte', path: '/mobile/account', icon: 'user' },
];

export const MOBILE_PUBLIC_TABS = [
  { to: '/', label: 'Accueil' },
  { to: '/simulateur', label: 'Simuler' },
  { to: '/services', label: 'Services' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/login', label: 'Compte' },
];
