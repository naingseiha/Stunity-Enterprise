# Post Details Page - Design Specification 📱

**Date:** January 28, 2026
**Status:** 🎨 Design Phase
**Priority:** HIGH

---

## 🎯 Problem Statement

**Current Issue:**
- Users cannot click on posts to view full details
- No dedicated page for individual posts
- Comments are cramped in feed view
- Images cannot be viewed in full size
- Cannot share individual post links
- Poor engagement depth

**User Impact:**
- Reduced engagement time
- Difficult to read long posts
- Poor comment thread visibility
- Cannot bookmark/share specific posts
- Not following social media UX patterns

---

## ✨ Solution: Beautiful Post Details Page

### Route Structure
```
/feed/post/[postId]
```

**Example:**
- `/feed/post/cm123abc` - View specific post
- Shareable URL for each post
- Deep linking support

---

## 🎨 Design Specification

### **Layout Structure**

```
┌─────────────────────────────────────┐
│  ← Back    [Post Type]    ⋮ Share  │ ← Header (sticky)
├─────────────────────────────────────┤
│  👤 Author Info + Follow Button     │
├─────────────────────────────────────┤
│                                     │
│  Post Title (Full, no truncation)  │
│                                     │
│  Post Content (Full text)          │
│                                     │
│  📸 Image Gallery (Large)          │
│  or                                │
│  📊 Poll Interface (Interactive)   │
│  or                                │
│  📝 Quiz/Assignment Details        │
│                                     │
├─────────────────────────────────────┤
│  👍 Like  💬 Comment  🔗 Share     │ ← Engagement Bar
│  123 likes • 45 comments • 2.3k views│
├─────────────────────────────────────┤
│                                     │
│  💬 Comments Section                │
│                                     │
│  ┌───────────────────────────┐    │
│  │ 👤 User Name              │    │
│  │ Great post! Thanks...     │    │
│  │ 👍 12  💬 Reply  2h ago   │    │
│  │                           │    │
│  │   ↪️ 👤 Reply to comment  │    │
│  │   └─ Nested reply...      │    │
│  └───────────────────────────┘    │
│                                     │
│  [Load More Comments]              │
│                                     │
├─────────────────────────────────────┤
│  ✍️ Write a comment... [Send]      │ ← Sticky Comment Box
└─────────────────────────────────────┘
```

---

## 📐 Component Breakdown

### 1. **Page Header** (Sticky)

**Desktop:**
```
┌─────────────────────────────────────────────┐
│  ← Back to Feed     [ANNOUNCEMENT]     ⋮ ⬆  │
│                                             │
└─────────────────────────────────────────────┘
```

**Mobile:**
```
┌───────────────────────┐
│ ← [ANNOUNCEMENT]  ⋮ ⬆│
└───────────────────────┘
```

**Elements:**
- Back button (← icon + "Back to Feed" on desktop)
- Post type badge (colored, pill-shaped)
- Action menu (⋮) - Edit, Delete, Report, etc.
- Share button (⬆) - Copy link, social sharing

**Styling:**
- White background with subtle shadow
- Sticky on scroll
- Backdrop blur on scroll
- Height: 60px (mobile), 72px (desktop)

---

### 2. **Author Section**

```
┌─────────────────────────────────────┐
│  👤  John Doe                       │
│      Teacher • Posted 2 hours ago   │
│                            [Follow] │
└─────────────────────────────────────┘
```

**Elements:**
- Profile picture (60px circle)
- Name (bold, 18px)
- Role & timestamp (gray, 14px)
- Follow button (if not own post)
  - Gradient blue when not following
  - Gray outline when following
  - "Following" text when followed

**Styling:**
- Padding: 16px
- Background: white
- Border-bottom: 1px gray-200
- Avatar has online indicator (green dot)

---

### 3. **Content Section**

#### **For All Post Types:**

**Title:**
- Font size: 24px (mobile), 32px (desktop)
- Font weight: 700 (bold)
- Color: gray-900
- Line height: 1.3
- Margin bottom: 16px

**Description:**
- Font size: 16px
- Font weight: 400
- Color: gray-700
- Line height: 1.6
- No truncation (show full text)
- Preserve line breaks
- Linkify URLs

**Metadata:**
- Privacy indicator
- Edit timestamp (if edited)
- View count
- Categories/tags

#### **For Image Posts:**

