'use client';

import React from 'react';
import type { KhmerMonthlyReportData, KhmerMonthlyReportStudent } from '@/lib/api/grades';
import { formatReportDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import { sortSubjectsByOrder } from '@/lib/reports/templates/khm-moeys/subjects';

interface TranscriptPrintProps {
  report: KhmerMonthlyReportData;
  settings: any;
  schoolProfile?: any;
}

// Convert numbers to Khmer numerals
function toKhmerNumerals(num: number | string): string {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (w) => khmerDigits[+w]);
}

// Format double digits with leading zero in Khmer
function formatKhmerDoubleDigits(num: number): string {
  const formatted = num < 10 ? `0${num}` : String(num);
  return toKhmerNumerals(formatted);
}

// Helper to determine subject letter grade in Khmer
function getSubjectGradeLetter(score: number, max: number): string {
  const percentage = (score / max) * 100;
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  if (percentage >= 50) return 'E';
  return 'F';
}

// Helper to determine subject remark in Khmer
function getSubjectRemark(grade: string): string {
  switch (grade) {
    case 'A': return 'ល្អប្រសើរ';
    case 'B': return 'ល្អណាស់';
    case 'C': return 'ល្អ';
    case 'D': return 'មធ្យម';
    case 'E': return 'ខ្សែរ';
    default: return 'ខ្សោយ';
  }
}

// Helper to determine subject result in Khmer
function getSubjectResult(score: number, max: number): string {
  return score >= max * 0.5 ? 'ជាប់' : 'ធ្លាក់';
}

