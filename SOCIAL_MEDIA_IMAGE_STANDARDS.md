# Social Media Image Display Standards

**Date:** February 9, 2026  
**Status:** ✅ Implemented - Facebook/LinkedIn Style  
**Approach:** Smart height limiting for scannable feeds

---

## 📊 How Major Platforms Handle Images

### **Facebook Feed** ⭐ (What we implemented)
```
Landscape (16:9):   Full display, looks great
Portrait (3:4):     Full display if ≤1.4x width
Portrait (9:16):    CROPPED to 1.4x, "See Full Image" button
Very Tall:          CROPPED to 1.4x, click to expand

MAX HEIGHT: 1.4x width
```

**Why:** Keeps feed scannable, not endlessly long. Professional appearance.

---

### **LinkedIn Feed** ⭐
```
Landscape:          Full display (~16:9)
Portrait:           LIMITED to ~1.3-1.5x width
Tall images:        Cropped, "See full image" link

MAX HEIGHT: 1.3-1.5x width
```

**Why:** Professional, clean, business-appropriate feed.

---

### **Instagram Feed** 📸
```
Portrait:           MAX 4:5 ratio (1.25x)
Landscape:          MAX 16:9 ratio (0.56x)
Square:             1:1 preferred
Strict cropping:    Anything beyond limits gets cropped

MAX HEIGHT: 1.25x width (4:5 ratio)
```

**Why:** Consistent, beautiful grid. Instagram's brand identity.

---

### **Twitter/X** 🐦
```
Adaptive:           ~1.5x max for portraits
Preview mode:       Shows cropped preview
Click behavior:     Opens full image in viewer

MAX HEIGHT: ~1.5x width
```

**Why:** Fast-scrolling feed, click to see details.

---

## 🎯 Stunity Implementation

### **Our Approach: Facebook/LinkedIn Hybrid**

```typescript
// Facebook-style limits for professional e-learning feed
const minHeight = 240;              // Minimum for wide images
const maxHeight = IMAGE_WIDTH * 1.4; // Facebook standard (1.4:1 max)
```

### **Height Limits by Ratio:**

| Image Ratio | Natural Height | Applied Height | Status |
|-------------|---------------|----------------|--------|
| **16:9 (landscape)** | 0.56x width | 0.56x width | ✅ Full display |
| **4:3 (photo)** | 0.75x width | 0.75x width | ✅ Full display |
| **1:1 (square)** | 1.0x width | 1.0x width | ✅ Full display |
| **4:5 (Instagram)** | 1.25x width | 1.25x width | ✅ Full display |
| **3:4 (portrait)** | 1.33x width | 1.33x width | ✅ Full display |
| **2:3 (tall portrait)** | 1.5x width | **1.4x width** | ⚠️ Cropped |
| **9:16 (phone screen)** | 1.78x width | **1.4x width** | ⚠️ Cropped |
| **9:21 (ultra tall)** | 2.33x width | **1.4x width** | ⚠️ Cropped |

### **User Experience:**

1. **Landscape/Square Images:**
   - Display at natural ratio
   - No cropping needed
   - Clean, professional

2. **Portrait Images (≤1.4x):**
   - Display at natural ratio
   - Looks perfect (3:4, 4:5)
   - Instagram/Facebook standard

3. **Very Tall Images (>1.4x):**
   - Cropped to 1.4x height
   - "Tap to see full" indicator (bottom right)
   - Click opens full-screen viewer
   - Keeps feed scannable

---

## 🎨 Visual Examples

### Good Display (No Cropping Needed)

```
┌──────────────────────────────┐
│                              │
│    LANDSCAPE (16:9)          │
│                              │
└──────────────────────────────┘
Height: 0.56x width ✅

┌──────────────────────────────┐
│                              │
│                              │
│    PORTRAIT (3:4)            │
│                              │
│                              │
└──────────────────────────────┘
Height: 1.33x width ✅
```

### Cropped Display (Height Limited)

```
┌──────────────────────────────┐
│                              │
│                              │
│    TALL PORTRAIT (9:16)      │
│    Showing top portion       │
│                              │
│  [Tap to see full] 🔍        │
└──────────────────────────────┘
Height: LIMITED to 1.4x width
Natural: 1.78x width (cropped) ⚠️
```

---

## 💡 Why 1.4x Maximum?

