# Stunity Enterprise: Education Model + Reporting Master Guide

> **Last Updated:** April 14, 2026  
> **Owner:** Platform Architecture + School Product Team  
> **Status:** Foundation implemented, Cambodia report standardization in planning

## 1. Why This Document Exists

This guide defines the full direction for Stunity’s multi-system school architecture and reporting/export strategy so every developer can implement consistently.

Primary goals:

1. Support multiple education systems (Cambodia, EU, US-style, International, Custom) without rewriting core services.
2. Deliver Cambodia-first reporting and export flows (MoEYS-aligned) as the first production-grade template.
3. Protect real production data in Supabase at every step.

This document complements:

- `SYSTEM_FLEXIBILITY_AND_ONBOARDING.md` (registration + onboarding architecture)
- `README.md` (project entrypoint)
- `docs/DATABASE_SAFETY.md` (production DB protection rules)

## 2. Scope And Non-Goals

### In Scope

- School-level education system configuration (`educationModel`).
- Model-aware onboarding defaults.
- Model-aware report design architecture.
- PDF and Excel export strategy by education model.
- Cambodia-first implementation plan for official reporting templates.

### Out of Scope (for now)

- Country-by-country legal compliance automation.
- Full localization of every report in every language.
- Auto-approval risk scoring for school legitimacy (future security stream).

## 3. Current Implemented Foundation (As of April 14, 2026)

### 3.1 Education Model Core

- `School.educationModel` enum exists and defaults to `KHM_MOEYS`.
- Supported enum values:
  - `KHM_MOEYS`
  - `EU_STANDARD`
  - `INT_BACC`
  - `CUSTOM`

### 3.2 Registration + Onboarding

- New school registration accepts education model from the UI.
- Onboarding defaults are model-aware.
- Pending-school policy supports enterprise onboarding:
  - New schools can onboard while in `PENDING` status.
  - High-risk operations remain blocked until approval.

### 3.3 Access + Safety Layer

- Access context now distinguishes:
  - `FULL`
  - `PENDING_REVIEW`
- Claim-code high-risk endpoints are blocked for pending schools.
- Auth payload includes school context needed by frontend workflows.

### 3.4 UI Context Labels

- Education model label is visible in admin/school navigation context.
- Report UI and PDF exports now carry education model context labels.

## 4. Multi-System Strategy

### 4.1 Design Principle

All education-specific behavior must be driven by **configuration + template registry**, not hardcoded branching in random pages.

### 4.2 Required Abstractions

1. `educationModel` (tenant-level selector)
2. Report template registry (by model + report type + version)
3. Normalized report data contract (shared payload for UI/PDF/Excel)
4. Export adapters (PDF/Excel renderers, model-aware)

### 4.3 Proposed Future Model Expansion

Current enum already supports Cambodia, EU, IB, and Custom. If needed, US-style can be represented by:

- adding a dedicated enum (recommended for clarity), or
- using `CUSTOM` with model profile presets.

Decision should be taken before US-specific report templates are productionized.

## 5. Cambodia-First Reporting Direction (Next Implementation Focus)

We prioritize Cambodia MoEYS standard forms first, then generalize.

### 5.1 Phase-1 Cambodia Report Pack (Target)

1. Student report card (semester)
2. Class ranking summary
3. Annual transcript/progression summary
4. Attendance summary report (monthly/semester)
5. Score entry/export sheets for school operations

### 5.2 Export Outputs

- PDF:
  - Official printable forms
  - Principal/teacher signature sections
  - Khmer-friendly layout and terminology
- Excel:
  - Data submission sheets
  - Audit-friendly tabular exports
  - Optional multi-sheet package per class/year

### 5.3 Template Inputs Pending From Product Team

Before final template coding, product/ops should provide:

