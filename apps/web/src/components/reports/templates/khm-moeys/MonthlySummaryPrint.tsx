'use client';

import type { KhmerMonthlyReportData, KhmerMonthlyReportSubject } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { getSubjectAbbreviation, sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';

export interface MonthlySummaryPrintProps {
  report: KhmerMonthlyReportData;
  /** When provided (e.g. user hid some subjects), table columns follow this list */
  subjects?: KhmerMonthlyReportSubject[];
  settings: {
    province: string;
    examCenter: string;
    roomNumber: string;
    reportTitle: string;
    examSession: string;
    reportDate: string;
    principalName: string;
    teacherName: string;
    showAttendance: boolean;
    showSubjects: boolean;
    showTotal: boolean;
    showAverage: boolean;
    showRank: boolean;
    showGradeLevel: boolean;
    showClassName: boolean;
    showCircles: boolean;
    autoCircle: boolean;
    firstPageStudentCount: number;
    nextPageStudentCount: number;
    tableFontSize: number;
  };
}

function formatScore(score: number | null | undefined, decimals = 1) {
  if (score === null || score === undefined) return '-';
  return Number(score).toFixed(decimals);
}

function isPassed(gradeLevel: string, average: number) {
  return ['A', 'B', 'C', 'D', 'E'].includes(gradeLevel) && average >= 25;
}

export default function MonthlySummaryPrint({ report, settings, subjects: subjectsProp }: MonthlySummaryPrintProps) {
  const columnSubjects = sortSubjectsByOrder(subjectsProp ?? report.subjects, report.grade);

  const pages = paginateKhmerMonthlyReport(
    report.students,
    settings.firstPageStudentCount,
    settings.nextPageStudentCount
  );
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const reportTitle = settings.reportTitle || 'បញ្ជីពិន្ទុប្រចាំខែ';
  const teacherName = settings.teacherName || report.teacherName || '';
  const signatureDate =
    settings.reportDate?.trim() ||
    formatReportDate((report.school?.name || settings.examCenter || '').split(',')[0]?.trim() || 'ស្វាយធំ');
  const monthLine =
    report.period?.month ? `ខែ${report.period.month}` : '';

  return (
    <div className="khmer-monthly-print">
      <style>{`
        @font-face {
          font-family: "Khmer OS Muol Light";
          src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight");
        }
        @font-face {
          font-family: "Khmer OS Bokor";
          src: local("Khmer OS Bokor"), local("KhmerOSBokor");
        }
        @font-face {
          font-family: "Khmer OS Siem Reap";
          src: local("Khmer OS Siemreap"), local("KhmerOSSiemreap");
        }
        @font-face {
          font-family: "Tacteing";
          src: local("Tacteing"), local("TacteingA");
        }

        :root {
          --khmer-report-heading-font: "Metal", "Moul", "Khmer OS Muol Light", "Khmer OS Muol", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", "Khmer OS Siem Reap", "Khmer OS", serif;
        }

        .khmer-monthly-print {
          display: none;
        }

        .khmer-monthly-page {
          width: 210mm;
          min-height: auto;
          margin: 0 auto 32px;
          padding: 5mm 3mm;
          box-sizing: border-box;
          max-width: 100%;
          color: #000;
          background: #fff;
          font-family: var(--khmer-report-body-font);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
          page-break-inside: avoid;
          page-break-after: always;
          break-inside: avoid;
          break-after: page;
        }

        .khmer-monthly-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .khmer-monthly-header {
          margin-bottom: 2mm;
        }

        .khmer-monthly-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1mm;
        }

        .khmer-monthly-school-info {
          text-align: left;
          padding-top: 14px;
          font-family: var(--khmer-report-body-font);
        }

        .khmer-monthly-school-info p {
          margin: 0;
          font-size: 10px;
          line-height: 1.4;
        }

        .khmer-monthly-school-info p:nth-child(2) {
          font-weight: 700;
        }

        .khmer-monthly-kingdom {
          text-align: center;
        }

        .khmer-monthly-kingdom p {
          margin: 0;
          font-family: var(--khmer-report-heading-font);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.2;
        }

        .khmer-monthly-kingdom .khmer-monthly-symbol {
          margin-top: 0;
          color: #dc2626;
          font-family: "Tacteing", serif;
          font-size: 24px;
          line-height: 1;
          letter-spacing: 0.1em;
        }

        .khmer-monthly-title {
          text-align: center;
          margin-bottom: 1.5mm;
        }

        .khmer-monthly-title h1,
        .khmer-monthly-title p,
        .khmer-monthly-class-line {
          margin: 0;
          font-family: var(--khmer-report-heading-font);
        }

        .khmer-monthly-title h1 {
          font-size: 16px;
          font-weight: 400;
          margin-bottom: 1px;
        }

        .khmer-monthly-title p,
        .khmer-monthly-class-line {
          font-size: 12px;
        }

        .khmer-monthly-class-line {
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 400;
        }

        .khmer-monthly-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-family: var(--khmer-report-body-font);
          font-size: ${settings.tableFontSize}px;
        }

        .khmer-monthly-table tr,
        .khmer-monthly-table th,
        .khmer-monthly-table td {
          border: 1px solid #000;
        }

        .khmer-monthly-table th,
        .khmer-monthly-table td {
          padding: 4px 6px;
          text-align: center;
          vertical-align: middle;
          line-height: 1.25;
        }

        .khmer-monthly-table th {
          background: #f3f4f6;
          font-weight: 700;
        }

        .khmer-monthly-table .attendance-head,
        .khmer-monthly-table .attendance-subhead,
        .khmer-monthly-table .grade-head {
          background: #fef3c7;
        }

        .khmer-monthly-table .subject-head,
        .khmer-monthly-table .class-head {
          background: #eff6ff;
        }

        .khmer-monthly-table .summary-head,
        .khmer-monthly-table .summary-cell {
          background: #ecfdf5;
        }

        .khmer-monthly-table .rank-head,
        .khmer-monthly-table .rank-cell {
          background: #eef2ff;
        }

        .khmer-monthly-table .index-head {
          width: 40px;
        }

        .khmer-monthly-table .name-head {
          min-width: 120px;
        }

        .khmer-monthly-table .class-head {
          min-width: 50px;
        }

        .khmer-monthly-table .subject-head {
          min-width: 35px;
        }

        .khmer-monthly-table .summary-head,
        .khmer-monthly-table .rank-head,
        .khmer-monthly-table .grade-head {
          width: 64px;
        }

        .khmer-monthly-table .student-name {
          text-align: left;
        }

        .khmer-monthly-table .passed-name {
          background: #fef9c3;
          font-weight: 700;
        }

        .khmer-monthly-index-circle {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
        }

        .khmer-monthly-index-circle::before {
          content: "";
          position: absolute;
          width: 24px;
          height: 24px;
          border: 2px solid #dc2626;
          border-radius: 999px;
        }

        .khmer-monthly-rank {
          color: #dc2626;
          font-weight: 700;
        }

        .khmer-monthly-stats {
          margin-top: 6px;
          margin-bottom: 8px;
          padding-bottom: 4px;
          font-size: 12px;
          font-family: var(--khmer-report-body-font);
        }

        .khmer-monthly-stats-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .khmer-monthly-stats-row > div {
          flex: 1;
        }

        .khmer-monthly-stats-row > div:nth-child(2) {
          text-align: center;
        }

        .khmer-monthly-stats-row > div:nth-child(3) {
          text-align: right;
        }

        .khmer-monthly-stats-label {
          font-weight: 700;
          font-family: var(--khmer-report-body-font);
        }

        .khmer-monthly-count-blue {
          color: #1d4ed8;
          font-weight: 700;
        }

        .khmer-monthly-count-pink {
          color: #be185d;
          font-weight: 700;
        }

        .khmer-monthly-count-green {
          color: #15803d;
          font-weight: 700;
        }

        .khmer-monthly-count-orange {
          color: #c2410c;
          font-weight: 700;
        }

        .khmer-monthly-signatures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 40px;
          margin-top: 12px;
          text-align: center;
        }

        .khmer-monthly-signatures p {
          margin: 0 0 2px;
          font-family: var(--khmer-report-body-font);
          font-size: 12px;
        }

        .khmer-monthly-signatures .signature-role {
          font-weight: 700;
        }

        .khmer-monthly-signatures .signature-name {
          color: #2563eb;
          font-family: var(--khmer-report-body-font);
          font-weight: 700;
        }

        .khmer-monthly-signature-space {
          height: 40px;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }

          .khmer-monthly-print,
          .khmer-monthly-print * {
            visibility: visible !important;
          }

          .khmer-monthly-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            background: white;
          }

          .khmer-monthly-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 5mm 3mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            background: white !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            break-after: page !important;
          }

          .khmer-monthly-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .khmer-monthly-table {
            width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
          }

          .khmer-monthly-table th,
          .khmer-monthly-table td {
            border: 0.5px solid #000 !important;
            box-shadow: none !important;
          }

          .khmer-monthly-header {
            margin-bottom: 2mm !important;
          }

          .khmer-monthly-stats {
            margin-top: 2mm !important;
          }

          .khmer-monthly-signatures {
            gap: 5mm !important;
            margin-top: 2mm !important;
          }

          .khmer-monthly-signature-space {
            height: 14mm !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {pages.map((students, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;

        return (
          <div className="khmer-monthly-page" key={`khmer-monthly-page-${pageIndex}`}>
            {isFirstPage && (
              <div className="khmer-monthly-header">
                <div className="khmer-monthly-header-row">
                  <div className="khmer-monthly-school-info">
                    <p>{settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប'}</p>
                    <p>{settings.examCenter || report.school?.name || 'វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ'}</p>
                  </div>

                  <div className="khmer-monthly-kingdom">
                    <p>ព្រះរាជាណាចក្រកម្ពុជា</p>
                    <p>ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                    <p className="khmer-monthly-symbol">3</p>
                  </div>
                </div>

                <div className="khmer-monthly-title">
                  <h1>{reportTitle}</h1>
                  <p>ឆ្នាំសិក្សា៖ {report.academicYear.label}</p>
                  {monthLine ? (
                    <p style={{ fontSize: '11px', margin: '2px 0 0', fontFamily: 'var(--khmer-report-heading-font)' }}>{monthLine}</p>
                  ) : null}
                  <div className="khmer-monthly-class-line">{classLabel}</div>
                  {settings.roomNumber?.trim() ? (
                    <p style={{ fontSize: '11px', margin: '4px 0 0', fontFamily: 'var(--khmer-report-body-font)' }}>
                      បន្ទប់៖ {settings.roomNumber.trim()}
                    </p>
                  ) : null}
                  {settings.examSession?.trim() ? (
                    <p style={{ fontSize: '11px', margin: '2px 0 0', fontFamily: 'var(--khmer-report-body-font)' }}>{settings.examSession.trim()}</p>
                  ) : null}
                </div>
              </div>
            )}

            <table className="khmer-monthly-table">
              <thead>
                <tr>
                  <th rowSpan={settings.showAttendance ? 2 : 1} className="index-head">ល.រ</th>
                  <th rowSpan={settings.showAttendance ? 2 : 1} className="name-head">គោត្តនាម និងនាម</th>
                  {isGradeWide && settings.showClassName && (
                    <th rowSpan={settings.showAttendance ? 2 : 1} className="class-head">ថ្នាក់</th>
                  )}
                  {settings.showAttendance && (
                    <th colSpan={3} className="attendance-head">អវត្តមាន</th>
                  )}
                  {settings.showSubjects &&
                    columnSubjects.map((subject) => (
                    <th key={subject.id} rowSpan={settings.showAttendance ? 2 : 1} className="subject-head">
                      {getSubjectAbbreviation(subject)}
                    </th>
                  ))}
                  {settings.showTotal && <th rowSpan={settings.showAttendance ? 2 : 1} className="summary-head">ពិន្ទុសរុប</th>}
                  {settings.showAverage && <th rowSpan={settings.showAttendance ? 2 : 1} className="summary-head">ម. ភាគ</th>}
                  {settings.showRank && <th rowSpan={settings.showAttendance ? 2 : 1} className="rank-head">ចំ.ថ្នាក់</th>}
                  {settings.showGradeLevel && <th rowSpan={settings.showAttendance ? 2 : 1} className="grade-head">និទ្ទេស</th>}
                </tr>

                {settings.showAttendance && (
                  <tr>
                    <th className="attendance-subhead">ច</th>
                    <th className="attendance-subhead">អ</th>
                    <th className="attendance-subhead">សរុប</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {students.map((student, index) => {
                  const rowNumber = pageIndex === 0
                    ? index + 1
                    : settings.firstPageStudentCount + (pageIndex - 1) * settings.nextPageStudentCount + index + 1;
                  const passed = settings.autoCircle && settings.showCircles && isPassed(student.gradeLevel, student.average);

                  return (
                    <tr key={student.studentId}>
                      <td>
                        {passed ? (
                          <span className="khmer-monthly-index-circle">{rowNumber}</span>
                        ) : (
                          rowNumber
                        )}
                      </td>
                      <td className={`student-name ${passed ? 'passed-name' : ''}`}>{student.studentName}</td>
                      {isGradeWide && settings.showClassName && <td className="class-head">{student.className}</td>}
                      {settings.showAttendance && (
                        <>
                          <td>{student.permission || 0}</td>
                          <td>{student.absent || 0}</td>
                          <td><strong>{(student.permission || 0) + (student.absent || 0)}</strong></td>
                        </>
                      )}
                      {settings.showSubjects &&
                        columnSubjects.map((subject) => (
                        <td key={subject.id}>{formatScore(student.grades[subject.id], 1)}</td>
                      ))}
                      {settings.showTotal && <td className="summary-cell"><strong>{formatScore(student.totalScore, 0)}</strong></td>}
                      {settings.showAverage && <td className="summary-cell"><strong>{formatScore(student.average, 2)}</strong></td>}
                      {settings.showRank && <td className="rank-cell khmer-monthly-rank">{student.rank}</td>}
                      {settings.showGradeLevel && <td className="grade-head"><strong>{student.gradeLevel}</strong></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLastPage && (
              <>
                <div className="khmer-monthly-stats">
                  <div className="khmer-monthly-stats-row">
                    <div>
                      <span className="khmer-monthly-stats-label">សិស្សសរុប៖ </span>
                      <span className="khmer-monthly-count-blue">{report.statistics.totalStudents} នាក់</span>
                      <span> / </span>
                      <span className="khmer-monthly-stats-label">ស្រី៖ </span>
                      <span className="khmer-monthly-count-pink">{report.statistics.femaleStudents} នាក់</span>
                    </div>

                    <div>
                      <span className="khmer-monthly-stats-label">ជាប់៖ </span>
                      <span className="khmer-monthly-count-green">{report.statistics.passedStudents} នាក់</span>
                      <span> / </span>
                      <span className="khmer-monthly-stats-label">ស្រី៖ </span>
                      <span className="khmer-monthly-count-pink">{report.statistics.passedFemaleStudents} នាក់</span>
                    </div>

                    <div>
                      <span className="khmer-monthly-stats-label">ធ្លាក់៖ </span>
                      <span className="khmer-monthly-count-orange">{report.statistics.failedStudents} នាក់</span>
                      <span> / </span>
                      <span className="khmer-monthly-stats-label">ស្រី៖ </span>
                      <span className="khmer-monthly-count-pink">{report.statistics.failedFemaleStudents} នាក់</span>
                    </div>
                  </div>
                </div>

                <div className="khmer-monthly-signatures">
                  <div>
                    <p>{signatureDate}</p>
                    <p className="signature-role">បានឃើញ និងឯកភាព</p>
                    <p className="signature-name">{settings.principalName}</p>
                  </div>

                  <div>
                    <p>{signatureDate}</p>
                    <p className="signature-role">គ្រូទទួលបន្ទុកថ្នាក់</p>
                    <div className="khmer-monthly-signature-space" />
                    <p className="signature-name">{teacherName}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
