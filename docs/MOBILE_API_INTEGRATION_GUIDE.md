# 📱 Mobile App - API Integration Guide

**Version:** 1.0  
**Last Updated:** February 8, 2026  
**Status:** Ready to Implement 🚀

---

## 📋 Overview

This guide provides a complete roadmap for integrating the Stunity mobile app with the backend microservices. The mobile UI is 100% complete and ready for API integration.

---

## 🎯 Integration Phases

### Phase 1: Foundation (Week 1) 🔐

#### 1.1 Install Dependencies
```bash
cd apps/mobile
npm install @react-native-async-storage/async-storage axios zustand
npm install @tanstack/react-query socket.io-client
npm install expo-image-picker expo-notifications
```

#### 1.2 Create API Configuration
**File:** `src/config/api.ts`
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'
  : process.env.EXPO_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      // Navigate to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 1.3 Create Authentication Store
**File:** `src/stores/authStore.ts`
```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/config/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePictureUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  register: async (data) => {
    try {
      const response = await apiClient.post('/auth/register', data);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      set({ user, token, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem('authToken');
      
      if (token) {
        const response = await apiClient.get('/auth/me');
        set({ user: response.data, token, isAuthenticated: true });
      }
    } catch (error) {
      await AsyncStorage.removeItem('authToken');
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

#### 1.4 Update Login Screen
**File:** `src/screens/auth/LoginScreen.tsx`
```typescript
// Add to existing login screen
import { useAuthStore } from '@/stores/authStore';

const handleLogin = async () => {
  try {
    setIsLoading(true);
    await useAuthStore.getState().login(email, password);
    // Navigation handled by root navigator
  } catch (error) {
    Alert.alert('Error', error.message || 'Login failed');
  } finally {
    setIsLoading(false);
  }
};
```

---

### Phase 2: Feed Integration (Week 2) 📰

#### 2.1 Create Feed Service
**File:** `src/services/feedService.ts`
```typescript
import apiClient from '@/config/api';

export const feedService = {
  // Get feed posts
  getPosts: async (page = 1, limit = 10) => {
    return apiClient.get('/posts', { params: { page, limit } });
  },

  // Create post
  createPost: async (data: FormData) => {
    return apiClient.post('/posts', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Like/unlike post
  toggleLike: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/like`);
  },

  // Get comments
  getComments: async (postId: string, page = 1) => {
    return apiClient.get(`/posts/${postId}/comments`, { params: { page } });
  },

  // Add comment
  addComment: async (postId: string, content: string) => {
    return apiClient.post(`/posts/${postId}/comments`, { content });
  },

  // Get stories
  getStories: async () => {
    return apiClient.get('/stories');
  },

  // Create story
  createStory: async (data: FormData) => {
    return apiClient.post('/stories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

#### 2.2 Update Feed Screen
**File:** `src/screens/feed/FeedScreen.tsx`
```typescript
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '@/services/feedService';

// Replace mock data with real API
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  refetch,
  isLoading,
} = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam = 1 }) => feedService.getPosts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});

// Like mutation
const likeMutation = useMutation({
  mutationFn: feedService.toggleLike,
  onSuccess: () => {
    queryClient.invalidateQueries(['posts']);
  },
});

