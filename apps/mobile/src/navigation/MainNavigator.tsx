/**
 * Main Tab Navigator
 *
 * Instagram-style bottom tab navigation for authenticated users
 * Features: Feed, Learn, Clubs, Profile (icon-only)
 */

import React, { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet, Platform, View } from "react-native";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  useNavigation,
  getFocusedRouteNameFromRoute,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Haptics } from "@/services/haptics";

import {
  MainStackParamList,
  MainTabParamList,
  FeedStackParamList,
  LearnStackParamList,
  QuizStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
  ClubsStackParamList,
} from "./types";
import { Colors, Typography, Shadows } from "@/config";
import { Sidebar } from "@/components/navigation";
import TabletTabRail from "@/components/navigation/TabletTabRail";
import { withSwipeableTab } from "@/components/navigation/SwipeableTabContainer";
import { ProfileTabIcon } from "@/components/navigation/ProfileTabIcon";
import { useLayoutBreakpoint } from "@/hooks/useLayoutBreakpoint";
import {
  NavigationProvider,
  useNavigationContext,
  useThemeContext,
} from "@/contexts";

// Implemented Screens
import {
  FeedScreen,
  CreatePostScreen,
  EditPostScreen,
  PostDetailScreen,
  CommentsScreen,
  BookmarksScreen,
  MyPostsScreen,
  EventsScreen,
  EventDetailScreen,
  SearchScreen,
  SuggestedUsersScreen,
  BountyDetailScreen,
  CreateBountyScreen,
  FocusReelsScreen,
  CreateFocusReelScreen,
} from "@/screens/feed";
import { prefetchReelsFeed, hydrateReelsCacheFromDisk } from "@/screens/feed/reelsCache";
import { prefetchLearnHub, hydrateLearnHubFromDisk } from "@/screens/learn/learnHubCache";
import { prefetchFeed, hydrateFeedCacheFromDisk } from "@/services/feedCache";
import { prefetchClubs, hydrateClubsCacheFromDisk } from "@/screens/clubs/clubsCache";
import { prefetchProfile, hydrateProfileCacheFromDisk } from "@/screens/profile/profileCache";
import { hydrateClassesCacheFromDisk, prefetchClasses, hydrateClassDetailFromDisk } from "@/api/classes";
import useAuthStore from "@/stores/authStore";
import {
  LearnScreen,
  CourseDetailScreen,
  LessonViewerScreen,
  DocumentViewerScreen,
  CreateCourseScreen,
  InstructorDashboardScreen,
} from "@/screens/learn";
import {
  ProfileScreen,
  EditProfileScreen,
  UserCardScreen,
  SettingsScreen,
  BlockedUsersScreen,
  ProfileVisitorsScreen,
  PasswordSecurityScreen,
  AcademicProfileScreen,
  ManageDeadlinesScreen,
} from "@/screens/profile";
import MyQRCardScreen from "@/screens/profile/MyQRCardScreen";
import {
  ConversationsScreen,
  ChatScreen,
  NewMessageScreen,
} from "@/screens/messages";
import MessagingArchivedScreen from "@/features/archived/messaging/MessagingArchivedScreen";
import { FEATURE_FLAGS } from "@/config/featureFlags";
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
  ClassLeaderboardScreen,
  ClassAssignmentsScreen,
  ClassMaterialsScreen,
  ClassMembersScreen,
  EditStudentScreen,
  EditTeacherScreen,
  ClassGradesScreen,
  ClassAttendanceScreen,
  DisciplineWorkbenchScreen,
  ClassDirectoryScreen,
  ClassAssignmentDetailScreen,
} from "@/screens/clubs";
import {
  AssignmentsListScreen,
  AssignmentDetailScreen,
  SubmissionFormScreen,
  SubmissionsListScreen,
  GradeSubmissionScreen,
} from "@/screens/assignments";
import {
  TakeQuizScreen,
  QuizResultsScreen,
  QuizDetailsScreen,
} from "@/screens/quiz";
import QuizDashboardScreen from "@/screens/quiz/QuizDashboardScreen";
import BrowseQuizzesScreen from "@/screens/quiz/BrowseQuizzesScreen";
import MyJoinedQuizzesScreen from "@/screens/quiz/MyJoinedQuizzesScreen";
import { QuizStudioScreen } from "@/screens/quiz/QuizStudioScreen";
import {
  LiveQuizJoinScreen,
  LiveQuizHostScreen,
  LiveQuizLobbyScreen,
  LiveQuizPlayScreen,
  LiveQuizLeaderboardScreen,
  LiveQuizPodiumScreen,
} from "@/screens/live-quiz";
import {
  StatsScreen,
  ChallengeScreen,
  ChallengeResultScreen,
} from "@/screens/stats";
import { LeaderboardScreen } from "@/screens/gamification/LeaderboardScreen";
import { AchievementsScreen } from "@/screens/achievements";
import { NotificationsScreen } from "@/screens/notifications";
import { AttendanceCheckInScreen } from "@/screens/attendance/AttendanceCheckInScreen";
import { AttendanceReportScreen } from "@/screens/attendance/AttendanceReportScreen";

