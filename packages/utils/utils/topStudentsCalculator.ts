/**
 * Calculate top students based on average scores
 * Returns top 5 students, or up to 6 if there's a tie at rank 5
 */

interface StudentScore {
  studentId: string;
  khmerName: string;
  className: string;
  averageScore: number;
  letterGrade?: string;
}

interface TopStudent {
  rank: number;
  studentId: string;
  khmerName: string;
  className: string;
  averageScore: number;
  letterGrade: string;
  tied?: boolean;
}

export function calculateTopStudents(
  students: StudentScore[],
  maxStudents: number = 5
): TopStudent[] {
  if (students.length === 0) return [];

  // Sort by average score descending
  const sorted = [...students].sort((a, b) => b.averageScore - a.averageScore);

  const topStudents: TopStudent[] = [];
  let currentRank = 1;
  let prevScore: number | null = null;
  let sameRankCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const student = sorted[i];

    // Determine rank
    if (prevScore !== null && student.averageScore < prevScore) {
      currentRank += sameRankCount;
      sameRankCount = 0;
    }

    // Check if we should include this student
    const shouldInclude =
      currentRank <= maxStudents ||
      (currentRank === maxStudents + 1 &&
        prevScore !== null &&
        student.averageScore === prevScore);

    if (!shouldInclude) break;

    // Check if tied with previous
    const tied = prevScore !== null && student.averageScore === prevScore;

    topStudents.push({
      rank: currentRank,
      studentId: student.studentId,
      khmerName: student.khmerName,
      className: student.className,
      averageScore: student.averageScore,
      letterGrade: student.letterGrade || "F",
      tied,
    });

    prevScore = student.averageScore;
    sameRankCount++;
  }

  return topStudents;
}

/**
 * Calculate top students by class
 */
export function calculateTopStudentsByClass(
  summaries: any[],
  classId: string
): TopStudent[] {
  const classStudents = summaries
    .filter((s) => s.student?.classId === classId && s.averageScore > 0)
    .map((s) => ({
      studentId: s.student?.studentId || "",
      khmerName:
        s.student?.khmerName ||
        s.student?.firstName + " " + s.student?.lastName ||
        "",
      className: s.student?.class?.name || "",
      averageScore: s.averageScore,
      letterGrade: s.letterGrade || "F",
    }));

  return calculateTopStudents(classStudents);
}

/**
 * Calculate top students by grade level
 */
export function calculateTopStudentsByGrade(
  summaries: any[],
  grade: string
): TopStudent[] {
  const gradeStudents = summaries
    .filter((s) => s.student?.class?.grade === grade && s.averageScore > 0)
    .map((s) => ({
      studentId: s.student?.studentId || "",
      khmerName:
        s.student?.khmerName ||
        s.student?.firstName + " " + s.student?.lastName ||
        "",
      className: s.student?.class?.name || "",
      averageScore: s.averageScore,
      letterGrade: s.letterGrade || "F",
    }));

  return calculateTopStudents(gradeStudents);
}
