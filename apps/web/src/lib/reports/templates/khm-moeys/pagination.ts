import type { KhmerMonthlyReportStudent } from '@/lib/api/grades';

export interface PaginationConfig {
  subjectCount: number;
  hasAttendance: boolean;
  hasClassName: boolean;
  isFirstPage: boolean;
  tableFontSize: number;
}

export function calculateStudentsPerPage(config: PaginationConfig): number {
  const { subjectCount, hasAttendance, hasClassName, isFirstPage, tableFontSize } = config;

  const pageHeight = 297;
  const marginTop = 8;
  const marginBottom = 8;

  const headerHeight = isFirstPage ? 28 : 0;
  const tableHeaderHeight = 22;
  const footerHeight = isFirstPage ? 25 : 0;

  const extraCols = subjectCount + (hasAttendance ? 3 : 0) + (hasClassName ? 1 : 0) + 4;
  const widthPressure = Math.min(1, 28 / Math.max(12, extraCols));

  const availableHeight =
    pageHeight - marginTop - marginBottom - headerHeight - tableHeaderHeight - footerHeight;

  let baseRowHeight: number;
  if (tableFontSize <= 7) {
    baseRowHeight = 3.2;
  } else if (tableFontSize <= 8) {
    baseRowHeight = 3.5;
  } else {
    baseRowHeight = 4.0;
  }

  baseRowHeight *= 0.85 + 0.15 * widthPressure;

  const studentsPerPage = Math.floor(availableHeight / baseRowHeight);

  if (isFirstPage) {
    return Math.max(28, Math.min(studentsPerPage, 45));
  }
  return Math.max(32, Math.min(studentsPerPage, 50));
}

export function paginateReports(
  reports: unknown[],
  config: PaginationConfig,
  customFirstPageCount?: number,
  customSubsequentPageCount?: number
): unknown[][] {
  const pages: unknown[][] = [];

  const firstPageCount =
    customFirstPageCount ||
    calculateStudentsPerPage({
      ...config,
      isFirstPage: true,
    });

  pages.push(reports.slice(0, firstPageCount));

  const remainingReports = reports.slice(firstPageCount);
  const subsequentPageCount =
    customSubsequentPageCount ||
    calculateStudentsPerPage({
      ...config,
      isFirstPage: false,
    });

  for (let i = 0; i < remainingReports.length; i += subsequentPageCount) {
    pages.push(remainingReports.slice(i, i + subsequentPageCount));
  }

  return pages;
}

export function paginateKhmerMonthlyReport(
  students: KhmerMonthlyReportStudent[],
  firstPageCount = 29,
  nextPageCount = 34
) {
  if (students.length <= firstPageCount) return [students];

  const pages = [students.slice(0, firstPageCount)];
  let index = firstPageCount;
  while (index < students.length) {
    pages.push(students.slice(index, index + nextPageCount));
    index += nextPageCount;
  }
  return pages;
}
