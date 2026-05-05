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
  return ['summary', 'detailed', 'semester-1'];
}
