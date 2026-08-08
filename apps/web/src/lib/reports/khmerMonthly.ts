/**
 * @deprecated Import from `@/lib/reports/templates/khm-moeys/*` instead.
 * Shims kept for older imports.
 */
export { KHMER_MONTHS, getKhmerMonthLabel, getKhmerMonthDisplayName } from './templates/khm-moeys/months';
export { getSubjectAbbreviation, sortSubjectsByOrder } from './templates/khm-moeys/subjects';
export { paginateKhmerMonthlyReport, paginateReports, calculateStudentsPerPage } from './templates/khm-moeys/pagination';
export {
  getAvailableMonthsForGrade,
  getMonthlyReportMonthsForGrades,
  getExamMonthsForGrade,
  getMonthsBetweenDates,
  resolveReportTermPlan,
} from './templates/khm-moeys/dynamic-months';
export type { ReportTermPlan } from './templates/khm-moeys/dynamic-months';