**Gallery:**
```
┌─────────────────────────────────────┐
│                                     │
│     📸  Large Image Display         │
│     (Full width, rounded corners)   │
│                                     │
│     Image 1 of 4                    │
│     ← →  Swipe/Navigate             │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Large image display (max height: 600px)
- Image carousel for multiple images
- Lightbox on click (full screen)
- Image counter (e.g., "1 of 4")
- Smooth transitions
- Pinch to zoom (mobile)
- Download button

#### **For Polls:**

**Detailed Poll View:**
```
┌─────────────────────────────────────┐
│  📊 Poll Question                   │
│                                     │
│  ○ Option 1  ████████░░ 75% (150)  │
│  ○ Option 2  ███░░░░░░░ 25% (50)   │
│                                     │
│  Total votes: 200                   │
│  Poll ends: Jan 30, 2026            │
│  Your vote: Option 1 ✓              │
│                                     │
│  [View Results] [Export CSV]        │
└─────────────────────────────────────┘
```

**Features:**
- Larger, more prominent options
- Animated progress bars
- Vote totals per option
- Total vote count
- Expiry date (if set)
- Your vote indicator
- Results visualization
- Export option (for creators)

#### **For Quizzes:**

```
┌─────────────────────────────────────┐
│  📝 Quiz: Final Exam Review         │
│                                     │
│  Questions: 10                      │
│  Time limit: 30 minutes             │
│  Attempts: 3 remaining              │
│  Due date: Jan 30, 2026             │
│                                     │
│  [Start Quiz]                       │
│  or                                 │
│  [View Results] (if completed)      │
└─────────────────────────────────────┘
```

#### **For Assignments:**

```
┌─────────────────────────────────────┐
│  📚 Assignment: Essay on Climate    │
│                                     │
│  Due: Jan 30, 2026, 11:59 PM        │
│  Points: 100                        │
│  Status: Not Submitted              │
│                                     │
│  📎 Attachments:                    │
│  - guidelines.pdf                   │
│  - rubric.pdf                       │
│                                     │
│  [Submit Assignment]                │
│  or                                 │
│  [View Submission] (if submitted)   │
└─────────────────────────────────────┘
```

---

### 4. **Engagement Bar**

**Primary Actions:**
```
┌─────────────────────────────────────┐
│  👍 Like   💬 Comment   🔗 Share    │
│  (animated buttons, larger size)    │
│                                     │
│  123 likes • 45 comments • 2.3k views│
└─────────────────────────────────────┘
```

**Styling:**
- Large, touch-friendly buttons (48px height)
- Active state: Filled color
- Inactive state: Outline
- Hover effects: Scale + shadow
- Smooth transitions
- Background: white
- Border: 1px gray-200
- Padding: 16px

**Button States:**
- **Like:**
  - Inactive: Gray outline, gray text
  - Active: Red/pink gradient, white text
  - Animation: Heart beat on click

- **Comment:**
  - Click scrolls to comment section
  - Shows comment count
  - Always outlined (blue)

- **Share:**
  - Opens share modal
  - Options: Copy link, WhatsApp, Telegram, Email
  - Shows share count

---

### 5. **Comments Section**

#### **Comment Composer (Sticky Bottom)**

**Desktop:**
```
┌─────────────────────────────────────┐
│  👤  [Write a comment...]    [Send] │
│      [📷 Image] [😀 Emoji]          │
└─────────────────────────────────────┘
```

**Mobile:**
```
┌─────────────────────────┐
│  [Write a comment...]   │
│  📷 😀           [Send] │
└─────────────────────────┘
```

**Features:**
- Auto-expand textarea
- Character limit: 500
- Image upload
- Emoji picker
- @mention autocomplete
- Preview mode
- Sticky to bottom on mobile
- Fixed at bottom of page on desktop

#### **Comment Thread**

**Top-level Comment:**
```
┌─────────────────────────────────────┐
│  👤  Jane Smith          2h ago     │
│      Student                        │
│                                     │
│  This is amazing! I learned so much│
│  from this post. Thank you! 🙏      │
│                                     │
│  👍 12  💬 Reply  🗑️ Delete         │
│                                     │
│  ↪️ View 3 replies                  │
└─────────────────────────────────────┘
```

**Nested Reply:**
```
  ┌───────────────────────────────────┐
  │ ↪️ 👤 John Doe        1h ago      │
  │        Teacher                    │
  │                                   │
  │    You're welcome! Glad it helped│
  │                                   │
  │    👍 5  💬 Reply                 │
  └───────────────────────────────────┘