1. Official MoEYS sample forms (PDF/photo/scan)
2. Mandatory field list (Khmer and English labels)
3. Calculation rules (rounding, pass/fail, ranking, grading bands)
4. Required signatures/stamps/workflow steps
5. Any compliance notes for archive/export naming

## 6. Reporting Architecture Blueprint

### 6.1 Canonical Report Payload Layer

Every report should first build a normalized payload:

- tenant metadata (`schoolId`, `educationModel`, `academicYearId`)
- report metadata (`reportType`, `version`, `generatedAt`, `generatedBy`)
- dataset (`students`, `subjects`, `scores`, `attendance`, `rankings`)
- computed metrics (averages, grade levels, pass rates)

This payload is then consumed by:

- UI renderer
- PDF renderer
- Excel renderer

### 6.2 Template Registry

Use deterministic keys:

- `{educationModel}:{reportType}:{version}`

Example:

- `KHM_MOEYS:student_report_card:v1`

### 6.3 Export Adapter Layer

- `renderPdf(templateKey, payload)`
- `renderExcel(templateKey, payload)`

No direct business logic inside UI components.

## 7. Production Data Safety Rules (Supabase)

These are non-negotiable for all next steps:

1. Never run destructive DB commands against Supabase from local development.
2. Keep all report queries strictly tenant-scoped (`schoolId`, academic year, permissions).
3. No global curriculum writes for non-tenant-safe tables.
4. Prefer additive migrations (new nullable columns/tables) over destructive schema changes.
5. Gate risky behavior with flags and role checks.
6. Validate all exports against access scope (`PENDING_REVIEW` vs `FULL`).

## 8. Implementation Plan (Cambodia Reports First)

### Phase A: Contract + Specs

1. Freeze report payload contracts per report type.
2. Freeze MoEYS field mapping table.
3. Define formula engines (averages, rank, pass/fail) with tests.

### Phase B: PDF Engine (MoEYS v1)

1. Build template components for each Cambodia report type.
2. Add Khmer labels and official-style layout zones.
3. Add snapshot/regression tests for PDF output shape.

### Phase C: Excel Engine (MoEYS v1)

1. Build workbook schema per report.
2. Separate machine-readable sheets from print sheets.
3. Add formula validation tests.

### Phase D: Admin + Operations Controls

1. Export history logging (who exported, when, report scope).
2. Version tagging in footer/header.
3. Retry and integrity checks for large exports.

### Phase E: Generalization

1. Extract Cambodia-specific logic into template modules.
2. Add EU/IB templates using same contracts.
3. Expand registry with versioned templates.

## 9. QA And Release Checklist

Before production deploy:

1. Unit tests pass for report calculations.
2. Tenant isolation verified with multi-school QA dataset.
3. PDF and Excel outputs match approved template references.
4. Role/access checks verified for pending schools.
5. Build and smoke tests pass across `auth-service`, `school-service`, and `apps/web`.
6. Migration safety checklist completed if schema changed.

## 10. Known Risks And Mitigations

### Risk: Template drift from official MoEYS forms

Mitigation: versioned template registry + visual approval process.

### Risk: Data leakage across schools

Mitigation: strict `schoolId` scoping and integration tests.

### Risk: Premature non-Cambodia branching

Mitigation: complete Cambodia v1 first, then reuse architecture for other models.

## 11. Developer Working Rules For Next PRs

1. Any report/export PR must state:
   - report type
   - target education model
   - template version
2. No report logic directly inside page components.
3. Any new calculation requires test coverage.
4. Any schema change must include Supabase safety notes.
5. Keep this guide updated when architecture decisions change.

## 12. Decision Log (Initial)

- April 14, 2026: Confirmed strategy is Cambodia-first implementation with multi-system architecture retained.
- April 14, 2026: Education model context added to auth + navigation + report surfaces to support future model-specific templates.

---

If you are implementing the next report/export feature, start from this guide, then align with `SYSTEM_FLEXIBILITY_AND_ONBOARDING.md` and current service constraints before writing code.
