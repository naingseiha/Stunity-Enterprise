export interface Notification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'POLL_VOTE' | 'POLL_RESULT' | 'MENTION' | 'FOLLOW' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  post?: {
    id: string;
    content: string;
  };
  link?: string;
}

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  polls: boolean;
  mentions: boolean;
  follows: boolean;
  system: boolean;
  soundEnabled: boolean;
  emailEnabled: boolean;
}
