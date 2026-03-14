/**
 * Mock Data for Offline Development
 * 
 * Provides realistic mock data when API is unavailable
 */

import { Post, StoryGroup, User, UserRole } from '@/types';

interface MockUserParams {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profilePictureUrl?: string;
  isVerified?: boolean;
}

const createMockUser = ({
  id,
  firstName,
  lastName,
  role,
  profilePictureUrl,
  isVerified = false,
}: MockUserParams): User => {
  const timestamp = new Date().toISOString();
  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    email: `${id}@example.com`,
    role,
    profilePictureUrl,
    languages: [],
    interests: [],
    isVerified,
    isOnline: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const mockPosts: Post[] = [
  {
    id: '1',
    author: createMockUser({
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=1',
      role: 'TEACHER',
      isVerified: true,
    }),
    content: 'Check out this amazing calculus tutorial! 📐 Understanding derivatives has never been easier. Let me know if you have any questions!',
    postType: 'COURSE',
    mediaUrls: ['https://picsum.photos/400/600?random=1'],
    authorId: 'user1',
    likes: 142,
    comments: 23,
    shares: 8,
    isLiked: false,
    isBookmarked: false,
    visibility: 'PUBLIC',
    tags: ['mathematics', 'calculus', 'education'],
    topicTags: ['Mathematics', 'Calculus', 'Education'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
    author: createMockUser({
      id: 'user2',
      firstName: 'Sarah',
      lastName: 'Wilson',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=5',
      role: 'STUDENT',
      isVerified: false,
    }),
    content: 'Just finished my chemistry project! 🧪 Thanks to everyone who helped. Here are some cool reactions we captured.',
    postType: 'PROJECT',
    mediaUrls: ['https://picsum.photos/800/450?random=2'],
    authorId: 'user2',
    likes: 89,
    comments: 15,
    shares: 3,
    isLiked: true,
    isBookmarked: false,
    visibility: 'PUBLIC',
    tags: ['chemistry', 'science', 'project'],
    topicTags: ['Chemistry', 'Science', 'Project'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      difficulty: 'BEGINNER',
      estimatedMinutes: 30,
      xpReward: 75,
      participantCount: 156,
    },
  },
  {
    id: '3',
    author: createMockUser({
      id: 'user3',
      firstName: 'Mike',
      lastName: 'Chen',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=8',
      role: 'TEACHER',
      isVerified: true,
    }),
    content: 'New physics quiz available! Test your understanding of Newton\'s Laws. Good luck! 🎯',
    postType: 'QUIZ',
    mediaUrls: [],
    authorId: 'user3',
    likes: 67,
    comments: 12,
    shares: 5,
    isLiked: false,
    isBookmarked: true,
    visibility: 'PUBLIC',
    tags: ['physics', 'quiz', 'newton'],
    topicTags: ['Physics', 'Quiz', 'Newton'],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
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
    author: createMockUser({
      id: 'user4',
      firstName: 'Emma',
      lastName: 'Brown',
      profilePictureUrl: 'https://i.pravatar.cc/150?img=9',
      role: 'STUDENT',
      isVerified: false,
    }),
    content: 'Study group meeting tomorrow at 3 PM! 📚 We\'ll be reviewing for the upcoming biology exam. Everyone is welcome!',
    postType: 'ANNOUNCEMENT',
    mediaUrls: ['https://picsum.photos/600/800?random=4'],
    authorId: 'user4',
    likes: 124,
    comments: 28,
    shares: 12,
    isLiked: false,
    isBookmarked: false,
    visibility: 'PUBLIC',
    tags: ['biology', 'studygroup', 'exam'],
    topicTags: ['Biology', 'StudyGroup', 'Exam'],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    learningMeta: {
      studyGroupName: 'Biology A+',
      participantCount: 45,
    },
  },
];

const alexStoryUser = createMockUser({
  id: 'user5',
  firstName: 'Alex',
  lastName: 'Taylor',
  profilePictureUrl: 'https://i.pravatar.cc/150?img=12',
  role: 'STUDENT',
});

export const mockStories: StoryGroup[] = [
  {
    user: alexStoryUser,
    stories: [
      {
        id: 'story1',
        author: alexStoryUser,
        type: 'IMAGE',
        mediaUrl: 'https://picsum.photos/400/700?random=10',
        duration: 5000,
        viewCount: 0,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 21 * 60 * 60 * 1000).toISOString(),
        isViewed: false,
      },
    ],
    hasUnviewed: true,
  },
];
