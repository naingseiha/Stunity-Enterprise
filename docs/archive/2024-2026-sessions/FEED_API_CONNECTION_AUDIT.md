# Feed API Connection Audit & Enhancement Plan
**Date:** February 12, 2026  
**Status:** ✅ Working, Needs Enhancement

---

## 🔍 Current Status Analysis

### ✅ What's Working

#### Backend (Feed Service - Port 3010)
- 🟢 **Service Running:** Healthy on port 3010
- 🟢 **Database Connected:** Prisma with Neon PostgreSQL
- 🟢 **Authentication:** JWT token middleware working
- 🟢 **File Uploads:** Cloudflare R2 configured (optional)
- 🟢 **CORS:** Configured for mobile/web clients

#### Mobile App Integration
- 🟢 **API Client:** Configured with feedApi instance
- 🟢 **Store Integration:** useFeedStore with all CRUD methods
- 🟢 **Auto-IP Detection:** Expo automatically detects dev machine IP
- 🟢 **Network Resilience:** 60s timeout, 3 retries with exponential backoff
- 🟢 **Optimistic Updates:** Instant UI feedback for like/unlike/bookmark

#### Endpoints Connected
1. ✅ `GET /posts` - Fetch feed posts (pagination, filtering)
2. ✅ `POST /posts` - Create new post
3. ✅ `POST /posts/:id/like` - Like post
4. ✅ `DELETE /posts/:id/like` - Unlike post (needs verification)
5. ✅ `POST /posts/:id/bookmark` - Bookmark post
6. ✅ `DELETE /posts/:id/bookmark` - Remove bookmark (needs verification)
7. ✅ `GET /posts/:id/comments` - Fetch comments
8. ✅ `POST /posts/:id/comments` - Add comment
9. ✅ `DELETE /comments/:id` - Delete comment
10. ✅ `POST /posts/:id/vote` - Vote on poll
11. ✅ `POST /posts/:id/share` - Share post
12. ✅ `POST /posts/:id/view` - Track post view
13. ✅ `GET /stories` - Fetch stories
14. ✅ `POST /upload` - Upload media files

---

## 🐛 Issues Found

### Issue #1: Unlike/Unbookmark Missing DELETE Endpoint Handler
**Severity:** Medium  
**Status:** ⚠️ Needs Fix

**Problem:**
- Mobile app calls `DELETE /posts/:id/like` to unlike
- Mobile app calls `DELETE /posts/:id/bookmark` to unbookmark
- Backend only has POST endpoints, no DELETE handlers

**Impact:**
- Unlike button makes API call that returns 404
- Unbookmark button makes API call that returns 404
- Optimistic updates revert on error
- User sees "unlike failed" behavior

**Solution:**
```typescript
// Add these endpoints to feed-service/src/index.ts

// DELETE /posts/:id/like - Unlike a post
app.delete('/posts/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.like.deleteMany({
      where: {
        postId: id,
        userId: req.user!.id,
      },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Unlike error:', error);
    res.status(500).json({ success: false, error: 'Failed to unlike post' });
  }
});

// DELETE /posts/:id/bookmark - Remove bookmark
app.delete('/posts/:id/bookmark', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.bookmark.deleteMany({
      where: {
        postId: id,
        userId: req.user!.id,
      },
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Unbookmark error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove bookmark' });
  }
});
```

---

### Issue #2: Stories Endpoint Returns Empty
**Severity:** Low  
**Status:** 🟡 Data Missing

**Problem:**
- Mobile calls `GET /stories` successfully
- Backend returns empty array (no stories in database)
- Stories carousel shows empty

**Impact:**
- Stories feature not visible to users
- UI works correctly, just no data

**Solution:**
- Seed stories data in database
- Create stories endpoint implementation if missing
- Verify stories schema exists in Prisma

---

### Issue #3: Media Upload Validation
**Severity:** Low  
**Status:** 🟡 Enhancement Needed

