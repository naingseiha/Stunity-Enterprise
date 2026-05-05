'use client';

import type { KhmerMonthlyReportData, KhmerMonthlyReportStudent } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';
import type { MonthlySummaryPrintProps } from './MonthlySummaryPrint';

function hasSemester(student: KhmerMonthlyReportStudent): student is KhmerMonthlyReportStudent & {
  semesterOne: NonNullable<KhmerMonthlyReportStudent['semesterOne']>;
} {
  return Boolean(student.semesterOne);
}

/** Semester 1 result sheet (SchoolManagementApp parity — pre-semester avg + exam + final) */
export default function SemesterOnePrint({ report, settings }: Omit<MonthlySummaryPrintProps, 'subjects'>) {
  const rows = report.students.filter(hasSemester);
  const pages = paginateKhmerMonthlyReport(rows, settings.firstPageStudentCount, settings.nextPageStudentCount);
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const reportTitle = settings.reportTitle || 'តារាងលទ្ធផលប្រចាំឆមាសទី១';
  const teacherName = settings.teacherName || report.teacherName || '';
  const signatureDate =
    settings.reportDate?.trim() ||
    formatReportDate((report.school?.name || settings.examCenter || '').split(',')[0]?.trim() || 'ស្វាយធំ');

  return (
    <div className="khmer-monthly-print">
      <style>{`
        @font-face { font-family: "Khmer OS Muol Light"; src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight"); }
        @font-face { font-family: "Khmer OS Bokor"; src: local("Khmer OS Bokor"), local("KhmerOSBokor"); }
        @font-face { font-family: "Tacteing"; src: local("Tacteing"), local("TacteingA"); }
        :root {
          --khmer-report-heading-font: "Metal", "Moul", "Khmer OS Muol Light", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", serif;
        }
        .khmer-monthly-print { display: none; }
        .moeys-semester-page {
          width: 210mm; margin: 0 auto 32px; padding: 5mm 3mm; background: #fff; color: #000;
          font-family: var(--khmer-report-body-font); font-size: ${settings.tableFontSize}px;
          page-break-after: always; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        }
        .moeys-semester-page:last-child { page-break-after: auto; }
        .moeys-semester-table { width: 100%; border-collapse: collapse; }
        .moeys-semester-table th, .moeys-semester-table td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
        .moeys-semester-table .name { text-align: left; min-width: 120px; }
        @media print {
          body * { visibility: hidden !important; }
          .khmer-monthly-print, .khmer-monthly-print * { visibility: visible !important; }
          .khmer-monthly-print { display: block !important; position: absolute; inset: 0; width: 100%; background: white; }
          .moeys-semester-page { box-shadow: none !important; page-break-after: always; }
          .moeys-semester-page:last-child { page-break-after: auto; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {pages.map((pageStudents, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="moeys-semester-page" key={`sem-${pageIndex}`}>
            {isFirst && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ paddingTop: 14, fontSize: 10, lineHeight: 1.4 }}>
                    <p style={{ margin: 0 }}>{settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប'}</p>
                    <p style={{ margin: 0, fontWeight: 700 }}>{settings.examCenter || report.school?.name || ''}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontFamily: 'var(--khmer-report-heading-font)', fontSize: 14, fontWeight: 600 }}>
                      ព្រះរាជាណាចក្រកម្ពុជា
                    </p>
                    <p style={{ margin: 0, fontFamily: 'var(--khmer-report-heading-font)', fontSize: 14, fontWeight: 600 }}>
                      ជាតិ សាសនា ព្រះមហាក្សត្រ
                    </p>
                    <p style={{ margin: 0, color: '#dc2626', fontFamily: 'Tacteing, serif', fontSize: 24 }}>3</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <h1 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--khmer-report-heading-font)', fontWeight: 600 }}>{reportTitle}</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 12, fontFamily: 'var(--khmer-report-heading-font)' }}>
                    ឆ្នាំសិក្សា៖ {report.academicYear.label}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, fontFamily: 'var(--khmer-report-heading-font)', fontWeight: 600 }}>
                    {classLabel}
                  </p>
                </div>
              </div>
            )}

            <table className="moeys-semester-table">
              <thead>
                <tr>
                  <th rowSpan={2}>ល.រ</th>
                  <th rowSpan={2}>គោត្តនាម និងនាម</th>
                  {isGradeWide && settings.showClassName && <th rowSpan={2}>ថ្នាក់</th>}
                  <th colSpan={3}>អវត្តមាន</th>
                  <th colSpan={2}>លទ្ធផលប្រចាំខែឆមាស</th>
                  <th colSpan={3}>លទ្ធផលប្រឡងឆមាស</th>
                  <th colSpan={3}>លទ្ធផលប្រចាំឆមាស</th>
                </tr>
                <tr>
                  <th>ច</th>
                  <th>អច្ប</th>
                  <th>សរុប</th>
                  <th>ម.ភាគ</th>
                  <th>ចំ.ថ្នាក់</th>
                  <th>ពិន្ទុ</th>
                  <th>ម.ភាគ</th>
                  <th>ចំ.ថ្នាក់</th>
                  <th>ម.ភាគ</th>
                  <th>ចំ.ថ្នាក់</th>
                  <th>និទ្ទេស</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((student, index) => {
                  const globalIndex =
                    pageIndex === 0
                      ? index + 1
                      : settings.firstPageStudentCount + (pageIndex - 1) * settings.nextPageStudentCount + index + 1;
                  const s = student.semesterOne!;
                  const totalAbs = (student.permission || 0) + (student.absent || 0);
                  return (
                    <tr key={student.studentId}>
                      <td>{globalIndex}</td>
                      <td className="name">{student.studentName}</td>
                      {isGradeWide && settings.showClassName && <td>{student.className}</td>}
                      <td>{student.permission || 0}</td>
                      <td>{student.absent || 0}</td>
                      <td>
                        <strong>{totalAbs}</strong>
                      </td>
                      <td>{s.preSemesterAverage.toFixed(2)}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{s.preSemesterRank}</td>
                      <td>{s.examTotal.toFixed(0)}</td>
                      <td>{s.examAverage.toFixed(2)}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{s.examRank}</td>
                      <td>{s.finalAverage.toFixed(2)}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{s.finalRank}</td>
                      <td>
                        <strong>{s.finalGrade}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLast && (
              <div style={{ marginTop: 10, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span>
                    <strong>សិស្សសរុប៖</strong> {report.statistics.totalStudents} នាក់ / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.femaleStudents} នាក់
                  </span>
                  <span>
                    <strong>ជាប់៖</strong> {report.statistics.passedStudents} នាក់ / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.passedFemaleStudents} នាក់
                  </span>
                  <span>
                    <strong>ធ្លាក់៖</strong> {report.statistics.failedStudents} នាក់ / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.failedFemaleStudents} នាក់
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 14, textAlign: 'center' }}>
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
