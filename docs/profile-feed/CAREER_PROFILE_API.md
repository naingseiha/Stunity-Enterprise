# 🎓 Career Profile System API Documentation

**Date:** January 26, 2026  
**Status:** 🚧 In Development  
**Database:** ✅ Schema Created & Migrated

---

## 📋 Overview

The Career Profile System transforms our platform into a comprehensive career development ecosystem. Users can showcase skills, experience, projects, certifications, and achievements to build their professional identity.

---

## 🗄️ Database Models

### UserSkill
Tracks skills with levels, verification, and endorsements.

```typescript
{
  id: string
  userId: string
  skillName: string // "JavaScript", "Mathematics", "Teaching"
  category: SkillCategory
  level: SkillLevel // BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
  yearsOfExp: float?
  isVerified: boolean
  verifiedBy: string?
  verifiedAt: DateTime?
  description: string?
  endorsements: SkillEndorsement[]
}
```

### SkillEndorsement
Peer endorsements for skills.

```typescript
{
  id: string
  skillId: string
  endorserId: string
  recipientId: string
  comment: string?
  createdAt: DateTime
}
```

### Experience
Work, teaching, volunteer, and other experiences.

```typescript
{
  id: string
  userId: string
  type: ExperienceType // WORK, TEACHING, VOLUNTEER, etc.
  title: string // Job title
  organization: string
  location: string?
  startDate: DateTime
  endDate: DateTime?
  isCurrent: boolean
  description: string?
  achievements: string[]
  skills: string[]
  mediaUrls: string[]
  mediaKeys: string[]
}
```

### Certification
Academic and professional certifications.

```typescript
{
  id: string
  userId: string
  name: string
  issuingOrg: string
  issueDate: DateTime
  expiryDate: DateTime?
  credentialId: string?
  credentialUrl: string?
  certificateUrl: string?
  certificateKey: string?
  description: string?
  skills: string[]
  isVerified: boolean
}
```

### Project
Portfolio projects with rich metadata.

```typescript
{
  id: string
  userId: string
  title: string
  description: string
  category: ProjectCategory
  status: ProjectStatus
  startDate: DateTime?
  endDate: DateTime?
  role: string?
  teamSize: int?
  technologies: string[]
  skills: string[]
  mediaUrls: string[]
  mediaKeys: string[]
  projectUrl: string?
  githubUrl: string?
  demoUrl: string?
  achievements: string[]
  collaborators: string[] // User IDs
  visibility: ProfileVisibility
  viewsCount: int
  likesCount: int
  isFeatured: boolean
}
```

### Achievement
Badges, awards, and milestones.

```typescript
{
  id: string
  userId: string
  type: AchievementType
  title: string
  description: string
  issuedBy: string?
  issuedDate: DateTime
  badgeUrl: string?
  badgeKey: string?
  certificateUrl: string?
  certificateKey: string?
  points: int
  rarity: AchievementRarity // COMMON, RARE, EPIC, LEGENDARY
  isPublic: boolean
  metadata: json?
}
```

### Recommendation
Written recommendations from others.

```typescript
{
  id: string
  recipientId: string
  authorId: string
  relationship: RecommendationRelation
  content: string
  skills: string[]
  rating: int? // 1-5
  isPublic: boolean
  isAccepted: boolean
  acceptedAt: DateTime?
}
```

---

## 🔌 API Endpoints (To Be Implemented)

### Skills API

#### `GET /api/profile/:userId/skills`
Get user's skills with endorsement counts.

**Response:**
```json
{
  "skills": [
    {
      "id": "skill1",
      "skillName": "JavaScript",
      "category": "PROGRAMMING",
      "level": "ADVANCED",
      "yearsOfExp": 3,
      "isVerified": true,
      "endorsementCount": 12,
      "recentEndorsements": [...]
    }
  ]
}
```

#### `POST /api/profile/skills`
Add a new skill.

#### `PUT /api/profile/skills/:skillId`
Update skill details.

#### `DELETE /api/profile/skills/:skillId`
Remove a skill.

#### `POST /api/profile/skills/:skillId/endorse`
Endorse someone's skill.

---

### Experience API

#### `GET /api/profile/:userId/experiences`
Get all experiences.

#### `POST /api/profile/experiences`
Add new experience.

#### `PUT /api/profile/experiences/:experienceId`
Update experience.

#### `DELETE /api/profile/experiences/:experienceId`
Delete experience.

---

### Certifications API

#### `GET /api/profile/:userId/certifications`
Get all certifications.

#### `POST /api/profile/certifications`
Add certification with file upload.

