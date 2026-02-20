# 📱 Stunity Feed System Documentation

**Version:** 4.0  
**Last Updated:** February 20, 2026

> **v4.0 Changes:** Scale optimizations for millions of users (parallel DB queries, Redis SCAN, bulk view inserts), Cloud Run deployment fixes, scroll performance improvements, feed visibility fix for new posts, quiz detail complete, comment real-time fix, repost SHARE notification, analytics DB-level aggregation. See DEVELOPER_GUIDE.md for full details.

---

## Overview

The Stunity Feed System is a comprehensive social media platform integrated into the school management system. It provides a LinkedIn + TikTok-style experience for school community engagement with posts, analytics, media sharing, and real-time interactions — designed to scale to millions of users on Google Cloud Run.

---

## Architecture

### Service Details

| Property | Value |
|----------|-------|
| Service Name | feed-service |
| Port | 3010 |
| Version | 3.0 |
| Database | PostgreSQL (shared with main app) |
| Auth | JWT Bearer Token |

### Related Components

```
apps/web/src/
├── app/[locale]/feed/           # Feed page
│   └── page.tsx                 # Main feed with 3-column layout
└── components/feed/
    ├── PostCard.tsx             # Individual post display
    ├── CreatePostModal.tsx      # Post creation form
    ├── MediaGallery.tsx         # Image grid layouts
    ├── PostAnalyticsModal.tsx   # Post statistics
    ├── InsightsDashboard.tsx    # User insights
    ├── TrendingSection.tsx      # Trending sidebar
    ├── ActivityDashboard.tsx    # Activity charts
    └── FeedZoomLoader.tsx       # Loading animation

services/feed-service/
└── src/
    └── index.ts                 # All API endpoints
```

---

## API Reference

### Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Posts

#### GET /posts
Get paginated posts from user's school and public posts.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Posts per page |
| type | string | - | Filter by post type |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "content": "Post content...",
      "postType": "ARTICLE",
      "visibility": "SCHOOL",
      "mediaUrls": [],
      "mediaDisplayMode": "AUTO",
      "likesCount": 5,
      "commentsCount": 2,
      "sharesCount": 1,
      "isLikedByMe": false,
      "author": {
        "id": "...",
        "firstName": "John",
        "lastName": "Doe",
        "profilePictureUrl": null,
        "role": "TEACHER"
      },
      "createdAt": "2026-02-05T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### POST /posts
Create a new post.

**Request Body:**
```json
{
  "content": "My post content",
  "postType": "ARTICLE",
  "visibility": "SCHOOL",
  "mediaUrls": ["https://..."],
  "mediaDisplayMode": "AUTO",
  "pollOptions": ["Option 1", "Option 2"]
}
```

**Post Types:**
| Type | Description |
|------|-------------|
| ARTICLE | General posts/updates |
| POLL | Poll with voting options |
| ANNOUNCEMENT | Official announcements |
| QUESTION | Q&A style posts |
| ACHIEVEMENT | Celebration posts |

**Visibility Options:**
| Option | Description |
|--------|-------------|
| PUBLIC | Anyone can see |
| SCHOOL | School members only |
| CLASS | Class members only |
| PRIVATE | Only author |

**Media Display Modes:**
| Mode | Description |
|------|-------------|
| AUTO | Auto-detect based on image dimensions |
| FIXED_HEIGHT | Cropped landscape (consistent height) |
| FULL_HEIGHT | Full image height (for posters) |

#### PUT /posts/:id
Update a post (author only).

**Request Body:**
```json
{
  "content": "Updated content",
  "visibility": "PUBLIC",
  "mediaUrls": [],
  "mediaDisplayMode": "FULL_HEIGHT"
}
```

#### DELETE /posts/:id
Delete a post (author or admin only).

### Interactions

#### POST /posts/:id/like
Toggle like on a post.

**Response:**
```json
{
  "success": true,
  "isLiked": true,
  "likesCount": 6
}
```

