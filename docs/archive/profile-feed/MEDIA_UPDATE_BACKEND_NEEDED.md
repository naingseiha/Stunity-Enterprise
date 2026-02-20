# Media Update Support - Backend Implementation Needed

## Date: 2026-01-28

## Current Limitation ⚠️

**Issue**: Users can delete and reorder images in the edit page UI, but changes are not saved.

**Root Cause**: Backend API `updatePost` only accepts:
```typescript
PUT /api/feed/posts/:postId
Body: {
  content: string,
  visibility: PostVisibility
}
```

**Missing**: Media update support (add, delete, reorder)

---

## Frontend Implementation Status

### ✅ What's Implemented in Frontend

1. **Image Deletion**
   - User can click X button to remove images
   - Updates local state correctly
   - Shows updated image grid

2. **Image Reordering**  
   - Drag and drop to reorder images
   - Visual feedback during drag
   - Updates local state correctly

3. **Image Addition**
   - Can add new images (up to 4 total)
   - Compresses images before upload
   - Shows preview immediately

4. **Warning System**
   - Detects when images are modified
   - Shows warning banner if images changed
   - Confirms with user before saving

---

## What Happens Now

### User Experience:
1. User edits post and deletes an image
2. **Yellow warning appears**: "⚠️ ចំណាំ: ការផ្លាស់ប្តូររូបភាព (លុប ឬប្តូរលំដាប់) នឹងមិនត្រូវបានរក្សាទុក។"
3. User clicks Save
4. **Confirmation dialog**: Warns that image changes won't be saved
5. If user confirms, saves only text content
6. Returns to feed - images unchanged

### Code:
```typescript
// Detects image changes
const originalImages = post.mediaUrls || [];
const imagesChanged = 
  mediaPreviews.length !== originalImages.length ||
  mediaPreviews.some((url, index) => url !== originalImages[index]);

// Shows warning if changed
if (imagesChanged) {
  const confirmed = confirm(
    "⚠️ ការផ្លាស់ប្តូររូបភាព (លុប ឬប្តូរលំដាប់) នឹងមិនត្រូវបានរក្សាទុក!\n\n" +
    "Backend API មិនទាន់គាំទ្រការកែសម្រួលរូបភាពនៅឡើយទេ។\n\n" +
    "តើអ្នកចង់រក្សាទុកតែខ្លឹមសារអត្ថបទទេ?"
  );
  if (!confirmed) return;
}
```

---

## Backend Changes Required

### 1. Update API Endpoint

**Extend** `PUT /api/feed/posts/:postId` to accept:

```typescript
interface UpdatePostRequest {
  content?: string;
  visibility?: PostVisibility;
  
  // NEW: Media updates
  mediaUrls?: string[];  // Ordered array of media URLs
  mediaDeleted?: string[];  // URLs to delete from storage
  mediaFiles?: File[];  // New files to upload
}
```

### 2. Database Schema Changes

**Check if needed**: The Post model should have:
```prisma
model Post {
  id        String   @id @default(cuid())
  content   String
  mediaUrls String[] // Array of media URLs
  mediaKeys String[] // Array of storage keys (for deletion)
  // ... other fields
}
```

### 3. Controller Logic (api/src/controllers/feed.controller.ts)

Update `updatePost` function:

```typescript
export const updatePost = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content, visibility, mediaUrls, mediaDeleted } = req.body;

    // Get existing post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.authorId !== userId) {
      return res.status(404).json({
        success: false,
        message: "Post not found or unauthorized",
      });
    }

    // Handle media deletions
    if (mediaDeleted && mediaDeleted.length > 0) {
      for (const url of mediaDeleted) {
        // Find corresponding storage key
        const keyIndex = post.mediaUrls.indexOf(url);
        if (keyIndex >= 0 && post.mediaKeys[keyIndex]) {
          await storageService.deleteFile(post.mediaKeys[keyIndex]);
        }
      }
    }

    // Handle new media uploads
    let newMediaUrls: string[] = [];
    let newMediaKeys: string[] = [];
    
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await storageService.uploadPostMedia(
          file.buffer,
          userId!,
          file.originalname,
          file.mimetype
        );
        if (result.success && result.url && result.key) {
          newMediaUrls.push(result.url);
          newMediaKeys.push(result.key);
        }
      }
    }

    // Merge media: keep existing (in order) + add new
    const finalMediaUrls = [...(mediaUrls || []), ...newMediaUrls];
    const finalMediaKeys = [
      ...post.mediaKeys.filter((_, index) => 
        mediaUrls?.includes(post.mediaUrls[index])
      ),
      ...newMediaKeys
    ];

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content || post.content,
        visibility: visibility || post.visibility,
        mediaUrls: finalMediaUrls,
        mediaKeys: finalMediaKeys,
        isEdited: true,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPost,
    });
  } catch (error: any) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update post",
    });
  }
};
```

### 4. Update Route Middleware

```typescript
// Add file upload middleware for PUT route
router.put("/posts/:postId", postMediaUpload, updatePost);
```

---

## Frontend Update (After Backend Ready)

Once backend supports media updates, update frontend:

