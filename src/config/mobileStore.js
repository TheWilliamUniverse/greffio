export const MOBILE_STORE = {
  appName: 'Greffio',
  bundleId: 'com.greffio.app',
  android: {
    packageName: 'com.greffio.app',
    playSubtitle: 'Formalités d’entreprise simplifiées',
    shortDescription: 'Créez, modifiez et suivez vos formalités d’entreprise avec Greffio.',
  },
  ios: {
    bundleId: 'com.greffio.app',
    subtitle: 'Formalités entreprise',
    organization: 'WILLIAM ESTABLISHMENTS',
  },
  legal: {
    privacyUrl: 'https://greffio.willentreprises.com/confidentialite',
    accountDeletionUrl: 'https://greffio.willentreprises.com/suppression-compte',
    cookiesUrl: 'https://greffio.willentreprises.com/cookies',
    supportEmail: 'support@willentreprises.com',
  },
  deepLinkHosts: [
    'greffio.willentreprises.com',
  ],
  futureDeepLinkHosts: [
    'app.greffio.willentreprises.com',
  ],
};

export { MOBILE_AUTH_TABS_NATIVE as MOBILE_BOTTOM_TABS } from './mobileNavigation.js';
