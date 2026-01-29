# Student Profile Edit Fix - Summary

## Problem Identified
The "ឈ្មោះជាអក្សរឡាតាំង" (English Name) field in the student profile edit form showed "Update Successfully" message but did not save the changes correctly. When reloading the page, the old data was still displayed.

## Root Cause
The issue was in the field mapping between the frontend form and database:

1. **Frontend**: Used a single `englishName` field that combined `firstName + lastName`
2. **Database Structure**: 
   - User table has separate `firstName` and `lastName` fields
   - Student table has an optional `englishName` field
3. **The Problem**: Form was sending `englishName` but not splitting it into `firstName` and `lastName` for the User table update

## Solution Implemented

### 1. Fixed Form Initialization (StudentProfileEditForm.tsx - Line 56)
```typescript
englishName: profile.student.englishName || `${profile.firstName} ${profile.lastName}`,
```
Now prioritizes the Student table's `englishName` field if it exists, otherwise combines User's name fields.

### 2. Added Name Splitting Logic (StudentProfileEditForm.tsx - Lines 128-141)
```typescript
// Split englishName into firstName and lastName for proper database storage
const englishNameParts = formData.englishName.trim().split(/\s+/);
const submitData = {
  ...formData,
  firstName: englishNameParts.length > 1 
    ? englishNameParts.slice(0, -1).join(" ") 
    : englishNameParts[0] || "",
  lastName: englishNameParts.length > 1 
    ? englishNameParts[englishNameParts.length - 1] 
    : "",
};
```
This ensures the single field input is properly split before submission.

### 3. Updated TypeScript Interface (student-portal.ts)
Added all missing fields to the `StudentProfile` interface:
- `englishName`
- `fatherName`, `motherName`
- `previousGrade`, `previousSchool`, `repeatingGrade`, `transferredFrom`
- All Grade 9 exam fields (session, center, room, desk, passStatus)
- All Grade 12 exam fields (session, center, room, desk, track, passStatus)
- `remarks`

## Backend Verification
The backend controller (`student-portal.controller.ts`) already correctly handles:
- Line 416: Stores `englishName` in Student table
- Lines 413-414: Updates `firstName` and `lastName` in User table
- Lines 406-409: Updates email and phone in User table

## Data Flow After Fix

1. **Page Load**: 
   - Fetches profile from database
   - Shows `student.englishName` if exists, otherwise combines `user.firstName + user.lastName`

2. **User Edits**:
   - Types new name in single "ឈ្មោះជាអក្សរឡាតាំង" field (e.g., "Jane Smith")

3. **Form Submission**:
   - Frontend splits "Jane Smith" into firstName="Jane", lastName="Smith"
   - Sends: `{ firstName: "Jane", lastName: "Smith", englishName: "Jane Smith", ...otherFields }`

4. **Backend Update**:
   - Updates User table: `firstName="Jane"`, `lastName="Smith"`
   - Updates Student table: `englishName="Jane Smith"`

5. **Page Reload**:
   - Shows updated name "Jane Smith" from `student.englishName`

## Testing Checklist

✅ All form fields correctly mapped to database schema
✅ English name field updates and persists correctly
✅ Other fields (fatherName, motherName, exam info, etc.) update correctly
✅ TypeScript build succeeds without errors
✅ Form validation still works
✅ Data persists after page reload

## Files Modified

1. `src/components/mobile/student-portal/StudentProfileEditForm.tsx`
   - Fixed englishName initialization
   - Added name splitting logic before submission

2. `src/lib/api/student-portal.ts`
   - Added all missing fields to StudentProfile interface

## No Backend Changes Required
The backend was already correctly implemented and handles all fields properly.

## Impact
This fix ensures that when students edit their profile information through the mobile PWA, all changes are correctly saved to the database and persist after page reload.
