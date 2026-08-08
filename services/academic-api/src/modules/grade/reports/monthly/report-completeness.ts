export type ReportCompletenessRow = {
  studentId: string;
  studentName: string;
  gender: string;
  average: number;
  isComplete: boolean;
};

export type ReportStatistics = {
  totalStudents: number;
  femaleStudents: number;
  completeStudents: number;
  completeFemaleStudents: number;
  incompleteStudents: number;
  incompleteFemaleStudents: number;
  passedStudents: number;
  passedFemaleStudents: number;
  failedStudents: number;
  failedFemaleStudents: number;
};

function isFemaleGender(gender?: string | null) {
  const normalized = String(gender || "").trim().toUpperCase();
  return normalized === "F" || normalized === "FEMALE" || gender === "ស្រី";
}

/**
 * Rank only students whose required scores are complete. Incomplete rows stay
 * visible for follow-up, but never receive an official rank.
 */
export function rankCompleteRows<T extends ReportCompletenessRow>(
  rows: T[],
  score: (row: T) => number = (row) => row.average,
): Array<T & { rank: number }> {
  const complete = rows
    .filter((row) => row.isComplete)
    .sort((a, b) => {
      const difference = score(b) - score(a);
      if (difference !== 0) return difference;
      return a.studentName.localeCompare(b.studentName, "km");
    });
  const rankByStudent = new Map(
    complete.map((row, index) => [row.studentId, index + 1]),
  );

  return [...complete, ...rows.filter((row) => !row.isComplete)].map((row) => ({
    ...row,
    rank: rankByStudent.get(row.studentId) || 0,
  }));
}

/** Missing scores are reported separately instead of being counted as 0/F. */
export function buildReportStatistics<T extends ReportCompletenessRow>(
  rows: T[],
  passingAverage: number,
): ReportStatistics {
  const complete = rows.filter((row) => row.isComplete);
  const incomplete = rows.filter((row) => !row.isComplete);
  const passed = complete.filter((row) => row.average >= passingAverage);
  const failed = complete.filter((row) => row.average < passingAverage);

  return {
    totalStudents: rows.length,
    femaleStudents: rows.filter((row) => isFemaleGender(row.gender)).length,
    completeStudents: complete.length,
    completeFemaleStudents: complete.filter((row) => isFemaleGender(row.gender)).length,
    incompleteStudents: incomplete.length,
    incompleteFemaleStudents: incomplete.filter((row) => isFemaleGender(row.gender)).length,
    passedStudents: passed.length,
    passedFemaleStudents: passed.filter((row) => isFemaleGender(row.gender)).length,
    failedStudents: failed.length,
    failedFemaleStudents: failed.filter((row) => isFemaleGender(row.gender)).length,
  };
}