#### POST /posts/:id/bookmark
Toggle bookmark on a post.

**Response:**
```json
{
  "success": true,
  "isBookmarked": true
}
```

#### POST /posts/:id/share
Track a share action.

**Response:**
```json
{
  "success": true,
  "sharesCount": 2
}
```

#### POST /posts/:id/view
Track post view (deduplicated per user per hour).

**Request Body:**
```json
{
  "source": "feed",
  "duration": 5000
}
```

**Source Options:**
- `feed` - Viewed from main feed
- `direct` - Viewed via direct link
- `share` - Viewed from shared link

### Comments

#### GET /posts/:id/comments
Get comments for a post.

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| page | number | 1 |
| limit | number | 20 |

#### POST /posts/:id/comments
Add a comment to a post.

**Request Body:**
```json
{
  "content": "My comment"
}
```

#### DELETE /comments/:id
Delete a comment (author only).

### Polls

#### POST /posts/:id/vote
Vote on a poll option.

**Request Body:**
```json
{
  "optionId": "option_cuid_here"
}
```

### User Content

#### GET /my-posts
Get current user's posts.

#### GET /bookmarks
Get bookmarked posts.

### Analytics

#### GET /posts/:id/analytics
Get detailed analytics for a post (author only).

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalViews": 150,
    "uniqueViewers": 45,
    "avgDuration": 8500,
    "engagementRate": 12.5,
    "dailyViews": [
      { "date": "2026-02-01", "views": 20 },
      { "date": "2026-02-02", "views": 35 }
    ],
    "viewsBySource": {
      "feed": 100,
      "direct": 30,
      "share": 20
    }
  }
}
```

#### GET /analytics/my-insights
Get user's posts performance overview.

**Query Parameters:**
| Param | Type | Default | Options |
|-------|------|---------|---------|
| period | string | 7d | 7d, 30d, 90d |

**Response:**
```json
{
  "success": true,
  "insights": {
    "totalViews": 500,
    "totalLikes": 120,
    "totalComments": 45,
    "topPosts": [...],
    "postsByType": {
      "ARTICLE": 10,
      "POLL": 3,
      "ANNOUNCEMENT": 2
    }
  }
}
```

#### GET /analytics/trending
Get trending posts.

**Query Parameters:**
| Param | Type | Default | Options |
|-------|------|---------|---------|
| period | string | 7d | 24h, 7d, 30d |
| limit | number | 10 | - |

**Trending Score Algorithm:**
```
score = views + (likes × 3) + (comments × 5) + (shares × 2)
```

#### GET /analytics/activity
Get user activity dashboard data.

**Response:**
```json
{
  "success": true,
  "activity": {
    "postsThisWeek": 5,
    "postsThisMonth": 15,
    "likesGiven": 30,
    "likesReceived": 45,
    "commentsGiven": 12,
    "commentsReceived": 20,
    "dailyActivity": [
      { "date": "Mon", "posts": 1, "likes": 5, "comments": 2 }
    ]
  }
}
```

---

## Frontend Components

### PostCard

Displays a single post with all interactions.

**Props:**
```typescript
interface PostCardProps {
  post: PostData;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onVote?: (postId: string, optionId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
  onViewAnalytics?: (postId: string) => void;
  currentUserId?: string;
}
```

### MediaGallery

Displays post images in responsive grid layouts.

**Props:**
```typescript
interface MediaGalleryProps {
  mediaUrls: string[];
  displayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
  onImageClick?: (index: number) => void;
  className?: string;
}
```

**Layout Behavior:**
| Images | Layout |
|--------|--------|
| 1 | Single image (full width) |
| 2 | 2-column grid |
| 3 | Large left + 2 small right |
| 4+ | 2x2 grid with "+N" indicator |

### MediaLightbox

Full-screen image viewer with navigation.

**Features:**
- Zoom in/out
- Navigation arrows
- Keyboard shortcuts (←/→/Esc)
- Download button
- Thumbnail strip

### CreatePostModal

Post creation form with all options.

**Features:**
- Post type selector (5 types)
- Visibility selector (4 options)
- Poll options (2-6 options)
- Media upload with preview
- Display mode selector
- Character counter

### TrendingSection

Sidebar showing trending posts.

**Features:**
- Period selector (24h/7d/30d)
- Ranked post list
- View counts
- Author info

### InsightsDashboard

User's posts performance overview.

**Features:**
- Period selector (7d/30d/90d)
- Total stats cards
- Top performing posts
- Posts by type breakdown

### ActivityDashboard

User activity visualization.

**Features:**
- Posts this week/month
- Likes given vs received
- Comments given vs received
- Daily activity chart

---

## Database Schema

### Post Model
```prisma
model Post {
  id                String         @id @default(cuid())
  authorId          String
  content           String
  mediaUrls         String[]
  mediaDisplayMode  String?        @default("AUTO")
  postType          PostType       @default(ARTICLE)
  visibility        PostVisibility @default(SCHOOL)
  likesCount        Int            @default(0)
  commentsCount     Int            @default(0)
  sharesCount       Int            @default(0)
  isEdited          Boolean        @default(false)
  isPinned          Boolean        @default(false)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  
  author            User           @relation(...)
  comments          Comment[]
  likes             Like[]
  bookmarks         Bookmark[]
  pollOptions       PollOption[]
  views             PostView[]
}
```

### PostView Model
```prisma
model PostView {
  id        String   @id @default(cuid())
  postId    String
  userId    String
  viewedAt  DateTime @default(now())
  duration  Int?
  source    String?
  ipAddress String?
  
  post      Post     @relation(...)
  user      User     @relation(...)
}
```

---

## UI Layout

### Desktop (lg+)

```
┌──────────────────────────────────────────────────────────┐
│                     Navigation Bar                        │
├──────────────┬────────────────────────┬──────────────────┤
│              │                        │                  │
│  Left        │     Center Feed        │    Right         │
│  Sidebar     │                        │    Sidebar       │
│  (Profile)   │   [Create Post Box]    │   (Trending)     │
│              │                        │                  │
│  - Stats     │   [Posts Feed]         │   - Quick        │
│  - Links     │                        │     Actions      │
│  - School    │                        │                  │
│              │                        │   - Footer       │
│              │                        │                  │
└──────────────┴────────────────────────┴──────────────────┘
    3 cols            6 cols                  3 cols
```

### Mobile

```
┌────────────────────────┐
│      Navigation        │
├────────────────────────┤
│   [Tab Navigation]     │
├────────────────────────┤
│   [Create Post Box]    │
├────────────────────────┤
│                        │
│      Posts Feed        │
│                        │
└────────────────────────┘
```

---

## Performance Considerations

### View Tracking
- Views are deduplicated per user per hour
- Non-blocking (errors are silently ignored)
- Batched writes for high-traffic posts

### Caching Strategy
- Posts list: SWR with 2-minute dedup
- Analytics: 5-minute cache
- Trending: 10-minute cache

### Optimizations
- Lazy load images below fold
- Virtual scrolling for long feeds
- Debounced search inputs
- Optimistic UI updates

---

## Error Handling

### Common Errors

| Code | Message | Solution |
|------|---------|----------|
| 401 | Unauthorized | Re-authenticate |
| 403 | Not authorized | Check permissions |
| 404 | Post not found | Post may be deleted |
| 500 | Server error | Retry later |

---

## Future Enhancements

1. **Real-time Updates** - WebSocket for instant post updates
2. **Mentions** - @username mentions with notifications
3. **Hashtags** - Topic tagging and search
4. **Reactions** - Emoji reactions beyond likes
5. **Video Support** - Video upload and playback
6. **Scheduled Posts** - Post scheduling
7. **Draft Saving** - Auto-save drafts
