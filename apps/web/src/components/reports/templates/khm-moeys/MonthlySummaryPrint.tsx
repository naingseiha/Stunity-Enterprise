'use client';

import type { KhmerMonthlyReportData, KhmerMonthlyReportSubject } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { getSubjectAbbreviation, sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';

export interface MonthlySummaryPrintProps {
  report: KhmerMonthlyReportData;
  /** When provided (e.g. user hid some subjects), table columns follow this list */
  subjects?: KhmerMonthlyReportSubject[];
  schoolProfile?: any;
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

export default function MonthlySummaryPrint({ report, settings, subjects: subjectsProp, schoolProfile }: MonthlySummaryPrintProps) {
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

  // Use school profile data for dynamic header
  const officeName = schoolProfile?.officeName || settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា';
  const clusterName = schoolProfile?.province ? `ខេត្ត៖ ${schoolProfile.province}` : settings.province;
  const schoolName = schoolProfile?.nameKh || schoolProfile?.name || report.school?.name || settings.examCenter;
  const logoUrl = schoolProfile?.logoUrl || report.school?.logo || '';

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
          --khmer-report-moul: 'Moul', "Metal", "Khmer OS Muol Light", serif;
        }

        .khmer-monthly-header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 5mm;
          padding: 0 2mm;
        }

        .khmer-monthly-header-left {
          text-align: left;
          flex: 1;
        }

        .khmer-monthly-header-right {
          text-align: center;
          width: 200px;
        }

        .khmer-moul-branding {
          font-family: var(--khmer-report-moul);
          color: #2563eb;
          font-size: 11px;
          line-height: 1.8;
          margin: 0;
        }

        .khmer-kingdom-text {
          font-family: var(--khmer-report-moul);
          font-size: 13px;
          line-height: 1.8;
          margin: 0;
        }

        .khmer-symbol-3 {
          font-family: "Tacteing", serif;
          font-size: 28px;
          color: #dc2626;
          margin-top: 0;
          line-height: 1;
        }

        .khmer-monthly-print {
          display: block;
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

        /* Modern Analytics Cards */
        .khmer-monthly-analytics-container {
          margin-top: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }

        .khmer-analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .khmer-analytics-card {
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          text-align: center;
          background: #f8fafc;
        }

        .khmer-analytics-card.total { border-left: 4px solid #3b82f6; background: #eff6ff; }
        .khmer-analytics-card.passed { border-left: 4px solid #10b981; background: #ecfdf5; }
        .khmer-analytics-card.failed { border-left: 4px solid #ef4444; background: #fef2f2; }

        .card-header {
          font-family: var(--khmer-report-moul);
          font-size: 9px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .card-value {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
        }

        .card-footer {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 9px;
          color: #475569;
          font-weight: 600;
        }

        .khmer-analytics-title {
          font-family: var(--khmer-report-moul);
          font-size: 10px;
          margin-bottom: 8px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }

        .khmer-grade-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }

        .khmer-grade-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
        }

        .grade-letter {
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
        }

        .grade-info {
          text-align: left;
        }

        .grade-count {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
        }

        .grade-female {
          font-size: 8px;
          color: #64748b;
          white-space: nowrap;
        }

        .grade-a { border-top: 3px solid #ca8a04; }
        .grade-b { border-top: 3px solid #2563eb; }
        .grade-c { border-top: 3px solid #16a34a; }
        .grade-d { border-top: 3px solid #ea580c; }
        .grade-e { border-top: 3px solid #64748b; }
        .grade-f { border-top: 3px solid #dc2626; }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          .khmer-monthly-print {
            display: block !important;
            width: 100% !important;
            background: white !important;
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
                <div className="khmer-monthly-header-container">
                  <div className="khmer-monthly-header-left">
                    {logoUrl && (
                      <div style={{ marginBottom: '8px' }}>
                        <img src={logoUrl} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
                      </div>
                    )}
                    <p className="khmer-moul-branding">{officeName}</p>
                    <p className="khmer-moul-branding">{clusterName}</p>
                    <p className="khmer-moul-branding">{schoolName}</p>
                  </div>

                  <div className="khmer-monthly-header-right">
                    <p className="khmer-kingdom-text">ព្រះរាជាណាចក្រកម្ពុជា</p>
                    <p className="khmer-kingdom-text">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                    <p className="khmer-symbol-3">3</p>
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
                        <td key={subject.id}>{formatScore(student.grades[subject.id], 0)}</td>
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
              <div className="khmer-monthly-analytics-container">
                {/* 1. General Summary Cards */}
                <div className="khmer-analytics-grid">
                  <div className="khmer-analytics-card total">
                    <div className="card-header">សិស្សសរុប (Total)</div>
                    <div className="card-value">{report.statistics.totalStudents}</div>
                    <div className="card-footer">
                      <span>ស្រី៖ {report.statistics.femaleStudents}</span>
                      <span>ប្រុស៖ {report.statistics.totalStudents - report.statistics.femaleStudents}</span>
                    </div>
                  </div>
                  <div className="khmer-analytics-card passed">
                    <div className="card-header">ជាប់ (Passed)</div>
                    <div className="card-value">{report.statistics.passedStudents}</div>
                    <div className="card-footer">
                      <span>ស្រី៖ {report.statistics.passedFemaleStudents}</span>
                      <span>ប្រុស៖ {report.statistics.passedStudents - report.statistics.passedFemaleStudents}</span>
                    </div>
                  </div>
                  <div className="khmer-analytics-card failed">
                    <div className="card-header">ធ្លាក់ (Failed)</div>
                    <div className="card-value">{report.statistics.failedStudents}</div>
                    <div className="card-footer">
                      <span>ស្រី៖ {report.statistics.failedFemaleStudents}</span>
                      <span>ប្រុស៖ {report.statistics.failedStudents - report.statistics.failedFemaleStudents}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Grade Distribution Cards */}
                <div className="khmer-analytics-title">កម្រិតលទ្ធផលសិក្សា (Grade Distribution)</div>
                <div className="khmer-grade-grid">
                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((grade) => {
                    const count = report.students.filter(s => s.gradeLevel === grade).length;
                    const femaleCount = report.students.filter(s => s.gradeLevel === grade && (s.gender === 'F' || s.gender === 'ស្រី' || s.gender === 'Female')).length;
                    const colorMap = {
                      A: '#ca8a04', // Yellow/Gold
                      B: '#2563eb', // Blue
                      C: '#16a34a', // Green
                      D: '#ea580c', // Orange
                      E: '#64748b', // Slate
                      F: '#dc2626'  // Red
                    };
                    return (
                      <div key={grade} className={`khmer-grade-card grade-${grade.toLowerCase()}`}>
                        <div className="grade-letter" style={{ color: colorMap[grade] }}>{grade}</div>
                        <div className="grade-info">
                          <div className="grade-count">{count} <span className="unit text-xs">នាក់</span></div>
                          <div className="grade-female">ស្រី៖ {femaleCount}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
