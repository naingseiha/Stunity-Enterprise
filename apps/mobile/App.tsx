/**
 * Stunity Mobile App
 * 
 * Enterprise e-learning social platform
 */

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { RootNavigator } from '@/navigation';
import { useAuthStore } from '@/stores';

// Ignore specific warnings in development
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'Require cycle:',
  ]);
}

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          // Add custom fonts here if needed
          // 'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        });

        // Initialize authentication
        await initialize();

        // Add any other initialization logic here
        // - Analytics setup
        // - Push notification registration
        // - Deep link handling setup
        
      } catch (error) {
        console.warn('App initialization error:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, [initialize]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen once app is ready
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar style="auto" />
          <RootNavigator />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
