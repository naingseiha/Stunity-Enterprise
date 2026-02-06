/**
 * App Constants
 * 
 * Static values used throughout the app
 */

// Screen names
export const SCREENS = {
  // Auth
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  VERIFY_OTP: 'VerifyOTP',
  RESET_PASSWORD: 'ResetPassword',
  
  // Main tabs
  FEED_TAB: 'FeedTab',
  LEARN_TAB: 'LearnTab',
  MESSAGES_TAB: 'MessagesTab',
  PROFILE_TAB: 'ProfileTab',
  
  // Feed
  FEED: 'Feed',
  POST_DETAIL: 'PostDetail',
  USER_PROFILE: 'UserProfile',
  HASHTAG: 'Hashtag',
  CLUBS: 'Clubs',
  CLUB_DETAIL: 'ClubDetail',
  EVENTS: 'Events',
  EVENT_DETAIL: 'EventDetail',
  CREATE_POST: 'CreatePost',
  CREATE_STORY: 'CreateStory',
  STORY_VIEWER: 'StoryViewer',
  COMMENTS: 'Comments',
  SEARCH: 'Search',
  
  // Learn
  LEARN: 'Learn',
  COURSE_DETAIL: 'CourseDetail',
  LESSON_VIEWER: 'LessonViewer',
  CREATE_COURSE: 'CreateCourse',
  EDIT_COURSE: 'EditCourse',
  LEARNING_PATH: 'LearningPath',
  MY_COURSES: 'MyCourses',
  MY_CREATED_COURSES: 'MyCreatedCourses',
  
  // Messages
  CONVERSATIONS: 'Conversations',
  CHAT: 'Chat',
  NEW_MESSAGE: 'NewMessage',
  GROUP_INFO: 'GroupInfo',
  
  // Profile
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
  CONNECTIONS: 'Connections',
  SETTINGS: 'Settings',
  BOOKMARKS: 'Bookmarks',
  MY_POSTS: 'MyPosts',
  NOTIFICATIONS: 'Notifications',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'stunity_auth_token',
  REFRESH_TOKEN: 'stunity_refresh_token',
  USER_ID: 'stunity_user_id',
  THEME: 'stunity_theme',
  LANGUAGE: 'stunity_language',
  ONBOARDING_COMPLETE: 'stunity_onboarding_complete',
  PUSH_TOKEN: 'stunity_push_token',
  LAST_SYNC: 'stunity_last_sync',
  DRAFT_POST: 'stunity_draft_post',
  SEARCH_HISTORY: 'stunity_search_history',
} as const;

// API endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_OTP: '/auth/verify-otp',
  
  // User
  ME: '/users/me',
  USER: (id: string) => `/users/${id}`,
  USER_PROFILE: (id: string) => `/users/${id}/profile`,
  FOLLOW: (id: string) => `/users/${id}/follow`,
  FOLLOWERS: (id: string) => `/users/${id}/followers`,
  FOLLOWING: (id: string) => `/users/${id}/following`,
  
  // Posts
  POSTS: '/posts',
  POST: (id: string) => `/posts/${id}`,
  LIKE_POST: (id: string) => `/posts/${id}/like`,
  BOOKMARK_POST: (id: string) => `/posts/${id}/bookmark`,
  POST_COMMENTS: (id: string) => `/posts/${id}/comments`,
  
  // Stories
  STORIES: '/stories',
  STORY: (id: string) => `/stories/${id}`,
  VIEW_STORY: (id: string) => `/stories/${id}/view`,
  REACT_STORY: (id: string) => `/stories/${id}/react`,
  
  // Courses
  COURSES: '/courses',
  COURSE: (id: string) => `/courses/${id}`,
  ENROLL: (id: string) => `/courses/${id}/enroll`,
  LESSONS: (courseId: string) => `/courses/${courseId}/lessons`,
  LESSON: (courseId: string, lessonId: string) => `/courses/${courseId}/lessons/${lessonId}`,
  COMPLETE_LESSON: (courseId: string, lessonId: string) => `/courses/${courseId}/lessons/${lessonId}/complete`,
  
  // Messages
  CONVERSATIONS: '/conversations',
  CONVERSATION: (id: string) => `/conversations/${id}`,
  MESSAGES: (conversationId: string) => `/conversations/${conversationId}/messages`,
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  MARK_READ: (id: string) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  
  // Upload
  UPLOAD: '/upload',
  UPLOAD_PROFILE: '/upload/profile',
  UPLOAD_COVER: '/upload/cover',
} as const;

// Error codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN: 'UNKNOWN',
} as const;

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  HASHTAG: /#(\w+)/g,
  MENTION: /@(\w+)/g,
} as const;

// Limits
export const LIMITS = {
  MAX_POST_LENGTH: 5000,
  MAX_COMMENT_LENGTH: 1000,
  MAX_BIO_LENGTH: 500,
  MAX_HEADLINE_LENGTH: 120,
  MAX_IMAGES_PER_POST: 10,
  MAX_FILE_SIZE_MB: 10,
  MAX_VIDEO_SIZE_MB: 100,
  STORY_DURATION_SECONDS: 15,
  STORY_MAX_CHARACTERS: 500,
  SEARCH_HISTORY_LIMIT: 20,
  MESSAGES_PAGE_SIZE: 50,
  NOTIFICATIONS_PAGE_SIZE: 30,
} as const;

// Animation durations
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
} as const;
