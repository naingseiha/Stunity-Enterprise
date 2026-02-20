# 🚀 QUICK START: Testing the Career Profile APIs

**Status:** ✅ Backend APIs Ready  
**Date:** January 26, 2026

---

## 🔥 What's Working RIGHT NOW

### ✅ Available APIs:

1. **Skills API** - Add/manage/endorse skills
2. **Projects API** - Create portfolio with media uploads
3. **Feed API** - 6 new post types (PROJECT, TUTORIAL, etc.)

---

## 🧪 How to Test

### 1. Start the API Server

```bash
cd api
npm run dev
```

Server should start on: `http://localhost:5001`

---

### 2. Test Skills API

#### Add a Skill
```bash
POST http://localhost:5001/api/profile/skills
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "skillName": "JavaScript",
  "category": "PROGRAMMING",
  "level": "ADVANCED",
  "yearsOfExp": 3,
  "description": "Building web applications with React and Node.js"
}
```

#### Get User's Skills
```bash
GET http://localhost:5001/api/profile/:userId/skills
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Endorse a Skill
```bash
POST http://localhost:5001/api/profile/skills/:skillId/endorse
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "comment": "Excellent JavaScript developer! Built amazing projects together."
}
```

---

### 3. Test Projects API

#### Create a Project (with media)
```bash
POST http://localhost:5001/api/profile/projects
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- title: "School Management App"
- description: "Full-stack web application for school management"
- category: "SOFTWARE"
- status: "COMPLETED"
- technologies: ["React", "Node.js", "PostgreSQL"]
- skills: ["JavaScript", "TypeScript", "Database Design"]
- githubUrl: "https://github.com/user/project"
- demoUrl: "https://demo.example.com"
- projectUrl: "https://example.com"
- visibility: "PUBLIC"
- isFeatured: true
- media: [file1.png, file2.png] // Upload up to 10 files
```

#### Get User's Projects
```bash
GET http://localhost:5001/api/profile/:userId/projects
Authorization: Bearer YOUR_JWT_TOKEN

Optional Query Params:
- category=SOFTWARE
- featured=true
```

#### Like a Project
```bash
POST http://localhost:5001/api/profile/projects/:projectId/like
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### 4. Test New Feed Post Types

#### Create a PROJECT Post
```bash
POST http://localhost:5001/api/feed/posts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- content: "Check out my latest project!\n\nBuilt a full-stack school management system..."
- postType: "PROJECT"
- visibility: "PUBLIC"
- media: [image1.png, image2.png]
```

#### Create a TUTORIAL Post
```bash
POST http://localhost:5001/api/feed/posts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- content: "How to build a React app from scratch\n\n1. Setup...\n2. Configure..."
- postType: "TUTORIAL"
- visibility: "SCHOOL"
```

#### Create an ACHIEVEMENT Post
```bash
POST http://localhost:5001/api/feed/posts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

Form Data:
- content: "🎉 Just completed 100 days of coding!\n\nLearned React, Node.js, and built 5 projects."
- postType: "ACHIEVEMENT"
- visibility: "PUBLIC"
- media: [certificate.png]
```

---

## 📱 Frontend Testing

### Update CreatePost Component

The feed already supports the new post types! Just test creating posts:

1. Go to the feed page
2. Click "Create Post"
3. Select post type: **PROJECT**, **TUTORIAL**, **ACHIEVEMENT**, etc.
4. Add content and media
5. Post!

The post cards will automatically show the correct icons and colors.

---

## 🎯 Example User Journey

### Student Building Portfolio:

1. **Add Skills**
   ```bash
   POST /api/profile/skills
   - JavaScript (ADVANCED)
   - React (INTERMEDIATE)
   - Python (BEGINNER)
   ```

2. **Get Endorsed by Teacher**
   ```bash
   POST /api/profile/skills/[js-skill-id]/endorse
   - Teacher endorses JavaScript skill
   - Student gets notification
   ```

3. **Create Project**
   ```bash
   POST /api/profile/projects
   - Title: "Student Portal"
   - Upload screenshots
   - Add GitHub link
   - Feature on profile
   ```

4. **Share Achievement**
   ```bash
   POST /api/feed/posts
   - Type: ACHIEVEMENT
   - Content: "Completed first full-stack project!"
   - Media: Project screenshot
   ```

5. **Check Profile Completion**
   ```bash
   GET /api/profile/me
   - Response includes: profileCompleteness: 65%
   - Suggestions: Add experience, certifications
   ```

---

## 🔍 Check Profile Completion

After adding skills and projects, check your profile:

```bash
GET http://localhost:5001/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

Response will include:
```json
{
  "user": {
    "profileCompleteness": 45,
    "totalLearningHours": 120,
    "currentStreak": 7,
    "totalPoints": 850,
    "level": 5,
    ...
  }
}
```

---

## 📊 View Profile Statistics

```bash
GET http://localhost:5001/api/profile/:userId
Authorization: Bearer YOUR_JWT_TOKEN
```

Returns complete profile with:
- Skills with endorsement counts
- Featured projects
- Recent achievements
- Profile completion percentage
- Stats (followers, posts, projects, etc.)

---

## 🎨 Frontend Components Needed

To complete the UI, create these components:

### Priority 1: Profile Page
```typescript
// src/components/profile/ProfilePage.tsx
- User header (photo, name, headline)
- Profile stats (followers, projects, skills)
- Skills section with endorsements
- Featured projects gallery
- Achievements showcase
- Profile completion progress
```

### Priority 2: Skills Section
```typescript
// src/components/profile/SkillsSection.tsx
- Skill categories
- Skill levels (visual indicators)
- Endorsement count
- Add/edit skill modal
- Endorse button for others' profiles
```

### Priority 3: Portfolio Section
```typescript
// src/components/profile/PortfolioSection.tsx
- Project grid/list view
- Project cards with images
- Technologies/skills tags
- GitHub/demo links
- Like button
- Feature toggle (own profile)
```

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" Error
**Solution:** Make sure you're sending the JWT token in the Authorization header

### Issue: "Cannot find module" Error
**Solution:** Run `npm install` in the api directory

### Issue: File Upload Fails
**Solution:** Check R2 storage credentials in .env file

### Issue: Profile Completion Not Updating
**Solution:** It updates automatically when adding skills/projects. Check the database.

---

## 📚 Documentation

Full API documentation: `docs/profile-feed/CAREER_PROFILE_API.md`

Implementation details: `docs/profile-feed/IMPLEMENTATION_COMPLETE.md`

---

## 🚀 Ready to Build the UI!

The backend is **100% ready**. Now create the beautiful frontend components to bring this career profile system to life!

**Start with:** ProfilePage component showing user's complete profile 🎨

---

**Questions?** Check the docs or test the APIs with Postman/Thunder Client! 💪
