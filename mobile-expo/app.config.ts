import type { ExpoConfig } from 'expo/config';

const APP_VERSION = '1.2.20';
const IOS_BUILD_NUMBER = '261510020';

const config: ExpoConfig = {
  name: 'Clareffio',
  slug: 'greffio',
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'com.greffio.app',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#f6f8fc',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.greffio.app',
    buildNumber: IOS_BUILD_NUMBER,
    associatedDomains: [
      'applinks:clareffio.willentreprises.com',
      'applinks:www.clareffio.willentreprises.com',
    ],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.greffio.app',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#f6f8fc',
    },
  },
  extra: {
    homeUrl: 'https://clareffio.willentreprises.com/?nativeApp=1',
    authCallbackScheme: 'com.greffio.app',
    allowedHostSuffixes: [
      'willentreprises.com',
      'mollie.com',
      'mollie.nl',
    ],
    eas: {
      projectId: process.env.EAS_PROJECT_ID || 'REPLACE_WITH_EAS_PROJECT_ID',
    },
  },
  plugins: [],
};

export default config;
