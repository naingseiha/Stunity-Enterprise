/**
 * Root Navigator
 * 
 * Main navigation structure for the app
 */

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, StatusBar, View, Text, ActivityIndicator } from 'react-native';

import { RootStackParamList } from './types';
import { useAuthStore } from '@/stores';
import { Colors } from '@/config';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ParentNavigator from './ParentNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Custom theme based on color scheme
const createNavigationTheme = (isDark: boolean) => ({
  ...(!isDark ? DefaultTheme : DarkTheme),
  colors: {
    ...(!isDark ? DefaultTheme.colors : DarkTheme.colors),
    primary: Colors.primary[500],
    background: isDark ? Colors.gray[900] : Colors.gray[50],
    card: isDark ? Colors.gray[800] : Colors.white,
    text: isDark ? Colors.gray[50] : Colors.gray[900],
    border: isDark ? Colors.gray[700] : Colors.gray[200],
    notification: Colors.error.main,
  },
});

const RootNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const isParent = (user as any)?.role === 'PARENT';

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={{ marginTop: 16, color: Colors.gray[600] }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={createNavigationTheme(isDark)}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? Colors.gray[900] : Colors.white}
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
        ) : isParent ? (
          <Stack.Screen name="Parent" component={ParentNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
