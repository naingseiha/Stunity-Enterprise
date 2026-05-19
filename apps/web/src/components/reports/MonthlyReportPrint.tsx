'use client';

import type { MonthlyReportFormat } from '@/lib/api/grades';
import MonthlyDetailedPrint from '@/components/reports/templates/khm-moeys/MonthlyDetailedPrint';
import MonthlySummaryPrint, { type MonthlySummaryPrintProps } from '@/components/reports/templates/khm-moeys/MonthlySummaryPrint';
import SemesterOnePrint from '@/components/reports/templates/khm-moeys/SemesterOnePrint';
import TranscriptPrint from '@/components/reports/templates/khm-moeys/TranscriptPrint';

function isMoeysTemplate(template?: string) {
  const t = (template || '').toUpperCase();
  return t === 'KHM_MOEYS' || t.includes('MOEYS');
}

/**
 * Dispatches print layout by API `report.template` + `report.format`.
 * Non-MOEYS templates fall back to summary layout until implemented.
 */
export default function MonthlyReportPrint(props: MonthlySummaryPrintProps & { schoolProfile?: any; activeTab?: string }) {
  const { report, schoolProfile, activeTab } = props;
  const format: MonthlyReportFormat = report.format ?? 'summary';

  if (activeTab === 'transcript') {
    return <TranscriptPrint report={report} settings={props.settings} schoolProfile={schoolProfile} />;
  }

  if (!isMoeysTemplate(report.template)) {
    return <MonthlySummaryPrint {...props} />;
  }

  if (format === 'semester-1' || format === 'semester-2') {
    return <SemesterOnePrint report={report} settings={props.settings} schoolProfile={schoolProfile} />;
  }

  // If settings indicate subjects should be shown and there are subjects to show, render Detailed vertical table.
  if (props.settings.showSubjects && report.subjects?.length > 0) {
    return <MonthlyDetailedPrint {...props} schoolProfile={schoolProfile} />;
  }

  // Otherwise fallback to the standard compact Summary table
  return <MonthlySummaryPrint {...props} schoolProfile={schoolProfile} />;
}