// Handle infinite scroll
const handleLoadMore = () => {
  if (hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
};
```

#### 2.3 Update Create Post Screen
**File:** `src/screens/feed/CreatePostScreen.tsx`
```typescript
import * as ImagePicker from 'expo-image-picker';
import { feedService } from '@/services/feedService';

const handleCreatePost = async () => {
  try {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('content', content);
    
    if (selectedImages.length > 0) {
      selectedImages.forEach((image, index) => {
        formData.append(`images`, {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        } as any);
      });
    }
    
    await feedService.createPost(formData);
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', 'Failed to create post');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Phase 3: Profile Integration (Week 3) 👤

#### 3.1 Create Profile Service
**File:** `src/services/profileService.ts`
```typescript
import apiClient from '@/config/api';

export const profileService = {
  // Get user profile
  getProfile: async (userId: string) => {
    return apiClient.get(`/students/${userId}`);
  },

  // Update profile
  updateProfile: async (userId: string, data: any) => {
    return apiClient.put(`/students/${userId}`, data);
  },

  // Get user stats
  getStats: async (userId: string) => {
    return apiClient.get(`/students/${userId}/stats`);
  },

  // Get performance data
  getPerformance: async (userId: string) => {
    return apiClient.get(`/students/${userId}/performance`);
  },

  // Upload avatar
  uploadAvatar: async (userId: string, imageUri: string) => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
    
    return apiClient.post(`/students/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Upload cover photo
  uploadCover: async (userId: string, imageUri: string) => {
    const formData = new FormData();
    formData.append('cover', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'cover.jpg',
    } as any);
    
    return apiClient.post(`/students/${userId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

#### 3.2 Update Profile Screen
**File:** `src/screens/profile/ProfileScreen.tsx`
```typescript
import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';
import { useAuthStore } from '@/stores/authStore';

const ProfileScreen = () => {
  const user = useAuthStore((state) => state.user);
  
  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profileService.getProfile(user!.id),
    enabled: !!user,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => profileService.getStats(user!.id),
    enabled: !!user,
  });

  // Fetch performance
  const { data: performance } = useQuery({
    queryKey: ['performance', user?.id],
    queryFn: () => profileService.getPerformance(user!.id),
    enabled: !!user,
  });

  // Use real data instead of mock data
  // ...
};
```

#### 3.3 Update Edit Profile Screen
**File:** `src/screens/profile/EditProfileScreen.tsx`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';

const EditProfileScreen = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileService.updateProfile(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile', user?.id]);
      navigation.goBack();
    },
  });

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        headline,
        bio,
        location,
        interests: interests.split(',').map(i => i.trim()),
        socialLinks: {
          github: githubUrl,
          linkedin: linkedinUrl,
          facebook: facebookUrl,
          portfolio: portfolioUrl,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };
};
```

---

### Phase 4: Messages Integration (Week 4) 💬

#### 4.1 Create Messaging Service
**File:** `src/services/messagingService.ts`
```typescript
import apiClient from '@/config/api';
import io from 'socket.io-client';

export const messagingService = {
  // Get conversations
  getConversations: async () => {
    return apiClient.get('/conversations');
  },

  // Get messages
  getMessages: async (conversationId: string, page = 1) => {
    return apiClient.get(`/conversations/${conversationId}/messages`, {
      params: { page },
    });
  },

  // Send message
  sendMessage: async (conversationId: string, content: string) => {
    return apiClient.post(`/conversations/${conversationId}/messages`, {
      content,
    });
  },

  // Mark as read
  markAsRead: async (conversationId: string) => {
    return apiClient.put(`/conversations/${conversationId}/read-all`);
  },

  // Get unread count
  getUnreadCount: async () => {
    return apiClient.get('/unread-count');
  },
};

// WebSocket for real-time messaging
export const createSocket = (token: string) => {
  const socket = io(process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3000', {
    auth: { token },
  });
  
  return socket;
};
```

#### 4.2 Update Conversations Screen
**File:** `src/screens/messages/ConversationsScreen.tsx`
```typescript
import { useQuery } from '@tanstack/react-query';
import { messagingService } from '@/services/messagingService';

const ConversationsScreen = () => {
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: messagingService.getConversations,
  });

  // Replace mock data with real conversations
  // ...
};
```

#### 4.3 Create Real-time Chat Hook
**File:** `src/hooks/useChat.ts`
```typescript
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { createSocket } from '@/services/messagingService';

export const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState([]);
  const token = useAuthStore((state) => state.token);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = createSocket(token);
    setSocket(newSocket);

    newSocket.emit('join', conversationId);

    newSocket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [conversationId, token]);

  const sendMessage = (content: string) => {
    socket?.emit('message', { conversationId, content });
  };

  return { messages, sendMessage };
};
```

---

### Phase 5: Learn & Clubs (Week 5) 📚

#### 5.1 Create Learn Service
**File:** `src/services/learnService.ts`
```typescript
import apiClient from '@/config/api';

export const learnService = {
  getClasses: async () => {
    return apiClient.get('/classes');
  },

  getCourses: async () => {
    return apiClient.get('/courses');
  },

  getCourseDetail: async (courseId: string) => {
    return apiClient.get(`/courses/${courseId}`);
  },

  enrollCourse: async (courseId: string) => {
    return apiClient.post(`/courses/${courseId}/enroll`);
  },
};
```

#### 5.2 Update Learn Screen
```typescript
import { useQuery } from '@tanstack/react-query';
import { learnService } from '@/services/learnService';

const { data: courses, isLoading } = useQuery({
  queryKey: ['courses'],
  queryFn: learnService.getCourses,
});
```

---

## 🔧 Additional Setup

### Query Client Setup
**File:** `App.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Rest of app */}
    </QueryClientProvider>
  );
}
```

### Push Notifications
```typescript
import * as Notifications from 'expo-notifications';

// Request permissions
const { status } = await Notifications.requestPermissionsAsync();

// Get push token
const token = await Notifications.getExpoPushTokenAsync();

// Send to backend
await apiClient.post('/notifications/register', { token });
```

---

## 📊 Testing Strategy

### Unit Tests
- API service functions
- Store actions
- Utility functions

### Integration Tests
- Authentication flow
- Post creation flow
- Message sending flow

### E2E Tests
- Login → Create Post → Logout
- Login → Send Message → Receive Response
- Profile Update Flow

---

## 🚀 Deployment Checklist

- [ ] Update API_BASE_URL for production
- [ ] Configure WebSocket URL
- [ ] Set up push notifications
- [ ] Enable offline mode
- [ ] Add error tracking (Sentry)
- [ ] Set up analytics
- [ ] Build iOS/Android apps
- [ ] Submit to App Store/Play Store

---

## 📝 Notes

- All mock data should be replaced with API calls
- Loading states are already in place
- Error handling needs to be added
- Offline mode with AsyncStorage caching recommended
- Image optimization needed for production

---

**Ready to start?** Begin with Phase 1 (Authentication) and move sequentially through each phase.
