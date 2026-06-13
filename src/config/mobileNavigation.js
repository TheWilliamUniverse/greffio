import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import {
  BarChart3,
  Bot,
  Building2,
  FileSignature,
  FileText,
  FolderKanban,
  FormInput,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  MessageSquareText,
  Plus,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react';

/** Onglets cockpit web mobile (<768px, authentifié). */
export const MOBILE_AUTH_TABS_WEB = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
  { to: QUESTIONNAIRE_NEW_PATH, icon: Plus, label: 'Nouveau', primary: true },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/team', icon: MessageSquareText, label: 'Messages' },
];

/**
 * Onglets app native — source unique partagée avec mobileStore.MOBILE_BOTTOM_TABS.
 * Web : Messages (5e onglet). Native : Compte (assistant/statuts via drawer ☰).
 */
export const MOBILE_AUTH_TABS_NATIVE = [
  { id: 'home', label: 'Accueil', path: '/dashboard', icon: 'home' },
  { id: 'dossiers', label: 'Dossiers', path: '/dossiers', icon: 'folders' },
  { id: 'new', label: 'Nouveau', path: QUESTIONNAIRE_NEW_PATH, icon: 'plus' },
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

/** Liens drawer cockpit (auth) — source unique pour web mobile et app native. */
export const MOBILE_DRAWER_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/assistant-documents', icon: FormInput, label: 'Compléter un PDF' },
  { to: '/boutique', icon: ShoppingBag, label: 'Boutique' },
  { to: '/team', icon: MessageSquareText, label: 'Messages' },
  { to: '/simulateur', icon: FileSignature, label: 'Nouvelle démarche' },
  { to: '/profil', icon: UserRound, label: 'Mon profil' },
  { to: '/analytics', icon: BarChart3, label: 'Pilotage' },
  { to: '/chat', icon: Bot, label: 'Assistant Greffio' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
  { to: '/contact', icon: HelpCircle, label: 'Aide / support' },
];

/** Groupes drawer mobile — navigation structurée (audit UX). */
export const MOBILE_DRAWER_NAV_GROUPS = [
  {
    label: 'Mon activité',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/dossiers', icon: FolderKanban, label: 'Dossiers' },
      { to: '/documents', icon: FileText, label: 'Documents' },
      { to: '/assistant-documents', icon: FormInput, label: 'Compléter un PDF' },
      { to: '/boutique', icon: ShoppingBag, label: 'Boutique' },
      { to: '/team', icon: MessageSquareText, label: 'Messages' },
    ],
  },
  {
    label: 'Pilotage',
    items: [
      { to: '/chat', icon: Bot, label: 'Assistant Greffio' },
      { to: '/analytics', icon: BarChart3, label: 'Pilotage' },
      { to: '/statuts', icon: FileSignature, label: 'Statuts' },
    ],
  },
  {
    label: 'Créer',
    items: [
      { to: '/simulateur', icon: Plus, label: 'Nouvelle démarche' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { to: '/profil', icon: UserRound, label: 'Mon profil' },
      { to: '/settings', icon: Settings, label: 'Paramètres' },
      { to: '/contact', icon: HelpCircle, label: 'Aide / support' },
    ],
  },
];

export const MOBILE_DRAWER_INTERNAL_ITEM = {
  to: '/interfaces',
  icon: Building2,
  label: 'Interfaces',
};

/** Menu ☰ simplifié — landing et pages publiques mobile. */
export const MOBILE_PUBLIC_DRAWER_ITEMS = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/simulateur', icon: Sparkles, label: 'Simuler une formalité' },
  { to: '/services', icon: LayoutGrid, label: 'Services' },
  { to: '/tarifs', icon: Receipt, label: 'Tarifs' },
  { to: '/contact', icon: HelpCircle, label: 'Contact' },
  { to: '/login', icon: LogIn, label: 'Connexion' },
];

/**
 * État actif drawer — pathname.startsWith avec règles métier (sous-routes dossier, etc.).
 */
export const isMobileDrawerNavActive = (pathname, to) => {
  const path = String(pathname || '');
  switch (to) {
    case '/dashboard':
      return path === '/dashboard';
    case '/dossiers':
      return path === '/dossiers' || path.startsWith('/dossier/');
    case '/documents':
      return path === '/documents' || path.startsWith('/documents/');
    case '/assistant-documents':
      return path.startsWith('/assistant-documents');
    case '/team':
      return path === '/team' || path.startsWith('/team/');
    case '/simulateur':
      return path.startsWith('/simulateur')
        || path.startsWith('/questionnaire')
        || path.startsWith('/statuts-gratuits');
    case '/profil':
      return path.startsWith('/profil') || path.startsWith('/mobile/account');
    case '/settings':
      return path.startsWith('/settings');
    case '/analytics':
      return path.startsWith('/analytics');
    case '/chat':
      return path.startsWith('/chat') || path.startsWith('/mobile/search');
    case '/contact':
      return path.startsWith('/contact');
    case '/interfaces':
      return path.startsWith('/interfaces');
    case '/statuts':
      return path.startsWith('/statuts');
    case '/':
      return path === '/';
    case '/login':
      return path.startsWith('/login') || path.startsWith('/signup');
    case '/services':
      return path.startsWith('/services') || path.startsWith('/service/');
    case '/tarifs':
      return path.startsWith('/tarifs');
    default:
      return path === to || path.startsWith(`${to}/`);
  }
};

export const buildMobileDrawerNavItems = (internalView = false) => {
  if (!internalView) return MOBILE_DRAWER_NAV_ITEMS;
  return [
    ...MOBILE_DRAWER_NAV_ITEMS.slice(0, 5),
    MOBILE_DRAWER_INTERNAL_ITEM,
    ...MOBILE_DRAWER_NAV_ITEMS.slice(5),
  ];
};

export const buildMobileDrawerNavGroups = (internalView = false) => {
  if (!internalView) return MOBILE_DRAWER_NAV_GROUPS;
  return MOBILE_DRAWER_NAV_GROUPS.map((group) => {
    if (group.label !== 'Pilotage') return group;
    return {
      ...group,
      items: [...group.items, MOBILE_DRAWER_INTERNAL_ITEM],
    };
  });
};
