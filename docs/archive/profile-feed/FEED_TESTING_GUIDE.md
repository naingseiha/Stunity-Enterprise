# 🧪 Social Feed Testing Guide

## Quick Start

### 1. Run Database Migration

```bash
cd /Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp
./scripts/migrate-feed-design.sh
```

Or manually:
```bash
cd api
npx prisma migrate dev --name update_post_types_education
npx prisma generate
cd ..
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Navigate to Feed

Open: `http://localhost:3000/feed`

---

## 📋 Testing Checklist

### Visual Design ✅
- [ ] Header shows profile picture, StunitY logo, search icon
- [ ] Logo has yellow-orange gradient
- [ ] Header is sticky on scroll
- [ ] Post cards have rounded corners (16px)
- [ ] Proper spacing between cards
- [ ] Type badges show correct colors and icons

### Post Types 🎯
Test creating posts for each type:

| Type | Icon | Color | CTA Button |
|------|------|-------|-----------|
| ARTICLE | 📄 | Orange | "X Reads" |
| COURSE | 🎓 | Green | "Enroll Now" |
| QUIZ | 🧠 | Purple | "Take Now" |
| QUESTION | ❓ | Indigo | "Answer" |
| EXAM | 📋 | Red | "Take Now" |
| ANNOUNCEMENT | 📢 | Pink | "Read More" |
| ASSIGNMENT | 📚 | Blue | "Submit" |
| POLL | 📊 | Amber | "Vote" |
| RESOURCE | 📁 | Teal | "Download" |

### Image Carousel 📷
- [ ] Upload 1 image - displays centered
- [ ] Upload 2 images - shows arrows and dots
- [ ] Upload 3 images - navigation works
- [ ] Upload 4 images (max) - all show correctly
- [ ] Click left arrow - goes to previous
- [ ] Click right arrow - goes to next
- [ ] Click dots - jumps to that image
- [ ] Images have 16:10 aspect ratio
- [ ] Current dot is orange, others are white/gray

### Engagement Features ❤️
- [ ] Click heart - turns red and increments count
- [ ] Click again - turns gray and decrements count
- [ ] Click comment icon - opens comments (if implemented)
- [ ] Click share icon - triggers share action
- [ ] Click bookmark - fills icon in blue
- [ ] Stats show correct numbers

### Action Buttons ⭐
- [ ] "Interested" button - toggles yellow on click
- [ ] Shows star icon (filled when interested)
- [ ] "Unfollow" button shows for COURSE type
- [ ] Buttons have proper hover states

### Filtering 🔍
- [ ] "All" shows all post types
- [ ] Filter by ARTICLE - shows only articles
- [ ] Filter by COURSE - shows only courses
- [ ] Filter by QUIZ - shows only quizzes
- [ ] Filter dropdown closes after selection
- [ ] Active filter is highlighted

### Menu Actions ⋮
**Own Posts:**
- [ ] Three dots menu appears
- [ ] "Edit" option shows (may not be functional yet)
- [ ] "Delete" option shows
- [ ] Delete asks for confirmation
- [ ] Delete removes post from feed

**Others' Posts:**
- [ ] "Report" option shows
- [ ] Report dialog appears (if implemented)

### Mobile Responsiveness 📱
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Touch targets are at least 44x44px
- [ ] Swipe works for image carousel
- [ ] Bottom navigation doesn't overlap content
- [ ] Feed icon is active on feed page

### Performance ⚡
- [ ] Load 10 posts - smooth scrolling
- [ ] Load 50 posts - still responsive
- [ ] Images lazy load
- [ ] Infinite scroll works (loads more on bottom)
- [ ] Pull to refresh works (if implemented)

### Typography & Spacing 📏
- [ ] Author name is bold, easy to read
- [ ] Time is gray, 12px
- [ ] Post title is 16px bold
- [ ] Description is 14px, line-clamp-3
- [ ] Padding is 16px on cards
- [ ] Gap between cards is 16px

---

## 🎨 Color Verification

Use browser DevTools to verify colors match design:

```css
/* Article */
--article-color: #FF9500;

/* Course */
--course-color: #34C759;

/* Quiz */
--quiz-color: #AF52DE;

/* Question */
--question-color: #5856D6;

/* Exam */
--exam-color: #FF3B30;

/* Announcement */
--announcement-color: #FF2D55;

/* Assignment */
--assignment-color: #007AFF;

/* Poll */
--poll-color: #FFB800;

/* Resource */
--resource-color: #30B0C7;
```

---

## 🐛 Common Issues & Solutions

### Issue: Post types show as old values
**Solution:** Run database migration
```bash
cd api
npx prisma migrate reset --force
npx prisma migrate dev
```

### Issue: Images not uploading
**Solution:** Check Cloudflare R2 configuration in `.env`
```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
```

### Issue: Feed not loading
**Solution:** Check API server is running
```bash
cd api
npm run dev
```

### Issue: Icons not showing
**Solution:** Verify lucide-react is installed
```bash
npm list lucide-react
```

### Issue: Styles not applying
**Solution:** Restart development server
```bash
# Ctrl+C to stop, then:
npm run dev
```

---

## 📸 Screenshot Locations for Testing

### Desktop (1920x1080)
1. Full feed view
2. Single post card
3. Image carousel with 3 images
4. Filter dropdown open
5. Menu actions open

### Mobile (375x667)
1. Feed header
2. Post card
3. Bottom navigation
4. Create post modal
5. Image upload preview

---

## ✅ Final Verification

Before marking as complete:

- [ ] All 9 post types work
- [ ] Images upload and display correctly
- [ ] Carousel navigation is smooth
- [ ] Engagement buttons respond immediately
- [ ] Filtering works without bugs
- [ ] Mobile experience is excellent
- [ ] PWA install prompt works
- [ ] Performance is good (< 2s load time)

---

## 📝 Test Data Suggestions

### Sample Article Post
```
Title: Mobile Application Development
Content: Mobile Application Development is a complete guide to building modern mobile apps for iOS and Android. It covers essential technologies like React Native, Flutter...

Images: 2-3 screenshots or mockups
Type: ARTICLE
```

### Sample Course Post
```
Title: Advanced Web Development
Content: Building on unprecedented advancements in 2024, AI continues to revolutionize web development by enhancing workflows...

Images: 1 course banner
Type: COURSE
```

### Sample Quiz Post
```
Title: JavaScript Fundamentals Quiz
Content: Test your knowledge of JavaScript basics! This quiz covers variables, functions, arrays, and objects.

Type: QUIZ
```

---

## 🚀 Ready for Production?

Check all boxes before deploying:

- [ ] All tests pass
- [ ] No console errors
- [ ] Database migration successful
- [ ] Images load from R2
- [ ] Mobile performance acceptable
- [ ] Accessibility tested
- [ ] Cross-browser tested
- [ ] Documentation updated

---

*Happy Testing! 🎉*
