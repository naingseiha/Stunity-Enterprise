/**
 * Main Tab Navigator
 * 
 * Instagram-style bottom tab navigation for authenticated users
 * Features: Feed, Learn, Clubs, Profile (icon-only)
 */

import React, { useCallback } from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MainStackParamList,
  MainTabParamList,
  FeedStackParamList,
  LearnStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from './types';
import { Colors, Typography, Shadows } from '@/config';
import { Sidebar } from '@/components/navigation';
import { NavigationProvider, useNavigationContext } from '@/contexts';

// Implemented Screens
import { FeedScreen, CreatePostScreen, EditPostScreen, PostDetailScreen, CommentsScreen, BookmarksScreen, MyPostsScreen, SearchScreen } from '@/screens/feed';
import { LearnScreen, CourseDetailScreen } from '@/screens/learn';
import { ProfileScreen, EditProfileScreen, SettingsScreen } from '@/screens/profile';
import { ConversationsScreen, ChatScreen } from '@/screens/messages';
import { ClubsScreen, ClubDetailsScreen, CreateClubScreen } from '@/screens/clubs';
import {
  AssignmentsListScreen,
  AssignmentDetailScreen,
  SubmissionFormScreen,
  SubmissionsListScreen,
  GradeSubmissionScreen,
} from '@/screens/assignments';
import { TakeQuizScreen, QuizResultsScreen } from '@/screens/quiz';
import {
  LiveQuizJoinScreen,
  LiveQuizHostScreen,
  LiveQuizLobbyScreen,
  LiveQuizPlayScreen,
  LiveQuizLeaderboardScreen,
  LiveQuizPodiumScreen,
} from '@/screens/live-quiz';
import {
  StatsScreen,
  LeaderboardScreen,
  ChallengeScreen,
  ChallengeResultScreen,
} from '@/screens/stats';
import { AchievementsScreen } from '@/screens/achievements';
import { NotificationsScreen } from '@/screens/notifications';

// Placeholder screens (will be implemented)
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{title}</Text>
  </View>
);

// Feed Stack Screens (placeholders for remaining)
const HashtagScreen = () => <PlaceholderScreen title="Hashtag" />;
const EventsScreen = () => <PlaceholderScreen title="Events" />;
const EventDetailScreen = () => <PlaceholderScreen title="Event Detail" />;

// Learn Stack Screens (placeholders for remaining)
const LessonViewerScreen = () => <PlaceholderScreen title="Lesson Viewer" />;
const CreateCourseScreen = () => <PlaceholderScreen title="Create Course" />;
const EditCourseScreen = () => <PlaceholderScreen title="Edit Course" />;
const LearningPathScreen = () => <PlaceholderScreen title="Learning Path" />;
const MyCoursesScreen = () => <PlaceholderScreen title="My Courses" />;
const MyCreatedCoursesScreen = () => <PlaceholderScreen title="My Created Courses" />;

// Messages Stack Screens
const NewMessageScreen = () => <PlaceholderScreen title="New Message" />;
const GroupInfoScreen = () => <PlaceholderScreen title="Group Info" />;

// Profile Stack Screens
const ConnectionsScreen = () => <PlaceholderScreen title="Connections" />;


// Create Stack Navigators
// Add Search to MainStack param list
type ExtendedMainStackParamList = MainStackParamList & {
  Search: undefined;
};

const MainStack = createNativeStackNavigator<ExtendedMainStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Clubs Stack
const ClubsStack = createNativeStackNavigator();

const ClubsStackNavigator: React.FC = () => (
  <ClubsStack.Navigator screenOptions={{ headerShown: false }}>
    <ClubsStack.Screen name="ClubsList" component={ClubsScreen} />
    <ClubsStack.Screen name="ClubDetails" component={ClubDetailsScreen} />
    <ClubsStack.Screen name="CreateClub" component={CreateClubScreen} />
    <ClubsStack.Screen name="AssignmentsList" component={AssignmentsListScreen} />
    <ClubsStack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
    <ClubsStack.Screen name="SubmissionForm" component={SubmissionFormScreen} />
    <ClubsStack.Screen name="SubmissionsList" component={SubmissionsListScreen} />
    <ClubsStack.Screen name="GradeSubmission" component={GradeSubmissionScreen} />
  </ClubsStack.Navigator>
);

