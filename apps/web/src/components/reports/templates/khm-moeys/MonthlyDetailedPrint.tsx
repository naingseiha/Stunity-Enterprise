'use client';

import type { KhmerMonthlyReportData } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { paginateReports } from '@/lib/reports/templates/khm-moeys/pagination';
import { getSubjectAbbreviation, sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';
import type { MonthlySummaryPrintProps } from './MonthlySummaryPrint';

function formatScore(score: number | null | undefined, decimals = 1) {
  if (score === null || score === undefined) return '-';
  return Number(score).toFixed(decimals);
}

/**
 * Detailed monthly layout: vertical subject headers (MOEYS / SchoolManagementApp style).
 */
export default function MonthlyDetailedPrint({ report, settings, subjects: subjectsProp }: MonthlySummaryPrintProps) {
  const columnSubjects = sortSubjectsByOrder(subjectsProp ?? report.subjects, report.grade);
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const reportTitle = settings.reportTitle || 'តារាងលទ្ធផលប្រចាំខែ';
  const teacherName = settings.teacherName || report.teacherName || '';
  const signatureDate =
    settings.reportDate?.trim() ||
    formatReportDate((report.school?.name || settings.examCenter || '').split(',')[0]?.trim() || 'ស្វាយធំ');
  const monthLine = report.period?.month ? `ខែ${report.period.month}` : '';

  const pages = paginateReports(
    report.students,
    {
      subjectCount: columnSubjects.length,
      hasAttendance: settings.showAttendance,
      hasClassName: Boolean(isGradeWide && settings.showClassName),
      isFirstPage: true,
      tableFontSize: settings.tableFontSize,
    },
    settings.firstPageStudentCount,
    settings.nextPageStudentCount
  ) as (typeof report.students)[];

  const fs = settings.tableFontSize;

  return (
    <div className="khmer-monthly-print">
      <style>{`
        @font-face { font-family: "Khmer OS Muol Light"; src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight"); }
        @font-face { font-family: "Tacteing"; src: local("Tacteing"), local("TacteingA"); }
        :root {
          --khmer-report-heading-font: "Metal", "Moul", "Khmer OS Muol Light", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", serif;
        }
        .detailed-page {
          width: 210mm; margin: 0 auto 24px; padding: 5mm 3mm; background: #fff; color: #000;
          font-family: var(--khmer-report-body-font); font-size: ${fs}px;
          page-break-after: always;
        }
        .detailed-page:last-child { page-break-after: auto; }
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          white-space: nowrap;
          height: 64px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin: 0 auto;
          font-size: ${Math.max(5, fs - 2)}px;
          line-height: 1.1;
        }
        .detailed-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .detailed-table th, .detailed-table td { border: 1px solid #000; padding: 1px 2px; text-align: center; }
        .detailed-table .nm { text-align: left; word-break: break-word; }
        @media print {
          body * { visibility: hidden !important; }
          .khmer-monthly-print, .khmer-monthly-print * { visibility: visible !important; }
          .khmer-monthly-print { display: block !important; position: absolute; inset: 0; width: 100%; background: white; }
          .detailed-page { box-shadow: none !important; }
          .detailed-table { table-layout: fixed !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {pages.map((students, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="detailed-page" key={`d-${pageIndex}`}>
            {isFirst && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ paddingTop: 12, fontSize: 10 }}>
                    <div>{settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប'}</div>
                    <div style={{ fontWeight: 700 }}>{settings.examCenter || report.school?.name || ''}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--khmer-report-heading-font)', fontSize: 14, fontWeight: 600 }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
                    <div style={{ fontFamily: 'var(--khmer-report-heading-font)', fontSize: 14, fontWeight: 600 }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
                    <div style={{ color: '#dc2626', fontFamily: 'Tacteing,serif', fontSize: 22 }}>3</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <div style={{ fontSize: 15, fontFamily: 'var(--khmer-report-heading-font)', fontWeight: 600 }}>{reportTitle}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>ឆ្នាំសិក្សា៖ {report.academicYear.label}</div>
                  {monthLine ? <div style={{ fontSize: 11, marginTop: 2 }}>{monthLine}</div> : null}
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{classLabel}</div>
                </div>
              </div>
            )}

            <table className="detailed-table">
              <thead>
                <tr>
                  <th style={{ width: 22 }}>
                    <div className="vertical-text" style={{ height: 52 }}>
                      ល.រ
                    </div>
                  </th>
                  <th style={{ width: 72 }}>
                    <div style={{ fontSize: fs, lineHeight: 1.15, padding: '2px 0' }}>
                      គោត្តនាម
                      <br />
                      និងនាម
                    </div>
                  </th>
                  {isGradeWide && settings.showClassName && (
                    <th style={{ width: 28 }}>
                      <div className="vertical-text">ថ្នាក់</div>
                    </th>
                  )}
                  {columnSubjects.map((subject) => (
                    <th key={subject.id} style={{ width: 18, background: '#eff6ff' }}>
                      <div className="vertical-text">{getSubjectAbbreviation(subject)}</div>
                    </th>
                  ))}
                  {settings.showAttendance && (
                    <>
                      <th style={{ width: 16 }}>
                        <div className="vertical-text">ច</div>
                      </th>
                      <th style={{ width: 16 }}>
                        <div className="vertical-text">អ</div>
                      </th>
                      <th style={{ width: 18 }}>
                        <div className="vertical-text">សរុប</div>
                      </th>
                    </>
                  )}
                  {settings.showTotal && (
                    <th style={{ width: 22 }}>
                      <div className="vertical-text">ពិន្ទុសរុប</div>
                    </th>
                  )}
                  {settings.showAverage && (
                    <th style={{ width: 22 }}>
                      <div className="vertical-text">ម.ភាគ</div>
                    </th>
                  )}
                  {settings.showRank && (
                    <th style={{ width: 22 }}>
                      <div className="vertical-text">ចំ.ថ្នាក់</div>
                    </th>
                  )}
                  {settings.showGradeLevel && (
                    <th style={{ width: 22 }}>
                      <div className="vertical-text">និទ្ទេស</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const rowNum =
                    pageIndex === 0
                      ? index + 1
                      : settings.firstPageStudentCount + (pageIndex - 1) * settings.nextPageStudentCount + index + 1;
                  return (
                    <tr key={student.studentId}>
                      <td>{rowNum}</td>
                      <td className="nm">{student.studentName}</td>
                      {isGradeWide && settings.showClassName && <td>{student.className}</td>}
                      {columnSubjects.map((subject) => (
                        <td key={subject.id}>{formatScore(student.grades[subject.id], 1)}</td>
                      ))}
                      {settings.showAttendance && (
                        <>
                          <td>{student.permission || 0}</td>
                          <td>{student.absent || 0}</td>
                          <td>
                            <strong>{(student.permission || 0) + (student.absent || 0)}</strong>
                          </td>
                        </>
                      )}
                      {settings.showTotal && (
                        <td>
                          <strong>{formatScore(student.totalScore, 0)}</strong>
                        </td>
                      )}
                      {settings.showAverage && (
                        <td>
                          <strong>{formatScore(student.average, 2)}</strong>
                        </td>
                      )}
                      {settings.showRank && <td style={{ color: '#dc2626', fontWeight: 700 }}>{student.rank}</td>}
                      {settings.showGradeLevel && (
                        <td>
                          <strong>{student.gradeLevel}</strong>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLast && (
              <div style={{ marginTop: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span>
                    <strong>សិស្សសរុប៖</strong> {report.statistics.totalStudents} នាក់ / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.femaleStudents}
                  </span>
                  <span>
                    <strong>ជាប់៖</strong> {report.statistics.passedStudents} / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.passedFemaleStudents}
                  </span>
                  <span>
                    <strong>ធ្លាក់៖</strong> {report.statistics.failedStudents} / <strong>ស្រី៖</strong>{' '}
                    {report.statistics.failedFemaleStudents}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 12, textAlign: 'center' }}>
                  <div>
                    <div>{signatureDate}</div>
                    <div style={{ fontWeight: 700 }}>បានឃើញ និងឯកភាព</div>
                    <div style={{ color: '#2563eb', fontWeight: 700 }}>{settings.principalName}</div>
                  </div>
                  <div>
                    <div>{signatureDate}</div>
                    <div style={{ fontWeight: 700 }}>គ្រូទទួលបន្ទុកថ្នាក់</div>
                    <div style={{ height: 36 }} />
                    <div style={{ color: '#2563eb', fontWeight: 700 }}>{teacherName}</div>
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
