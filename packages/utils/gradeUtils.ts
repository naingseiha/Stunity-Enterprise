import { GradeScale, Grade } from "@/types";

export function getLetterGrade(
  score: number,
  gradeScale: GradeScale[]
): string {
  for (const scale of gradeScale) {
    if (score >= scale.min && score <= scale.max) {
      return scale.grade;
    }
  }
  return "F";
}

export function calculateAverage(grades: Grade[]): number {
  if (!grades || grades.length === 0) return 0;

  // Include ALL scores (including 0) in calculations
  const total = grades.reduce((sum, grade) => {
    const score =
      typeof grade.score === "string" ? parseFloat(grade.score) : grade.score;
    return sum + (isNaN(score) ? 0 : score);
  }, 0);

  return total / grades.length;
}

export function getStudentRank(
  studentId: string,
  classId: string,
  allGrades: Grade[],
  students: any[]
): number {
  const classStudents = students.filter((s) => s.classId === classId);

  const studentAverages = classStudents.map((student) => {
    const studentGrades = allGrades.filter((g) => g.studentId === student.id);
    const avg = calculateAverage(studentGrades);
    return { studentId: student.id, average: avg };
  });

  studentAverages.sort((a, b) => b.average - a.average);

  const rank = studentAverages.findIndex((s) => s.studentId === studentId);
  return rank !== -1 ? rank + 1 : 0;
}

/**
 * Check if a score represents an absent student (score = 0)
 * @param score The grade score to check
 * @returns true if the score is exactly 0 (absent), false otherwise
 */
export function isAbsentScore(score: number | null | undefined): boolean {
  return score === 0;
}

/**
 * Format a grade score for display
 * - Score of 0 displays as "A" (Absent)
 * - Null/undefined displays as "-"
 * - Other scores display as numbers with specified decimal places
 *
 * @param score The grade score
 * @param decimalPlaces Number of decimal places (default: 1)
 * @returns Formatted string for display
 */
export function formatGradeDisplay(
  score: number | null | undefined,
  decimalPlaces: number = 1
): string {
  if (score === null || score === undefined) {
    return "-";
  }

  if (isAbsentScore(score)) {
    return "A";
  }

  return score.toFixed(decimalPlaces);
}

/**
 * Filter out absent scores (0) from a list of grades for calculation purposes
 * @param scores Array of scores
 * @returns Array of scores excluding absent (0) values
 */
export function filterAbsentScores(scores: (number | null | undefined)[]): number[] {
  return scores.filter(
    (score): score is number =>
      score !== null &&
      score !== undefined &&
      !isAbsentScore(score)
  );
}

/**
 * Count the number of absent scores in a list
 * @param scores Array of scores
 * @returns Number of absent scores (score = 0)
 */
export function countAbsentScores(scores: (number | null | undefined)[]): number {
  return scores.filter(isAbsentScore).length;
}
