# Average Calculation Improvement - Fix Document

## Current Issue

The current average calculation uses a **fixed total coefficient** for ALL students in a class, regardless of how many subjects have been imported or have scores entered.

### Current Formula (INCORRECT):
```
AVERAGE = Total Score / Total Coefficient of ALL 13-15 subjects
```

Example Problem:
- Class has 15 subjects total (coefficient sum = 15.0)
- Only imported 3 subjects: Khmer (coef=1), Math (coef=2), Physics (coef=2)
- Student A: Khmer=75, Math=80, Physics=70
- **Current Calculation**: (75 + 80 + 70) / 15.0 = 15.0 ❌ WRONG
- **Should be**: (75 + 80 + 70) / 5.0 = 45.0 ✅ CORRECT

## Required New Behavior

### New Formula (CORRECT):
```
AVERAGE = Total Score of ENTERED subjects / Total Coefficient of ENTERED subjects
```

### Important Rules:

1. **Only count subjects that have been imported/entered**
   - If only 3 subjects imported → use coefficient sum of those 3 subjects only
   - If all 15 subjects imported → use coefficient sum of all 15 subjects

2. **Score of 0 is still counted as "entered"**
   - Student A: Math=75, Physics=0
   - This counts as 2 subjects entered
   - AVERAGE = (75 + 0) / (coef_math + coef_physics)
   - **DO NOT** exclude Physics from coefficient just because score is 0

3. **Only exclude subjects with NO score at all (empty/null)**
   - Empty cell = not entered = exclude from both numerator and denominator
   - Score of 0 = absent but entered = include in both numerator and denominator

## Implementation Changes

### File: `src/components/grades/useGradeCalculations.ts`

**Current Code (lines 11-48):**
```typescript
const calculatedStudents = useMemo(() => {
  return students.map((student) => {
    let totalScore = 0;
    let totalMaxScore = 0;

    subjects.forEach((subject) => {
      const cellKey = `${student.studentId}_${subject.id}`;
      const cell = cells[cellKey];

      if (cell && cell.value.trim() !== "" && !cell.error) {
        const score = parseFloat(cell.value);
        if (!isNaN(score)) {
          // Include ALL scores (including 0) in calculations
          totalScore += score;
          totalMaxScore += subject.maxScore;
        }
      }
    });

    // ❌ WRONG: Uses fixed totalCoefficient for entire class
    const average = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;

    // ... rest of code
  });
}, [cells, students, subjects, totalCoefficient]);
```

**New Code (REQUIRED CHANGE):**
```typescript
const calculatedStudents = useMemo(() => {
  return students.map((student) => {
    let totalScore = 0;
    let totalMaxScore = 0;
    let studentCoefficient = 0; // ✅ NEW: Track coefficient per student

    subjects.forEach((subject) => {
      const cellKey = `${student.studentId}_${subject.id}`;
      const cell = cells[cellKey];

      if (cell && cell.value.trim() !== "" && !cell.error) {
        const score = parseFloat(cell.value);
        if (!isNaN(score)) {
          // Include ALL scores (including 0) in calculations
          totalScore += score;
          totalMaxScore += subject.maxScore;
          studentCoefficient += subject.coefficient; // ✅ NEW: Add coefficient only for entered subjects
        }
      }
    });

    // ✅ CORRECT: Use student-specific coefficient based on entered subjects
    const average = studentCoefficient > 0 ? totalScore / studentCoefficient : 0;

    let gradeLevel = "F";
    if (average >= 45) gradeLevel = "A";
    else if (average >= 40) gradeLevel = "B";
    else if (average >= 35) gradeLevel = "C";
    else if (average >= 30) gradeLevel = "D";
    else if (average >= 25) gradeLevel = "E";

    return {
      ...student,
      totalScore: totalScore.toFixed(2),
      totalMaxScore,
      totalCoefficient: studentCoefficient.toFixed(2), // ✅ NEW: Store student's actual coefficient
      average: average.toFixed(2),
      gradeLevel,
    };
  });
}, [cells, students, subjects]); // ✅ Removed totalCoefficient from dependencies
```

## Test Scenarios

### Scenario 1: Partial Subject Import
- **Given**: 15 subjects total in class, only 3 imported (Khmer, Math, Physics)
- **Student Data**:
  - Khmer = 75 (coef=1)
  - Math = 80 (coef=2)
  - Physics = 70 (coef=2)
- **Expected**:
  - Total Score = 75 + 80 + 70 = 225
  - Total Coefficient = 1 + 2 + 2 = 5
  - Average = 225 / 5 = 45.0

### Scenario 2: Score of 0 (Absent)
- **Given**: 2 subjects imported
- **Student Data**:
  - Math = 75 (coef=2)
  - Physics = 0 (coef=2) ← Absent but score entered
- **Expected**:
  - Total Score = 75 + 0 = 75
  - Total Coefficient = 2 + 2 = 4 ← Still count Physics coefficient
  - Average = 75 / 4 = 18.75

### Scenario 3: Missing Score (Not Entered)
- **Given**: 3 subjects imported
- **Student Data**:
  - Math = 75 (coef=2)
  - Physics = (empty) ← Not entered yet
  - Chemistry = 80 (coef=2)
- **Expected**:
  - Total Score = 75 + 80 = 155
  - Total Coefficient = 2 + 2 = 4 ← Exclude Physics coefficient
  - Average = 155 / 4 = 38.75

### Scenario 4: All Subjects Imported
- **Given**: All 15 subjects imported and entered
- **Student Data**: All subjects have scores (including some 0s)
- **Expected**:
  - Sum all scores (including 0s)
  - Sum all 15 coefficients
  - Average = Total / All Coefficients

## Summary

✅ **What Changes**: Calculate coefficient dynamically per student based on which subjects have scores entered

✅ **What Stays Same**: Score of 0 is still treated as "entered" and included in calculations

✅ **Files to Modify**: 
- `src/components/grades/useGradeCalculations.ts` (main change)

✅ **No Database Changes**: This is purely a frontend calculation change

✅ **No Breaking Changes**: The calculation is more accurate and fair for students
