/**
 * Mock Data for Offline Development
 * 
 * Provides realistic mock data when API is unavailable
 */

import { Post, StoryGroup } from '@/types';

export const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=1',
      role: 'TEACHER',
      isVerified: true,
    },
    content: 'Check out this amazing calculus tutorial! 📐 Understanding derivatives has never been easier. Let me know if you have any questions!',
    postType: 'COURSE',
    mediaUrls: ['https://picsum.photos/400/600?random=1'],
    likes: 142,
    comments: 23,
    shares: 8,
    isLiked: false,
    isBookmarked: false,
    topicTags: ['Mathematics', 'Calculus', 'Education'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 45,
      xpReward: 100,
      participantCount: 234,
      progress: 65,
    },
  },
  {
    id: '2',
    author: {
      id: 'user2',
      firstName: 'Sarah',
      lastName: 'Wilson',
      name: 'Sarah Wilson',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=5',
      role: 'STUDENT',
      isVerified: false,
    },
    content: 'Just finished my chemistry project! 🧪 Thanks to everyone who helped. Here are some cool reactions we captured.',
    postType: 'PROJECT',
    mediaUrls: ['https://picsum.photos/800/450?random=2'],
    likes: 89,
    comments: 15,
    shares: 3,
    isLiked: true,
    isBookmarked: false,
    topicTags: ['Chemistry', 'Science', 'Project'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      xpReward: 75,
      participantCount: 156,
    },
  },
  {
    id: '3',
    author: {
      id: 'user3',
      firstName: 'Mike',
      lastName: 'Chen',
      name: 'Mike Chen',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=8',
      role: 'TEACHER',
      isVerified: true,
    },
    content: 'New physics quiz available! Test your understanding of Newton\'s Laws. Good luck! 🎯',
    postType: 'QUIZ',
    mediaUrls: [],
    likes: 67,
    comments: 12,
    shares: 5,
    isLiked: false,
    isBookmarked: true,
    topicTags: ['Physics', 'Quiz', 'Newton'],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 20,
      xpReward: 50,
      participantCount: 312,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: '4',
    author: {
      id: 'user4',
      firstName: 'Emma',
      lastName: 'Brown',
      name: 'Emma Brown',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=9',
      role: 'STUDENT',
      isVerified: false,
    },
    content: 'Study group meeting tomorrow at 3 PM! 📚 We\'ll be reviewing for the upcoming biology exam. Everyone is welcome!',
    postType: 'ANNOUNCEMENT',
    mediaUrls: ['https://picsum.photos/600/800?random=4'],
    likes: 124,
    comments: 28,
    shares: 12,
    isLiked: false,
    isBookmarked: false,
    topicTags: ['Biology', 'StudyGroup', 'Exam'],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      studyGroupName: 'Biology A+',
      participantCount: 45,
    },
  },
];

export const mockStories: StoryGroup[] = [
  {
    user: {
      id: 'user5',
      firstName: 'Alex',
      lastName: 'Taylor',
      name: 'Alex Taylor',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=12',
      role: 'STUDENT',
    },
    stories: [
      {
        id: 'story1',
        mediaUrl: 'https://picsum.photos/400/700?random=10',
        mediaType: 'IMAGE',
        duration: 5000,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isViewed: false,
      },
    ],
    hasUnviewed: true,
  },
];
