'use client';

import type { MonthlyReportFormat } from '@/lib/api/grades';
import MonthlyDetailedPrint from '@/components/reports/templates/khm-moeys/MonthlyDetailedPrint';
import MonthlySummaryPrint, { type MonthlySummaryPrintProps } from '@/components/reports/templates/khm-moeys/MonthlySummaryPrint';
import SemesterOnePrint from '@/components/reports/templates/khm-moeys/SemesterOnePrint';

function isMoeysTemplate(template?: string) {
  const t = (template || '').toUpperCase();
  return t === 'KHM_MOEYS' || t.includes('MOEYS');
}

/**
 * Dispatches print layout by API `report.template` + `report.format`.
 * Non-MOEYS templates fall back to summary layout until implemented.
 */
export default function MonthlyReportPrint(props: MonthlySummaryPrintProps) {
  const { report } = props;
  const format: MonthlyReportFormat = report.format ?? 'summary';

  if (!isMoeysTemplate(report.template)) {
    return <MonthlySummaryPrint {...props} />;
  }

  if (format === 'semester-1') {
    return <SemesterOnePrint report={report} settings={props.settings} />;
  }

  if (format === 'detailed') {
    return <MonthlyDetailedPrint {...props} />;
  }

  return <MonthlySummaryPrint {...props} />;
}
