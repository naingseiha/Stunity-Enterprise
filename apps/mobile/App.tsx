/**
 * Stunity Mobile App
 * 
 * Enterprise e-learning social platform
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

import { RootNavigator } from '@/navigation';
import { useAuthStore } from '@/stores';
import { SplashScreen } from '@/components/common';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider } from '@/contexts';

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

    prepare();
  }, []);

  useEffect(() => {
    if (!appIsReady) return;

    // Small delay to ensure layout is ready
    const timer = setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch((error) => {
        console.warn('Failed to hide native splash screen:', error);
      });
      setShowSplash(true); // Start our custom animated splash
    }, 100);

    return () => clearTimeout(timer);
  }, [appIsReady]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <NotificationProvider>
            <StatusBar style="dark" />
            {appIsReady && !showSplash && <RootNavigator />}
            {showSplash && (
              <SplashScreen
                onComplete={handleSplashComplete}
                duration={2500}
              />
            )}
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
});
