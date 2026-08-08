'use client';

import type { KhmerMonthlyReportStudent } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';
import type { MonthlySummaryPrintProps } from './MonthlySummaryPrint';

function hasSemester(student: KhmerMonthlyReportStudent): student is KhmerMonthlyReportStudent & {
  semesterOne: NonNullable<KhmerMonthlyReportStudent['semesterOne']>;
} {
  return Boolean(student.semesterOne);
}

/** Learning tracking book: one column per month in the semester term. */
export default function TrackingBookPrint({
  report,
  settings,
  schoolProfile,
}: Omit<MonthlySummaryPrintProps, 'subjects'> & { schoolProfile?: any }) {
  const rows = report.students.filter(hasSemester);
  const months = report.monthsIncluded || [];
  const firstPageCount = Math.max(12, Math.floor(settings.firstPageStudentCount * 0.7));
  const nextPageCount = Math.max(14, Math.floor(settings.nextPageStudentCount * 0.75));
  const pages = paginateKhmerMonthlyReport(rows, firstPageCount, nextPageCount);
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const isSem2 = report.format === 'tracking-2' || report.format === 'semester-2';
  const reportTitle =
    settings.reportTitle ||
    (isSem2 ? 'សៀវភៅតាមដានការសិក្សា ឆមាសទី២' : 'សៀវភៅតាមដានការសិក្សា ឆមាសទី១');
  const teacherName = settings.teacherName || report.teacherName || '';
  const officeName = 'មន្ទីរអប់រំ យុវជន និងកីឡា';
  const provinceVal = schoolProfile?.province || settings.province || '';
  const cleanProvince = provinceVal.replace(/^(ខេត្ត៖|ខេត្ត)/, '').trim();
  const clusterName = cleanProvince ? `ខេត្ត៖ ${cleanProvince}` : '';
  const signatureDate =
    settings.reportDate?.trim() || formatReportDate(cleanProvince || '');
  const schoolName =
    schoolProfile?.nameKh ||
    schoolProfile?.name ||
    report.school?.name ||
    settings.examCenter ||
    '';
  const logoUrl = schoolProfile?.logoUrl || report.school?.logo || '';

  return (
    <div className="khmer-monthly-print">
      <link href="https://fonts.googleapis.com/css2?family=Moul&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --khmer-report-heading-font: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", serif;
          --khmer-report-moul: 'Moul', "Metal", "Khmer OS Muol Light", serif;
        }
        .khmer-monthly-print { display: block; }
        .moeys-track-page {
          width: 297mm; margin: 0 auto 32px; padding: 5mm 4mm; background: #fff; color: #000;
          font-family: var(--khmer-report-body-font); font-size: ${Math.max(8, settings.tableFontSize - 1)}px;
          page-break-after: always; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        }
        .moeys-track-page:last-child { page-break-after: auto; }
        .moeys-track-table { width: 100%; border-collapse: collapse; }
        .moeys-track-table th, .moeys-track-table td { border: 1px solid #000; padding: 2px 3px; text-align: center; }
        .moeys-track-table th { font-family: var(--khmer-report-heading-font); }
        .moeys-track-table .name { text-align: left; min-width: 110px; }
        .khmer-moul-branding { font-family: var(--khmer-report-moul); color: #2563eb; font-size: 11px; line-height: 1.8; margin: 0; }
        .khmer-kingdom-text { font-family: var(--khmer-report-moul); font-size: 13px; line-height: 1.8; margin: 0; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .khmer-monthly-print { display: block !important; width: 100% !important; background: white !important; }
        }
      `}</style>

      {pages.map((pageStudents, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="moeys-track-page" key={`track-${pageIndex}`}>
            {isFirst ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain' }} />
                  ) : null}
                  <p className="khmer-moul-branding">{officeName}</p>
                  <p className="khmer-moul-branding">{clusterName}</p>
                  <p className="khmer-moul-branding">{schoolName}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p className="khmer-kingdom-text">ព្រះរាជាណាចក្រកម្ពុជា</p>
                  <p className="khmer-kingdom-text">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                  <h1 style={{ margin: '8px 0 0', fontSize: 15, fontFamily: 'var(--khmer-report-heading-font)' }}>
                    {reportTitle}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontFamily: 'var(--khmer-report-heading-font)' }}>
                    ឆ្នាំសិក្សា៖ {report.academicYear.label} · {classLabel}
                  </p>
                </div>
                <div style={{ width: 120 }} />
              </div>
            ) : null}

            <table className="moeys-track-table">
              <thead>
                <tr>
                  <th>ល.រ</th>
                  <th>គោត្តនាម នាម</th>
                  {isGradeWide && settings.showClassName ? <th>ថ្នាក់</th> : null}
                  {months.map((month) => (
                    <th key={month.monthNumber}>{month.label}</th>
                  ))}
                  <th>ម.ភាគឆមាស</th>
                  <th>ចំ.ថ្នាក់</th>
                  <th>និទ្ទេស</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((student, index) => {
                  const globalIndex =
                    pageIndex === 0
                      ? index + 1
                      : firstPageCount + (pageIndex - 1) * nextPageCount + index + 1;
                  const semester = student.semesterOne!;
                  const averages = semester.monthAverages || {};
                  return (
                    <tr key={student.studentId}>
                      <td>{globalIndex}</td>
                      <td className="name">{student.studentName}</td>
                      {isGradeWide && settings.showClassName ? <td>{student.className}</td> : null}
                      {months.map((month) => {
                        const value = averages[month.monthNumber];
                        return (
                          <td key={month.monthNumber}>
                            {typeof value === 'number' ? value.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                      <td>{semester.finalAverage.toFixed(2)}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>
                        {semester.finalRank || student.rank}
                      </td>
                      <td>
                        <strong>{semester.finalGrade}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLast ? (
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
