# Changelog

All notable changes to Stunity Enterprise will be documented in this file.

## [2.4.0] - 2026-02-10

### Added - Claim Code & ID Generation System

#### Database & Core
- **ID Generation System** with 3 formats (STRUCTURED, SIMPLIFIED, HYBRID)
- **ClaimCode model** with verification data, expiration, and revocation support
- **IdGenerationLog model** for audit trail
- Luhn check digit algorithm for ID validation
- Support for Cambodia/ASEAN student ID standards
- New enums: `IdFormat`, `ClaimCodeType`, `AccountType`

#### Backend Services
- **Auth Service v2.3** - 4 new claim code endpoints:
  - `POST /auth/claim-codes/validate` - Validate claim code
  - `POST /auth/claim-codes/link` - Link code to existing account
  - `POST /auth/register/with-claim-code` - Register with code
  - `POST /auth/login/claim-code` - First-time login with code

- **School Service v2.4** - 5 new claim code management endpoints:
  - `POST /schools/:id/claim-codes/generate` - Generate codes (bulk/specific)
  - `GET /schools/:id/claim-codes` - List codes with filtering
  - `GET /schools/:id/claim-codes/:codeId` - Get code details
  - `GET /schools/:id/claim-codes/export` - Export as CSV
  - `POST /schools/:id/claim-codes/:codeId/revoke` - Revoke code

- **Student Service** - Integrated ID generation:
  - Automatic student ID generation on creation
  - Configurable format per school (STRUCTURED/SIMPLIFIED/HYBRID)
  - Permanent UUID-based IDs
  - Generation metadata logging

- **Teacher Service** - Integrated ID generation:
  - Automatic teacher ID generation on creation
  - Same format options as students
  - Permanent UUID-based IDs
  - Generation metadata logging

#### Mobile App
- **RegisterScreen** - Claim code integration:
  - "I have a school claim code" toggle
  - Claim code input with auto-uppercase
  - Real-time validation with API
  - Success card showing school/student info
  - Auto-fill organization from validated code
  - Auto-select role based on code type (STUDENT/TEACHER)
  - Professional UI with yellow toggle, blue validate button, green success card

#### Utilities
- `ClaimCodeGenerator` - Cryptographic code generation
  - Format: `TYPE-XXXX-XXXX` (e.g., STNT-AB12-CD34)
  - Removes ambiguous characters (0, O, 1, I)
  - Configurable expiration (default 365 days)
  - Verification data support

- `IdGenerator` - Flexible student/teacher ID generation
  - STRUCTURED format: `GSYY-SSCCC-NNNN-C` with full demographics
  - SIMPLIFIED format: `S-XXXXXX-C` for privacy compliance
  - HYBRID format: `SYYL-NNNNNN-C` balanced approach
  - Thread-safe sequential numbering

#### Documentation
- `CLAIM_CODE_API_IMPLEMENTATION.md` (21KB) - Complete API reference
- `STUDENT_TEACHER_ID_SYSTEM.md` (30KB) - ID system specifications
- `SOCIAL_SCHOOL_INTEGRATION_WORKFLOW.md` (30KB) - Workflow design
- `MOBILE_INTEGRATION_COMPLETE.md` (8KB) - Mobile integration guide

#### Testing
- Comprehensive integration test script (`test-claim-codes.sh`)
- Simple API test script (`simple-test-claim-codes.sh`)
- Service health checks
- End-to-end workflow testing

### Changed
- **User model** - Added account type fields:
  - `accountType` (SOCIAL_ONLY, SCHOOL_ONLY, HYBRID)
  - `organizationCode`, `organizationName`, `organizationType`
  - `socialFeaturesEnabled`, `privacySettings`
  - SSO fields: `ssoProvider`, `ssoId`, `ssoAccessToken`

- **School model** - Added ID generation configuration:
  - `idFormat` (STRUCTURED, SIMPLIFIED, HYBRID)
  - `idPrefix` for school identification
  - `nextStudentNumber`, `nextTeacherNumber` for sequencing
  - `countryCode`, `regionCode` for regional customization

- **Student model** - Added ID fields:
  - `permanentId` (UUID-based, immutable)
  - `studentIdFormat`, `studentIdMeta`
  - `entryYear` for cohort tracking

- **Teacher model** - Added ID fields:
  - `permanentId` (UUID-based, immutable)
  - `teacherIdFormat`, `teacherIdMeta`
  - `hireYear` for tenure tracking

### Database Migration
- Migration: `20260210131804_add_id_and_claim_code_systems`
- All tables created successfully
- Indexes added for performance
- Foreign key relationships established

### Technical Details
- Total implementation: 21.5 hours
- Backend endpoints: 9 (4 auth + 5 school)
- Mobile code added: ~300 lines
- Test scripts: 2
- Documentation: 4 major files
- TypeScript compilation: ✅ No errors

---

## [2.3.0] - 2026-02-09

### Added - Enterprise Mobile Auth UI
- Professional authentication screens (Welcome, Login, Register)
- Enterprise SSO button
- Organization selection in registration
- Compliance checkboxes (Terms, Privacy, FERPA/GDPR)
- Fully rounded design system (28-30px border radius)
- Enhanced visual design with shadows and gradients

See: `ENHANCED_AUTH_DESIGN.md`, `DESIGN_CONSISTENCY_UPDATE.md`

---

## [2.2.0] - 2026-01-15

### Added
- Multi-tenant school management system
- Academic year comprehensive management
- Attendance tracking system
- Grade management with confirmation workflow
- Parent portal with student lookup

### Changed
- Upgraded to Prisma 5.x
- Enhanced database schema
- Improved API error handling

---

## [2.1.0] - 2025-12-10

### Added
- Social feed system
- User profiles with connections
- Post creation and interaction
- Like and comment system

---

## [2.0.0] - 2025-11-01

### Added
- Initial release of Stunity Enterprise
- 12 microservices architecture
- PostgreSQL database with Prisma ORM
- React Native mobile app
- Authentication system
- School registration

---

## Version History Summary

- **v2.4.0** (2026-02-10): Claim Code & ID Generation System ✅
- **v2.3.0** (2026-02-09): Enterprise Mobile Auth UI
- **v2.2.0** (2026-01-15): Multi-tenant School Management
- **v2.1.0** (2025-12-10): Social Feed System
- **v2.0.0** (2025-11-01): Initial Release
