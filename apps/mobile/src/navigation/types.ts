/**
 * Navigation Types
 * 
 * Type definitions for React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Modal screens
  CreatePost: undefined;
  CreateStory: undefined;
  PostDetail: { postId: string };
  StoryViewer: { groupIndex: number };
  CourseDetail: { courseId: string };
  LessonViewer: { courseId: string; lessonId: string };
  UserProfile: { userId: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Search: undefined;
  Comments: { postId: string };
  ImageViewer: { images: string[]; initialIndex?: number };
};

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { token: string };
};

// Main Tab Navigator
export type MainTabParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  LearnTab: NavigatorScreenParams<LearnStackParamList>;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Feed Stack
export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  Hashtag: { tag: string };
  Clubs: undefined;
  ClubDetail: { clubId: string };
  Events: undefined;
  EventDetail: { eventId: string };
};

// Learn Stack
export type LearnStackParamList = {
  LearnHub: undefined;
  CourseDetail: { courseId: string };
  LessonViewer: { courseId: string; lessonId: string };
  CreateCourse: undefined;
  EditCourse: { courseId: string };
  LearningPath: { pathId: string };
  MyCourses: undefined;
  MyCreatedCourses: undefined;
};

// Messages Stack
export type MessagesStackParamList = {
  Conversations: undefined;
  Chat: { conversationId?: string; userId?: string };
  NewMessage: undefined;
  GroupInfo: { conversationId: string };
};

// Profile Stack
export type ProfileStackParamList = {
  Profile: { userId?: string } | undefined;
  EditProfile: undefined;
  Connections: { type: 'followers' | 'following' };
  Settings: undefined;
  Bookmarks: undefined;
  MyPosts: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type FeedStackScreenProps<T extends keyof FeedStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<FeedStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

export type LearnStackScreenProps<T extends keyof LearnStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<LearnStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

export type MessagesStackScreenProps<T extends keyof MessagesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MessagesStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    MainTabScreenProps<keyof MainTabParamList>
  >;

// Declare global types for useNavigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
