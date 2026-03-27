# Implementation Plan: Adding English Names

## Goal
Add `englishFirstName` and `englishLastName` as optional fields to the `Student`, `Teacher`, and `User` models to support international naming standards, while leaving the `Parent` model untouched. Ensure the web and mobile clients are updated to capture and display these new fields where applicable.

## Proposed Changes

### Database Layer (`packages/database`)
#### [MODIFY] packages/database/prisma/schema.prisma
- **Student Model:** Add `englishFirstName String?` and `englishLastName String?`.
- **Teacher Model:** Add `englishFirstName String?` and `englishLastName String?`.
- **User Model:** Add `englishFirstName  String?` and `englishLastName  String?`.
- **Action:** Run Prisma migrations (`npx prisma migrate dev --name add_english_names` or `npx prisma db push`) to safely apply changes without affecting existing logic.

### API & Validation Layer
- Locate and update any relevant Zod validation schemas (e.g., inside API routers or the `services` folders) to accept `englishFirstName` and `englishLastName` as `.optional()`.

### Web Client (`apps/web`)
- **Forms:** Update `StudentModal.tsx`, Teacher management forms, and user profile settings to include two new optional text input fields: "English First Name" and "English Last Name".
- **Display:** Update relevant Profile screens to display these English names alongside the native names if they are provided.

### Mobile Client (`apps/mobile`)
- **Forms:** Update Student/Teacher/User profile editing screens to include optional inputs for "English First Name" and "English Last Name".
- **Display:** Update profile view screens to beautifully display the English names if they exist.

## Verification Plan

### Automated Tests
- No automated tests specifically cover form UI validation across the stack, but API TRPC tests (if present) will be updated or run to ensure Prisma allows the nulls.
- Run `pnpm tsc` or `pnpm build` across the monorepo to ensure type safety is maintained and no errors were introduced by expanding the schema.

### Manual Verification
1. **Database:** Verify `npx prisma db push` succeeds and existing rows remain unharmed.
2. **Web App:** 
   - Open the Web App, navigate to the User Directory or Student Management.
   - Open `StudentModal` and verify the "English First Name" and "English Last Name" inputs appear.
   - Fill them out, save, and reopen to ensure the data persists.
3. **Mobile App:** 
   - Start the mobile app via Expo.
   - Navigate to the Profile settings and ensure the two new inputs exist and can save successfully.
