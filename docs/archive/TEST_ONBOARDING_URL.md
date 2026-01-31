# 🚀 Test Onboarding Wizard - UPDATED

## ✅ Three Ways to Test

### Method 1: Direct URL with School ID (EASIEST)
Just click or navigate to:
```
http://localhost:3000/en/onboarding?schoolId=cml11211o00006xsh61xi30o7
```
✅ This will automatically use the test school we created!

### Method 2: Set localStorage (Browser Console)
1. Open browser console (F12)
2. Paste and run:
```javascript
localStorage.setItem('schoolId', 'cml11211o00006xsh61xi30o7');
```
3. Navigate to: `http://localhost:3000/en/onboarding`

### Method 3: Use Default (Fallback)
Just navigate to:
```
http://localhost:3000/en/onboarding
```
It will automatically use the test school ID as fallback!

---

## 📊 What You'll See

**Step 1: Welcome** 
- School name: Sunrise High School
- Academic year: 2026-2027
- Auto-created items summary

**Step 2: Calendar**
- 13 Cambodian holidays
- 2 semesters

**Step 3: Subjects**
- 15 subjects with Khmer names

**Step 4-6: Teachers, Classes, Students**
- Beautiful UI with sample data generation
- Will show "API endpoint not found" errors when trying to save
- This is expected - we haven't created the batch APIs yet

**Step 7: Complete**
- Success celebration screen!

---

## 🎯 Quick Test Now

**Try this URL:**
```
http://localhost:3000/en/onboarding?schoolId=cml11211o00006xsh61xi30o7
```

**Expected Result:**
- ✅ Progress bar showing 42.86% complete (3/7 steps)
- ✅ Beautiful wizard UI
- ✅ Navigate through all 7 steps
- ⚠️ Steps 4-6 will show UI but can't save to DB (API endpoints not created yet)

---

🎉 **Enjoy the beautiful onboarding wizard!**