// Feed Stack Navigator
const FeedStackNavigator: React.FC = () => (
  <FeedStack.Navigator screenOptions={{ headerShown: false }}>
    <FeedStack.Screen name="Feed" component={FeedScreen} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
    <FeedStack.Screen name="EditPost" component={EditPostScreen} />
    <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
    <FeedStack.Screen name="Comments" component={CommentsScreen} />
    <FeedStack.Screen name="Bookmarks" component={BookmarksScreen} />
    <FeedStack.Screen name="MyPosts" component={MyPostsScreen} />
    <FeedStack.Screen name="UserProfile" component={ProfileScreen} />
    <FeedStack.Screen name="Hashtag" component={HashtagScreen} />
    <FeedStack.Screen name="Events" component={EventsScreen} />
    <FeedStack.Screen name="EventDetail" component={EventDetailScreen} />
  </FeedStack.Navigator>
);

// Learn Stack Navigator
const LearnStackNavigator: React.FC = () => (
  <LearnStack.Navigator screenOptions={{ headerShown: false }}>
    <LearnStack.Screen name="LearnHub" component={LearnScreen} />
    <LearnStack.Screen name="CourseDetail" component={CourseDetailScreen} />
    <LearnStack.Screen name="LessonViewer" component={LessonViewerScreen} />
    <LearnStack.Screen name="CreateCourse" component={CreateCourseScreen} />
    <LearnStack.Screen name="EditCourse" component={EditCourseScreen} />
    <LearnStack.Screen name="LearningPath" component={LearningPathScreen} />
    <LearnStack.Screen name="MyCourses" component={MyCoursesScreen} />
    <LearnStack.Screen name="MyCreatedCourses" component={MyCreatedCoursesScreen} />
  </LearnStack.Navigator>
);