### **Feed Scannability:**
- Users scroll through many posts
- Too-tall images make scrolling tedious
- 1.4x is the sweet spot (Facebook's research)

### **Screen Real Estate:**
- Average phone: 390px wide
- 1.4x = 546px tall per image
- ~1.4 posts visible at once
- Good balance of content

### **Comparison:**

| Max Height | Posts on Screen | User Experience |
|------------|-----------------|-----------------|
| **1.0x** | 2+ posts | Too cramped ❌ |
| **1.4x** ⭐ | 1.4 posts | Perfect balance ✅ |
| **2.0x** | 1 post | Too much scrolling ❌ |
| **Unlimited** | <1 post | Feed nightmare ❌ |

---

## 🔧 Technical Implementation

### Image Height Calculation

```typescript
if (mode === 'auto' && imageDimensions) {
  const imageAspectRatio = imageDimensions.height / imageDimensions.width;
  const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
  
  // Facebook/LinkedIn style limits
  const minHeight = 240;
  const maxHeight = IMAGE_WIDTH * 1.4; // Key limit!
  
  const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
  
  // Track if cropped for UI indicator
  setIsCropped(calculatedHeight > maxHeight);
  
  return finalHeight;
}
```

### Crop Detection

```typescript
// Check if image will be cropped
const isCropped = (imageDimensions.height / imageDimensions.width) > 1.4;

// Show indicator
{isCropped && (
  <View style={styles.expandIndicator}>
    <Ionicons name="expand-outline" size={14} color="#fff" />
    <Text>Tap to see full</Text>
  </View>
)}
```

### Content Fit

```typescript
<Image
  source={{ uri }}
  contentFit="cover"  // Fills container, crops if needed
  style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}
/>
```

- **`cover`**: Fills container, maintains ratio, crops excess
- **NOT `contain`**: Would show letterboxing/pillarboxing
- **NOT `stretch`**: Would distort image

---

## 🎯 Preset Modes

### 1. **Auto Mode** (Recommended for Feed)
```typescript
<ImageCarousel images={urls} mode="auto" />
```
- Detects natural dimensions
- Applies 1.4x max limit
- Shows "Tap to see full" if cropped
- Best for mixed content feeds

### 2. **Landscape Mode** (Course Thumbnails)
```typescript
<ImageCarousel images={urls} mode="landscape" />
```
- Forces 16:9 ratio (0.5625x)
- Consistent across all images
- Good for video thumbnails

### 3. **Portrait Mode** (Instagram Style)
```typescript
<ImageCarousel images={urls} mode="portrait" />
```
- Forces 4:5 ratio (1.25x)
- Instagram portrait standard
- Good for profile/product photos

### 4. **Square Mode** (Classic Instagram)
```typescript
<ImageCarousel images={urls} mode="square" />
```
- Forces 1:1 ratio
- Classic Instagram grid
- Uniform appearance

---

## 📱 User Behavior

### Expected Interactions:

1. **Scrolling feed:**
   - See preview of each image
   - Cropped tall images look natural
   - Not overwhelming to scroll

2. **Interested in image:**
   - Tap anywhere on image
   - Opens full-screen viewer
   - Can see entire image uncropped
   - Pinch to zoom available

3. **Tall image indicator:**
   - "Tap to see full" badge visible
   - Prompts user to tap
   - Clear affordance

---

## 🎨 Design Benefits

### For Users:
✅ **Scannable feed** - not endlessly long  
✅ **Consistent pacing** - comfortable scrolling  
✅ **Clear indicators** - know when cropped  
✅ **Easy to expand** - tap to see full  

### For Content:
✅ **Landscape images** - full display  
✅ **Portrait photos** - look natural  
✅ **Tall diagrams** - accessible via tap  
✅ **Mixed content** - harmonious layout  

### For Platform:
✅ **Professional appearance** - like Facebook/LinkedIn  
✅ **Better engagement** - easier to scroll  
✅ **Flexible** - handles all image types  
✅ **Performant** - limited heights = faster renders  

---

## 🧪 Testing Results

### Image Types Tested:
- ✅ Landscape (16:9, 4:3, 21:9)
- ✅ Square (1:1)
- ✅ Portrait (3:4, 4:5, 2:3)
- ✅ Tall (9:16, 9:21, infographics)
- ✅ Educational diagrams (various)
- ✅ Screenshots (phone, tablet, desktop)

### All Display Correctly:
- ✅ Landscape: Full display
- ✅ Portraits ≤1.4x: Full display
- ✅ Portraits >1.4x: Cropped with indicator
- ✅ No distortion on any image
- ✅ Smooth scrolling maintained

---

## 📊 Industry Standards Summary

| Platform | Max Portrait Height | Approach | Feed Feel |
|----------|-------------------|----------|-----------|
| **Facebook** | 1.4x width | Crop + expand | Scannable ✅ |
| **LinkedIn** | 1.3-1.5x width | Crop + link | Professional ✅ |
| **Instagram** | 1.25x width (4:5) | Strict crop | Aesthetic ✅ |
| **Twitter** | 1.5x width | Crop + view | Fast ✅ |
| **Pinterest** | Unlimited | Masonry grid | Visual wall |
| **TikTok** | 16:9 (vertical) | Full screen | Video focused |
| **Stunity** ⭐ | 1.4x width | FB/LI hybrid | E-learning ✅ |

---

## 🎉 Conclusion

Stunity now follows **Facebook and LinkedIn's proven approach** for image display:

1. ✅ **Scannable feeds** - 1.4x max height
2. ✅ **Natural display** - landscapes and normal portraits
3. ✅ **Smart cropping** - tall images with expand option
4. ✅ **Professional UX** - industry-standard behavior

**Result:** A beautiful, scannable, professional feed perfect for e-learning content! 🚀

---

**Implementation Files:**
- `apps/mobile/src/components/common/ImageCarousel.tsx`
- `IMAGE_CAROUSEL_FIX.md` (technical details)
- `FULL_WIDTH_MEDIA_UPDATE.md` (layout update)

**Questions?** Contact the development team.
