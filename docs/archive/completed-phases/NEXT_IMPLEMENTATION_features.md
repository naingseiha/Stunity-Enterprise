# Next Implementation Roadmap

## Overview

This document outlines the next features to be implemented for Stunity Enterprise, building on the completed feed media upload functionality.

---

## Phase 16: Enhanced Feed Features

### 16.1 Video Upload Support
**Priority:** High  
**Estimated Effort:** Medium

- [ ] Add video file support to R2 upload (MP4, WebM, MOV)
- [ ] Implement video player component in PostCard
- [ ] Add video thumbnail generation
- [ ] Implement video compression before upload
- [ ] Add video duration display

### 16.2 Document Attachments
**Priority:** Medium  
**Estimated Effort:** Low

- [ ] Support document uploads (PDF, DOCX, XLSX, PPTX)
- [ ] Document preview/download in posts
- [ ] File type icons and metadata display

### 16.3 Rich Text Editor
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Integrate rich text editor (TipTap or Slate)
- [ ] Support markdown formatting
- [ ] Add code blocks for tutorials
- [ ] Mention users (@username)
- [ ] Hashtag support (#topic)

### 16.4 Post Scheduling
**Priority:** Low  
**Estimated Effort:** Low

- [ ] Schedule posts for future publication
- [ ] Draft posts
- [ ] Scheduled posts dashboard

---

## Phase 17: Messaging System

### 17.1 Direct Messaging
**Priority:** High  
**Estimated Effort:** High

- [ ] One-on-one messaging
- [ ] Real-time message delivery (WebSocket)
- [ ] Message read receipts
- [ ] Typing indicators
- [ ] Message search

### 17.2 Group Chats
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Create group chats
- [ ] Add/remove members
- [ ] Group admin controls
- [ ] Group chat settings

### 17.3 File Sharing in Messages
**Priority:** Medium  
**Estimated Effort:** Low

- [ ] Share images in messages
- [ ] Share documents in messages
- [ ] Shared files gallery

---

## Phase 18: Notifications System

### 18.1 In-App Notifications
**Priority:** High  
**Estimated Effort:** Medium

- [ ] Real-time notification bell
- [ ] Notification types (likes, comments, mentions, follows)
- [ ] Mark as read/unread
- [ ] Notification settings

### 18.2 Push Notifications
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Browser push notifications
- [ ] Mobile push (future mobile app)
- [ ] Notification preferences

### 18.3 Email Notifications
**Priority:** Low  
**Estimated Effort:** Low

- [ ] Daily/weekly digest emails
- [ ] Important activity alerts
- [ ] Email preferences

---

## Phase 19: User Profiles

### 19.1 Profile Pages
**Priority:** High  
**Estimated Effort:** Medium

- [ ] Public user profile page
- [ ] Profile banner/cover photo
- [ ] Bio and about section
- [ ] Skills and expertise tags
- [ ] Activity timeline

### 19.2 Profile Settings
**Priority:** Medium  
**Estimated Effort:** Low

- [ ] Edit profile information
- [ ] Privacy settings
- [ ] Account settings
- [ ] Change password

### 19.3 Following System
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Follow/unfollow users
- [ ] Followers/following lists
- [ ] Following feed filter

---

## Phase 20: Learning Features

### 20.1 Course Management
**Priority:** High  
**Estimated Effort:** High

- [ ] Create courses with modules
- [ ] Lesson content (video, text, quiz)
- [ ] Course enrollment
- [ ] Progress tracking

### 20.2 Quiz System
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Create quizzes with multiple question types
- [ ] Timed quizzes
- [ ] Auto-grading
- [ ] Quiz analytics

### 20.3 Assignment Submissions
**Priority:** Medium  
**Estimated Effort:** Medium

- [ ] Submit assignments as files
- [ ] Assignment grading
- [ ] Feedback and comments
- [ ] Due date reminders

---

## Phase 21: Mobile App

### 21.1 React Native App
**Priority:** High  
**Estimated Effort:** Very High

- [ ] Cross-platform mobile app (iOS & Android)
- [ ] Core features parity with web
- [ ] Native camera integration
- [ ] Push notifications
- [ ] Offline support

---

## Technical Debt & Improvements

### Performance
- [ ] Image optimization/compression before upload
- [ ] Lazy loading for feed posts
- [ ] Virtual scrolling for long lists
- [ ] CDN caching improvements

### Security
- [ ] File type validation on server
- [ ] Image content moderation
- [ ] Rate limiting for uploads
- [ ] CORS hardening

### Testing
- [ ] Unit tests for feed service
- [ ] Integration tests for upload flow
- [ ] E2E tests for feed UI
- [ ] Load testing for file uploads

### DevOps
- [ ] CI/CD pipeline improvements
- [ ] Staging environment
- [ ] Automated backups for R2
- [ ] Monitoring and alerting

---

## Suggested Implementation Order

1. **Video Upload Support** - Extends current media functionality
2. **Direct Messaging** - Core communication feature
3. **In-App Notifications** - Improves engagement
4. **Profile Pages** - User identity and discovery
5. **Course Management** - Core educational feature
6. **Mobile App** - Expand user reach

---

## Notes

- All features should maintain multi-tenant isolation (schoolId filtering)
- Follow existing patterns for authentication and API structure
- Maintain bilingual support (English/Khmer)
- Ensure responsive design for all new components