#### `PUT /api/profile/certifications/:certId`
Update certification.

#### `DELETE /api/profile/certifications/:certId`
Delete certification.

---

### Projects API

#### `GET /api/profile/:userId/projects`
Get user's projects/portfolio.

**Query params:**
- `category`: Filter by category
- `featured`: Only featured projects

#### `GET /api/projects/:projectId`
Get project details.

#### `POST /api/profile/projects`
Create new project.

#### `PUT /api/profile/projects/:projectId`
Update project.

#### `DELETE /api/profile/projects/:projectId`
Delete project.

#### `POST /api/profile/projects/:projectId/like`
Like a project.

#### `POST /api/profile/projects/:projectId/feature`
Feature/unfeature on profile.

---

### Achievements API

#### `GET /api/profile/:userId/achievements`
Get user's achievements.

#### `GET /api/achievements/available`
Get available achievements to earn.

#### `POST /api/achievements/award` (Admin/System)
Award achievement to user.

---

### Recommendations API

#### `GET /api/profile/:userId/recommendations`
Get recommendations (accepted only for public view).

#### `POST /api/profile/recommendations`
Write a recommendation for someone.

#### `PUT /api/profile/recommendations/:recId/accept`
Accept a recommendation.

#### `DELETE /api/profile/recommendations/:recId`
Delete a recommendation.

---

### Profile API Updates

#### `GET /api/profile/:userId`
Get complete profile with all sections.

**Response:**
```json
{
  "user": {
    "id": "user1",
    "firstName": "John",
    "lastName": "Doe",
    "profilePictureUrl": "...",
    "coverPhotoUrl": "...",
    "headline": "Grade 12 Student | STEM Enthusiast",
    "bio": "...",
    "careerGoals": "...",
    "location": "Phnom Penh, Cambodia",
    "languages": ["Khmer", "English"],
    "interests": ["Programming", "Mathematics"],
    "profileCompleteness": 85,
    "totalPoints": 2450,
    "level": 12,
    "currentStreak": 15,
    "isVerified": true,
    "isOpenToOpportunities": true
  },
  "stats": {
    "followers": 234,
    "following": 89,
    "posts": 56,
    "projects": 8,
    "certifications": 5,
    "skills": 15,
    "achievements": 23
  },
  "skills": [...],
  "experiences": [...],
  "certifications": [...],
  "featuredProjects": [...],
  "recentAchievements": [...],
  "recommendations": [...]
}
```

#### `PUT /api/profile`
Update profile fields.

#### `GET /api/profile/:userId/stats`
Get profile statistics.

#### `GET /api/profile/:userId/completion`
Get profile completion percentage and suggestions.

---

## 📊 Profile Completion Calculator

Profile completion is calculated based on filled sections:

```typescript
const sections = {
  basicInfo: 10,          // Name, photo, headline
  about: 10,              // Bio, career goals
  contact: 5,             // Location, languages
  skills: 15,             // At least 5 skills
  experience: 15,         // At least 1 experience
  education: 10,          // Linked to student/teacher record
  projects: 15,           // At least 2 projects
  certifications: 10,     // At least 1 certification
  achievements: 5,        // Earned achievements
  recommendations: 5      // At least 1 recommendation
}

Total: 100%
```

---

## 🎯 Implementation Priority

### Phase 1 (This Week)
1. ✅ Database schema
2. ⏳ Skills API
3. ⏳ Projects/Portfolio API
4. ⏳ Profile completion calculator

### Phase 2 (Next Week)
1. Experience API
2. Certifications API
3. Achievements system
4. Recommendations API

### Phase 3 (Week 3)
1. Profile UI components
2. Profile viewing/editing
3. Privacy controls
4. Profile analytics

---

## 🔐 Privacy & Security

### Visibility Controls
Users can set visibility per section:
- `PUBLIC`: Everyone can see
- `SCHOOL`: Only school members
- `CLASS`: Only classmates
- `PRIVATE`: Only self

### Data Validation
- Skill verification by teachers/platform
- Certificate URL validation
- Project URL validation
- Recommendation moderation

---

## 📈 Analytics & Tracking

### Profile Views
Track who views your profile and when.

### Skill Trends
Track which skills are most in-demand.

### Achievement Progress
Show progress toward earning achievements.

### Network Growth
Track follower/connection growth over time.

---

## 🚀 Next Steps

1. Implement Skills API endpoints
2. Create Project/Portfolio API
3. Build Profile UI components
4. Add profile completion calculator
5. Implement privacy controls
6. Create analytics dashboard

---

**This API will power the career development features!** 🎓✨
