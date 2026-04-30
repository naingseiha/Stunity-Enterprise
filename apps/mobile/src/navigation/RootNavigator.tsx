/**
 * Root Navigator
 * 
 * Main navigation structure for the app
 */

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';

import { RootStackParamList } from './types';
import { useAuthStore } from '@/stores';
import { useThemeContext } from '@/contexts';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ParentNavigator from './ParentNavigator';

// Import screens
import { ForceChangePasswordScreen } from '@/screens/auth';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Custom theme based on color scheme
const createNavigationTheme = (colors: ReturnType<typeof useThemeContext>['colors'], isDark: boolean) => ({
  ...(!isDark ? DefaultTheme : DarkTheme),
  colors: {
    ...(!isDark ? DefaultTheme.colors : DarkTheme.colors),
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.notification,
  },
});

const MainStackScreen = () => (
  <ErrorBoundary>
    <MainNavigator />
  </ErrorBoundary>
);

const RootNavigator: React.FC = () => {
  const { colors, isDark } = useThemeContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const isParent = user?.role === 'PARENT';
  const mustChangePassword = isAuthenticated && user?.isDefaultPassword;

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  // Deep linking configuration
  const linking = {
    prefixes: ['stunity://', 'https://stunity.com'],
    config: {
      screens: {
        Auth: {
          screens: {
            ResetPassword: 'reset-password',
          },
        },
      },
    } as any,
  };

  return (
    <NavigationContainer theme={createNavigationTheme(colors, isDark)} linking={linking}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : mustChangePassword ? (
          <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen} />
        ) : isParent ? (
          <Stack.Screen name="Parent" component={ParentNavigator} />
        ) : (
          <Stack.Screen
            name="Main"
            component={MainStackScreen}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