```

**Features:**
- Nested replies (max 3 levels)
- Like comments
- Reply to comments
- Edit own comments (5min window)
- Delete own comments
- Report comments
- Sort options:
  - Top (most likes)
  - Newest
  - Oldest
- Load more (pagination: 10 per page)
- Collapse/expand replies
- @mention highlighting

**Comment Styling:**
- Background: gray-50 (top-level), white (replies)
- Border-radius: 12px
- Padding: 12px
- Margin: 8px 0
- Indent: 32px per level
- Avatar: 40px (top), 32px (replies)

---

### 6. **Related Content Section** (Optional)

```
┌─────────────────────────────────────┐
│  More from this author              │
│                                     │
│  [Post Card] [Post Card] [Post Card]│
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- Show 3 recent posts from same author
- Horizontal scroll on mobile
- Grid on desktop
- "View Profile" link

---

## 🎨 Visual Design System

### **Color Palette:**

**Post Type Colors:**
- ANNOUNCEMENT: Orange gradient (orange-500 to yellow-500)
- UPDATE: Blue gradient (blue-500 to indigo-500)
- COURSE: Purple gradient (purple-500 to pink-500)
- POLL: Green gradient (green-500 to emerald-500)
- QUIZ: Cyan gradient (cyan-500 to blue-500)
- ASSIGNMENT: Red gradient (red-500 to pink-500)
- PROJECT: Indigo gradient (indigo-500 to purple-500)
- TUTORIAL: Teal gradient (teal-500 to cyan-500)

**UI Colors:**
- Background: white
- Surface: gray-50
- Border: gray-200
- Text primary: gray-900
- Text secondary: gray-600
- Text muted: gray-400

**Engagement:**
- Like (active): red-500 to pink-500
- Comment: blue-500
- Share: green-500
- View: gray-500

### **Typography:**

**Headings:**
- Post title: 32px, font-black, gray-900
- Section title: 20px, font-bold, gray-800
- Card title: 16px, font-semibold, gray-900

**Body:**
- Main text: 16px, font-normal, gray-700
- Small text: 14px, font-normal, gray-600
- Caption: 12px, font-normal, gray-500

**Khmer:**
- Font: Koulen (headings), Battambang (body)
- Slightly larger than English for readability

### **Spacing:**
- Container padding: 16px (mobile), 24px (desktop)
- Section spacing: 24px
- Card spacing: 12px
- Element spacing: 8px

### **Shadows:**
- Card: shadow-md
- Hover: shadow-lg
- Active: shadow-xl
- Modal: shadow-2xl

### **Border Radius:**
- Cards: rounded-2xl (16px)
- Buttons: rounded-xl (12px)
- Badges: rounded-full
- Images: rounded-xl
- Avatars: rounded-full

### **Animations:**

**Page Entry:**
- Fade in + slide up
- Duration: 400ms
- Easing: ease-out

**Button Interactions:**
- Hover: scale(1.02) + shadow
- Active: scale(0.98)
- Duration: 200ms

**Like Animation:**
- Heart burst effect
- Color transition
- Duration: 300ms

**Comment Post:**
- Slide in from bottom
- Fade in
- Duration: 300ms

---

## 📱 Responsive Design

### **Mobile (<640px):**
- Single column layout
- Sticky header (compact)
- Sticky comment composer at bottom
- Full-width images
- Touch-optimized buttons (min 44px)
- Bottom sheet for actions
- Swipe gestures for images

### **Tablet (640px - 1024px):**
- Wider content (max 800px)
- Two-column for related content
- Larger images
- Hover effects enabled

### **Desktop (>1024px):**
- Max width: 800px (centered)
- Side padding: 64px
- Three-column related content
- All hover effects
- Keyboard shortcuts:
  - `L` - Like post
  - `C` - Focus comment box
  - `Esc` - Back to feed
  - `←/→` - Navigate images

---

## 🔧 Technical Requirements

### **API Endpoints Needed:**

```typescript
// Get post details
GET /api/feed/posts/:postId
Response: {
  post: Post,
  author: User,
  comments: Comment[],
  likes: number,
  views: number,
  isLiked: boolean,
  isFollowing: boolean
}

// Get post comments
GET /api/feed/posts/:postId/comments
Query: { page, limit, sort }
Response: { comments: Comment[], total: number }

// Add comment
POST /api/feed/posts/:postId/comments
Body: { content, parentId? }

// Like post
POST /api/feed/posts/:postId/like

// Increment view count
POST /api/feed/posts/:postId/view

// Follow author
POST /api/users/:userId/follow
```

### **Component Structure:**

