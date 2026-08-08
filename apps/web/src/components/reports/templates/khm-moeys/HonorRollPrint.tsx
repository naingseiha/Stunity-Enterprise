'use client';

import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import type { MonthlySummaryPrintProps } from './MonthlySummaryPrint';

/** Honor / distinction table from ranked report students (top performers). */
export default function HonorRollPrint({
  report,
  settings,
  schoolProfile,
  topN = 10,
}: Omit<MonthlySummaryPrintProps, 'subjects'> & {
  schoolProfile?: any;
  topN?: number;
}) {
  const ranked = report.students
    .filter((student) => student.isComplete !== false && student.rank > 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, topN);
  const pages = paginateKhmerMonthlyReport(ranked, 30, 34);
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const reportTitle = settings.reportTitle || 'តារាងកិត្តិយស';
  const teacherName = settings.teacherName || report.teacherName || '';
  const provinceVal = schoolProfile?.province || settings.province || '';
  const cleanProvince = provinceVal.replace(/^(ខេត្ត៖|ខេត្ត)/, '').trim();
  const schoolName =
    schoolProfile?.nameKh ||
    schoolProfile?.name ||
    report.school?.name ||
    settings.examCenter ||
    '';
  const signatureDate =
    settings.reportDate?.trim() || formatReportDate(cleanProvince || '');
  const periodLabel =
    report.format === 'annual'
      ? 'ប្រចាំឆ្នាំ'
      : report.period?.month
        ? `ប្រចាំខែ ${report.period.month}`
        : '';

  return (
    <div className="khmer-monthly-print">
      <link href="https://fonts.googleapis.com/css2?family=Moul&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --khmer-report-heading-font: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", serif;
        }
        .khmer-monthly-print { display: block; }
        .moeys-honor-page {
          width: 210mm; margin: 0 auto 32px; padding: 8mm 6mm; background: #fff; color: #000;
          font-family: var(--khmer-report-body-font); font-size: ${settings.tableFontSize + 1}px;
          page-break-after: always; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        }
        .moeys-honor-page:last-child { page-break-after: auto; }
        .moeys-honor-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .moeys-honor-table th, .moeys-honor-table td { border: 1px solid #000; padding: 6px 8px; text-align: center; }
        .moeys-honor-table th { font-family: var(--khmer-report-heading-font); }
        .moeys-honor-table .name { text-align: left; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .khmer-monthly-print { display: block !important; width: 100% !important; background: white !important; }
        }
      `}</style>

      {pages.map((pageStudents, pageIndex) => (
        <div className="moeys-honor-page" key={`honor-${pageIndex}`}>
          {pageIndex === 0 ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'var(--khmer-report-heading-font)', fontSize: 14 }}>
                ព្រះរាជាណាចក្រកម្ពុជា
              </p>
              <p style={{ margin: '2px 0 0', fontFamily: 'var(--khmer-report-heading-font)', fontSize: 13 }}>
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </p>
              <p style={{ margin: '10px 0 0', fontFamily: 'var(--khmer-report-heading-font)', color: '#2563eb' }}>
                {schoolName}
              </p>
              <h1 style={{ margin: '10px 0 0', fontFamily: 'var(--khmer-report-heading-font)', fontSize: 18 }}>
                {reportTitle}
              </h1>
              <p style={{ margin: '6px 0 0', fontFamily: 'var(--khmer-report-heading-font)' }}>
                ឆ្នាំសិក្សា៖ {report.academicYear.label} {periodLabel ? `· ${periodLabel}` : ''}
              </p>
              <p style={{ margin: '4px 0 0', fontFamily: 'var(--khmer-report-heading-font)', fontWeight: 700 }}>
                {classLabel}
              </p>
            </div>
          ) : null}

          <table className="moeys-honor-table">
            <thead>
              <tr>
                <th>ចំ.ថ្នាក់</th>
                <th>គោត្តនាម នាម</th>
                {isGradeWide && settings.showClassName ? <th>ថ្នាក់</th> : null}
                <th>ម.ភាគ</th>
                <th>និទ្ទេស</th>
              </tr>
            </thead>
            <tbody>
              {pageStudents.map((student) => (
                <tr key={student.studentId}>
                  <td style={{ color: '#dc2626', fontWeight: 800 }}>{student.rank}</td>
                  <td className="name">{student.studentName}</td>
                  {isGradeWide && settings.showClassName ? <td>{student.className}</td> : null}
                  <td>{student.average.toFixed(2)}</td>
                  <td>
                    <strong>{student.gradeLevel}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageIndex === pages.length - 1 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 24, textAlign: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px' }}>{signatureDate}</p>
                <p style={{ margin: 0, fontWeight: 700 }}>បានឃើញ និងឯកភាព</p>
                <p style={{ margin: '4px 0 0', color: '#2563eb', fontWeight: 700 }}>{settings.principalName}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px' }}>{signatureDate}</p>
                <p style={{ margin: 0, fontWeight: 700 }}>គ្រូទទួលបន្ទុកថ្នាក់</p>
                <div style={{ height: 40 }} />
                <p style={{ margin: 0, color: '#2563eb', fontWeight: 700 }}>{teacherName}</p>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
