/**
 * Stunity Mobile App
 * 
 * Enterprise e-learning social platform
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, LogBox, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
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

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const { initialize, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth - this will restore persisted state
        // and validate tokens if available
        await initialize();
      } catch (e) {
        console.warn('App init error:', e);
        // Set initialized even on error so app can show login
        useAuthStore.setState({ 
          isInitialized: true, 
          isLoading: false 
        });
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading Stunity...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