```
src/app/feed/post/[postId]/
├── page.tsx                 # Main page
└── loading.tsx             # Loading skeleton

src/components/feed/post-details/
├── PostDetailsPage.tsx      # Main container
├── PostHeader.tsx          # Sticky header
├── AuthorSection.tsx       # Author info + follow
├── PostContent.tsx         # Content based on type
├── EngagementBar.tsx       # Like, comment, share
├── CommentsSection.tsx     # Comments thread
├── CommentItem.tsx         # Single comment
├── CommentComposer.tsx     # Comment input (sticky)
├── RelatedPosts.tsx        # More from author
└── ShareModal.tsx          # Share options
```

### **State Management:**

```typescript
interface PostDetailsState {
  post: Post | null;
  loading: boolean;
  error: string | null;
  comments: Comment[];
  commentsLoading: boolean;
  commentsPage: number;
  hasMoreComments: boolean;
  isLiked: boolean;
  likeCount: number;
  viewCount: number;
  isFollowing: boolean;
}
```

### **Performance Optimizations:**

1. **Lazy Loading:**
   - Comments pagination (10 per load)
   - Images lazy load
   - Related posts lazy load

2. **Caching:**
   - Cache post data (5 min TTL)
   - Cache comments (2 min TTL)
   - Optimistic UI updates

3. **Prefetching:**
   - Prefetch related posts
   - Prefetch author profile
   - Preload next image in gallery

4. **Code Splitting:**
   - Lazy load comment composer
   - Lazy load share modal
   - Lazy load image lightbox

---

## 🧪 User Experience Flow

### **Scenario 1: View Post Details**
1. User clicks post in feed
2. Page transitions with smooth animation
3. Post details load (show skeleton while loading)
4. Scroll to top automatically
5. Header sticks on scroll
6. Images load progressively

### **Scenario 2: Engage with Post**
1. User clicks like
2. Button animates (heart beat)
3. Count updates immediately (optimistic)
4. Backend syncs in background
5. If fail, revert with toast notification

### **Scenario 3: Comment on Post**
1. User clicks comment button
2. Scrolls smoothly to comment composer
3. Composer gets focus
4. User types comment
5. Click send
6. Comment appears immediately (optimistic)
7. Composer clears
8. Shows success feedback

### **Scenario 4: Reply to Comment**
1. User clicks reply on comment
2. Nested composer appears
3. @mention author auto-filled
4. User types reply
5. Reply appears nested under parent
6. Collapses other expanded threads

### **Scenario 5: Share Post**
1. User clicks share
2. Modal opens with options
3. User clicks "Copy Link"
4. Link copied to clipboard
5. Toast: "Link copied!"
6. Modal closes

---

## 🎯 Success Metrics

### **Engagement:**
- Time on post page: >2 min average
- Comment rate: 15%+ of viewers
- Like rate: 30%+ of viewers
- Share rate: 5%+ of viewers

### **Performance:**
- Page load: <1s
- Time to interactive: <2s
- Largest contentful paint: <2.5s
- Cumulative layout shift: <0.1

### **User Satisfaction:**
- Bounce rate: <30%
- Return rate: >60%
- Feature usage: 80%+ use comments
- Net Promoter Score: >8/10

---

## 📋 Implementation Phases

### **Phase 1: Core Page (Week 1)**
- [x] Design specification
- [ ] Create route structure
- [ ] Build PostDetailsPage component
- [ ] PostHeader with back navigation
- [ ] AuthorSection with follow
- [ ] PostContent rendering
- [ ] Basic engagement bar
- [ ] Mobile responsive

### **Phase 2: Comments (Week 1-2)**
- [ ] CommentsSection component
- [ ] CommentItem with nesting
- [ ] CommentComposer (sticky)
- [ ] Add comment API integration
- [ ] Comment pagination
- [ ] Sort functionality
- [ ] Like comments

### **Phase 3: Enhanced Features (Week 2)**
- [ ] Image gallery with lightbox
- [ ] Enhanced poll view
- [ ] Quiz detail view
- [ ] Assignment detail view
- [ ] Share modal
- [ ] Related posts section

### **Phase 4: Polish (Week 3)**
- [ ] Animations and transitions
- [ ] Loading skeletons
- [ ] Error states
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Analytics tracking
- [ ] Performance optimization

---

## 🚀 Next Steps

1. **Review & Approve Design**
   - Get stakeholder feedback
   - Validate with users
   - Adjust as needed

2. **Start Implementation**
   - Create route structure
   - Build core components
   - Integrate APIs
   - Test thoroughly

3. **Test & Iterate**
   - User testing
   - Performance testing
   - Accessibility testing
   - Bug fixes

4. **Launch**
   - Gradual rollout
   - Monitor metrics
   - Gather feedback
   - Iterate based on data

---

**This design will transform the feed into a world-class social learning platform!** 🚀✨