**Problem:**
- Upload endpoint accepts files but doesn't validate properly
- No size limit enforcement on mobile side
- No preview before upload

**Enhancement:**
```typescript
// In CreatePostScreen.tsx, add validation before upload
const validateMedia = (uri: string) => {
  // Check file size
  // Check file type
  // Show preview
  // Compress if needed
};
```

---

### Issue #4: Post Update Missing
**Severity:** Medium  
**Status:** ⚠️ Partial Implementation

**Problem:**
- Backend has `PUT /posts/:id` endpoint
- Mobile store has `updatePost` method
- EditPostScreen exists but not integrated in PostCard
- No "Edit" button on posts

**Solution:**
- Add "..." menu button to PostCard
- Show Edit/Delete options for own posts
- Navigate to EditPostScreen when tapped
- Implement update functionality

---

### Issue #5: Real-time Updates Missing
**Severity:** High  
**Status:** 🔴 Not Implemented

**Problem:**
- No WebSocket connection for real-time updates
- Users must refresh to see new posts/likes/comments
- No live notification when someone comments

**Solution:**
- Implement Socket.io client in mobile app
- Connect to messaging service (port 3011)
- Subscribe to post events (new_post, new_comment, new_like)
- Update UI in real-time without refresh

---

### Issue #6: Analytics Not Displayed
**Severity:** Low  
**Status:** 🟡 UI Missing

**Problem:**
- Backend has analytics endpoints
- Mobile has analytics modal component
- Not connected in UI

**Solution:**
- Add analytics icon to own posts
- Fetch and display analytics data
- Show engagement metrics

---

## 🚀 Enhancement Plan

### Phase 1: Fix Critical Issues (1-2 hours)
**Priority: HIGH** 🔥

1. **Add DELETE endpoints for unlike/unbookmark**
   - [ ] Add `DELETE /posts/:id/like` handler
   - [ ] Add `DELETE /posts/:id/bookmark` handler
   - [ ] Test unlike functionality
   - [ ] Test unbookmark functionality

2. **Add Post Edit/Delete UI**
   - [ ] Add "..." menu to PostCard (own posts only)
   - [ ] Show Edit/Delete options
   - [ ] Connect EditPostScreen
   - [ ] Test update flow

3. **Seed Stories Data**
   - [ ] Create stories seed script
   - [ ] Add 10-15 sample stories
   - [ ] Verify stories endpoint works
   - [ ] Test stories carousel

---

### Phase 2: Enhance Core Features (2-3 hours)
**Priority: MEDIUM** 📊

1. **Media Upload Enhancement**
   - [ ] Add file size validation
   - [ ] Add image compression
   - [ ] Show upload progress bar
   - [ ] Add preview before upload
   - [ ] Support video uploads

2. **Comments Enhancement**
   - [ ] Add nested replies support
   - [ ] Add comment edit/delete
   - [ ] Add comment like functionality
   - [ ] Show comment count badge
   - [ ] Pagination for comments (load more)

3. **Poll Enhancement**
   - [ ] Verify poll voting works
   - [ ] Show real-time vote counts
   - [ ] Add poll results visualization
   - [ ] Disable voting after user votes
   - [ ] Show "You voted" indicator

4. **Search & Filters**
   - [ ] Add search posts by keyword
   - [ ] Add filter by post type
   - [ ] Add filter by date range
   - [ ] Add sort options (latest, popular, trending)

---

### Phase 3: Advanced Features (3-4 hours)
**Priority: LOW** ⭐

1. **Real-time Updates**
   - [ ] Implement Socket.io client
   - [ ] Connect to WebSocket server
   - [ ] Subscribe to feed events
   - [ ] Update UI on new posts
   - [ ] Show "New posts available" banner
   - [ ] Live comment updates

2. **Analytics Integration**
   - [ ] Add analytics icon to own posts
   - [ ] Fetch post analytics
   - [ ] Display engagement metrics
   - [ ] Show view counts
   - [ ] Show daily views chart