// Profile Stack Screens
const ConnectionsScreen = SuggestedUsersScreen;

// Create Stack Navigators
// Add Search to MainStack param list
type ExtendedMainStackParamList = MainStackParamList & {
  Search: undefined;
  CreateFocusReel: undefined;
};

const MainStack = createNativeStackNavigator<ExtendedMainStackParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const QuizStack = createNativeStackNavigator<QuizStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Clubs Stack
const ClubsStack = createNativeStackNavigator<ClubsStackParamList>();

const ClubsStackNavigator = () => (
  <ClubsStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureEnabled: true,
    }}
  >
    <ClubsStack.Screen name="ClubsList" component={ClubsScreen} />
    <ClubsStack.Screen name="ClubDetails" component={ClubDetailsScreen} />
    <ClubsStack.Screen name="ClubAcademics" component={ClubAcademicsScreen} />
    <ClubsStack.Screen
      name="ClubAnnouncements"
      component={ClubAnnouncementsScreen}
    />
    <ClubsStack.Screen name="ClubMaterials" component={ClubMaterialsScreen} />
    <ClubsStack.Screen name="ClubMembers" component={ClubMembersScreen} />
    <ClubsStack.Screen name="ClubInvites" component={ClubInvitesScreen} />
    <ClubsStack.Screen name="ClassDirectory" component={ClassDirectoryScreen} />
    <ClubsStack.Screen name="ClassDetails" component={ClassDetailsScreen} />
    <ClubsStack.Screen
      name="ClassAnnouncements"
      component={ClassAnnouncementsScreen}
    />
    <ClubsStack.Screen name="ClassReport" component={ClassReportScreen} />
    <ClubsStack.Screen
      name="ClassLeaderboard"
      component={ClassLeaderboardScreen}
    />
    <ClubsStack.Screen
      name="ClassAssignments"
      component={ClassAssignmentsScreen}
    />
    <ClubsStack.Screen name="ClassMaterials" component={ClassMaterialsScreen} />
    <ClubsStack.Screen name="ClassMembers" component={ClassMembersScreen} />
    <ClubsStack.Screen name="EditStudent" component={EditStudentScreen} />
    <ClubsStack.Screen name="EditTeacher" component={EditTeacherScreen} />
    <ClubsStack.Screen name="ClassGrades" component={ClassGradesScreen} />
    <ClubsStack.Screen
      name="ClassAttendance"
      component={ClassAttendanceScreen}
    />
    <ClubsStack.Screen
      name="DisciplineWorkbench"
      component={DisciplineWorkbenchScreen}
    />
    <ClubsStack.Screen name="ClassQuizzes" component={BrowseQuizzesScreen} />
    <ClubsStack.Screen
      name="ClassAssignmentDetail"
      component={ClassAssignmentDetailScreen}
    />
    <ClubsStack.Screen name="CreateClub" component={CreateClubScreen} />
    <ClubsStack.Screen
      name="AssignmentsList"
      component={AssignmentsListScreen}
    />
    <ClubsStack.Screen
      name="AssignmentDetail"
      component={AssignmentDetailScreen}
    />
    <ClubsStack.Screen name="SubmissionForm" component={SubmissionFormScreen} />
    <ClubsStack.Screen
      name="SubmissionsList"
      component={SubmissionsListScreen}
    />
    <ClubsStack.Screen
      name="GradeSubmission"
      component={GradeSubmissionScreen}
    />
  </ClubsStack.Navigator>
);

