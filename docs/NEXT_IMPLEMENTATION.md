# Next Implementation Roadmap

This document outlines the planned next steps for Stunity Enterprise development.

---

## Priority 1: Bug Fixes & Code Quality

### 1.1 TypeScript Error Resolution
Fix pre-existing TypeScript compilation errors:

**Files to Fix:**
| File | Issue | Priority |
|------|-------|----------|
| `classes/page.tsx` | `clearAccessToken` → `clearTokens` | High |
| `classes/[id]/roster/page.tsx` | Student type missing fields | High |
| `settings/academic-years/*.tsx` | `schoolId` property access | Medium |
| `settings/promotion/page.tsx` | Missing context properties | Medium |
| `grades/entry/page.tsx` | Undefined score handling | Low |

**Estimated Effort:** 2-3 hours

### 1.2 API Type Definitions
Create proper TypeScript interfaces for all API responses to eliminate `any` types.

---

## Priority 2: Feature Completion

### 2.1 Timetable System
- [ ] Auto-assign algorithm improvements (smarter teacher distribution)
- [ ] Timetable templates (save/load common configurations)
- [ ] Bulk edit mode (select multiple cells)
- [ ] Print-friendly timetable view
- [ ] Teacher workload visualization

### 2.2 Attendance System
- [ ] Quick attendance marking (one-click for whole class)
- [ ] Attendance trends/analytics dashboard
- [ ] Late arrival tracking with reason codes
- [ ] Parent notification integration

### 2.3 Grade System
- [ ] Grade calculation formulas (customizable weights)
- [ ] Grade curves and normalization
- [ ] Report card PDF generation
- [ ] Grade history comparison

### 2.4 Student Management
- [ ] Student transfer between classes
- [ ] Bulk student import from Excel/CSV
- [ ] Student profile photos
- [ ] Parent/guardian contact management

---

## Priority 3: UX Improvements

### 3.1 Additional Loading States
Add loading.tsx to remaining pages:
- [ ] `/settings/failed-students`
- [ ] `/settings/year-end-workflow`
- [ ] `/timetable/master`
- [ ] `/profile`

### 3.2 Error Boundaries
Implement proper error handling:
- [ ] Global error boundary component
- [ ] Per-page error.tsx files
- [ ] User-friendly error messages
- [ ] Error reporting/logging

### 3.3 Mobile Responsiveness
- [ ] Test and fix mobile layouts
- [ ] Touch-friendly timetable editing
- [ ] Mobile-optimized navigation

### 3.4 Accessibility
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast improvements
- [ ] Focus indicators

---

## Priority 4: Infrastructure

### 4.1 Testing
- [ ] Unit tests for API functions
- [ ] Integration tests for critical flows
- [ ] E2E tests with Playwright/Cypress
- [ ] Test coverage reporting

### 4.2 Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component storybook
- [ ] Developer onboarding guide
- [ ] Deployment documentation

### 4.3 Performance Monitoring
- [ ] Add performance metrics collection
- [ ] Database query optimization
- [ ] API response time monitoring
- [ ] Frontend bundle analysis

---

## Implementation Order Recommendation

### Sprint 1 (Week 1-2)
1. Fix TypeScript errors (Priority 1.1)
2. Add remaining loading states (Priority 3.1)
3. Implement error boundaries (Priority 3.2)

### Sprint 2 (Week 3-4)
1. Timetable templates feature
2. Print-friendly timetable view
3. Mobile responsiveness fixes

### Sprint 3 (Week 5-6)
1. Attendance quick marking
2. Grade calculation formulas
3. Report card PDF generation

### Sprint 4 (Week 7-8)
1. Student bulk import
2. API documentation
3. Testing setup

---

## Technical Debt to Address

1. **Inconsistent API patterns** - Standardize response formats
2. **Mixed state management** - Consider React Query for server state
3. **Duplicate code** - Extract common patterns into hooks
4. **Missing validation** - Add Zod schemas for form validation
5. **Hardcoded strings** - Move to i18n translation files

---

## Quick Wins (Can be done anytime)

- [ ] Add favicon and meta tags
- [ ] Implement dark mode toggle
- [ ] Add loading spinners to buttons during actions
- [ ] Improve toast notification system
- [ ] Add keyboard shortcuts for common actions

---

*Created: February 1, 2026*
*Next Review: February 15, 2026*
