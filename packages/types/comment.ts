export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  postId: string;
  parentId?: string; // For nested replies
  likes: number;
  replies?: Comment[];
  reactions?: {
    like: number;
    love: number;
    helpful: number;
  };
  userReaction?: 'like' | 'love' | 'helpful' | null;
  isEdited: boolean;
  canEdit: boolean;
  canDelete: boolean;
  images?: string[];
  mentions?: string[]; // User IDs mentioned
}

export interface CommentReaction {
  id: string;
  type: 'like' | 'love' | 'helpful';
  userId: string;
  commentId: string;
}

export type CommentSortBy = 'newest' | 'oldest' | 'top';