// Feed Stack Navigator
const FeedStackNavigator = () => (
  <FeedStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureEnabled: true,
    }}
  >
    <FeedStack.Screen name="Feed" component={FeedScreen} />
    <FeedStack.Screen name="CreatePost" component={CreatePostScreen} />
    <FeedStack.Screen name="EditPost" component={EditPostScreen} />
    <FeedStack.Screen
      name="PostDetail"
      component={PostDetailScreen}
      options={{
        animation:
          Platform.OS === "ios" ? "fade_from_bottom" : "slide_from_right",
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
    <FeedStack.Screen
      name="BountyDetail"
      component={BountyDetailScreen}
      options={{ headerShown: false, animation: 'slide_from_right' }}
    />
    <FeedStack.Screen
      name="CreateBounty"
      component={CreateBountyScreen}
      options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
    />
    <FeedStack.Screen name="FocusReels" component={FocusReelsScreen} />
  </FeedStack.Navigator>
);

// Learn Stack Navigator
const LearnStackNavigator = () => (
  <LearnStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureEnabled: true,
    }}
  >
    <LearnStack.Screen name="LearnHub" component={LearnScreen} />
    <LearnStack.Screen name="CourseDetail" component={CourseDetailScreen} />
    <LearnStack.Screen name="LessonViewer" component={LessonViewerScreen} />
    <LearnStack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    <LearnStack.Screen name="CreateCourse" component={CreateCourseScreen} />
    <LearnStack.Screen
      name="InstructorDashboard"
      component={InstructorDashboardScreen}
    />
  </LearnStack.Navigator>
);

// Quiz Stack Navigator
const QuizStackNavigator = () => (
  <QuizStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureEnabled: true,
    }}
  >
    <QuizStack.Screen name="QuizDashboard" component={QuizDashboardScreen} />
  </QuizStack.Navigator>
);

// Messages Stack Navigator (archived until Enterprise — see config/featureFlags.ts)
const MessagesStackNavigator = () => {
  if (!FEATURE_FLAGS.MESSAGING_ENABLED) {
    return <MessagingArchivedScreen />;
  }
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <MessagesStack.Screen
        name="Conversations"
        component={ConversationsScreen}
      />
      <MessagesStack.Screen name="Chat" component={ChatScreen} />
      <MessagesStack.Screen name="NewMessage" component={NewMessageScreen} />
    </MessagesStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
      gestureEnabled: true,
    }}
  >
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="UserCard" component={UserCardScreen} />
    <ProfileStack.Screen name="Connections" component={ConnectionsScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
    <ProfileStack.Screen
      name="ProfileVisitors"
      component={ProfileVisitorsScreen}
    />
    <ProfileStack.Screen
      name="PasswordSecurity"
      component={PasswordSecurityScreen}
    />
    <ProfileStack.Screen name="Bookmarks" component={BookmarksScreen} />
    <ProfileStack.Screen name="MyPosts" component={MyPostsScreen} />
    <ProfileStack.Screen
      name="AcademicProfile"
      component={AcademicProfileScreen}
    />
    <ProfileStack.Screen
      name="ManageDeadlines"
      component={ManageDeadlinesScreen}
    />
    <ProfileStack.Screen name="MyQRCard" component={MyQRCardScreen} />
    <ProfileStack.Screen
      name="AttendanceCheckIn"
      component={AttendanceCheckInScreen as any}
    />
    <ProfileStack.Screen
      name="AttendanceReport"
      component={AttendanceReportScreen as any}
    />
  </ProfileStack.Navigator>
);

// Tab Navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

// Wrap each visible tab root so horizontal flicks switch tabs (Instagram-style).
// The wrapper bails out on vertical scrolls and on deep-stack screens.
const SwipeableFeed = withSwipeableTab(FeedStackNavigator, "FeedTab");
const SwipeableReels = withSwipeableTab(FocusReelsScreen, "ReelsTab");
const SwipeableLearn = withSwipeableTab(LearnStackNavigator, "LearnTab");
const SwipeableClubs = withSwipeableTab(ClubsStackNavigator, "ClubsTab");
const SwipeableProfile = withSwipeableTab(ProfileStackNavigator, "ProfileTab");

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
  children,
}: {
  focused: boolean;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconSize: number;
  styles: ReturnType<typeof createStyles>;
  children?: React.ReactNode;
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
    <Animated.View
      style={[
        styles.tabIconContainer,
        { transform: [{ translateY }, { scale }] },
      ]}
    >
      {children ?? (
        <Ionicons name={iconName} size={iconSize} color={color} />
      )}
    </Animated.View>
  );
});

