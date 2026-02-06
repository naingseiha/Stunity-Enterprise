/**
 * Core Type Definitions
 * 
 * Shared types used throughout the application
 */

// User Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  headline?: string;
  professionalTitle?: string;
  location?: string;
  languages: string[];
  interests: string[];
  isVerified: boolean;
  isOnline: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 
  | 'STUDENT'
  | 'TEACHER'
  | 'PARENT'
  | 'ADMIN'
  | 'SCHOOL_ADMIN'
  | 'STAFF';

export interface UserStats {
  posts: number;
  followers: number;
  following: number;
  courses: number;
  enrollments: number;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

// Post Types
export interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  author: User;
  authorId: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
  createdAt: string;
}

// Story Types
export interface Story {
  id: string;
  author: User;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  duration: number;
  viewCount: number;
  isViewed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

// Course Types
export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  instructor: User;
  category: string;
  level: CourseLevel;
  price: number;
  currency: string;
  duration: number; // in minutes
  totalLessons: number;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  isPublished: boolean;
  isEnrolled?: boolean;
  progress?: number;
  tags: string[];
  requirements: string[];
  learningOutcomes: string[];
  createdAt: string;
  updatedAt: string;
}

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description?: string;
  type: LessonType;
  contentUrl?: string;
  duration: number;
  order: number;
  isCompleted?: boolean;
  isFree: boolean;
}

export type LessonType = 'VIDEO' | 'ARTICLE' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE';

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  level: CourseLevel;
  courseIds: string[];
  courses?: Course[];
  estimatedDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  course: Course;
  progress: number;
  completedLessons: string[];
  startedAt: string;
  lastAccessedAt: string;
  completedAt?: string;
}

// Message Types
export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupIcon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  isRead: boolean;
  readBy: string[];
  createdAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'SYSTEM';

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  actor?: User;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'MENTION'
  | 'MESSAGE'
  | 'COURSE_UPDATE'
  | 'ENROLLMENT'
  | 'ACHIEVEMENT'
  | 'SYSTEM';

// Club & Event Types
export interface Club {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  category: string;
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
  privacy: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  attendeeCount: number;
  maxAttendees?: number;
  isAttending: boolean;
  organizer: User;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
