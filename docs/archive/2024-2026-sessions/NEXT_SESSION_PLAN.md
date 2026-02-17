# 📋 Next Session Implementation Plan

**Current Status**: Quiz Post Type Complete ✅  
**Version**: v21.2  
**Date**: February 12, 2026

---

## 🎯 Next Priorities

### 1. Question Post Type (2-3 hours)
Create `QuestionForm.tsx` component with unique features:

**Features to Implement**:
- 💰 **Bounty System**
  - Point values: 0 (no bounty), 50, 100, 200, 500 points
  - Chip selector similar to quiz
  - Display current user's available points
  
- 🏷️ **Tags/Categories**
  - Input field with chip display
  - Auto-complete from existing tags
  - Max 5 tags per question
  - Create new tags on-the-fly

- 📝 **Expected Answer Type**
  - Short answer
  - Detailed explanation
  - Code snippet
  - Resource link
  - Multiple options selector

- ⭐ **Best Answer System**
  - Mark best answer (question owner)
  - Award bounty automatically
  - Highlight best answer badge

**UI Design**:
- Follow Quiz form card design
- Bounty display prominently at top
- Tags as horizontal scrollable chips
- Expected answer type as radio buttons
- Summary card showing bounty + tags

**Files to Create**:
- `apps/mobile/src/screens/feed/create-post/forms/QuestionForm.tsx`
- Update `CreatePostScreen.tsx` to conditionally render QuestionForm

---

### 2. Enhanced Poll Post Type (1-2 hours)
Enhance existing poll with advanced features:

**Current State**:
- ✅ Basic poll options (2-6 options)
- ✅ Add/remove options
- ⏳ Missing: Duration, visibility, anonymous voting

**Features to Add**:
- ⏰ **Duration**
  - No end date
  - 1 day
  - 3 days
  - 1 week
  - 2 weeks
  - Custom date picker
  
- 👁️ **Results Visibility**
  - Show while voting (real-time)
  - Show after voting (user must vote)
  - Show after poll ends
  - Never show (only creator sees)

- ✅ **Multiple Selections**
  - Toggle on/off
  - If on, allow selecting multiple options
  - Show "Select up to X options"

- 🕵️ **Anonymous Voting**
  - Toggle on/off
  - Hide voter identities
  - Show only vote counts

**UI Design**:
- Wrap existing poll in a card
- Add settings section above options
- Use chip selectors for duration
- Toggle switches for anonymous/multiple
- Summary showing total settings

**Files to Modify**:
- `apps/mobile/src/screens/feed/CreatePostScreen.tsx` (enhance poll section)

---

### 3. Announcement Post Type (1 hour)
Create `AnnouncementForm.tsx` for important messages:

**Features to Implement**:
- �� **Importance Level**
  - Info (Blue) - General information
  - Important (Orange) - Pay attention
  - Urgent (Red) - Action required
  - Critical (Dark Red) - Immediate attention
  - Icon + color coding for each

- 📅 **Expiration Date**
  - No expiration
  - 24 hours
  - 3 days
  - 1 week
  - Custom date picker
  - Auto-hide after expiration

- 🎯 **Target Audience** (Optional - can skip for now)
  - All users
  - Students only
  - Instructors only
  - Specific clubs
  - Specific classes

- 📌 **Pin to Top**
  - Toggle to pin announcement
  - Shows at top of feed until unpinned
  - Only one announcement can be pinned

**UI Design**:
- Large importance selector with colors
- Icon badges for each level
- Expiration picker with chips
- Pin toggle switch
- Preview card showing how it will look

**Files to Create**:
- `apps/mobile/src/screens/feed/create-post/forms/AnnouncementForm.tsx`

---

## 📂 File Structure

```
apps/mobile/src/screens/feed/create-post/
├── animations.ts ✅
├── components/
│   ├── AnimatedButton.tsx ✅
│   └── QuizQuestionInput.tsx ✅
└── forms/
    ├── QuizForm.tsx ✅
    ├── QuestionForm.tsx ⏳ (NEXT)
    ├── PollForm.tsx ⏳ (NEXT - or enhance in CreatePostScreen)
    └── AnnouncementForm.tsx ⏳ (NEXT)
```

---

## 🎨 Design Consistency

**Follow Quiz UI Pattern**:
- Card-based layout with 16px radius
- Icon badges for section headers
- Horizontal scrollable chips for options
- Dashed border "add" buttons
- Summary cards at bottom
- FadeIn/FadeOut animations (300ms/200ms)
- Haptic feedback on all interactions
- Indigo primary color (#6366F1)

**Color Scheme by Post Type**:
- Article: #F59E0B (Orange)
- Question: #3B82F6 (Blue)
- Announcement: #EF4444 (Red)
- Poll: #8B5CF6 (Purple)
- Quiz: #EC4899 (Pink)
- Course: #10B981 (Green)
- Project: #F97316 (Deep Orange)

---

## 🔄 Integration Steps

For each new form component:

1. **Create the form component**
   - Export as named export: `export function ComponentName() {}`
   - Accept `onDataChange` callback prop
   - Use `useEffect` to call callback on data changes

2. **Import in CreatePostScreen**
   ```typescript
   import { QuestionForm } from './create-post/forms/QuestionForm';
   ```

3. **Add state management**
   ```typescript
   const [questionData, setQuestionData] = useState<any>(null);
   ```

4. **Add conditional rendering**
   ```typescript
   {postType === 'QUESTION' && (
     <Animated.View entering={FadeIn} exiting={FadeOut}>
       <QuestionForm onDataChange={setQuestionData} />
     </Animated.View>
   )}
   ```

5. **Update handlePost function**
   - Add validation for new post type data
   - Pass data to createPost API call

---

## 🧪 Testing Checklist

For each new post type:
- [ ] Form renders when post type selected
- [ ] All inputs work correctly
- [ ] Animations are smooth (60 FPS)
- [ ] Haptic feedback on interactions
- [ ] Real-time validation works
- [ ] Summary updates correctly
- [ ] Can switch between post types
- [ ] Data persists until form cleared
- [ ] Mobile keyboard behaves correctly
- [ ] No console errors or warnings

---

## 📊 Estimated Time

- **Question Form**: 2-3 hours
  - Component structure: 30 min
  - Bounty system: 45 min
  - Tags input: 45 min
  - Answer type: 30 min
  - UI polish: 30 min

- **Enhanced Poll**: 1-2 hours
  - Duration picker: 30 min
  - Visibility options: 20 min
  - Multiple selection toggle: 20 min
  - Anonymous toggle: 20 min
  - UI integration: 30 min

- **Announcement Form**: 1 hour
  - Importance selector: 20 min
  - Expiration picker: 20 min
  - Pin toggle: 10 min
  - UI polish: 10 min

**Total**: 4-6 hours for all three post types

---

## 🚀 Success Criteria

**Complete when**:
- ✅ All three post types implemented
- ✅ Beautiful, consistent UI across all forms
- ✅ Smooth animations and haptic feedback
- ✅ Real-time validation and summaries
- ✅ No bugs or console errors
- ✅ Documentation updated
- ✅ Code committed and pushed

---

## 📚 Reference Files

- `QuizForm.tsx` - Template for card-based form
- `QuizQuestionInput.tsx` - Template for complex inputs
- `animations.ts` - Animation utilities
- `CreatePostScreen.tsx` - Main integration point
- `QUIZ_UI_REDESIGN.md` - Design specifications

---

**Ready to start**: Yes! 🎉  
**Dependencies**: All installed ✅  
**Backend**: Not required yet (frontend only)  
**Estimated completion**: 1 session (4-6 hours)