```typescript
// In EditPostForm.tsx handleSave function:

const handleSave = async () => {
  // ... validation ...

  setIsPosting(true);
  try {
    // Determine which images to delete
    const originalUrls = post.mediaUrls || [];
    const deletedUrls = originalUrls.filter(
      url => !mediaPreviews.includes(url)
    );

    // Separate existing URLs from new files
    const existingUrls = mediaPreviews.filter(
      url => originalUrls.includes(url)
    );

    // Create FormData
    const formData = new FormData();
    formData.append("content", content.trim());
    formData.append("visibility", visibility);
    formData.append("mediaUrls", JSON.stringify(existingUrls));
    formData.append("mediaDeleted", JSON.stringify(deletedUrls));
    
    // Append new image files
    mediaFiles.forEach(file => {
      formData.append("media", file);
    });

    // Call updated API
    await updatePostWithMedia(post.id, formData);
    
    router.push("/feed");
    router.refresh();
  } catch (error) {
    console.error("Failed to update post:", error);
    alert("មានបញ្ហាក្នុងការកែសម្រួលការផ្សាយ!");
  } finally {
    setIsPosting(false);
  }
};
```

Add new API function in `src/lib/api/feed.ts`:

```typescript
export const updatePostWithMedia = async (
  postId: string,
  formData: FormData
): Promise<Post> => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/feed/posts/${postId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - let browser set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: "Failed to update post" 
    }));
    throw new Error(error.message);
  }

  const result = await response.json();
  
  // Invalidate cache
  apiCache.clear();
  
  return result.data;
};
```

---

## Testing Checklist (After Backend Implementation)

### Image Deletion
- [ ] Delete one image and save - verify it's removed
- [ ] Delete all images and save - verify post has no images
- [ ] Delete middle image (1, **2**, 3) - verify correct one removed

### Image Reordering
- [ ] Drag first image to end - verify new order persists
- [ ] Drag last image to start - verify new order persists
- [ ] Complex reorder (3,1,2) - verify exact order

### Image Addition
- [ ] Add 1 new image to post with 3 - verify 4 total
- [ ] Add 2 new images to post with 2 - verify 4 total
- [ ] Try adding more than 4 - verify button disabled

### Mixed Operations
- [ ] Delete 1 image, add 1 new, reorder - verify all changes
- [ ] Reorder, then delete - verify correct images remain
- [ ] Add new, then reorder all - verify order includes new

### Storage Cleanup
- [ ] Verify deleted images are removed from S3/storage
- [ ] Verify no orphaned files left behind
- [ ] Verify storage keys are updated correctly

---

## Alternative: Temporary Workaround

If backend implementation takes time, consider:

### Option A: Disable Image Editing
```typescript
// Make images read-only in edit mode
<div className="px-4 pb-4">
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
    <p className="text-sm text-blue-800">
      📷 រូបភាពមិនអាចកែសម្រួលបានទេ។ សូមលុបការផ្សាយហើយបង្កើតថ្មី។
    </p>
  </div>
  {/* Show images without delete/drag */}
  <div className="grid grid-cols-2 gap-2">
    {mediaPreviews.map((preview, index) => (
      <div key={index} className="relative aspect-square">
        <Image src={preview} alt={`Image ${index + 1}`} fill />
      </div>
    ))}
  </div>
</div>
```

### Option B: Allow Only for Posts Without Images
```typescript
// In PostCard.tsx, only show edit for text-only posts
{isOwnPost && post.mediaUrls.length === 0 && (
  <button onClick={() => router.push(`/feed/edit/${post.id}`)}>
    Edit
  </button>
)}
```

### Option C: Delete & Recreate
```typescript
// Show warning suggesting delete + recreate
"ដើម្បីកែរូបភាព សូមលុបការផ្សាយនេះ ហើយបង្កើតការផ្សាយថ្មី។"
```

---

## Priority Assessment

### High Priority if:
- Users frequently edit posts with images
- Image mistakes are common
- Reordering is important for storytelling

### Low Priority if:
- Most edits are text-only
- Users rarely change images after posting
- Delete + recreate is acceptable workflow

---

## Estimated Effort

### Backend Implementation
- **Time**: 3-4 hours
- **Complexity**: Medium
- **Risk**: Low (standard CRUD operation)

### Files to Modify
1. `api/src/controllers/feed.controller.ts` - updatePost function
2. `api/src/routes/feed.routes.ts` - add middleware
3. `src/lib/api/feed.ts` - add updatePostWithMedia
4. `src/components/feed/EditPostForm.tsx` - update handleSave

### Testing
- **Time**: 1-2 hours
- **Coverage**: Image CRUD operations, storage cleanup

---

## Current Status

- ✅ Frontend UI complete
- ✅ Warning system implemented
- ✅ User notified of limitation
- ⏳ Backend implementation pending
- ⏳ Full functionality blocked

---

## Recommendation

**Option 1** (Recommended): Implement backend support
- Best user experience
- Aligns with user expectations
- Makes edit feature complete

**Option 2**: Disable image editing temporarily
- Quick workaround
- Clear user expectations
- Can implement properly later

**Option 3**: Keep current warning system
- Users can still edit text
- Aware of limitation
- No broken expectations

---

**Decision needed**: Choose an option and proceed accordingly.
