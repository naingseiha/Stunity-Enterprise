# Feed Media Upload Implementation

## Overview

This document describes the complete implementation of media upload functionality for the Stunity Enterprise social feed, including Cloudflare R2 storage integration, multiple post types, and full CRUD operations for posts.

## Features Implemented

### 1. Cloudflare R2 Media Storage

**Location:** `services/feed-service/src/utils/r2.ts`

The feed service now supports uploading media files to Cloudflare R2, an S3-compatible object storage service.

#### Configuration

Environment variables in `.env`:
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=stunityapp
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

#### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload multiple files (max 10, 10MB each) |
| DELETE | `/upload/:key` | Delete a file by its R2 key |

#### Supported File Types
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX

#### Upload Response
```json
{
  "success": true,
  "data": [
    {
      "url": "https://pub-xxxxx.r2.dev/posts/1234567890-abc123.jpg",
      "key": "posts/1234567890-abc123.jpg",
      "size": 102400,
      "type": "image/jpeg",
      "originalName": "photo.jpg"
    }
  ]
}
```

### 2. Expanded Post Types

The feed now supports **10 post types** in the Create Post modal (15 total in the schema):

| Post Type | Icon | Description |
|-----------|------|-------------|
| ARTICLE | FileText | General articles and updates |
| COURSE | BookOpen | Course announcements |
| QUIZ | HelpCircle | Quiz posts |
| QUESTION | HelpCircle | Questions for the community |
| ANNOUNCEMENT | Megaphone | Important announcements |
| TUTORIAL | BookOpen | Educational tutorials |
| RESOURCE | FolderOpen | Shared resources |
| PROJECT | Rocket | Project showcases |
| RESEARCH | Microscope | Research papers/findings |
| COLLABORATION | UsersRound | Collaboration requests |

Additional types in schema: EXAM, ASSIGNMENT, POLL, ACHIEVEMENT, REFLECTION

### 3. Post Detail Page

**Location:** `apps/web/src/app/[locale]/feed/post/[id]/page.tsx`

Features:
- Full post content display
- Media gallery with lightbox
- Like/Unlike functionality
- Bookmark functionality
- Comment system with replies
- Edit/Delete options for post author
- Poll results display
- Navigation arrows for multiple images

### 4. Edit Post Page

**Location:** `apps/web/src/app/[locale]/feed/post/[id]/edit/page.tsx`

Features:
- Edit post content
- Change visibility (Public, School, Private)
- Remove existing media
- Add new media files
- Upload to R2 on save

### 5. Create Post Modal Enhancements

**Location:** `apps/web/src/components/feed/CreatePostModal.tsx`

Features:
- 10 post type selection with icons
- Multiple file upload (images)
- Image preview grid
- Media display mode selection (Auto, Grid, Carousel)
- Poll creation with multiple options
- Visibility settings
- Upload progress indicator

### 6. PostCard Improvements

**Location:** `apps/web/src/components/feed/PostCard.tsx`

Features:
- Click on content navigates to post detail
- All 15 post types styled with unique colors/icons
- Media gallery integration
- Like, comment, share, bookmark actions

## Technical Implementation

### Upload Flow

```
1. User selects files in CreatePostModal
   ↓
2. Files stored in state (mediaFiles[])
   ↓
3. Preview URLs generated for display
   ↓
4. On submit: Files uploaded to R2 via FormData
   ↓
5. R2 returns public URLs
   ↓
6. Post created with mediaUrls array
   ↓
7. Feed refreshes to show new post
```

### Authentication

All API calls use `TokenManager.getAccessToken()` from `@/lib/api/auth` for consistent token handling.

### Next.js Image Configuration

R2 domain added to `next.config.js`:
```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'pub-772730709ea64ee7824db864842e5bc0.r2.dev',
      pathname: '/**',
    },
  ],
},
```

## Files Modified/Created

### Created
- `services/feed-service/src/utils/r2.ts` - R2 upload utility
- `apps/web/src/app/[locale]/feed/post/[id]/page.tsx` - Post detail page
- `apps/web/src/app/[locale]/feed/post/[id]/edit/page.tsx` - Edit post page

### Modified
- `services/feed-service/src/index.ts` - Added upload endpoints
- `services/feed-service/package.json` - Added AWS SDK dependencies
- `apps/web/src/components/feed/CreatePostModal.tsx` - R2 upload integration
- `apps/web/src/components/feed/PostCard.tsx` - Added Link to detail page
- `apps/web/src/app/[locale]/feed/page.tsx` - Fixed handleCreatePost to include mediaUrls
- `apps/web/next.config.js` - Added R2 image domain
- `.env` - Added R2 credentials

## API Reference

### Feed Service Endpoints (Port 3010)

#### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | Get feed posts (paginated) |
| POST | `/posts` | Create new post |
| GET | `/posts/:id` | Get single post |
| PUT | `/posts/:id` | Update post |
| DELETE | `/posts/:id` | Delete post |
| POST | `/posts/:id/like` | Like/unlike post |
| POST | `/posts/:id/bookmark` | Bookmark/unbookmark |
| POST | `/posts/:id/share` | Record share |
| POST | `/posts/:id/vote` | Vote on poll |
| POST | `/posts/:id/view` | Track view |
| GET | `/posts/:id/comments` | Get comments |
| POST | `/posts/:id/comments` | Add comment |

#### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload files to R2 |
| DELETE | `/upload/:key` | Delete file from R2 |

#### User Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/my-posts` | Get current user's posts |
| GET | `/bookmarks` | Get bookmarked posts |

#### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts/:id/analytics` | Post analytics (author only) |
| GET | `/analytics/my-insights` | User insights |
| GET | `/analytics/trending` | Trending posts |
| GET | `/analytics/activity` | Activity dashboard |

## Testing

### Manual Testing Checklist

- [x] Create post with text only
- [x] Create post with single image
- [x] Create post with multiple images
- [x] View post detail page
- [x] Edit post content
- [x] Add images to existing post
- [x] Remove images from post
- [x] Delete post
- [x] Like/unlike post
- [x] Add comments
- [x] Bookmark post
- [x] Create poll post
- [x] Vote on poll

### API Testing

```bash
# Test upload
curl -X POST http://localhost:3010/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@image.jpg"

# Create post with media
curl -X POST http://localhost:3010/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test post with image",
    "postType": "ARTICLE",
    "visibility": "SCHOOL",
    "mediaUrls": ["https://pub-xxxxx.r2.dev/posts/example.jpg"]
  }'
```

## Known Limitations

1. **Video uploads not yet supported** - Only images currently
2. **File size limit** - 10MB per file, 10 files max
3. **No image compression** - Images uploaded at original size

## Next Steps

See `NEXT_IMPLEMENTATION.md` for upcoming features.
