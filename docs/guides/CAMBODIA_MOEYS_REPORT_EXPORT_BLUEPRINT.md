# Cambodia MoEYS Reporting And Export Blueprint

> Last Updated: April 14, 2026
> Owner: Product + Platform + Data Team
> Status: Planning-ready architecture (implementation to start after official form inputs)

## 1. Document Purpose

This document defines how Stunity Enterprise should implement report generation and export for Cambodia MoEYS first, while remaining compatible with other education systems (EU/US/International/Custom) later.

It is the implementation blueprint for:

- Report architecture
- Template system
- Dynamic school branding
- File export formats (PDF, XLSX, CSV)
- Data safety and production controls
- QA and release process

This blueprint is designed for engineering execution once official form samples are provided.

## 2. Business Goals

1. Produce official-looking school reports aligned to Cambodian standards.
2. Support at least two export types for each major report:
   - Print-ready PDF
   - Data-ready spreadsheet (XLSX, with CSV fallback)
3. Let schools apply dynamic branding without breaking compliance format:
   - Logo
   - School identity
   - Date formatting
   - Signatures/footer notes
4. Keep system architecture reusable for non-Cambodia templates.
5. Protect real Supabase production data and avoid tenant leakage.

## 3. Scope

### In Scope

- Student report exports
- Teacher and class operational reports
- Monthly and term summaries
- Subject/grade summaries
- PDF and spreadsheet export pipeline
- Template and customization framework

### Out of Scope (for now)

- OCR import of scanned forms
- Government e-submission APIs
- AI auto-layout generation for official forms

## 4. Target Report Families (MoEYS Phase-1)

The first Cambodia implementation should cover:

1. Student semester report card
2. Class ranking summary
3. Monthly attendance report
4. Subject performance summary
5. Teacher load/assignment summary
6. Annual progression or year-end summary

Each family should define:

- Official PDF layout template(s)
- XLSX data workbook template
- CSV data schema for interoperability

## 5. Real-World Pattern (Industry-Standard Approach)

World-class school systems typically use this model:

1. Canonical data contract per report
2. Versioned template registry per country/system
3. Separate renderers per file type (PDF engine, spreadsheet engine)
4. Branded overlays controlled by school settings
5. Audit logs and immutable export artifacts

This is the same pattern recommended for Stunity.

## 6. Architecture Overview

Use a 6-layer architecture:

1. Data Extraction Layer
2. Canonical Report Payload Layer
3. Template Registry Layer
4. Render Adapter Layer
5. Branding/Customization Layer
6. Delivery + Audit Layer

### 6.1 Data Extraction Layer

Responsibilities:

- Fetch report source data from services (grades, students, classes, attendance, etc.)
- Enforce tenant and permission boundaries
- Normalize missing/null values early

Mandatory constraints:

- Every query must include `schoolId`
- Academic year/term filters required where relevant
- Access scope check (`FULL` vs `PENDING_REVIEW`) before high-risk exports

### 6.2 Canonical Report Payload Layer

All renderers consume one normalized payload structure:

```ts
type CanonicalReportPayload = {
  meta: {
    reportType: string;
    reportVersion: string;
    educationModel: 'KHM_MOEYS' | 'EU_STANDARD' | 'INT_BACC' | 'CUSTOM';
    generatedAtIso: string;
    generatedByUserId: string;
    schoolId: string;
    academicYearId?: string;
    termId?: string;
  };
  school: {
    name: string;
    code?: string;
    logoUrl?: string;
    address?: string;
    locale?: string;
  };
  filters: Record<string, string | number | boolean | null>;
  sections: Record<string, unknown>;
  metrics: Record<string, number | string>;
  signatures?: {
    principalName?: string;
    teacherName?: string;
  };
};
```

Benefits:

- One source of truth for all export types
- Consistent calculations across PDF/XLSX/CSV
- Easy snapshot testing

### 6.3 Template Registry Layer

Use deterministic template keys:

- `{educationModel}:{reportType}:{version}`

Examples:

- `KHM_MOEYS:student_report_card:v1`
- `KHM_MOEYS:monthly_attendance:v1`

Template metadata should include:

- Display name
- Applicable grade ranges
- Required payload fields
- Output modes supported (PDF/XLSX/CSV)
- Template status (`draft`, `approved`, `deprecated`)

### 6.4 Render Adapter Layer

Adapters should be explicit and isolated:

- `renderPdf(templateKey, payload, options)`
- `renderXlsx(templateKey, payload, options)`
- `renderCsv(templateKey, payload, options)`

Rules:

- No business formulas in UI page components
- No direct DB fetch in renderer
- Renderer consumes only canonical payload + template + branding settings

### 6.5 Branding/Customization Layer

Allow controlled customization without breaking official structure.

Configurable fields (per school):

- Logo image
- Header text (school name, code, address)
- Footer note
- Signature labels
- Date display format
- Optional stamp/approval image

Guardrails:

- Template-locked sections cannot be moved for compliance forms
- Branding overlays allowed only in designated zones
- Image validation for size/type/aspect ratio

### 6.6 Delivery + Audit Layer

Every export request should:

1. Generate artifact
2. Store metadata
3. Return downloadable link/stream
4. Write audit log

Audit record should include:

- `schoolId`
- `userId`
- `templateKey`
- `outputType` (`pdf`, `xlsx`, `csv`)
- Scope and filters used
- Generated timestamp
- Artifact hash/checksum

