/**
 * Root Navigator
 * 
 * Main navigation structure for the app
 */

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme, StatusBar } from 'react-native';

import { RootStackParamList } from './types';
import { useAuthStore } from '@/stores';
import { LightTheme, DarkTheme as AppDarkTheme, Colors } from '@/config';
import { Loading } from '@/components/common';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

// Import screens (these will be created later)
// import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
// import CreatePostScreen from '@/screens/feed/CreatePostScreen';
// import CreateStoryScreen from '@/screens/feed/CreateStoryScreen';
// import StoryViewerScreen from '@/screens/feed/StoryViewerScreen';
// import PostDetailScreen from '@/screens/feed/PostDetailScreen';
// import CourseDetailScreen from '@/screens/learn/CourseDetailScreen';
// import LessonViewerScreen from '@/screens/learn/LessonViewerScreen';
// import UserProfileScreen from '@/screens/profile/UserProfileScreen';
// import SettingsScreen from '@/screens/settings/SettingsScreen';
// import NotificationsScreen from '@/screens/notifications/NotificationsScreen';
// import SearchScreen from '@/screens/feed/SearchScreen';
// import CommentsScreen from '@/screens/feed/CommentsScreen';
// import ImageViewerScreen from '@/screens/common/ImageViewerScreen';

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
  const { isAuthenticated, isInitialized, isLoading } = useAuthStore();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <Loading fullScreen message="Loading..." />;
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
          // Auth flow
          <>
            {/* <Stack.Screen name="Onboarding" component={OnboardingScreen} /> */}
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </>
        ) : (
          // Main app
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            
            {/* Modal screens */}
            {/* <Stack.Screen
              name="CreatePost"
              component={CreatePostScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="CreateStory"
              component={CreateStoryScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="StoryViewer"
              component={StoryViewerScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
            <Stack.Screen name="LessonViewer" component={LessonViewerScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen
              name="Comments"
              component={CommentsScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ImageViewer"
              component={ImageViewerScreen}
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
              }}
            /> */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