const MainNavigatorContent = () => {
  const layout = useLayoutBreakpoint();
  const { colors, isDark } = useThemeContext();
  const styles = React.useMemo(
    () => createStyles(colors, isDark),
    [colors, isDark],
  );

  const { sidebarVisible, closeSidebar } = useNavigationContext();
  const navigation = useNavigation<any>();

  const handleNavigate = useCallback(
    (screen: string) => {
      // Map sidebar menu items to proper tab + screen navigation
      const screenToTabMap: Record<
        string,
        { tab: string; screen?: string; params?: Record<string, unknown> }
      > = {
        Settings: { tab: "ProfileTab", screen: "Settings" },
        Bookmarks: { tab: "ProfileTab", screen: "Bookmarks" },
        AttendanceCheckIn: { tab: "ProfileTab", screen: "AttendanceCheckIn" },
        MyPosts: { tab: "ProfileTab", screen: "MyPosts" },
        UserCard: { tab: "ProfileTab", screen: "UserCard" },
        Connections: {
          tab: "ProfileTab",
          screen: "Connections",
          params: { type: "followers" },
        },
        EditProfile: { tab: "ProfileTab", screen: "EditProfile" },
        ProfileTab: { tab: "ProfileTab" },
        Profile: { tab: "ProfileTab", screen: "Profile" },
        Events: { tab: "FeedTab", screen: "Events" },
        MyCourses: {
          tab: "LearnTab",
          screen: "LearnHub",
          params: { initialTab: "enrolled" },
        },
        LearningPath: {
          tab: "LearnTab",
          screen: "LearnHub",
          params: { initialTab: "paths" },
        },
        MyQRCard: { tab: "ProfileTab", screen: "MyQRCard" },
        MyCreatedCourses: {
          tab: "LearnTab",
          screen: "LearnHub",
          params: { initialTab: "created" },
        },
        // Quiz Hub is reachable from the sidebar after the tab was removed.
        Quizzes: { tab: "QuizTab" },
      };

      const mapping = screenToTabMap[screen];
      if (mapping) {
        if (mapping.screen) {
          // Navigate to a specific screen within a tab
          navigation.navigate("MainTabs", {
            screen: mapping.tab,
            params: { screen: mapping.screen, params: mapping.params },
          });
        } else {
          // Just switch to the tab
          navigation.navigate("MainTabs", { screen: mapping.tab });
        }
      } else {
        // For screens registered on MainStack (e.g., Notifications, Stats)
        navigation.navigate(screen);
      }
    },
    [navigation],
  );

  return (
    <View style={styles.navigatorRoot}>
      <Tab.Navigator
        sceneContainerStyle={{
          backgroundColor: colors.background,
        }}
        tabBar={
          layout.isTablet
            ? () => null
            : (props) => <BottomTabBar {...props} />
        }
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false, // Instagram-style: icons only
          tabBarActiveTintColor: colors.primary, // Black when active (Instagram style)
          tabBarInactiveTintColor: colors.textSecondary, // Light gray when inactive
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            height: Platform.OS === "ios" ? 80 : 60,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 24 : 8,
            elevation: 0,
            shadowColor: "#000",
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
              case "FeedTab":
                // Home icon - Instagram style
                iconName = focused ? "home" : "home-outline";
                iconSize = 28;
                break;
              case "LearnTab":
                // Compass for exploration/learning
                iconName = focused ? "compass" : "compass-outline";
                iconSize = 28;
                break;
              case "ReelsTab":
                // Play-circle for short-form video — slightly larger to pop visually.
                iconName = focused ? "play-circle" : "play-circle-outline";
                iconSize = 32;
                break;
              case "QuizTab":
                // Game controller for play/quizzes
                iconName = focused
                  ? "game-controller"
                  : "game-controller-outline";
                iconSize = 27;
                break;
              case "ClubsTab":
                // School for clubs/study groups
                iconName = focused ? "school" : "school-outline";
                iconSize = 28;
                break;
              case "ProfileTab":
                // Circle person for profile - Instagram style
                iconName = focused ? "person-circle" : "person-circle-outline";
                iconSize = 28;
                break;
              default:
                iconName = "help-outline";
            }

            // Render custom tab bar icons
            return (
              <MainTabIcon
                focused={focused}
                color={color}
                iconName={iconName}
                iconSize={iconSize}
                styles={styles}
              >
                {route.name === "ProfileTab" ? (
                  <ProfileTabIcon focused={focused} color={color} />
                ) : undefined}
              </MainTabIcon>
            );
          },
        })}
        screenListeners={({ route, navigation }) => ({
          tabPress: (event) => {
            Haptics.selectionAsync();
            if (route.name === "ProfileTab") {
              event.preventDefault();
              navigation.navigate("ProfileTab", { screen: "Profile" });
            }
          },
        })}
      >
        <Tab.Screen
          name="FeedTab"
          component={SwipeableFeed}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "Feed";
            if (
              [
                "CreatePost",
                "EditPost",
                "PostDetail",
                "Comments",
                "EventDetail",
              ].includes(routeName)
            ) {
              return { tabBarStyle: { display: "none" } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="ReelsTab"
          component={SwipeableReels}
          // Keep the bottom tab bar visible on Reels (like TikTok / Instagram /
          // Facebook). The reel pages size themselves to sit above the bar
          // (FocusReelsScreen uses useBottomTabBarHeight), so nothing is hidden.
          // Reels are always a dark, immersive surface, so the bar goes dark +
          // light-tinted while focused (regardless of the app's light/dark
          // theme) to match — same as TikTok/IG. Reverts when another tab is
          // focused (that screen's options take over).
          options={{
            tabBarActiveTintColor: "#FFFFFF",
            tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
            tabBarStyle: {
              backgroundColor: "#000000",
              borderTopWidth: 0.5,
              borderTopColor: "rgba(255,255,255,0.12)",
              height: Platform.OS === "ios" ? 80 : 60,
              paddingTop: 8,
              paddingBottom: Platform.OS === "ios" ? 24 : 8,
              elevation: 0,
            },
          }}
        />
        <Tab.Screen
          name="LearnTab"
          component={SwipeableLearn}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "LearnHub";
            if (
              [
                "CourseDetail",
                "LessonViewer",
                "DocumentViewer",
                "CreateCourse",
                "EditCourse",
                "InstructorDashboard",
              ].includes(routeName)
            ) {
              return { tabBarStyle: { display: "none" } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="QuizTab"
          component={QuizStackNavigator}
          options={{
            // Quiz lives in the sidebar menu now (frees a slot for Reels).
            // Keep the route registered so deep links / programmatic nav still work.
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="ClubsTab"
          component={SwipeableClubs}
          options={({ route }) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? "ClubsList";
            if (
              [
                "ClassGrades",
                "ClassDetails",
                "ClassReport",
                "ClassLeaderboard",
                "ClassAttendance",
                "ClassQuizzes",
                "CreateClub",
                "ClubAcademics",
                "ClubAnnouncements",
                "ClubMaterials",
                "ClubMembers",
                "ClubInvites",
                "AssignmentsList",
                "AssignmentDetail",
                "SubmissionForm",
                "SubmissionsList",
                "GradeSubmission",
                "ClassAnnouncements",
                "ClassAssignments",
                "ClassMaterials",
                "ClassMembers",
                "ClassDirectory",
                "EditStudent",
                "EditTeacher",
              ].includes(routeName)
            ) {
              return { tabBarStyle: { display: "none" } };
            }
            return {};
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={SwipeableProfile}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "Profile";
            if (
              [
                "EditProfile",
                "Connections",
                "Settings",
                "BlockedUsers",
                "ProfileVisitors",
                "PasswordSecurity",
                "AcademicProfile",
                "ManageDeadlines",
                "AttendanceCheckIn",
                "AttendanceReport",
                "MyQRCard",
              ].includes(routeName)
            ) {
              return { tabBarStyle: { display: "none" } };
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
    </View>
  );
};

function MainTabsScreenWrapper() {
  const layout = useLayoutBreakpoint();
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {layout.isTablet ? <TabletTabRail /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <MainNavigatorContent />
      </View>
    </View>
  );
}

function MainStackNavigatorTabletAware() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        contentStyle: { flex: 1 },
      }}
    >
        <MainStack.Screen name="MainTabs" component={MainTabsScreenWrapper} />
        <MainStack.Screen name="Messages" component={MessagesStackNavigator} />
        <MainStack.Screen name="QuizDetails" component={QuizDetailsScreen} />
        <MainStack.Screen name="TakeQuiz" component={TakeQuizScreen} />
        <MainStack.Screen name="QuizResults" component={QuizResultsScreen} />
        <MainStack.Screen
          name="BrowseQuizzes"
          component={BrowseQuizzesScreen}
        />
        <MainStack.Screen
          name="MyJoinedQuizzes"
          component={MyJoinedQuizzesScreen}
        />
        <MainStack.Screen name="QuizStudio" component={QuizStudioScreen} />
        <MainStack.Screen name="LiveQuizJoin" component={LiveQuizJoinScreen} />
        <MainStack.Screen name="LiveQuizHost" component={LiveQuizHostScreen} />
        <MainStack.Screen
          name="LiveQuizLobby"
          component={LiveQuizLobbyScreen}
        />
        <MainStack.Screen name="LiveQuizPlay" component={LiveQuizPlayScreen} />
        <MainStack.Screen
          name="LiveQuizLeaderboard"
          component={LiveQuizLeaderboardScreen}
        />
        <MainStack.Screen
          name="LiveQuizPodium"
          component={LiveQuizPodiumScreen}
        />
        <MainStack.Screen name="Stats" component={StatsScreen} />
        <MainStack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <MainStack.Screen name="Challenges" component={ChallengeScreen} />
        <MainStack.Screen
          name="ChallengeResult"
          component={ChallengeResultScreen}
        />
        <MainStack.Screen name="Achievements" component={AchievementsScreen} />
        <MainStack.Screen
          name="Notifications"
          component={NotificationsScreen}
        />
        <MainStack.Screen name="Search" component={SearchScreen} />
        <MainStack.Screen
          name="CreateFocusReel"
          component={CreateFocusReelScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom', presentation: 'modal' }}
        />
      </MainStack.Navigator>
  );
};

const MainNavigator = () => {
  // Background-prefetch the Reels feed on app boot, *before* the user taps
  // the Reels tab. Same trick Instagram / TikTok use for instant tab entry.
  //
  // Two-layer fast path:
  //   1. AsyncStorage hydrate (~5ms): populates reelsCache from last session
  //      so even a cold-from-kill launch can show real reels immediately.
  //   2. Network refresh: fires in the background, refreshes the cache, and
  //      persists the new payload back to disk for next launch.
  //
  // CRITICAL: the network call is *deferred 1.5s* so it doesn't join the
  // boot waterfall (FeedStore, carousels, notifications, analytics) and
  // starve feed-service's connection pool. Without this delay, /reels/feed
  // gets queued behind /posts/feed and the Reels TTI balloons to ~10s on
  // cold launch. The disk hydrate still fires immediately so the cache is
  // populated for any same-tick tab tap.
  //
  // userId scopes the disk cache so account switching can't leak reels.
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (!userId) return; // wait until auth resolved before touching disk
    // Disk hydrate runs immediately (~5ms, no network) so a same-tick Reels
    // or Learn tap renders from last session's cache instantly.
    void hydrateReelsCacheFromDisk(userId);
    void hydrateLearnHubFromDisk(userId);
    void hydrateFeedCacheFromDisk(userId);
    void hydrateClubsCacheFromDisk(userId);
    void hydrateProfileCacheFromDisk(userId);
    void hydrateClassesCacheFromDisk(userId);
    void hydrateClassDetailFromDisk(userId);
    // Network refresh deferred 1.5s so it doesn't pile onto the boot
    // waterfall (FeedStore, carousels, notifications). After the spike
    // settles, the per-service connection pools are free and the prefetch
    // calls get a clean shot.
    const t = setTimeout(() => {
      void prefetchReelsFeed(userId);
      void prefetchLearnHub(userId);
      void prefetchFeed(userId);
      void prefetchClubs(userId);
      void prefetchProfile(userId);
      void prefetchClasses(userId);
    }, 1500);
    return () => clearTimeout(t);
  }, [userId]);

  return (
    <NavigationProvider>
      <MainStackNavigatorTabletAware />
    </NavigationProvider>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    navigatorRoot: {
      flex: 1,
      position: "relative",
    },
    tabIconContainer: {
      alignItems: "center",
      justifyContent: "center",
      width: 50,
      height: 50,
    },
  });

export default MainNavigator;
