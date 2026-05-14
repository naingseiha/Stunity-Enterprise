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
export default function MonthlyDetailedPrint({ report, settings, subjects: subjectsProp, schoolProfile }: MonthlySummaryPrintProps & { schoolProfile?: any }) {
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

  // Use school profile data for dynamic header
  const officeName = schoolProfile?.officeName || settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា';
  const clusterName = schoolProfile?.province ? `ខេត្ត៖ ${schoolProfile.province}` : settings.province;
  const schoolName = schoolProfile?.nameKh || schoolProfile?.name || report.school?.name || settings.examCenter;
  const logoUrl = schoolProfile?.logoUrl || report.school?.logo || '';

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
          @page { size: A4 portrait; margin: 0; }
          .khmer-monthly-print { display: block !important; width: 100% !important; background: white !important; }
        }
      `}</style>

      {pages.map((students, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="detailed-page" key={`d-${pageIndex}`}>
            {isFirst && (
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
                        <td key={subject.id}>{formatScore(student.grades[subject.id], 0)}</td>
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
              <>
                <div style={{ marginTop: 15, marginBottom: 20 }}>
                  {/* 1. General Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 15 }}>
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', textAlign: 'center', background: '#eff6ff', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: 9, color: '#64748b', marginBottom: 4 }}>សិស្សសរុប (Total)</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{report.statistics.totalStudents}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, fontSize: 9, color: '#475569', fontWeight: 600 }}>
                        <span>ស្រី៖ {report.statistics.femaleStudents}</span>
                        <span>ប្រុស៖ {report.statistics.totalStudents - report.statistics.femaleStudents}</span>
                      </div>
                    </div>
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', textAlign: 'center', background: '#ecfdf5', borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: 9, color: '#64748b', marginBottom: 4 }}>ជាប់ (Passed)</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{report.statistics.passedStudents}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, fontSize: 9, color: '#475569', fontWeight: 600 }}>
                        <span>ស្រី៖ {report.statistics.passedFemaleStudents}</span>
                        <span>ប្រុស៖ {report.statistics.passedStudents - report.statistics.passedFemaleStudents}</span>
                      </div>
                    </div>
                    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', textAlign: 'center', background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
                      <div style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: 9, color: '#64748b', marginBottom: 4 }}>ធ្លាក់ (Failed)</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{report.statistics.failedStudents}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, fontSize: 9, color: '#475569', fontWeight: 600 }}>
                        <span>ស្រី៖ {report.statistics.failedFemaleStudents}</span>
                        <span>ប្រុស៖ {report.statistics.failedStudents - report.statistics.failedFemaleStudents}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grade Distribution Cards */}
                  <div style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: 10, marginBottom: 8, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>កម្រិតលទ្ធផលសិក្សា (Grade Distribution)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((grade) => {
                      const count = report.students.filter(s => s.gradeLevel === grade).length;
                      const femaleCount = report.students.filter(s => s.gradeLevel === grade && (s.gender === 'F' || s.gender === 'ស្រី' || s.gender === 'Female')).length;
                      const colorMap = {
                        A: '#ca8a04', B: '#2563eb', C: '#16a34a', D: '#ea580c', E: '#64748b', F: '#dc2626'
                      };
                      const borderColors = {
                        A: '#ca8a04', B: '#2563eb', C: '#16a34a', D: '#ea580c', E: '#64748b', F: '#dc2626'
                      };
                      return (
                        <div key={grade} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 6, display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderTop: `3px solid ${borderColors[grade]}` }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: colorMap[grade], lineHeight: 1 }}>{grade}</div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{count} <span style={{ fontSize: 8, fontWeight: 400 }}>នាក់</span></div>
                            <div style={{ fontSize: 8, color: '#64748b', whiteSpace: 'nowrap' }}>ស្រី៖ {femaleCount}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
