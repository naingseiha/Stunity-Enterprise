/**
 * Main Tab Navigator
 * 
 * Instagram-style bottom tab navigation for authenticated users
 * Features: Feed, Learn, Clubs, Profile (icon-only)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MainStackParamList,
  MainTabParamList,
  FeedStackParamList,
  LearnStackParamList,
  QuizStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from './types';
import { Colors, Typography, Shadows } from '@/config';
import { Sidebar } from '@/components/navigation';
import { NavigationProvider, useNavigationContext, useThemeContext } from '@/contexts';

// Implemented Screens
import { FeedScreen, CreatePostScreen, EditPostScreen, PostDetailScreen, CommentsScreen, BookmarksScreen, MyPostsScreen, EventsScreen, EventDetailScreen, SearchScreen, SuggestedUsersScreen } from '@/screens/feed';
import { LearnScreen, CourseDetailScreen, LessonViewerScreen, DocumentViewerScreen, CreateCourseScreen, InstructorDashboardScreen } from '@/screens/learn';
import { ProfileScreen, EditProfileScreen, UserCardScreen, SettingsScreen, PasswordSecurityScreen, AcademicProfileScreen, ManageDeadlinesScreen } from '@/screens/profile';
import MyQRCardScreen from '@/screens/profile/MyQRCardScreen';
import { ConversationsScreen, ChatScreen, NewMessageScreen } from '@/screens/messages';
import {
  ClubsScreen,
  ClubAcademicsScreen,
  ClubAnnouncementsScreen,
  ClubMaterialsScreen,
  ClubMembersScreen,
  ClubInvitesScreen,
  ClubDetailsScreen,
  CreateClubScreen,
  ClassDetailsScreen,
  ClassAnnouncementsScreen,
  ClassReportScreen,
  ClassAssignmentsScreen,
  ClassMaterialsScreen,
  ClassMembersScreen,
  EditStudentScreen,
  EditTeacherScreen,
  ClassGradesScreen,
  ClassAttendanceScreen,
  ClassDirectoryScreen,
  ClassAssignmentDetailScreen,
} from '@/screens/clubs';
import {
  AssignmentsListScreen,
  AssignmentDetailScreen,
  SubmissionFormScreen,
  SubmissionsListScreen,
  GradeSubmissionScreen,
} from '@/screens/assignments';
import { TakeQuizScreen, QuizResultsScreen } from '@/screens/quiz';
import QuizDashboardScreen from '@/screens/quiz/QuizDashboardScreen';
import BrowseQuizzesScreen from '@/screens/quiz/BrowseQuizzesScreen';
import { QuizStudioScreen } from '@/screens/quiz/QuizStudioScreen';
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
  ChallengeScreen,
  ChallengeResultScreen,
} from '@/screens/stats';
import { LeaderboardScreen } from '@/screens/gamification/LeaderboardScreen';
import { AchievementsScreen } from '@/screens/achievements';
import { NotificationsScreen } from '@/screens/notifications';
import { AttendanceCheckInScreen } from '@/screens/attendance/AttendanceCheckInScreen';
import { AttendanceReportScreen } from '@/screens/attendance/AttendanceReportScreen';

// Profile Stack Screens
const ConnectionsScreen = SuggestedUsersScreen;


// Create Stack Navigators
// Add Search to MainStack param list
type ExtendedMainStackParamList = MainStackParamList & {
  Search: undefined;
};

const MainStack = createNativeStackNavigator<ExtendedMainStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const QuizStack = createNativeStackNavigator<QuizStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Clubs Stack
const ClubsStack = createNativeStackNavigator();

const ClubsStackNavigator = () => (
  <ClubsStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <ClubsStack.Screen name="ClubsList" component={ClubsScreen} />
    <ClubsStack.Screen name="ClubDetails" component={ClubDetailsScreen} />
    <ClubsStack.Screen name="ClubAcademics" component={ClubAcademicsScreen} />
    <ClubsStack.Screen name="ClubAnnouncements" component={ClubAnnouncementsScreen} />
    <ClubsStack.Screen name="ClubMaterials" component={ClubMaterialsScreen} />
    <ClubsStack.Screen name="ClubMembers" component={ClubMembersScreen} />
    <ClubsStack.Screen name="ClubInvites" component={ClubInvitesScreen} />
    <ClubsStack.Screen name="ClassDirectory" component={ClassDirectoryScreen} />
    <ClubsStack.Screen name="ClassDetails" component={ClassDetailsScreen} />
    <ClubsStack.Screen name="ClassAnnouncements" component={ClassAnnouncementsScreen} />
    <ClubsStack.Screen name="ClassReport" component={ClassReportScreen} />
    <ClubsStack.Screen name="ClassAssignments" component={ClassAssignmentsScreen} />
    <ClubsStack.Screen name="ClassMaterials" component={ClassMaterialsScreen} />
    <ClubsStack.Screen name="ClassMembers" component={ClassMembersScreen} />
    <ClubsStack.Screen name="EditStudent" component={EditStudentScreen} />
    <ClubsStack.Screen name="EditTeacher" component={EditTeacherScreen} />
    <ClubsStack.Screen name="ClassGrades" component={ClassGradesScreen} />
    <ClubsStack.Screen name="ClassAttendance" component={ClassAttendanceScreen} />
    <ClubsStack.Screen name="ClassQuizzes" component={BrowseQuizzesScreen} />
    <ClubsStack.Screen name="ClassAssignmentDetail" component={ClassAssignmentDetailScreen} />
    <ClubsStack.Screen name="CreateClub" component={CreateClubScreen} />
    <ClubsStack.Screen name="AssignmentsList" component={AssignmentsListScreen} />
    <ClubsStack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
    <ClubsStack.Screen name="SubmissionForm" component={SubmissionFormScreen} />
    <ClubsStack.Screen name="SubmissionsList" component={SubmissionsListScreen} />
    <ClubsStack.Screen name="GradeSubmission" component={GradeSubmissionScreen} />
  </ClubsStack.Navigator>
);

// Feed Stack Navigator
const FeedStackNavigator = () => (
  <FeedStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <FeedStack.Screen name="Feed" component={FeedScreen} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
    <FeedStack.Screen name="EditPost" component={EditPostScreen} />
    <FeedStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={{
        animation: Platform.OS === 'ios' ? 'fade_from_bottom' : 'slide_from_right',
        animationDuration: 260,
      }}
    />
    <FeedStack.Screen name="Comments" component={CommentsScreen} />
    <FeedStack.Screen name="Bookmarks" component={BookmarksScreen} />
    <FeedStack.Screen name="MyPosts" component={MyPostsScreen} />
    <FeedStack.Screen name="UserProfile" component={ProfileScreen} />
    <FeedStack.Screen name="Events" component={EventsScreen} />
    <FeedStack.Screen name="EventDetail" component={EventDetailScreen} />
    <FeedStack.Screen name="SuggestedUsers" component={SuggestedUsersScreen} />
  </FeedStack.Navigator>
);

// Learn Stack Navigator
const LearnStackNavigator = () => (
  <LearnStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <LearnStack.Screen name="LearnHub" component={LearnScreen} />
    <LearnStack.Screen name="CourseDetail" component={CourseDetailScreen} />
    <LearnStack.Screen name="LessonViewer" component={LessonViewerScreen} />
    <LearnStack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    <LearnStack.Screen name="CreateCourse" component={CreateCourseScreen} />
    <LearnStack.Screen name="InstructorDashboard" component={InstructorDashboardScreen} />
  </LearnStack.Navigator>
);

// Quiz Stack Navigator
const QuizStackNavigator = () => (
  <QuizStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <QuizStack.Screen name="QuizDashboard" component={QuizDashboardScreen} />
  </QuizStack.Navigator>
);

// Messages Stack Navigator
const MessagesStackNavigator = () => (
  <MessagesStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <MessagesStack.Screen name="Conversations" component={ConversationsScreen} />
    <MessagesStack.Screen name="Chat" component={ChatScreen} />
    <MessagesStack.Screen name="NewMessage" component={NewMessageScreen} />
  </MessagesStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="UserCard" component={UserCardScreen} />
    <ProfileStack.Screen name="Connections" component={ConnectionsScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="PasswordSecurity" component={PasswordSecurityScreen} />
    <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
    <ProfileStack.Screen name="MyPosts" component={MyPostsScreen} />
    <ProfileStack.Screen name="AcademicProfile" component={AcademicProfileScreen} />
    <ProfileStack.Screen name="ManageDeadlines" component={ManageDeadlinesScreen} />
    <ProfileStack.Screen name="MyQRCard" component={MyQRCardScreen} />
    <ProfileStack.Screen name="AttendanceCheckIn" component={AttendanceCheckInScreen as any} />
    <ProfileStack.Screen name="AttendanceReport" component={AttendanceReportScreen as any} />
  </ProfileStack.Navigator>
);

// Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

const MainTabIcon = React.memo(function MainTabIcon({
  focused,
  color,
  iconName,
  iconSize,
  styles,
}: {
  focused: boolean;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const focusProgress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusProgress, {
      toValue: focused ? 1 : 0,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [focused, focusProgress]);

  const scale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const translateY = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -1],
  });

  return (
    <Animated.View style={[styles.tabIconContainer, { transform: [{ translateY }, { scale }] }]}>
      <Ionicons
        name={iconName}
        size={iconSize}
        color={color}
      />
    </Animated.View>
  );
});

const MainNavigatorContent = () => {
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { sidebarVisible, closeSidebar } = useNavigationContext();
  const navigation = useNavigation<any>();

  const handleNavigate = useCallback((screen: string) => {
    // Map sidebar menu items to proper tab + screen navigation
    const screenToTabMap: Record<string, { tab: string; screen?: string; params?: Record<string, unknown> }> = {
      'Settings': { tab: 'ProfileTab', screen: 'Settings' },
      'Bookmarks': { tab: 'ProfileTab', screen: 'Bookmarks' },
      'AttendanceCheckIn': { tab: 'ProfileTab', screen: 'AttendanceCheckIn' },
      'MyPosts': { tab: 'ProfileTab', screen: 'MyPosts' },
      'UserCard': { tab: 'ProfileTab', screen: 'UserCard' },
      'Connections': { tab: 'ProfileTab', screen: 'Connections', params: { type: 'followers' } },
      'EditProfile': { tab: 'ProfileTab', screen: 'EditProfile' },
      'ProfileTab': { tab: 'ProfileTab' },
      'Profile': { tab: 'ProfileTab', screen: 'Profile' },
      'Events': { tab: 'FeedTab', screen: 'Events' },
      'MyCourses': { tab: 'LearnTab', screen: 'LearnHub', params: { initialTab: 'enrolled' } },
      'LearningPath': { tab: 'LearnTab', screen: 'LearnHub', params: { initialTab: 'paths' } },
      'MyQRCard': { tab: 'ProfileTab', screen: 'MyQRCard' },
      'MyCreatedCourses': { tab: 'LearnTab', screen: 'LearnHub', params: { initialTab: 'created' } },
    };

    const mapping = screenToTabMap[screen];
    if (mapping) {
      if (mapping.screen) {
        // Navigate to a specific screen within a tab
        navigation.navigate('MainTabs', {
          screen: mapping.tab,
          params: { screen: mapping.screen, params: mapping.params },
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
          tabBarActiveTintColor: colors.primary, // Black when active (Instagram style)
          tabBarInactiveTintColor: colors.textSecondary, // Light gray when inactive
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
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
              case 'QuizTab':
                // Game controller for play/quizzes
                iconName = focused ? 'game-controller' : 'game-controller-outline';
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
              <MainTabIcon
                focused={focused}
                color={color}
                iconName={iconName}
                iconSize={iconSize}
                styles={styles}
              />
            );
          },
        })}
        screenListeners={({ route, navigation }) => ({
          tabPress: (event) => {
            Haptics.selectionAsync();
            if (route.name === 'ProfileTab') {
              event.preventDefault();
              navigation.navigate('ProfileTab', { screen: 'Profile' });
            }
          },
        })}
      >
        <Tab.Screen
          name="FeedTab"
          component={FeedStackNavigator}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Feed';
            if (['CreatePost', 'EditPost', 'PostDetail', 'Comments', 'EventDetail'].includes(routeName)) {
              return { tabBarStyle: { display: 'none' } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="LearnTab"
          component={LearnStackNavigator}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'LearnHub';
            if (['CourseDetail', 'LessonViewer', 'DocumentViewer', 'CreateCourse', 'EditCourse', 'InstructorDashboard'].includes(routeName)) {
              return { tabBarStyle: { display: 'none' } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="QuizTab"
          component={QuizStackNavigator}
        />
        <Tab.Screen
          name="ClubsTab"
          component={ClubsStackNavigator}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'ClubsList';
            if ([
              'ClassGrades',
              'ClassDetails',
              'CreateClub',
              'ClubAcademics',
              'ClubAnnouncements',
              'ClubMaterials',
              'ClubMembers',
              'ClubInvites',
              'AssignmentsList',
              'AssignmentDetail',
              'SubmissionForm',
              'SubmissionsList',
              'GradeSubmission',
              'ClassAnnouncements',
              'ClassAssignments',
              'ClassMaterials',
              'ClassMembers',
              'ClassDirectory',
              'EditStudent',
              'EditTeacher',
            ].includes(routeName)) {
              return { tabBarStyle: { display: 'none' } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Profile';
            if (['EditProfile', 'Connections', 'Settings', 'PasswordSecurity', 'AcademicProfile', 'ManageDeadlines', 'AttendanceCheckIn', 'AttendanceReport', 'MyQRCard'].includes(routeName)) {
              return { tabBarStyle: { display: 'none' } };
            }
            return {};
          }}
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

const MainNavigator = () => {
  return (
    <NavigationProvider>
      <MainStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
        <MainStack.Screen name="MainTabs" component={MainNavigatorContent} />
        <MainStack.Screen name="Messages" component={MessagesStackNavigator} />
        <MainStack.Screen name="TakeQuiz" component={TakeQuizScreen} />
        <MainStack.Screen name="QuizResults" component={QuizResultsScreen} />
        <MainStack.Screen name="BrowseQuizzes" component={BrowseQuizzesScreen} />
        <MainStack.Screen name="QuizStudio" component={QuizStudioScreen} />
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
});

export default MainNavigator;
