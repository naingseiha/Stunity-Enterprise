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
export default function SemesterOnePrint({ report, settings, schoolProfile }: Omit<MonthlySummaryPrintProps, 'subjects'> & { schoolProfile?: any }) {
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

  // Use school profile data for dynamic header
  const officeName = schoolProfile?.officeName || settings.province || 'មន្ទីរអប់រំយុវជន និងកីឡា';
  const clusterName = schoolProfile?.province ? `ខេត្ត៖ ${schoolProfile.province}` : settings.province;
  const schoolName = schoolProfile?.nameKh || schoolProfile?.name || report.school?.name || settings.examCenter;
  const logoUrl = schoolProfile?.logoUrl || report.school?.logo || '';

  return (
    <div className="khmer-monthly-print">
      <style>{`
        @font-face { font-family: "Khmer OS Muol Light"; src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight"); }
        @font-face { font-family: "Khmer OS Bokor"; src: local("Khmer OS Bokor"), local("KhmerOSBokor"); }
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
        .khmer-monthly-print { display: block; }
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
          @page { size: A4 portrait; margin: 0; }
          .khmer-monthly-print { display: block !important; width: 100% !important; background: white !important; }
        }
      `}</style>

      {pages.map((pageStudents, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="moeys-semester-page" key={`sem-${pageIndex}`}>
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
