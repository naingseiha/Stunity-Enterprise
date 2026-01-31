# 🧪 Testing the Onboarding Wizard

## ✅ Step 1: Login Credentials

Use these credentials to test:

**Email:** `john.doe@sunrisehigh.edu.kh`  
**Password:** `SecurePass123!`

**School ID:** `cml11211o00006xsh61xi30o7`

---

## 🚀 Step 2: Access the Onboarding Wizard

### Option A: Direct URL (Recommended for testing)
```
http://localhost:3000/en/onboarding
```

### Option B: After Login
After successful login, you should be redirected to dashboard.
Manually navigate to `/onboarding` path to test the wizard.

---

## 📋 Step 3: Test Flow

1. **Login** at `http://localhost:3000/en/auth/login`
   - Email: john.doe@sunrisehigh.edu.kh
   - Password: SecurePass123!

2. **Navigate to Onboarding**
   - Go to: `http://localhost:3000/en/onboarding`
   - Or update the login redirect to go to onboarding

3. **Test Each Step:**

   **Step 1: Welcome** ✅ (Review)
   - Should show school info
   - Display what was auto-created
   - Click "Next"

   **Step 2: Calendar** ✅ (Review)
   - Shows 13 Cambodian holidays
   - Shows 2 semesters
   - Click "Next"

   **Step 3: Subjects** ✅ (Review)
   - Shows 15 subjects
   - Displays categories and coefficients
   - Click "Next"

   **Step 4: Teachers** ⭐ (Action)
   - Option 1: Click "Sample Data" → Generates 10 teachers
   - Option 2: Click "CSV Import" → Test CSV upload
   - Option 3: Click "Manual Entry" → Form to add one teacher
   - Option 4: Click "Skip" → Move to next step
   - Click "Continue"

   **Step 5: Classes** ⭐ (Action)
   - Select grades: 10, 11, 12
   - Adjust sections slider: 2
   - Click "Generate Classes" → Creates 6 classes
   - Preview shows all classes
   - Click "Continue"

   **Step 6: Students** ⭐ (Action)
   - Option 1: Adjust slider → Generate 50 students
   - Option 2: Click "CSV Import" → Upload CSV
   - Option 3: Click "Skip" → Skip for now
   - Preview shows student list with stats
   - Click "Continue"

   **Step 7: Complete** 🎉 (Celebration)
   - Shows success message
   - Displays statistics (teachers, classes, students)
   - Shows "What's Next" guide
   - Click "Go to Dashboard"

---

## 🔧 Troubleshooting

### Issue: Can't see onboarding page
**Solution:** Make sure web app is running on port 3000
```bash
cd /Users/naingseiha/Documents/Stunity-Enterprise
npm run dev  # or your start command
```

### Issue: Login keeps failing
**Solution:** Use exact credentials above. The school was just created.

### Issue: API errors in steps 4-6
**Solution:** The batch API endpoints don't exist yet. You'll see errors when trying to create teachers/classes/students. This is expected - we need to create those APIs next.

### Issue: Page not found
**Solution:** Check that Next.js compiled the new files:
```bash
# Restart the dev server
cd apps/web
npm run dev
```

---

## 📊 Expected Behavior

### What Works Now (Steps 1-3)
- ✅ Progress visualization
- ✅ Step navigation
- ✅ Data display from registration
- ✅ Visual design and UI

### What Needs Backend (Steps 4-6)
- ⏳ Creating teachers (needs POST /teachers/batch)
- ⏳ Creating classes (needs POST /classes/batch)
- ⏳ Creating students (needs POST /students/batch)

### Current State
You can navigate through all 7 steps, but steps 4-6 will show the UI and generate sample data, but won't persist to database until we create the batch API endpoints.

---

## 🎯 Quick Test Commands

```bash
# 1. Make sure services are running
cd /Users/naingseiha/Documents/Stunity-Enterprise
./start-all-services.sh

# 2. Check web app is running
curl http://localhost:3000

# 3. Test login API
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@sunrisehigh.edu.kh",
    "password": "SecurePass123!"
  }'

# 4. Check onboarding status
curl http://localhost:3002/schools/cml11211o00006xsh61xi30o7/onboarding/status
```

---

## 🚀 Next Steps After Testing

1. Test the UI flow through all 7 steps
2. Verify the design looks good
3. Note any bugs or issues
4. Then we'll create the 3 batch API endpoints to make steps 4-6 functional

---

**Ready to test!** Open your browser and go to:
```
http://localhost:3000/en/onboarding
```
