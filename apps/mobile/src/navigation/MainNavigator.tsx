/**
 * Main Tab Navigator
 * 
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  MainTabParamList,
  FeedStackParamList,
  LearnStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
} from './types';
import { Colors, Typography, Shadows } from '@/config';

// Implemented Screens
import { FeedScreen } from '@/screens/feed';
import { LearnScreen } from '@/screens/learn';
import { ProfileScreen } from '@/screens/profile';
import { ConversationsScreen, ChatScreen } from '@/screens/messages';

// Placeholder screens (will be implemented)
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{title}</Text>
  </View>
);

// Feed Stack Screens (placeholders for remaining)
const PostDetailScreen = () => <PlaceholderScreen title="Post Detail" />;
const UserProfileScreen = () => <PlaceholderScreen title="User Profile" />;
const HashtagScreen = () => <PlaceholderScreen title="Hashtag" />;
const ClubsScreen = () => <PlaceholderScreen title="Clubs" />;
const ClubDetailScreen = () => <PlaceholderScreen title="Club Detail" />;
const EventsScreen = () => <PlaceholderScreen title="Events" />;
const EventDetailScreen = () => <PlaceholderScreen title="Event Detail" />;

// Learn Stack Screens
const CourseDetailScreen = () => <PlaceholderScreen title="Course Detail" />;
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
const EditProfileScreen = () => <PlaceholderScreen title="Edit Profile" />;
const ConnectionsScreen = () => <PlaceholderScreen title="Connections" />;
const SettingsScreen = () => <PlaceholderScreen title="Settings" />;
const BookmarksScreen = () => <PlaceholderScreen title="Bookmarks" />;
const MyPostsScreen = () => <PlaceholderScreen title="My Posts" />;

// Create Stack Navigators
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Feed Stack Navigator
const FeedStackNavigator: React.FC = () => (
  <FeedStack.Navigator screenOptions={{ headerShown: false }}>
    <FeedStack.Screen name="Feed" component={FeedScreen} />
    <FeedStack.Screen name="PostDetail" component={PostDetailScreen} />
    <FeedStack.Screen name="UserProfile" component={UserProfileScreen} />
    <FeedStack.Screen name="Hashtag" component={HashtagScreen} />
    <FeedStack.Screen name="Clubs" component={ClubsScreen} />
    <FeedStack.Screen name="ClubDetail" component={ClubDetailScreen} />
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

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarLabelStyle: {
          fontSize: Typography.fontSize.xs,
          fontWeight: Typography.fontWeight.medium,
          marginTop: -4,
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.gray[200],
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: 8,
          ...Shadows.sm,
        },
        tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'FeedTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'LearnTab':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'MessagesTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
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
        options={{ title: 'Feed' }}
      />
      <Tab.Screen
        name="LearnTab"
        component={LearnStackNavigator}
        options={{ title: 'Learn' }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
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
});

export default MainNavigator;
