import type { MonthlyReportFormat } from '@/lib/api/grades';

export type ReportTemplateId = 'KHM_MOEYS' | 'EU_STANDARD' | 'INT_BACC' | 'CUSTOM';

export function normalizeReportTemplateId(template?: string | null): ReportTemplateId | string {
  const t = (template || 'KHM_MOEYS').toString().trim().toUpperCase().replace(/-/g, '_');
  if (['KHM_MOEYS', 'EU_STANDARD', 'INT_BACC', 'CUSTOM'].includes(t)) {
    return t as ReportTemplateId;
  }
  if (t.includes('MOEYS')) return 'KHM_MOEYS';
  return t;
}

export function getSupportedFormats(_templateId: string): MonthlyReportFormat[] {
  return [
    'summary',
    'detailed',
    'semester-1',
    'semester-2',
    'semester-exam-1',
    'semester-exam-2',
    'annual',
    'tracking-1',
    'tracking-2',
  ];
}

/** Hub-facing academic result report kinds (maps onto MonthlyReportFormat). */
export type AcademicResultReportKind =
  | 'monthly'
  | 'semester-exam'
  | 'semester'
  | 'annual';

export function resolveMonthlyReportFormat(params: {
  kind: AcademicResultReportKind;
  semester?: 1 | 2;
  /** Monthly sub-output: results sheet vs tracking book (honor is client-side print). */
  monthlyOutput?: 'results' | 'tracking';
}): MonthlyReportFormat {
  const semester = params.semester === 2 ? 2 : 1;
  switch (params.kind) {
    case 'semester-exam':
      return semester === 1 ? 'semester-exam-1' : 'semester-exam-2';
    case 'semester':
      return semester === 1 ? 'semester-1' : 'semester-2';
    case 'annual':
      return 'annual';
    case 'monthly':
    default:
      return params.monthlyOutput === 'tracking'
        ? semester === 1
          ? 'tracking-1'
          : 'tracking-2'
        : 'detailed';
  }
}