export default function TranscriptPrint({ report, settings, schoolProfile }: TranscriptPrintProps) {
  const columnSubjects = sortSubjectsByOrder(report.subjects, report.grade);
  const teacherName = settings.teacherName || report.teacherName || '';
  const monthLine = report.period?.month ? `ខែ${report.period.month}` : '';
  const academicYearLabel = report.academicYear.label;

  const provinceVal = schoolProfile?.province || settings.province || '';
  const cleanProvince = provinceVal.replace(/^(ខេត្ត៖|ខេត្ត)/, '').trim();
  const schoolName = schoolProfile?.nameKh || schoolProfile?.name || report.school?.name || settings.examCenter || '';
  const logoUrl = schoolProfile?.logoUrl || report.school?.logo || '';

  // Extract signatures date
  const signatureDate = settings.reportDate?.trim() || formatReportDate(cleanProvince || '');

  // Pre-calculate subject rankings for all students in the report
  const subjectRankings = React.useMemo(() => {
    const rankings: Record<string, Record<string, number>> = {}; // subjectKey -> studentId -> rank

    columnSubjects.forEach((subject) => {
      const subjectKey = subject.nameKh || subject.name;
      const scores = report.students.map((student) => {
        const score = student.grades[subjectKey] ?? student.grades[subject.id] ?? 0;
        return { studentId: student.studentId, score };
      });

      // Sort descending
      scores.sort((a, b) => b.score - a.score);

      // Assign ranks with handling for ties
      rankings[subjectKey] = {};
      let currentRank = 1;
      for (let i = 0; i < scores.length; i++) {
        if (i > 0 && scores[i].score < scores[i - 1].score) {
          currentRank = i + 1;
        }
        rankings[subjectKey][scores[i].studentId] = currentRank;
      }
    });

    return rankings;
  }, [report.students, columnSubjects]);

  return (
    <div className="khmer-transcript-print">
      <link href="https://fonts.googleapis.com/css2?family=Moul&display=swap" rel="stylesheet" />
      <style>{`
        @font-face { font-family: "Khmer OS Muol Light"; src: local("Khmer OS Muol Light"), local("KhmerOSMuolLight"); }
        @font-face { font-family: "Tacteing"; src: local("Tacteing"), local("TacteingA"), local("Tacteng"), local("TactengA"); }
        
        .transcript-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 24px;
          padding: 8mm 10mm 5mm;
          background: #fff;
          color: #000;
          font-family: "Battambang", "Khmer OS Siemreap", serif;
          font-size: 10.5px;
          line-height: 1.4;
          box-sizing: border-box;
          page-break-after: always;
          position: relative;
        }

        .transcript-page:last-child {
          page-break-after: auto;
        }

        .transcript-header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 3mm;
        }

        .transcript-header-left {
          text-align: left;
          flex: 1;
          padding-top: 15px;
        }

        .transcript-header-right {
          text-align: center;
          width: 220px;
        }

        .transcript-moul-branding {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 10px;
          line-height: 1.7;
          margin: 0;
        }

        .transcript-kingdom-text {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 11px;
          line-height: 1.7;
          margin: 0;
        }

        .transcript-symbol-3 {
          font-family: "Tacteing", "Tacteng", "tactieng", serif;
          font-size: 24px;
          color: #000;
          margin-top: -2px;
          line-height: 1;
        }

        .transcript-photo-placeholder {
          position: absolute;
          top: 17mm;
          right: 10mm;
          width: 80px;
          height: 100px;
          border: 1px solid #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
          border-radius: 4px;
          box-shadow: inset 0 0 4px rgba(0,0,0,0.05);
          overflow: hidden;
          z-index: 10;
        }

        .transcript-title-section {
          text-align: center;
          margin-top: -15px;
          margin-bottom: 4mm;
        }

        .transcript-main-title {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          color: #dc2626;
          font-size: 13px;
          line-height: 1.8;
          margin: 0;
        }

        .transcript-sub-title {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          color: #dc2626;
          font-size: 11.5px;
          margin: 2px 0 0 0;
        }

        .transcript-year-title {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 10.5px;
          margin: 2px 0 0 0;
        }

        .student-meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5mm;
          margin-bottom: 3mm;
          font-size: 11px;
        }

        .student-meta-table td {
          padding: 2px 0;
          vertical-align: middle;
        }

        .student-meta-label {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 10.5px;
          white-space: nowrap;
          padding-right: 4px;
        }

        .student-meta-value {
          font-weight: bold;
          font-size: 11.5px;
        }

        .transcript-section-title {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 11px;
          margin: 4mm 0 1.5mm 0;
          text-align: left;
        }

        .transcript-results-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2mm;
        }

        .transcript-results-table th, .transcript-results-table td {
          border: 1px solid #000;
          padding: 6px 4px;
          text-align: center;
          vertical-align: middle;
        }

        .transcript-results-table th {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 9.5px;
          background-color: #f8fafc;
        }

        .transcript-results-table td.subject-name {
          text-align: left;
          font-weight: 500;
          padding-left: 8px;
        }

        .transcript-results-table tr.summary-row {
          font-weight: bold;
          background-color: #f1f5f9;
        }

        .transcript-results-table tr.summary-row td {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 9.5px;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1mm;
        }

        .attendance-table th, .attendance-table td {
          border: 1px solid #000;
          padding: 6px 6px;
          text-align: center;
        }

        .attendance-table th {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 9.5px;
          background-color: #f8fafc;
        }

        .remarks-list {
          margin: 0;
          padding-left: 18px;
          list-style-type: unset;
        }

        .remarks-list li {
          margin-bottom: 3px;
          font-size: 11px;
        }

        .transcript-signatures-container {
          display: flex;
          justify-content: space-between;
          margin-top: 5mm;
          font-size: 11px;
        }

        .signature-column {
          text-align: center;
          width: 250px;
        }

        .signature-title {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 10px;
          margin-bottom: 12mm;
        }

        .signature-name {
          font-family: 'Moul', "Metal", "Khmer OS Muol Light", serif;
          font-size: 10.5px;
          margin-top: 2px;
        }

        .transcript-footnote {
          border-top: 1px solid #ccc;
          padding-top: 4px;
          margin-top: 5mm;
          font-size: 8.5px;
          line-height: 1.4;
          text-align: justify;
          color: #475569;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
          }
          .transcript-page {
            margin: 0 !important;
            padding: 8mm 10mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
            width: 210mm !important;
            min-height: 297mm !important;
          }
          .khmer-transcript-print {
            display: block !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>

      {report.students.map((student, studentIndex) => {
        // Calculate dynamic properties for student
        const classSize = report.students.length;
        const femaleCount = report.students.filter(
          (s) => s.gender?.toUpperCase() === 'FEMALE' || s.gender?.toUpperCase() === 'F' || s.gender === 'ស្រី'
        ).length;

        const totalStudentsText = `ចំនួនសិស្សក្នុងថ្នាក់ ${toKhmerNumerals(classSize)} នាក់ ស្រី ${toKhmerNumerals(femaleCount)} នាក់`;

        // Calculate passed subjects count
        let passedSubjectsCount = 0;
        columnSubjects.forEach((sub) => {
          const subjectKey = sub.nameKh || sub.name;
          const score = student.grades[subjectKey] ?? student.grades[sub.id] ?? 0;
          const max = sub.maxScore || 100;
          if (score >= max * 0.5) {
            passedSubjectsCount++;
          }
        });

        // Formulated suggestion bullet
        const hasPassed = student.average >= report.rules.passingAverage;
        let suggestionText = '';
        if (student.average >= 40) {
          suggestionText = 'លទ្ធផលសិក្សាល្អប្រសើរណាស់ គប្បីបន្តការខិតខំប្រឹងប្រែងនេះតទៅទៀត។';
        } else if (student.average >= 25) {
          suggestionText = 'ការសិក្សាទទួលបានលទ្ធផលល្អមធ្យម ត្រូវខិតខំរៀនសូត្របន្ថែមទៀត។';
        } else {
          suggestionText = 'លទ្ធផលសិក្សានៅខ្សោយ ត្រូវយកចិត្តទុកដាក់ខ្ពស់លើការសិក្សាឡើងវិញ។';
        }

        const rawClassName = report.class?.name || '';
        const hasClassPrefix = rawClassName.includes('ថ្នាក់');
        const classDisplay = hasClassPrefix ? rawClassName : `ថ្នាក់ទី ${rawClassName || report.grade}`;
        const formattedClass = toKhmerNumerals(classDisplay);

        return (
          <div className="transcript-page" key={student.studentId}>
            {/* Header section */}
            <div className="transcript-header-container">
              <div className="transcript-header-left">
                {logoUrl && (
                  <div style={{ marginBottom: '6px' }}>
                    <img src={logoUrl} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
                  </div>
                )}
                <p className="transcript-moul-branding">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រះសីហនុ</p>
                <p className="transcript-moul-branding">ការិយាល័យអប់រំ យុវជន និងកីឡា</p>
                <p className="transcript-moul-branding">{schoolName}</p>
              </div>

              {/* Royal emblem text */}
              <div className="transcript-header-right" style={{ marginRight: '90px' }}>
                <p className="transcript-kingdom-text">ព្រះរាជាណាចក្រកម្ពុជា</p>
                <p className="transcript-kingdom-text">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                <p className="transcript-symbol-3">3</p>
              </div>

              {/* Photo section */}
              <div className="transcript-photo-placeholder">
                <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}>រូបថត ៣x៤</span>
              </div>
            </div>

            {/* Title section */}
            <div className="transcript-title-section">
              <h2 className="transcript-main-title">ព្រឹត្តិបត្រពិន្ទុប្រចាំ{monthLine}</h2>
              <h3 className="transcript-sub-title">{formattedClass}</h3>
              <p className="transcript-year-title">ឆ្នាំសិក្សា {toKhmerNumerals(academicYearLabel)}</p>
            </div>

            {/* Student Metadata Row */}
            <table className="student-meta-table">
              <tbody>
                <tr>
                  <td style={{ width: '13%' }}>
                    <span className="student-meta-label">គោត្តនាម - នាម៖</span>
                  </td>
                  <td style={{ width: '37%' }}>
                    <span className="student-meta-value">{student.studentName}</span>
                  </td>
                  <td style={{ width: '7%' }}>
                    <span className="student-meta-label">ភេទ៖</span>
                  </td>
                  <td style={{ width: '13%' }}>
                    <span className="student-meta-value">
                      {student.gender?.toUpperCase() === 'FEMALE' || student.gender?.toUpperCase() === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                    </span>
                  </td>
                  <td style={{ width: '30%', textAlign: 'right' }}>
                    <span className="student-meta-value" style={{ fontSize: '10.5px' }}>{totalStudentsText}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section A: Academic Results */}
            <h3 className="transcript-section-title">ក. លទ្ធផលនៃការសិក្សា</h3>
            <table className="transcript-results-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>ល-រ</th>
                  <th style={{ width: '33%' }}>មុខវិជ្ជា</th>
                  <th style={{ width: '12%' }}>ពិន្ទុអតិបរមា</th>
                  <th style={{ width: '12%' }}>ពិន្ទុប្រឡងបាន</th>
                  <th style={{ width: '9%' }}>ចំណាត់ថ្នាក់</th>
                  <th style={{ width: '9%' }}>និទ្ទេស</th>
                  <th style={{ width: '9%' }}>មូលវិចារ</th>
                  <th style={{ width: '9%' }}>លទ្ធផល</th>
                </tr>
              </thead>
              <tbody>
                {columnSubjects.map((sub, index) => {
                  const subjectKey = sub.nameKh || sub.name;
                  const rawScore = student.grades[subjectKey] ?? student.grades[sub.id] ?? null;
                  const max = sub.maxScore || 100;
                  const displayScore = rawScore !== null ? toKhmerNumerals(rawScore.toFixed(1)) : '-';

                  const grade = rawScore !== null ? getSubjectGradeLetter(rawScore, max) : '-';
                  const remark = rawScore !== null ? getSubjectRemark(grade) : '-';
                  const result = rawScore !== null ? getSubjectResult(rawScore, max) : '-';

                  // Extract pre-calculated rank
                  const rank = subjectRankings[subjectKey]?.[student.studentId] ?? null;
                  const displayRank = rank !== null ? toKhmerNumerals(rank) : '-';

                  return (
                    <tr key={sub.id || index}>
                      <td>{toKhmerNumerals(index + 1)}</td>
                      <td className="subject-name">{sub.nameKh || sub.name}</td>
                      <td>{toKhmerNumerals(max)}</td>
                      <td style={{ fontWeight: 'bold' }}>{displayScore}</td>
                      <td style={{ color: rank === 1 ? '#dc2626' : 'inherit', fontWeight: rank === 1 ? 'bold' : 'normal' }}>
                        {displayRank}
                      </td>
                      <td>{grade}</td>
                      <td>{remark}</td>
                      <td style={{ color: result === 'ធ្លាក់' ? '#dc2626' : 'inherit', fontWeight: result === 'ធ្លាក់' ? 'bold' : 'normal' }}>
                        {result}
                      </td>
                    </tr>
                  );
                })}

                {/* Total row */}
                <tr className="summary-row">
                  <td></td>
                  <td className="subject-name">ពិន្ទុសរុប</td>
                  <td>{toKhmerNumerals(columnSubjects.reduce((acc, sub) => acc + (sub.maxScore || 100), 0))}</td>
                  <td>{toKhmerNumerals(student.totalScore.toFixed(1))}</td>
                  <td colSpan={4} style={{ backgroundColor: '#fff', border: 'none' }}></td>
                </tr>

                {/* Average row */}
                <tr className="summary-row">
                  <td></td>
                  <td className="subject-name">មធ្យមភាគ</td>
                  <td>{toKhmerNumerals((50).toFixed(2))}</td>
                  <td>{toKhmerNumerals(student.average.toFixed(2))}</td>
                  <td style={{ color: '#dc2626', fontWeight: 'bold' }}>{toKhmerNumerals(student.rank)}</td>
                  <td>{student.gradeLevel || '-'}</td>
                  <td>
                    {student.average >= 45 ? 'ល្អប្រសើរ' :
                     student.average >= 40 ? 'ល្អណាស់' :
                     student.average >= 35 ? 'ល្អ' :
                     student.average >= 30 ? 'ល្អបង្គួរ' :
                     student.average >= 25 ? 'មធ្យម' : 'ខ្សោយ'}
                  </td>
                  <td style={{ color: hasPassed ? 'inherit' : '#dc2626' }}>
                    {hasPassed ? 'ជាប់' : 'ធ្លាក់'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section B: Attendance and Section C: Remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: '15px', marginTop: '3mm' }}>
              <div>
                <h3 className="transcript-section-title" style={{ marginTop: 0 }}>ខ. ចំនួនអវត្តមានក្នុងខែ</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>អវត្តមាន</th>
                      <th style={{ width: '30%' }}>នៃ{monthLine}</th>
                      <th style={{ width: '30%' }}>សរុបអវត្តមាន</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: '8.5px' }}>មានច្បាប់</td>
                      <td>{formatKhmerDoubleDigits(student.permission)} ជង</td>
                      <td>{formatKhmerDoubleDigits(student.permission)} ជង</td>
                    </tr>
                    <tr>
                      <td style={{ fontFamily: 'var(--khmer-report-moul)', fontSize: '8.5px' }}>អត់ច្បាប់</td>
                      <td>{formatKhmerDoubleDigits(student.absent)} ជង</td>
                      <td>{formatKhmerDoubleDigits(student.absent)} ជង</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="transcript-section-title" style={{ marginTop: 0 }}>គ. មូលវិចារ</h3>
                <ul className="remarks-list">
                  <li>បានប្រឡងជាប់ចំនួន <strong>{toKhmerNumerals(passedSubjectsCount)}</strong> មុខវិជ្ជា</li>
                  <li>{suggestionText}</li>
                </ul>
              </div>
            </div>

            {/* Signatures Row */}
            <div className="transcript-signatures-container">
              <div className="signature-column">
                <p style={{ margin: 0, opacity: 0.9 }}>បានឃើញ និងឯកភាព</p>
                <p className="signature-title">នាយកសាលា</p>
                <div style={{ height: '35px' }} />
                <p className="signature-name">{settings.principalName || 'សុខ វ៉ាន់'}</p>
              </div>

              <div className="signature-column">
                <p style={{ margin: 0, fontStyle: 'italic' }}>{signatureDate}</p>
                <p className="signature-title">គ្រូធ្វើការងារ</p>
                <div style={{ height: '35px' }} />
                <p className="signature-name">{teacherName || 'កែម មុន្នីកាល'}</p>
              </div>
            </div>

            {/* Footnote */}
            <div className="transcript-footnote">
              យោងតាមបទបញ្ជាផ្ទៃក្នុងសម្រាប់គ្រឹះស្ថានមធ្យមសិក្សាចំណេះទូទៅ៖ ១. ចំពោះសិស្សដែលឈប់អត់ច្បាប់លើសពី០៥ដង ត្រូវសហការជាមួយអាណាព្យាបាលសិស្សសួរនាំ។ ២. សិស្សឈប់អត់ច្បាប់ លើសពី២០ដងឡើងនិងមិនដោះស្រាយ នឹងត្រូវលុបឈ្មោះចេញ។ ៣. សិស្សដែលឈប់មានច្បាប់លើសពី៤០ដងឡើង ត្រូវរៀបចំត្រួតពិនិត្យ ការសិក្សាឡើងវិញថាតើលទ្ធផលសិក្សាមធ្យមភាគប្រចាំឆ្នាំសន្និដ្ឋានយ៉ាងណា។
            </div>
          </div>
        );
      })}
    </div>
  );
}
