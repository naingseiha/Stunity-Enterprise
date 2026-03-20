/**
 * Stunity Mobile App
 * 
 * Enterprise e-learning social platform
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { LogBox } from 'react-native';

import { RootNavigator } from '@/navigation';
import { useAuthStore } from '@/stores';
import { learnApi, clubsApi } from '@/api';
import i18n from '@/lib/i18n'; // Initialize i18n
import { SplashScreen } from '@/components/common';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider } from '@/contexts';
import {
  KHMER_FONT_ASSETS,
  initializeKhmerTypography,
  setKhmerTypographyLanguage,
} from '@/lib/khmerTypography';

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

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const { initialize } = useAuthStore();
  const [fontsLoaded, fontLoadError] = useFonts(KHMER_FONT_ASSETS);
  const areFontsReady = fontsLoaded || Boolean(fontLoadError);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth - this will restore persisted state
        await Promise.race([
          initialize(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('App initialization timed out')), APP_INIT_TIMEOUT_MS);
          }),
        ]);
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

    // Mount JS splash first, then hide native splash to avoid white transition flash.
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
          <NotificationProvider>
            <StatusBar style="dark" translucent backgroundColor="transparent" />
            <View style={styles.contentContainer}>
              {appIsReady && areFontsReady && <RootNavigator />}
              {showSplash && (
                <SplashScreen
                  onComplete={handleSplashComplete}
                  duration={2000}
                />
              )}
            </View>
          </NotificationProvider>
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
    backgroundColor: '#FFFFFF',
  },
});
