export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  score: string | number;
  month: string;
  year: string;
  updatedAt: string;
}

export interface GradeScale {
  grade: string;
  min: number;
  max: number;
  description: string;
}