// Messages Stack Navigator
const MessagesStackNavigator: React.FC = () => (
  <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
    <MessagesStack.Screen name="Conversations" component={ConversationsScreen} />
    <MessagesStack.Screen name="Chat" component={ChatScreen} />
    <MessagesStack.Screen name="NewMessage" component={NewMessageScreen} />
    <MessagesStack.Screen name="GroupInfo" component={GroupInfoScreen} />
  </MessagesStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="Connections" component={ConnectionsScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
    <ProfileStack.Screen name="MyPosts" component={MyPostsScreen} />
  </ProfileStack.Navigator>
);

// Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

const MainNavigatorContent: React.FC = () => {
  const { sidebarVisible, closeSidebar } = useNavigationContext();
  const navigation = useNavigation<any>();

  const handleNavigate = useCallback((screen: string) => {
    // Map sidebar menu items to proper tab + screen navigation
    const screenToTabMap: Record<string, { tab: string; screen?: string }> = {
      'Settings': { tab: 'ProfileTab', screen: 'Settings' },
      'Bookmarks': { tab: 'ProfileTab', screen: 'Bookmarks' },
      'MyPosts': { tab: 'ProfileTab', screen: 'MyPosts' },
      'Connections': { tab: 'ProfileTab', screen: 'Connections' },
      'EditProfile': { tab: 'ProfileTab', screen: 'EditProfile' },
      'ProfileTab': { tab: 'ProfileTab' },
      'Profile': { tab: 'ProfileTab', screen: 'Profile' },
      'Events': { tab: 'FeedTab', screen: 'Events' },
    };

    const mapping = screenToTabMap[screen];
    if (mapping) {
      if (mapping.screen) {
        // Navigate to a specific screen within a tab
        navigation.navigate('MainTabs', {
          screen: mapping.tab,
          params: { screen: mapping.screen },
        });
      } else {
        // Just switch to the tab
        navigation.navigate('MainTabs', { screen: mapping.tab });
      }
    } else {
      // For screens registered on MainStack (e.g., Notifications, Stats)
      navigation.navigate(screen);
    }
  }, [navigation]);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false, // Instagram-style: icons only
          tabBarActiveTintColor: '#000000', // Black when active (Instagram style)
          tabBarInactiveTintColor: '#C7C7CC', // Light gray when inactive
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0.5,
            borderTopColor: '#E5E5E5',
            height: Platform.OS === 'ios' ? 80 : 60,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            elevation: 0,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
            let iconName: keyof typeof Ionicons.glyphMap;
            let iconSize = 26;

            switch (route.name) {
              case 'FeedTab':
                // Home icon - Instagram style
                iconName = focused ? 'home' : 'home-outline';
                iconSize = 28;
                break;
              case 'LearnTab':
                // Compass for exploration/learning
                iconName = focused ? 'compass' : 'compass-outline';
                iconSize = 28;
                break;
              case 'MessagesTab':
                // Multiple chat bubbles for messages - cleaner look
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                iconSize = 27;
                break;
              case 'ClubsTab':
                // School for clubs/study groups
                iconName = focused ? 'school' : 'school-outline';
                iconSize = 28;
                break;
              case 'ProfileTab':
                // Circle person for profile - Instagram style
                iconName = focused ? 'person-circle' : 'person-circle-outline';
                iconSize = 28;
                break;
              default:
                iconName = 'help-outline';
            }

            // Render custom tab bar icons
            return (
              <View style={styles.tabIconContainer}>
                <Ionicons
                  name={iconName}
                  size={iconSize}
                  color={color}
                />
              </View>
            );
          },
        })}
        screenListeners={{
          tabPress: () => {
            Haptics.selectionAsync();
          },
        }}
      >
        <Tab.Screen
          name="FeedTab"
          component={FeedStackNavigator}
        />
        <Tab.Screen
          name="LearnTab"
          component={LearnStackNavigator}
        />
        <Tab.Screen
          name="MessagesTab"
          component={MessagesStackNavigator}
        />
        <Tab.Screen
          name="ClubsTab"
          component={ClubsStackNavigator}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
        />
      </Tab.Navigator>

      {/* Sidebar for additional navigation */}
      <Sidebar
        visible={sidebarVisible}
        onClose={closeSidebar}
        onNavigate={handleNavigate}
      />
    </>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <NavigationProvider>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="MainTabs" component={MainNavigatorContent} />
        <MainStack.Screen name="TakeQuiz" component={TakeQuizScreen} />
        <MainStack.Screen name="QuizResults" component={QuizResultsScreen} />
        <MainStack.Screen name="LiveQuizJoin" component={LiveQuizJoinScreen} />
        <MainStack.Screen name="LiveQuizHost" component={LiveQuizHostScreen} />
        <MainStack.Screen name="LiveQuizLobby" component={LiveQuizLobbyScreen} />
        <MainStack.Screen name="LiveQuizPlay" component={LiveQuizPlayScreen} />
        <MainStack.Screen name="LiveQuizLeaderboard" component={LiveQuizLeaderboardScreen} />
        <MainStack.Screen name="LiveQuizPodium" component={LiveQuizPodiumScreen} />
        <MainStack.Screen name="Stats" component={StatsScreen} />
        <MainStack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <MainStack.Screen name="Challenges" component={ChallengeScreen} />
        <MainStack.Screen name="ChallengeResult" component={ChallengeResultScreen} />
        <MainStack.Screen name="Achievements" component={AchievementsScreen} />
        <MainStack.Screen name="Notifications" component={NotificationsScreen} />
        <MainStack.Screen name="Search" component={SearchScreen} />
      </MainStack.Navigator>
    </NavigationProvider>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[50],
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[400],
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
});

export default MainNavigator;