## 7. Export Format Strategy

### 7.1 PDF (Official/Print Use)

Best for:

- Official report cards
- Signed forms
- Archival print documents

Technical requirements:

- Stable page dimensions and margins
- Khmer-safe fonts where required
- Signature/stamp zones
- Deterministic footer metadata (version + generated date)

### 7.2 XLSX (Operational/Editable Use)

Best for:

- School office workflows
- Bulk review and reconciliation
- Multi-sheet exports

Technical requirements:

- Typed columns
- Freeze panes, headers, sheet naming standard
- Numeric format consistency
- Protected formula cells where needed

### 7.3 CSV (Interoperability Use)

Best for:

- Data exchange with external tools
- Lightweight import/export scenarios

Technical requirements:

- UTF-8 encoding
- Deterministic column order
- Explicit delimiter and quote behavior
- Companion schema docs per report type

Recommendation:

- Treat CSV as a data format, not a design format.
- Use PDF for design fidelity and XLSX for operational spreadsheet workflows.

## 8. Dynamic Layout And User Flexibility

Support two levels of flexibility:

### Level A: Safe Customization (Default)

- Swap logo
- Update localized labels from allowed dictionary
- Configure date style
- Set signature text/names
- Add footer note

### Level B: Advanced Designer (Later)

- Optional drag/drop field positioning
- Template cloning
- Preview and approval workflow

For MoEYS official forms, Level A is recommended first to preserve compliance.

## 9. Date, Locale, And Numbering Rules

For Cambodia templates:

- Default locale: `km-KH` with optional bilingual labels
- Date output:
  - Display format configurable (`DD/MM/YYYY` default for official forms if confirmed)
  - Store ISO date internally
- Ranking and averages:
  - Formula version pinned in template metadata
- Identifier formatting:
  - Keep student/class IDs as strings to avoid spreadsheet auto-format corruption

## 10. Data Model Additions (Recommended)

Add or confirm these entities:

1. `report_templates`
2. `report_template_versions`
3. `report_branding_settings`
4. `report_exports` (artifact metadata + audit)

Suggested `report_exports` fields:

- `id`
- `schoolId`
- `generatedByUserId`
- `templateKey`
- `outputType`
- `filterSnapshotJson`
- `artifactStoragePath`
- `artifactHash`
- `generatedAt`
- `status`

All tables must be tenant-scoped and indexed by `schoolId`.

## 11. API Design (Draft)

### Generate

- `POST /reports/exports/generate`
  - Input: `reportType`, `templateKey`, `outputType`, `filters`, `brandingOverrides?`
  - Output: job ID or direct artifact link

### Preview

- `POST /reports/exports/preview`
  - Light preview generation for UI validation

### History

- `GET /reports/exports/history`
  - Paginated export logs per school

### Download

- `GET /reports/exports/:id/download`
  - Permission-checked file stream

## 12. Security And Supabase Production Safety

Hard rules:

1. No destructive migration workflow in local dev against Supabase.
2. No global writes for school-specific report fields.
3. Explicit role checks for export actions.
4. Signed artifact URLs with expiry.
5. PII minimization in logs and telemetry.
6. Redaction policy for debug logs.

## 13. Performance And Reliability

For large classes/schools:

- Use async export jobs
- Queue-based processing
- Retry with idempotency key
- Cap concurrent jobs per school
- Cache canonical payload fragments where safe

Expected behavior:

- Small exports: synchronous response
- Large exports: queued with status polling

## 14. Testing Strategy

Minimum quality gates:

1. Unit tests for formula logic
2. Contract tests for canonical payload shape
3. Golden file tests for PDF and XLSX snapshots
4. Multi-tenant isolation integration tests
5. Permission tests (`ADMIN`, `STAFF`, `SUPER_ADMIN`, pending schools)
6. Regression tests for template version upgrades

## 15. Rollout Plan

### Phase 0 - Preparation

1. Collect official MoEYS form artifacts
2. Freeze report field dictionary
3. Freeze formula definitions

### Phase 1 - MoEYS v1 Engine

1. Implement canonical payload builders
2. Implement PDF + XLSX + CSV adapters for first two report families
3. Add branding settings and export audit logs

### Phase 2 - Complete MoEYS Pack

1. Add remaining report families
2. Add approval workflow and version pinning
3. Add job queue for heavy exports

### Phase 3 - Multi-System Expansion

1. Reuse same contracts for EU/IB templates
2. Introduce US profile if required
3. Add template management tooling

## 16. Required Inputs From Product (When Ready)

When you provide formats, include:

1. Official sample files per report type
2. Mandatory/optional field list
3. Calculation definitions
4. Signature/stamp requirements
5. Khmer/English label dictionary
6. Exact export file naming conventions

## 17. Definition Of Done (Per Report Template)

A template is "done" only when:

1. PDF output matches approved reference layout
2. XLSX output matches approved sheet schema
3. CSV schema documented and validated
4. Formula tests and snapshot tests pass
5. Tenant isolation and permission tests pass
6. Audit logs are visible in admin history

## 18. Immediate Next Steps For Engineering

1. Keep this blueprint as the execution source of truth.
2. Wait for MoEYS form package from product.
3. Start with two pilot templates:
   - `student_report_card`
   - `monthly_attendance`
4. Build canonical payload contracts first, then renderers.

---

This blueprint is intentionally implementation-focused so the team can move directly into coding once official templates are provided.
