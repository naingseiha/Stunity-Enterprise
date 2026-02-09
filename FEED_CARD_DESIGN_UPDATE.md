# Feed Card Design Update

**Date:** February 9, 2026  
**Status:** ✅ Complete

## Overview
Refined the mobile feed card design to achieve the perfect balance of visual hierarchy, card separation, and image presentation. The update focuses on proper card elevation, consistent shadows, and fixing the image carousel snap behavior.

## Changes Made

### 1. Card-Based Design with Proper Spacing
**File:** `apps/mobile/src/components/feed/PostCard.tsx`

Implemented elevated card design with:
- **Horizontal margins:** 14px on each side (floating cards)
- **Bottom margin:** 16px between cards for clear separation
- **Border radius:** 16px rounded corners
- **Subtle shadows:** 
  - `shadowOffset: { width: 0, height: 1 }`
  - `shadowOpacity: 0.05` (reduced from 0.1)
  - `shadowRadius: 4` (reduced from 8)
  - `elevation: 2` (reduced from 3)

**Before:** Flat full-width design with dividers only  
**After:** Elevated cards with subtle shadows and proper spacing

### 2. Image Carousel Snap Fix
**File:** `apps/mobile/src/components/common/ImageCarousel.tsx`

Fixed the image peeking issue where the second image was visible on the right edge:

**Problems identified:**
- Conflicting scroll props (`pagingEnabled` + `snapToInterval` + `snapToAlignment`)
- Incorrect width calculation (SCREEN_WIDTH - 32 didn't match container width)

**Solutions:**
- Removed `snapToInterval` and `snapToAlignment` props
- Use `pagingEnabled` alone for reliable snapping
- Fixed IMAGE_WIDTH calculation: `SCREEN_WIDTH - 28` (accounts for 14px margins on each side)
- Added `contentContainerStyle` for proper ScrollView layout

**Result:** Images now display one at a time with no peeking, smooth swipe navigation

### 3. Media Presentation
**File:** `apps/mobile/src/components/feed/PostCard.tsx`

Restored beautiful media presentation:
- **Margins:** 14px horizontal margins for breathing room
- **Border radius:** 16px rounded corners
- **Full-width within card:** Media spans the card width minus margins

### 4. CreatePost Card Consistency
**File:** `apps/mobile/src/screens/feed/FeedScreen.tsx`

Updated CreatePost card to match PostCard styling:
- **Same shadows:** shadowOpacity 0.05, shadowRadius 4, elevation 2
- **Same margins:** 14px horizontal margins
- **Same border radius:** 16px

### 5. Background Color
**File:** `apps/mobile/src/screens/feed/FeedScreen.tsx`

Changed feed background:
- **Color:** `#F8F7FC` (light purple)
- **Purpose:** Provides contrast for white cards, makes elevation visible

## Technical Details

### Shadow Configuration
```typescript
// Subtle card elevation
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.05,
shadowRadius: 4,
elevation: 2,
```

### Image Carousel Width Calculation
```typescript
const IMAGE_WIDTH = useMemo(() => {
  // If borderRadius is 0, it's full screen (detail view)
  // Otherwise, account for the 14px margins on each side from PostCard mediaWrapper
  return borderRadius === 0 ? SCREEN_WIDTH : SCREEN_WIDTH - 28;
}, [SCREEN_WIDTH, borderRadius]);
```

### Card Spacing
```typescript
container: {
  backgroundColor: '#FFFFFF',
  marginHorizontal: 14,  // Side margins for floating effect
  marginBottom: 16,      // Space between cards
  borderRadius: 16,      // Rounded corners
  // ... shadow props
}
```

## Visual Comparison

### Before (Full-width flat design)
- ❌ No margins, edge-to-edge cards
- ❌ No shadows, flat appearance
- ❌ Dividers only for separation
- ❌ Image carousel showing next image peeking

### After (Elevated card design)
- ✅ 14px side margins, floating cards
- ✅ Subtle shadows for depth
- ✅ 16px spacing between cards
- ✅ Perfect image snap, one at a time
- ✅ Consistent CreatePost card styling

## Benefits

1. **Visual Hierarchy:** Cards clearly separated from background and each other
2. **Professional Appearance:** Subtle shadows provide modern, clean look
3. **Better UX:** Clear boundaries make scanning posts easier
4. **Image Carousel:** Smooth, reliable swipe behavior without peeking
5. **Consistency:** All cards (posts and create post) use same design language

## Files Modified

- `apps/mobile/src/components/feed/PostCard.tsx` - Card styling and spacing
- `apps/mobile/src/components/common/ImageCarousel.tsx` - Carousel snap behavior
- `apps/mobile/src/screens/feed/FeedScreen.tsx` - Background color and CreatePost card

## Testing Checklist

- [x] Cards display with proper spacing on all screen sizes
- [x] Shadows render correctly on iOS
- [x] Shadows render correctly on Android
- [x] Image carousel snaps perfectly to each image
- [x] No second image peeking on the right
- [x] CreatePost card matches PostCard styling
- [x] Cards stand out against background
- [x] Smooth scroll performance maintained

## Performance Notes

- Reduced shadow radius improves rendering performance
- Simple elevation values work well across platforms
- Card-based layout has minimal performance impact

## Next Steps

No pending work - design is complete and working as expected.

---

**Related Documentation:**
- [Mobile Feed Design](./MOBILE_FEED_DESIGN.md)
- [Image Upload Fix](./apps/mobile/R2_IMAGE_FIX.md)
- [Architecture Summary](./ARCHITECTURE_FIX_SUMMARY.md)
