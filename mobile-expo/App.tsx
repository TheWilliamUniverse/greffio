import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

SplashScreen.preventAutoHideAsync().catch(() => {});

type AppExtra = {
  homeUrl?: string;
  authCallbackScheme?: string;
  allowedHostSuffixes?: string[];
};

const extra = (Constants.expoConfig?.extra || {}) as AppExtra;
const HOME_URL = extra.homeUrl || 'https://clareffio.willentreprises.com/?nativeApp=1';
const AUTH_SCHEME = extra.authCallbackScheme || 'com.greffio.app';
const ALLOWED_SUFFIXES = extra.allowedHostSuffixes || ['willentreprises.com', 'mollie.com', 'mollie.nl'];

const homeOrigin = new URL(HOME_URL).origin;

const isAllowedUrl = (rawUrl: string) => {
  if (!rawUrl) return false;
  if (rawUrl.startsWith(`${AUTH_SCHEME}://`)) return true;
  if (rawUrl.startsWith('about:blank')) return true;
  try {
    const { hostname, protocol } = new URL(rawUrl);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return ALLOWED_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [booting, setBooting] = useState(true);

  const userAgent = useMemo(
    () => `ClareffioExpo/${Constants.expoConfig?.version || '1.0.0'} (${Platform.OS}; Expo)`,
    [],
  );

  const onLoadEnd = useCallback(async () => {
    setBooting(false);
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    const url = String(request.url || '');
    if (url.startsWith(`${AUTH_SCHEME}://auth/callback`)) {
      webViewRef.current?.injectJavaScript(
        `window.location.replace(${JSON.stringify(`${homeOrigin}/dashboard?nativeApp=1`)}); true;`,
      );
      return false;
    }
    return isAllowedUrl(url);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <WebView
          ref={webViewRef}
          source={{ uri: HOME_URL }}
          style={styles.webview}
          userAgent={userAgent}
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          pullToRefreshEnabled
          onLoadEnd={onLoadEnd}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          applicationNameForUserAgent="ClareffioNative"
        />
        {booting ? (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color="#1e4d8c" />
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f8fc',
  },
});
