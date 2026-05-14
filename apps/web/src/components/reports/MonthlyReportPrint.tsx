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
export default function MonthlyReportPrint(props: MonthlySummaryPrintProps & { schoolProfile?: any }) {
  const { report, schoolProfile } = props;
  const format: MonthlyReportFormat = report.format ?? 'summary';

  if (!isMoeysTemplate(report.template)) {
    return <MonthlySummaryPrint {...props} />;
  }

  if (format === 'semester-1') {
    return <SemesterOnePrint report={report} settings={props.settings} schoolProfile={schoolProfile} />;
  }

  if (format === 'detailed') {
    return <MonthlyDetailedPrint {...props} schoolProfile={schoolProfile} />;
  }

  return <MonthlySummaryPrint {...props} schoolProfile={schoolProfile} />;
}
