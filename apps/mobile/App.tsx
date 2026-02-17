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
import { NotificationProvider } from '@/contexts';

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
  ]);
}

// Prevent auto-hide expo splash screen
ExpoSplashScreen.preventAutoHideAsync().catch(() => { });

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { initialize } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth - this will restore persisted state
        await initialize();
      } catch (e) {
        console.warn('App init error:', e);
        useAuthStore.setState({
          isInitialized: true,
          isLoading: false
        });
      } finally {
        setAppIsReady(true);
        // Hide expo's native splash screen
        ExpoSplashScreen.hideAsync().catch(() => { });
      }
    }

    prepare();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          {appIsReady && <RootNavigator />}
          {showSplash && (
            <SplashScreen
              onComplete={handleSplashComplete}
              duration={2500}
            />
          )}
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
