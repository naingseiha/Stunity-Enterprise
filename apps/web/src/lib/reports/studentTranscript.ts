export interface TranscriptGradeInput {
  score: number;
  maxScore: number;
  percentage?: number | null;
  monthNumber?: number | null;
}
export interface TranscriptSubjectInput {
  subjectId: string;
  grades: TranscriptGradeInput[];
  [key: string]: unknown;
}

export interface TranscriptSubjectCalculation<T extends TranscriptSubjectInput = TranscriptSubjectInput> {
  subject: T;
  maxScore: number | null;
  semester1Score: number | null;
  semester2Score: number | null;
  annualScore: number | null;
  annualPercentage: number | null;
  gradeLetter: string | null;
  remark: string | null;
  result: string | null;
  isComplete: boolean;
}

export const SEMESTER_1_MONTHS = [11, 12, 1, 2, 3] as const;
export const SEMESTER_2_MONTHS = [4, 5, 6, 7, 8] as const;
export const SEMESTER_1_MONTHLY_MONTHS = [11, 12, 1, 2] as const;
export const SEMESTER_2_MONTHLY_MONTHS = [4, 5, 6, 7] as const;

export function safeMean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function gradePercentage(grade: TranscriptGradeInput): number | null {
  if (typeof grade.percentage === 'number' && Number.isFinite(grade.percentage)) {
    return grade.percentage;
  }
  if (!Number.isFinite(grade.score) || !Number.isFinite(grade.maxScore) || grade.maxScore <= 0) {
    return null;
  }
  return (grade.score / grade.maxScore) * 100;
}

function averageRawScore(grades: TranscriptGradeInput[]): { score: number | null; maxScore: number | null } {
  const valid = grades.filter(
    (grade) => Number.isFinite(grade.score) && Number.isFinite(grade.maxScore) && grade.maxScore > 0
  );
  if (valid.length === 0) return { score: null, maxScore: null };

  // A raw-score average is only meaningful when every included assessment has
  // the same maximum. If the scale changed, the UI must show an incomplete
  // value rather than silently normalising it into an official-looking score.
  const maxScores = new Set(valid.map((grade) => grade.maxScore));
  if (maxScores.size !== 1) return { score: null, maxScore: null };

  return {
    score: safeMean(valid.map((grade) => grade.score)),
    maxScore: valid[0].maxScore,
  };
}

export function getLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  if (percentage >= 50) return 'E';
  return 'F';
}

export function getKhmerRemark(grade: string): string {
  if (grade === 'A') return 'ល្អប្រសើរ';
  if (grade === 'B') return 'ល្អណាស់';
  if (grade === 'C') return 'ល្អ';
  if (grade === 'D') return 'ល្អបង្គួរ';
  if (grade === 'E') return 'មធ្យម';
  return 'ខ្សោយ';
}

export function calculateTranscriptSubject<T extends TranscriptSubjectInput>(
  subject: T
): TranscriptSubjectCalculation<T> {
  const semester1Grades = subject.grades.filter((grade) =>
    SEMESTER_1_MONTHS.includes(grade.monthNumber as (typeof SEMESTER_1_MONTHS)[number])
  );
  const semester2Grades = subject.grades.filter((grade) =>
    SEMESTER_2_MONTHS.includes(grade.monthNumber as (typeof SEMESTER_2_MONTHS)[number])
  );
  const semester1 = averageRawScore(semester1Grades);
  const semester2 = averageRawScore(semester2Grades);
  const hasCompatibleScale =
    semester1.maxScore !== null && semester2.maxScore !== null && semester1.maxScore === semester2.maxScore;
  const annualScore = hasCompatibleScale && semester1.score !== null && semester2.score !== null
    ? (semester1.score + semester2.score) / 2
    : null;
  const annualPercentage = annualScore !== null && semester1.maxScore
    ? (annualScore / semester1.maxScore) * 100
    : null;
  const gradeLetter = annualPercentage !== null ? getLetterGrade(annualPercentage) : null;

  return {
    subject,
    maxScore: hasCompatibleScale ? semester1.maxScore : semester1.maxScore ?? semester2.maxScore,
    semester1Score: semester1.score,
    semester2Score: semester2.score,
    annualScore,
    annualPercentage,
    gradeLetter,
    remark: gradeLetter ? getKhmerRemark(gradeLetter) : null,
    result: annualPercentage !== null ? (annualPercentage >= 50 ? 'ជាប់' : 'ធ្លាក់') : null,
    isComplete: annualScore !== null,
  };
}

function averageSubjectPercentages<T extends TranscriptSubjectInput>(
  subjects: T[],
  months: readonly number[]
): number | null {
  const subjectAverages = subjects.map((subject) =>
    safeMean(
      subject.grades
        .filter((grade) => typeof grade.monthNumber === 'number' && months.includes(grade.monthNumber))
        .map(gradePercentage)
    )
  );
  return safeMean(subjectAverages);
}

export function calculateTranscriptSummary<T extends TranscriptSubjectInput>(subjects: T[]) {
  const semester1ExamPercentage = averageSubjectPercentages(subjects, [3]);
  const semester2ExamPercentage = averageSubjectPercentages(subjects, [8]);
  const semester1MonthlyPercentage = averageSubjectPercentages(subjects, SEMESTER_1_MONTHLY_MONTHS);
  const semester2MonthlyPercentage = averageSubjectPercentages(subjects, SEMESTER_2_MONTHLY_MONTHS);

  const toFiftyPointScale = (percentage: number | null) => percentage === null ? null : percentage * 0.5;
  const semester1Exam = toFiftyPointScale(semester1ExamPercentage);
  const semester2Exam = toFiftyPointScale(semester2ExamPercentage);
  const semester1Monthly = toFiftyPointScale(semester1MonthlyPercentage);
  const semester2Monthly = toFiftyPointScale(semester2MonthlyPercentage);
  const semester1Overall = semester1Exam !== null && semester1Monthly !== null
    ? (semester1Exam + semester1Monthly) / 2
    : null;
  const semester2Overall = semester2Exam !== null && semester2Monthly !== null
    ? (semester2Exam + semester2Monthly) / 2
    : null;

  return {
    semester1Exam,
    semester2Exam,
    annualExam: semester1Exam !== null && semester2Exam !== null ? (semester1Exam + semester2Exam) / 2 : null,
    semester1Monthly,
    semester2Monthly,
    annualMonthly: semester1Monthly !== null && semester2Monthly !== null ? (semester1Monthly + semester2Monthly) / 2 : null,
    semester1Overall,
    semester2Overall,
    annualOverall: semester1Overall !== null && semester2Overall !== null
      ? (semester1Overall + semester2Overall) / 2
      : null,
  };
}