3. **Notifications**
   - [ ] Like notifications
   - [ ] Comment notifications
   - [ ] Share notifications
   - [ ] Poll vote notifications
   - [ ] New follower posts

4. **Performance Optimization**
   - [ ] Implement image lazy loading
   - [ ] Add post virtualization (FlashList)
   - [ ] Cache API responses
   - [ ] Implement stale-while-revalidate
   - [ ] Prefetch next page

---

## 📋 Testing Checklist

### Manual Testing Required
- [ ] Create post with text only
- [ ] Create post with single image
- [ ] Create post with multiple images
- [ ] Create post with poll (2-6 options)
- [ ] Like a post (should work instantly)
- [ ] Unlike a post (needs fix first)
- [ ] Bookmark a post
- [ ] Remove bookmark (needs fix first)
- [ ] Comment on a post
- [ ] Delete own comment
- [ ] Vote on a poll
- [ ] Share a post
- [ ] View post details
- [ ] Edit own post (needs UI first)
- [ ] Delete own post (needs UI first)
- [ ] Refresh feed (pull-to-refresh)
- [ ] Load more posts (infinite scroll)
- [ ] Filter by subject/topic
- [ ] Switch between feed tabs

### API Response Testing
```bash
# Test posts endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3010/posts

# Test post creation
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test post","postType":"ARTICLE"}' \
  http://localhost:3010/posts

# Test like
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/posts/POST_ID/like

# Test unlike (currently 404 - needs fix)
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/posts/POST_ID/like

# Test comments
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/posts/POST_ID/comments

# Test add comment
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great post!"}' \
  http://localhost:3010/posts/POST_ID/comments
```

---

## 🎯 Success Metrics

### Phase 1 Success Criteria
- ✅ Unlike button works without errors
- ✅ Unbookmark button works without errors
- ✅ Edit post functionality complete
- ✅ Delete post functionality complete
- ✅ Stories data visible in feed

### Phase 2 Success Criteria
- ✅ Media upload with progress indicator
- ✅ Comments with nested replies
- ✅ Poll voting with real-time results
- ✅ Search and filter working

### Phase 3 Success Criteria
- ✅ Real-time updates working
- ✅ Analytics displayed for own posts
- ✅ Notifications functional
- ✅ Feed loads in <2 seconds

---

## 📝 Next Steps (Recommended Order)

1. **Start with Phase 1 (Critical Fixes)** - 1-2 hours
   - Fix unlike/unbookmark endpoints
   - Add edit/delete UI
   - Seed stories data

2. **Move to Phase 2 (Core Enhancements)** - 2-3 hours
   - Enhance media uploads
   - Improve comments
   - Verify polls work

3. **Consider Phase 3 (Advanced)** - Optional
   - Real-time features
   - Analytics
   - Notifications

---

## 🛠️ Files to Modify

### Backend
- `services/feed-service/src/index.ts` - Add DELETE endpoints

### Mobile
- `apps/mobile/src/screens/feed/PostCard.tsx` - Add edit/delete menu
- `apps/mobile/src/screens/feed/CreatePostScreen.tsx` - Add media validation
- `apps/mobile/src/stores/feedStore.ts` - Already complete ✅
- `apps/mobile/src/components/feed/PostCard.tsx` - Add menu button

### Database
- Create stories seed script
- Verify bookmark/like tables exist

---

## 💡 Key Insights

1. **Most features already work!** The API integration is 80% complete.
2. **Main issue:** Missing DELETE endpoints for unlike/unbookmark
3. **UI gap:** Edit/delete functionality exists but not exposed in UI
4. **Data gap:** No stories data in database
5. **Performance:** Current implementation is solid with good error handling

---

**Status:** Ready for enhancement  
**Estimated Time:** 6-9 hours for all phases  
**Recommended:** Start with Phase 1 (1-2 hours) for immediate impact
