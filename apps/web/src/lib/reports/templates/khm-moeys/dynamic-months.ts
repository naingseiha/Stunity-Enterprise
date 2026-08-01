import { AcademicTerm } from '@/lib/api/academic-years';
import { KHMER_MONTHS, getKhmerMonthLabel } from './months';

/** Get all month numbers between a start and end date */
export function getMonthsBetweenDates(startDateStr: string, endDateStr: string): number[] {
  const months: number[] = [];
  const current = new Date(startDateStr);
  current.setDate(1); // Set to 1st of month to avoid issues
  const end = new Date(endDateStr);
  
  while (current <= end) {
    months.push(current.getMonth() + 1); // getMonth is 0-indexed
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/** 
 * Returns the list of available months for a specific grade based on the active Academic Terms.
 * Finds all terms applicable to the grade, generates the months between their start/end dates,
 * filters out excluded months, and attaches metadata like whether a month is an exam month.
 */
export function getAvailableMonthsForGrade(terms: AcademicTerm[], gradeStr: string | number) {
  if (!terms || terms.length === 0) return [];
  
  const grade = Number(String(gradeStr).replace(/[^0-9]/g, '')) || 0;
  
  // Find terms that apply to this grade.
  // A term applies if its gradeLevels array is empty (applies to all) OR includes the grade.
  const applicableTerms = terms.filter(t => 
    !t.gradeLevels || t.gradeLevels.length === 0 || t.gradeLevels.includes(grade)
  );

  const availableMonths: { number: number; label: string; isExamMonth?: boolean; termNumber?: number }[] = [];
  const addedMonths = new Set<number>();

  // Sort terms by termNumber so we process Semester 1 before Semester 2
  const sortedTerms = [...applicableTerms].sort((a, b) => (a.termNumber || 0) - (b.termNumber || 0));

  for (const term of sortedTerms) {
    const allMonths = getMonthsBetweenDates(term.startDate, term.endDate);
    
    // We filter out excludedMonths.
    const validMonths = allMonths.filter(m => !term.excludedMonths?.includes(m));

    for (const m of validMonths) {
      if (!addedMonths.has(m)) {
        addedMonths.add(m);
        const isExamMonth = m === term.examMonth;
        availableMonths.push({
          number: m,
          label: getKhmerMonthLabel(m),
          isExamMonth,
          termNumber: term.termNumber,
        });
      }
    }
  }

  return availableMonths;
}
