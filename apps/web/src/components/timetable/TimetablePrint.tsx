import React from 'react';
import { type Period } from '@/lib/api/timetable';
import { DAY_LABELS, type DayOfWeek, type TimetableEntry } from './types';

interface TimetablePrintProps {
  entries: TimetableEntry[];
  periods: Period[];
  title: string;
  subTitle?: string;
  schoolName?: string;
  logoUrl?: string;
  officeName?: string;
  clusterName?: string;
  gradeRange?: string;
  academicYear: string;
  classLabel?: string;
  teacherName?: string;
  principalName?: string;
  signatureDate?: string;
  showDays?: DayOfWeek[];
}

export default function TimetablePrint({
  entries,
  periods,
  title,
  subTitle,
  schoolName,
  logoUrl,
  officeName = 'ការិយាល័យអប់រំយុវជន និងកីឡានៃរដ្ឋបាល',
  clusterName = 'កម្រងសាលារៀន',
  gradeRange = 'ថ្នាក់ទី ១, ២, ៣',
  academicYear,
  classLabel,
  teacherName,
  principalName = 'នាយកសាលា',
  signatureDate,
  showDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
}: TimetablePrintProps) {
  // Group entries by period and day
  const entryMap = new Map<string, TimetableEntry>();
  entries.forEach((entry) => {
    entryMap.set(`${entry.periodId}|${entry.dayOfWeek}`, entry);
  });

  const fs = 12; // Base font size

  return (
    <div className="timetable-print-container">
      <style>{`
        .timetable-print-container {
          background: #f1f5f9;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }

        @media print {
          .timetable-print-container {
            background: white;
            padding: 0;
            display: block;
            margin: 0;
            width: 100%;
          }
          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 10mm !important;
          }
        }

        .print-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 10mm;
          margin: 0 auto;
          background: white;
          color: black;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          position: relative;
        }

        .khmer-moul {
          font-family: "Metal", "Moul", serif;
          font-weight: 400;
        }

        .khmer-koulen {
          font-family: "Koulen", sans-serif;
        }

        .khmer-battambang {
          font-family: "Battambang", sans-serif;
        }

        .symbol-font {
          font-family: "Tacteng", serif;
        }

        .header-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          align-items: flex-start;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          max-width: 60%;
        }

        .header-right {
          text-align: center;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .main-title {
          text-align: center;
          margin-bottom: 25px;
        }

        .title-red {
          color: #dc2626;
          font-size: 24px;
          margin: 0;
          font-style: italic;
        }

        .subtitle-red {
          color: #dc2626;
          font-size: 14px;
          margin: 5px 0 0 0;
          font-weight: bold;
        }

        .class-info-line {
          font-family: "Metal", "Moul", serif;
          font-size: 14px;
          margin-bottom: 8px;
          color: black;
          font-style: italic;
        }

        .timetable-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-top: 5px;
        }

        .timetable-table th, .timetable-table td {
          border: 1px solid black;
          padding: 8px 4px;
          text-align: center;
          font-size: 10px;
          vertical-align: middle;
          line-height: 1.3;
        }

        .timetable-table th {
          color: #dc2626;
          font-weight: bold;
          font-family: "Koulen", sans-serif;
          font-size: 12px;
        }

        .time-col {
          width: 85px;
          color: #dc2626 !important;
          font-family: "Koulen", sans-serif !important;
        }

        .break-row td {
          background-color: white;
          color: #dc2626;
          font-style: italic;
          font-weight: bold;
        }

        .footer-container {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          font-size: 11px;
        }

        .footer-column {
          width: 48%;
          text-align: center;
        }

        .signature-space {
          height: 50px;
        }

        .teacher-signature-name {
          color: #2563eb;
          font-family: "Metal", "Moul", serif;
          font-size: 16px;
          font-style: italic;
          margin-top: 15px;
        }
      `}</style>

      <div className="print-page">
        {/* Header Section */}
        <div className="header-container">
          <div className="header-left">
            <div className="flex items-center gap-2 mb-1">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: 55, height: 55, objectFit: 'contain' }} />
              ) : (
                <img src="/logo.png" alt="Logo" style={{ width: 55, height: 55, objectFit: 'contain' }} />
              )}
            </div>
            <div className="khmer-moul" style={{ color: '#2563eb', fontSize: '12px' }}>{officeName}</div>
            <div className="khmer-moul" style={{ color: '#2563eb', fontSize: '11px' }}>{clusterName}</div>
            <div className="khmer-moul" style={{ color: '#2563eb', fontSize: '11px' }}>{schoolName || 'សាលាបឋមសិក្សា'}</div>
            <div className="khmer-battambang" style={{ color: '#2563eb', fontSize: '10px' }}>{gradeRange}</div>
          </div>

          <div className="header-right">
            <div className="khmer-moul" style={{ fontSize: '14px' }}>ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div className="khmer-moul" style={{ fontSize: '14px' }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div className="symbol-font" style={{ fontSize: 32, color: '#dc2626', marginTop: 2 }}>3</div>
          </div>
        </div>

        {/* Title Section */}
        <div className="main-title">
          <h1 className="khmer-moul title-red">{title}</h1>
          <h2 className="khmer-moul subtitle-red">{academicYear}</h2>
        </div>

        {/* Info Line */}
        {classLabel && (
          <div className="class-info-line">
            {classLabel}
          </div>
        )}

        {/* Timetable Table */}
        <table className="timetable-table">
          <thead>
            <tr>
              <th className="time-col">ម៉ោងសិក្សា</th>
              {showDays.map((day) => (
                <th key={day}>{DAY_LABELS[day].kh}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              if (period.isBreak) {
                return (
                  <tr key={period.id} className="break-row">
                    <td className="time-col">
                      {period.startTime} - {period.endTime}
                      <br />
                      ({period.duration}ន)
                    </td>
                    <td colSpan={showDays.length} className="khmer-battambang">
                      ( {period.nameKh || period.name} )
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={period.id}>
                  <td className="time-col">
                    {period.startTime} - {period.endTime}
                    <br />
                    ({period.duration}ន)
                  </td>
                  {showDays.map((day) => {
                    const entry = entryMap.get(`${period.id}|${day}`);
                    return (
                      <td key={day} className="khmer-battambang">
                        {entry ? (
                          <>
                            <div className="font-bold" style={{ fontSize: '11px' }}>{entry.subject?.nameKh || entry.subject?.name}</div>
                            {entry.teacher && (
                              <div style={{ fontSize: '9px', marginTop: 3 }}>
                                {entry.teacher.khmerName || `${entry.teacher.firstName} ${entry.teacher.lastName}`}
                              </div>
                            )}
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="footer-container khmer-battambang">
          <div className="footer-column">
            <div className="font-bold" style={{ textDecoration: 'underline', fontSize: '12px' }}>បានឃើញនិងឯកភាព</div>
            <div style={{ marginTop: 8 }}>ថ្ងៃសៅរ៍ ៥រោច ខែកត្តិក ឆ្នាំថោះ បញ្ចស័ក ព.ស.២៥៦៧</div>
            <div style={{ marginBottom: 5 }}>ព្រៃជ្រាប,ថ្ងៃទី ២ ខែ ធ្នូ ឆ្នាំ២០២៣</div>
            <div className="font-bold khmer-moul" style={{ fontSize: '13px', marginTop: 10 }}>នាយកសាលា</div>
          </div>

          <div className="footer-column">
            <div style={{ marginTop: 8 }}>ថ្ងៃសៅរ៍ ៥រោច ខែកត្តិក ឆ្នាំថោះ បញ្ចស័ក ព.ស.២៥៦៧</div>
            <div style={{ marginBottom: 5 }}>ព្រៃជ្រាប,ថ្ងៃទី ២ ខែ ធ្នូ ឆ្នាំ២០២៣</div>
            <div className="font-bold khmer-moul" style={{ fontSize: '13px', marginTop: 10 }}>គ្រូទទួលបន្ទុកថ្នាក់</div>
            
            <div className="teacher-signature-name">{teacherName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
