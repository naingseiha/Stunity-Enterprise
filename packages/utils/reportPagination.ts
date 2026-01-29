/**
 * ✅ Dynamic Report Pagination Calculator
 * Automatically calculates students per page based on available space
 */

interface PaginationConfig {
  subjectCount: number;
  hasAttendance: boolean;
  hasClassName: boolean;
  isFirstPage: boolean;
  tableFontSize: number;
}

/**
 * Calculate how many students fit on a page dynamically
 */
export function calculateStudentsPerPage(config: PaginationConfig): number {
  const {
    subjectCount,
    hasAttendance,
    hasClassName,
    isFirstPage,
    tableFontSize,
  } = config;

  // A4 dimensions: 210mm x 297mm
  const pageHeight = 297; // mm
  const marginTop = 8; // mm
  const marginBottom = 8; // mm

  // Header heights
  const headerHeight = isFirstPage ? 28 : 0; // mm (reduced from 35 to 28)
  const tableHeaderHeight = 22; // mm (reduced from 25 to 22)
  const footerHeight = isFirstPage ? 25 : 0; // mm (reduced from 30 to 25, only on last page)

  // Available space for table rows
  const availableHeight =
    pageHeight -
    marginTop -
    marginBottom -
    headerHeight -
    tableHeaderHeight -
    footerHeight;

  // Row height calculation based on font size
  // Very compact rows for detailed report
  let baseRowHeight: number;
  if (tableFontSize <= 7) {
    baseRowHeight = 3.2; // mm
  } else if (tableFontSize <= 8) {
    baseRowHeight = 3.5; // mm
  } else {
    baseRowHeight = 4.0; // mm
  }

  // Calculate students that fit
  const studentsPerPage = Math.floor(availableHeight / baseRowHeight);

  // Safety bounds - adjusted for detailed reports
  if (isFirstPage) {
    return Math.max(35, Math.min(studentsPerPage, 50)); // First page: 35-50 students
  } else {
    return Math.max(40, Math.min(studentsPerPage, 55)); // Subsequent pages: 40-55 students
  }
}

/**
 * Paginate student reports dynamically
 */
export function paginateReports(
  reports: any[],
  config: PaginationConfig,
  customFirstPageCount?: number,
  customSubsequentPageCount?: number
): any[][] {
  const pages: any[][] = [];

  // First page - use custom or calculated
  const firstPageCount =
    customFirstPageCount ||
    calculateStudentsPerPage({
      ...config,
      isFirstPage: true,
    });

  pages.push(reports.slice(0, firstPageCount));

  // Remaining pages - use custom or calculated
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

/**
 * Get recommended student counts for UI display
 */
export function getRecommendedStudentCounts(config: PaginationConfig): {
  firstPage: number;
  subsequentPage: number;
} {
  return {
    firstPage: calculateStudentsPerPage({ ...config, isFirstPage: true }),
    subsequentPage: calculateStudentsPerPage({ ...config, isFirstPage: false }),
  };
}
