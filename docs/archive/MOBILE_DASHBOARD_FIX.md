# Mobile Dashboard Average Calculation Fix

**Date**: 2026-01-16  
**Status**: ✅ FIXED

## Problem Identified

The mobile dashboard was showing **incorrect average calculations** (old formula) while most API endpoints were already using the new correct formula documented in `AVERAGE_CALCULATION_IMPLEMENTATION.md`.

### Root Cause

The issue was in **`api/src/services/grade-calculation.service.ts`** at line 108-110:

```typescript
// ❌ OLD - INCORRECT (was using weighted score divided by coefficient)
const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
```

This was calculating: `(score × coefficient) / coefficient` which is mathematically equivalent to just `score`, but NOT averaging across subjects correctly.

### Why Mobile Dashboard Was Affected

1. **Mobile dashboard** uses the `/api/dashboard/mobile-stats` endpoint
2. This endpoint queries `studentMonthlySummary.average` from the database
3. The `studentMonthlySummary` records are created by `grade-calculation.service.ts`
4. Since this service was using the **old formula**, all stored averages were incorrect

## The Fix

### File Changed: `api/src/services/grade-calculation.service.ts`

**Line 108-110** updated from:
```typescript
// Calculate average
const average =
  totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
```

**To:**
```typescript
// ✅ Calculate average using correct formula (as per AVERAGE_CALCULATION_IMPLEMENTATION.md)
// AVERAGE = Total Score of ENTERED subjects / Sum of coefficients for ENTERED subjects
const average =
  totalCoefficient > 0 ? totalScore / totalCoefficient : 0;
```

## Correct Formula (Documented)

```
AVERAGE = Total Score of ENTERED subjects / Sum of coefficients for ENTERED subjects
```

### Example:
- **Student has**: Math (score=75, coef=2), Physics (score=80, coef=2), Chemistry (empty)
- **Calculation**: (75 + 80) / (2 + 2) = 155 / 4 = **38.75** ✅

### Old Incorrect Calculation Was:
- **Calculation**: (75×2 + 80×2) / (2 + 2) = 310 / 4 = **77.5** ❌ (WRONG!)

## What Was Already Correct

These components were **already using the correct formula**:

1. ✅ **Frontend grade entry** (`src/components/grades/useGradeCalculations.ts` line 31)
2. ✅ **Monthly summary service** (`api/src/services/monthly-summary.service.ts` lines 91-94)
3. ✅ **Calculation script** (`api/src/scripts/calculate-monthly-summaries-dynamic.ts` lines 95-98)
4. ✅ **Comprehensive stats API** (`api/src/controllers/dashboard.controller.ts` line 1191)
5. ✅ **Grade level stats API** (uses student summaries calculated with correct formula)

## Next Steps Required

### 1. Rebuild API
```bash
cd api
npm run build
```

### 2. Recalculate All Monthly Summaries
All existing `studentMonthlySummary` records need to be recalculated with the correct formula:

```bash
cd api
npx ts-node src/scripts/calculate-monthly-summaries-dynamic.ts "មករា" 2026
```

Run this for all months that have data (e.g., មករា, កុម្ភៈ, etc.)

### 3. Restart API Server
```bash
# If using PM2
pm2 restart school-api

# Or if running directly
cd api && npm start
```

### 4. Clear Cache on Mobile App
Mobile users should:
- Pull down to refresh the dashboard
- Or clear app cache

## Verification

After the fix and recalculation:

1. **Check mobile dashboard** - averages should now match the correct formula
2. **Compare with grade entry screen** - values should be consistent
3. **Verify statistics page** - all calculations should align

## Impact

✅ **Mobile dashboard** will now show accurate averages  
✅ **Consistent calculations** across all screens  
✅ **Fair student evaluation** based on entered subjects only  
✅ **No breaking changes** - only calculation logic improved

---

**Status**: ✅ CODE FIXED - Needs API rebuild and data recalculation
