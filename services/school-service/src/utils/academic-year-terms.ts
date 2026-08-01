export type AcademicTermInput = {
  id?: string;
  name: string;
  nameKh?: string | null;
  termNumber: number;
  startDate: string | Date;
  endDate: string | Date;
  gradeLevels?: number[];
  examMonth?: number | null;
  excludedMonths?: number[];
};

export class AcademicTermValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'AcademicTermValidationError';
  }
}

const uniqueMonths = (values: unknown): number[] =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12),
    ),
  ).sort((a, b) => a - b);

const uniqueGrades = (values: unknown): number[] =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(Number)
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12),
    ),
  ).sort((a, b) => a - b);

function monthsBetween(startDate: Date, endDate: Date): Set<number> {
  const months = new Set<number>();
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth() + 1;
  const endValue = endDate.getUTCFullYear() * 100 + endDate.getUTCMonth() + 1;

  while (year * 100 + month <= endValue) {
    months.add(month);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function scopesOverlap(left: number[], right: number[]) {
  return left.length === 0 || right.length === 0 || left.some((grade) => right.includes(grade));
}

export function normalizeAndValidateAcademicTerms(
  rawTerms: unknown,
  academicYearStart: string | Date,
  academicYearEnd: string | Date,
): AcademicTermInput[] {
  if (!Array.isArray(rawTerms) || rawTerms.length === 0) {
    throw new AcademicTermValidationError('At least one academic term is required');
  }

  const yearStart = new Date(academicYearStart);
  const yearEnd = new Date(academicYearEnd);
  if (Number.isNaN(yearStart.getTime()) || Number.isNaN(yearEnd.getTime()) || yearEnd <= yearStart) {
    throw new AcademicTermValidationError('Academic year dates are invalid');
  }

  const terms = rawTerms.map((raw: any, index) => {
    const name = String(raw?.name || '').trim();
    const startDate = new Date(raw?.startDate);
    const endDate = new Date(raw?.endDate);
    const termNumber = Number(raw?.termNumber);
    const gradeLevels = uniqueGrades(raw?.gradeLevels);
    const excludedMonths = uniqueMonths(raw?.excludedMonths ?? raw?.skipMonths);
    const examMonth = raw?.examMonth === '' || raw?.examMonth == null ? null : Number(raw.examMonth);

    if (!name) throw new AcademicTermValidationError(`Term ${index + 1} needs a name`);
    if (!Number.isInteger(termNumber) || termNumber < 1) {
      throw new AcademicTermValidationError(`${name} needs a valid term number`);
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      throw new AcademicTermValidationError(`${name} has an invalid date range`);
    }
    if (startDate < yearStart || endDate > yearEnd) {
      throw new AcademicTermValidationError(`${name} must stay inside the academic year`);
    }

    const includedMonths = monthsBetween(startDate, endDate);
    if (examMonth != null && (!Number.isInteger(examMonth) || !includedMonths.has(examMonth))) {
      throw new AcademicTermValidationError(`${name}'s exam month must fall inside its date range`);
    }
    if (examMonth != null && excludedMonths.includes(examMonth)) {
      throw new AcademicTermValidationError(`${name}'s exam month cannot also be a break month`);
    }
    if (excludedMonths.some((month) => !includedMonths.has(month))) {
      throw new AcademicTermValidationError(`${name} has a break month outside its date range`);
    }

    return {
      id: typeof raw?.id === 'string' ? raw.id : undefined,
      name,
      nameKh: raw?.nameKh ? String(raw.nameKh).trim() : null,
      termNumber,
      startDate,
      endDate,
      gradeLevels,
      examMonth,
      excludedMonths,
    };
  });

  for (let leftIndex = 0; leftIndex < terms.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < terms.length; rightIndex += 1) {
      const left = terms[leftIndex];
      const right = terms[rightIndex];
      if (left.termNumber === right.termNumber && scopesOverlap(left.gradeLevels!, right.gradeLevels!)) {
        throw new AcademicTermValidationError(
          `${left.name} and ${right.name} both apply to the same grade(s) in semester ${left.termNumber}`,
        );
      }
    }
  }

  return terms;
}

export function academicTermData(term: AcademicTermInput) {
  return {
    name: term.name,
    nameKh: term.nameKh || null,
    termNumber: term.termNumber,
    startDate: new Date(term.startDate),
    endDate: new Date(term.endDate),
    gradeLevels: term.gradeLevels || [],
    examMonth: term.examMonth ?? null,
    excludedMonths: term.excludedMonths || [],
  };
}

const sameNumberList = (left: number[] = [], right: number[] = []) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export function academicTermNeedsUpdate(existing: any, next: ReturnType<typeof academicTermData>) {
  const existingGrades = [...(existing.gradeLevels || [])].sort((a: number, b: number) => a - b);
  const nextGrades = [...next.gradeLevels].sort((a, b) => a - b);
  const existingExcluded = [...(existing.excludedMonths || [])].sort((a: number, b: number) => a - b);
  const nextExcluded = [...next.excludedMonths].sort((a, b) => a - b);

  return existing.name !== next.name
    || (existing.nameKh || null) !== next.nameKh
    || existing.termNumber !== next.termNumber
    || new Date(existing.startDate).getTime() !== next.startDate.getTime()
    || new Date(existing.endDate).getTime() !== next.endDate.getTime()
    || (existing.examMonth ?? null) !== next.examMonth
    || !sameNumberList(existingGrades, nextGrades)
    || !sameNumberList(existingExcluded, nextExcluded);
}
