export type OperationalAcademicYear = {
  id: string;
  name?: string | null;
  status: string;
  isCurrent: boolean;
  startDate: Date;
  endDate: Date;
};

export type AcademicYearWriteBlock = {
  code: 'ACADEMIC_YEAR_READ_ONLY' | 'ACADEMIC_YEAR_DATE_OUT_OF_RANGE';
  message: string;
};

export function getAcademicYearWriteBlock(
  academicYear: OperationalAcademicYear,
  recordDate?: Date,
): AcademicYearWriteBlock | null;
