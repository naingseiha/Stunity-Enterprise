'use client';

import type { KhmerMonthlyReportStudent } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { paginateKhmerMonthlyReport } from '@/lib/reports/templates/khm-moeys/pagination';
import type { MonthlySummaryPrintProps } from './MonthlySummaryPrint';

function hasAnnual(student: KhmerMonthlyReportStudent): student is KhmerMonthlyReportStudent & {
  annual: NonNullable<KhmerMonthlyReportStudent['annual']>;
} {
  return Boolean(student.annual);
}

/** Annual register: (Semester 1 + Semester 2) / 2 */
export default function AnnualPrint({
  report,
  settings,
  schoolProfile,
}: Omit<MonthlySummaryPrintProps, 'subjects'> & { schoolProfile?: any }) {
  const rows = report.students.filter(hasAnnual);
  const pages = paginateKhmerMonthlyReport(
    rows,
    settings.firstPageStudentCount,
    settings.nextPageStudentCount,
  );
  const isGradeWide = report.scope === 'grade';
  const classLabel = isGradeWide
    ? `កម្រិតថ្នាក់៖ ថ្នាក់ទី ${report.grade}`
    : report.class?.name || `ថ្នាក់ទី ${report.grade}`;
  const reportTitle = settings.reportTitle || 'តារាងលទ្ធផលប្រចាំឆ្នាំ';
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
        @font-face { font-family: "Khmer OS Muol Light"; src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight"); }
        @font-face { font-family: "Tacteing"; src: local("Tacteing"), local("TacteingA"), local("Tacteng"), local("TactengA"); }
        :root {
          --khmer-report-heading-font: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          --khmer-report-body-font: "Battambang", "Khmer OS Siemreap", serif;
          --khmer-report-moul: 'Moul', "Metal", "Khmer OS Muol Light", serif;
        }
        .khmer-monthly-print { display: block; }
        .moeys-annual-page {
          width: 210mm; margin: 0 auto 32px; padding: 5mm 3mm; background: #fff; color: #000;
          font-family: var(--khmer-report-body-font); font-size: ${settings.tableFontSize}px;
          page-break-after: always; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
        }
        .moeys-annual-page:last-child { page-break-after: auto; }
        .moeys-annual-table { width: 100%; border-collapse: collapse; }
        .moeys-annual-table th, .moeys-annual-table td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
        .moeys-annual-table th { font-family: var(--khmer-report-heading-font); font-size: ${settings.tableFontSize + 1}px; }
        .moeys-annual-table .name { text-align: left; min-width: 120px; }
        .khmer-moul-branding { font-family: var(--khmer-report-moul); color: #2563eb; font-size: 11px; line-height: 1.8; margin: 0; }
        .khmer-kingdom-text { font-family: var(--khmer-report-moul); font-size: 13px; line-height: 1.8; margin: 0; }
        .khmer-symbol-3 { font-family: "Tacteing", "Tacteng", serif; font-size: 28px; color: #dc2626; margin-top: 0; line-height: 1; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          .khmer-monthly-print { display: block !important; width: 100% !important; background: white !important; }
        }
      `}</style>

      {pages.map((pageStudents, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;
        return (
          <div className="moeys-annual-page" key={`annual-${pageIndex}`}>
            {isFirst && (
              <div className="khmer-monthly-header">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '5mm',
                    padding: '0 2mm',
                  }}
                >
                  <div style={{ textAlign: 'left', flex: 1, paddingTop: 45 }}>
                    {logoUrl ? (
                      <div style={{ marginBottom: 8 }}>
                        <img
                          src={logoUrl}
                          alt="Logo"
                          style={{ width: 60, height: 60, objectFit: 'contain' }}
                        />
                      </div>
                    ) : null}
                    <p className="khmer-moul-branding">{officeName}</p>
                    <p className="khmer-moul-branding">{clusterName}</p>
                    <p className="khmer-moul-branding">{schoolName}</p>
                  </div>
                  <div style={{ textAlign: 'center', width: 200 }}>
                    <p className="khmer-kingdom-text">ព្រះរាជាណាចក្រកម្ពុជា</p>
                    <p className="khmer-kingdom-text">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                    <p className="khmer-symbol-3">3</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontFamily: 'var(--khmer-report-heading-font)',
                      fontWeight: 600,
                    }}
                  >
                    {reportTitle}
                  </h1>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 12,
                      fontFamily: 'var(--khmer-report-heading-font)',
                    }}
                  >
                    ឆ្នាំសិក្សា៖ {report.academicYear.label}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 12,
                      fontFamily: 'var(--khmer-report-heading-font)',
                      fontWeight: 600,
                    }}
                  >
                    {classLabel}
                  </p>
                </div>
              </div>
            )}

            <table className="moeys-annual-table">
              <thead>
                <tr>
                  <th rowSpan={2}>ល.រ</th>
                  <th rowSpan={2}>គោត្តនាម នាម</th>
                  {isGradeWide && settings.showClassName ? <th rowSpan={2}>ថ្នាក់</th> : null}
                  <th colSpan={2}>ឆមាសទី១</th>
                  <th colSpan={2}>ឆមាសទី២</th>
                  <th colSpan={3}>លទ្ធផលប្រចាំឆ្នាំ</th>
                </tr>
                <tr>
                  <th>ម.ភាគ</th>
                  <th>ចំ.ថ្នាក់</th>
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
                      : settings.firstPageStudentCount +
                        (pageIndex - 1) * settings.nextPageStudentCount +
                        index +
                        1;
                  const annual = student.annual!;
                  const complete = annual.isComplete ?? student.isComplete !== false;
                  return (
                    <tr key={student.studentId}>
                      <td>{globalIndex}</td>
                      <td className="name">{student.studentName}</td>
                      {isGradeWide && settings.showClassName ? <td>{student.className}</td> : null}
                      <td>{complete ? annual.semester1Average.toFixed(2) : '—'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{complete && annual.semester1Rank > 0 ? annual.semester1Rank : '—'}</td>
                      <td>{complete ? annual.semester2Average.toFixed(2) : '—'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{complete && annual.semester2Rank > 0 ? annual.semester2Rank : '—'}</td>
                      <td>{complete ? annual.annualAverage.toFixed(2) : '—'}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{complete && annual.annualRank > 0 ? annual.annualRank : '—'}</td>
                      <td>
                        <strong>{complete ? annual.annualGrade : 'មិនទាន់គ្រប់'}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isLast ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 40,
                  marginTop: 14,
                  textAlign: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px' }}>{signatureDate}</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>បានឃើញ និងឯកភាព</p>
                  <p style={{ margin: '4px 0 0', color: '#2563eb', fontWeight: 700 }}>
                    {settings.principalName}
                  </p>
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
