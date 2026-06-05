/**
 * Stunity Mobile App
 * 
 * Enterprise e-learning social platform
 */

import React, { useCallback, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { LogBox } from 'react-native';
import { Image } from 'expo-image';

import { RootNavigator } from '@/navigation';
import { useAuthStore } from '@/stores';
import { learnApi, clubsApi } from '@/api';
import i18n from '@/lib/i18n'; // Initialize i18n
import { SplashScreen } from '@/components/common';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider, ThemeProvider } from '@/contexts';
import { hydrateAppPreferences } from '@/services/appPreferences';
import { loadFeatureFlags } from '@/config/featureFlags';
import { track } from '@/services/analytics';
import { initMonitoring, wrapWithMonitoring } from '@/services/monitoring';
import { hydrateServerHostOverride } from '@/services/serverConfig';
import {
  KHMER_FONT_ASSETS,
  initializeKhmerTypography,
  setKhmerTypographyLanguage,
} from '@/lib/khmerTypography';

// Initialize crash reporting before anything else so the global error/rejection
// handlers are installed up front and errors during startup are captured.
// No-op when no Sentry DSN is configured (see services/monitoring).
initMonitoring();

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
  ]);
}

// Prevent auto-hide expo splash screen
ExpoSplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Failed to prevent native splash auto-hide:', error);
});

const APP_INIT_TIMEOUT_MS = 15000;

function scheduleExpoImageCacheReset() {
  InteractionManager.runAfterInteractions(() => {
    try {
      Image.clearDiskCache();
      Image.clearMemoryCache();
    } catch (e) {
      console.warn('Failed to clear expo-image caches:', e);
    }
  });
}

function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { initialize } = useAuthStore();
  const [fontsLoaded, fontLoadError] = useFonts(KHMER_FONT_ASSETS);
  const areFontsReady = fontsLoaded || Boolean(fontLoadError);

  useEffect(() => {
    async function prepare() {
      try {
        // Apply persisted runtime server host override before any auth/API calls.
        await hydrateServerHostOverride();

        const initWithTimeout = Promise.race([
          initialize(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('App initialization timed out')), APP_INIT_TIMEOUT_MS);
          }),
        ]);

        await Promise.all([hydrateAppPreferences(), initWithTimeout]);
      } catch (e) {
        console.warn('App init error:', e);
        useAuthStore.setState({
          isInitialized: true,
          isLoading: false
        });
      } finally {
        setAppIsReady(true);
      }
    }

    prepare().then(() => {
      // After auth is initialized, check if we're logged in and prefetch
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated) {
        // Prefetch in background to warm up caches
        learnApi.prefetchLearnHub().catch(() => {});
        clubsApi.prefetchClubs().catch(() => {});
        // Resolve feature flags for this user (gates rolled-out features).
        loadFeatureFlags().catch(() => {});
        // Record the session open (drives WAD/MAU active-day rollup).
        track('app_open');
      }
    });
  }, []);

  useEffect(() => {
    initializeKhmerTypography(i18n.resolvedLanguage || i18n.language);

    const handleLanguageChanged = (language: string) => {
      setKhmerTypographyLanguage(language);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    if (fontLoadError) {
      console.warn('Failed to load Khmer fonts:', fontLoadError);
    }
  }, [fontLoadError]);

  useEffect(() => {
    if (!appIsReady || !areFontsReady) return;

    scheduleExpoImageCacheReset();

    // Mount custom splash first, then hide native on the next frame to avoid a flash.
    setShowSplash(true);
    const frame = requestAnimationFrame(() => {
      ExpoSplashScreen.hideAsync().catch((error) => {
        console.warn('Failed to hide native splash screen:', error);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [appIsReady, areFontsReady]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ThemeProvider>
            <NotificationProvider>
              <View style={styles.contentContainer}>
                {appIsReady && areFontsReady && <RootNavigator />}
                {showSplash && (
                  <SplashScreen
                    onComplete={handleSplashComplete}
                    duration={1400}
                  />
                )}
              </View>
            </NotificationProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

// Wrap the root with Sentry for touch/navigation breadcrumbs and proper error
// boundary wiring. Safe when monitoring is disabled — wrap() just renders the
// app unchanged if Sentry was never initialized.
export default wrapWithMonitoring(App);
