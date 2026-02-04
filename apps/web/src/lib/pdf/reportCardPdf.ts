import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentReportCard } from '@/lib/api/grades';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: { finalY: number };
  }
}

/**
 * Generate PDF Report Card for a student
 * Cambodian-style report card with bilingual support (Khmer/English)
 */
export const generateStudentReportCardPDF = (
  reportCard: StudentReportCard,
  schoolName: string = 'Test High School'
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { student, class: classInfo, semester, year, subjects, summary, attendance } = reportCard;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const secondaryColor: [number, number, number] = [99, 102, 241]; // Indigo-500
  const successColor: [number, number, number] = [34, 197, 94]; // Green-500
  const dangerColor: [number, number, number] = [239, 68, 68]; // Red-500
  const textColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // Gray-100

  // ========================================
  // Header Section
  // ========================================
  
  // School Header Background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // School Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, 15, { align: 'center' });
  
  // Report Card Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const semesterText = semester === 1 ? 'First Semester' : 'Second Semester';
  doc.text(`Student Report Card - ${semesterText} ${year}`, pageWidth / 2, 25, { align: 'center' });
  
  // Khmer subtitle
  doc.setFontSize(10);
  const semesterKh = semester === 1 ? 'Semester 1' : 'Semester 2';
  doc.text(`Report Card - ${semesterKh}`, pageWidth / 2, 33, { align: 'center' });

  yPos = 55;

  // ========================================
  // Student Information Section
  // ========================================
  
  doc.setTextColor(...textColor);
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 3, 3, 'F');
  
  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Left Column
  doc.text('Student Name:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.firstName} ${student.lastName}`, margin + 35, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Khmer Name:', margin + 5, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(student.khmerName || '-', margin + 35, yPos + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Student ID:', margin + 5, yPos + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(student.studentId || 'N/A', margin + 35, yPos + 14);
  
  // Right Column
  const rightCol = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Class:', rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(classInfo.name, rightCol + 20, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Grade:', rightCol, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Grade ${classInfo.grade}`, rightCol + 20, yPos + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Gender:', rightCol, yPos + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(student.gender || 'N/A', rightCol + 20, yPos + 14);

  yPos += 32;

  // ========================================
  // Overall Summary Box
  // ========================================
  
  // Summary boxes
  const boxWidth = (pageWidth - (margin * 2) - 15) / 4;
  const boxHeight = 22;
  
  // Box 1: Overall Average
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Overall Average', margin + boxWidth/2, yPos + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(summary.overallAverage.toFixed(2), margin + boxWidth/2, yPos + 16, { align: 'center' });
  
  // Box 2: Grade Level
  doc.setFillColor(...secondaryColor);
  doc.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Grade Level', margin + boxWidth*1.5 + 5, yPos + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(summary.overallGradeLevel, margin + boxWidth*1.5 + 5, yPos + 16, { align: 'center' });
  
  // Box 3: Class Rank
  doc.setFillColor(234, 179, 8); // Yellow
  doc.roundedRect(margin + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Class Rank', margin + boxWidth*2.5 + 10, yPos + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${summary.classRank}/${summary.totalStudents}`, margin + boxWidth*2.5 + 10, yPos + 16, { align: 'center' });
  
  // Box 4: Status
  const statusColor = summary.isPassing ? successColor : dangerColor;
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin + (boxWidth + 5) * 3, yPos, boxWidth, boxHeight, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Status', margin + boxWidth*3.5 + 15, yPos + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(summary.isPassing ? 'PASSED' : 'FAILED', margin + boxWidth*3.5 + 15, yPos + 16, { align: 'center' });

  yPos += boxHeight + 10;

  // ========================================
  // Subject Grades Table
  // ========================================
  
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject Grades', margin, yPos);
  yPos += 5;

  // Group subjects by category
  const subjectsByCategory = subjects.reduce((acc, subject) => {
    const category = subject.subject.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subject);
    return acc;
  }, {} as Record<string, typeof subjects>);

  // Prepare table data
  const tableHead = [
    ['Subject', 'M1', 'M2', 'M3', 'M4', 'M5', 'Avg', 'Grade'],
  ];

  const tableBody: any[][] = [];
  
  Object.entries(subjectsByCategory).forEach(([category, categorySubjects]) => {
    // Category header row
    tableBody.push([{ content: category.toUpperCase(), colSpan: 8, styles: { fillColor: [229, 231, 235], fontStyle: 'bold', halign: 'left' } }]);
    
    categorySubjects.forEach((subj) => {
      const monthGrades = subj.monthlyGrades.slice(0, 5);
      const scores = monthGrades.map(g => g.score.toString());
      // Fill remaining columns with '-'
      while (scores.length < 5) {
        scores.push('-');
      }
      const row = [
        `${subj.subject.name}`,
        ...scores,
        subj.semesterAverage.toFixed(1),
        subj.gradeLevel,
      ];
      tableBody.push(row);
    });
  });

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'left' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Color grade cells based on value
      if (data.column.index === 7 && data.section === 'body') {
        const grade = data.cell.text[0];
        if (grade === 'A' || grade === 'B') {
          data.cell.styles.textColor = [34, 197, 94]; // Green
        } else if (grade === 'C') {
          data.cell.styles.textColor = [234, 179, 8]; // Yellow
        } else if (grade === 'D' || grade === 'E') {
          data.cell.styles.textColor = [249, 115, 22]; // Orange
        } else if (grade === 'F') {
          data.cell.styles.textColor = [239, 68, 68]; // Red
        }
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }

  // ========================================
  // Attendance Summary
  // ========================================
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Attendance Summary', margin, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Present', 'Late', 'Absent', 'Excused', 'Permission', 'Attendance Rate']],
    body: [[
      attendance.present.toString(),
      attendance.late.toString(),
      attendance.absent.toString(),
      attendance.excused.toString(),
      attendance.permission.toString(),
      `${attendance.attendanceRate}%`,
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: successColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      halign: 'center',
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { textColor: [34, 197, 94] }, // Green
      1: { textColor: [249, 115, 22] }, // Orange
      2: { textColor: [239, 68, 68] }, // Red
      3: { textColor: [37, 99, 235] }, // Blue
      4: { textColor: [99, 102, 241] }, // Indigo
      5: { textColor: attendance.attendanceRate >= 80 ? [34, 197, 94] : [239, 68, 68] },
    },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // ========================================
  // Grading Scale
  // ========================================
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Grading Scale:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('A (90-100) Excellent | B (80-89) Good | C (70-79) Satisfactory | D (60-69) Needs Improvement | E (50-59) Poor | F (0-49) Fail', margin, yPos + 5);
  
  yPos += 15;

  // ========================================
  // Signature Section
  // ========================================
  
  const sigWidth = (pageWidth - margin * 2 - 20) / 3;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  
  // Parent Signature
  doc.text('Parent Signature', margin + sigWidth / 2, yPos, { align: 'center' });
  doc.line(margin, yPos + 10, margin + sigWidth, yPos + 10);
  
  // Teacher Signature
  doc.text('Class Teacher', margin + sigWidth * 1.5 + 10, yPos, { align: 'center' });
  doc.line(margin + sigWidth + 10, yPos + 10, margin + sigWidth * 2 + 10, yPos + 10);
  
  // Principal Signature
  doc.text('Principal', margin + sigWidth * 2.5 + 20, yPos, { align: 'center' });
  doc.line(margin + sigWidth * 2 + 20, yPos + 10, pageWidth - margin, yPos + 10);

  // ========================================
  // Footer
  // ========================================
  
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const generatedDate = new Date(reportCard.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(
    `Generated on ${generatedDate} | Stunity Enterprise School Management System`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download PDF for a single student
 */
export const downloadStudentReportCardPDF = (
  reportCard: StudentReportCard,
  schoolName?: string
): void => {
  const doc = generateStudentReportCardPDF(reportCard, schoolName);
  const filename = `Report_Card_${reportCard.student.firstName}_${reportCard.student.lastName}_${reportCard.semester === 1 ? 'S1' : 'S2'}_${reportCard.year}.pdf`;
  doc.save(filename);
};

/**
 * Get PDF as blob for preview or other uses
 */
export const getStudentReportCardPDFBlob = (
  reportCard: StudentReportCard,
  schoolName?: string
): Blob => {
  const doc = generateStudentReportCardPDF(reportCard, schoolName);
  return doc.output('blob');
};

/**
 * Generate grading scale legend
 */
export const getGradingScaleTable = (): { grade: string; range: string; description: string }[] => {
  return [
    { grade: 'A', range: '90-100', description: 'Excellent' },
    { grade: 'B', range: '80-89', description: 'Good' },
    { grade: 'C', range: '70-79', description: 'Satisfactory' },
    { grade: 'D', range: '60-69', description: 'Needs Improvement' },
    { grade: 'E', range: '50-59', description: 'Poor' },
    { grade: 'F', range: '0-49', description: 'Fail' },
  ];
};

// Import types for class report
import { ClassReportSummary } from '@/lib/api/grades';

/**
 * Generate PDF Class Summary Report
 */
export const generateClassSummaryPDF = (
  report: ClassReportSummary,
  schoolName: string = 'Test High School'
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { class: classInfo, semester, year, students, statistics } = report;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo-500
  const successColor: [number, number, number] = [34, 197, 94];
  const dangerColor: [number, number, number] = [239, 68, 68];
  const textColor: [number, number, number] = [31, 41, 55];
  const lightGray: [number, number, number] = [243, 244, 246];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const semesterText = semester === 1 ? 'First Semester' : 'Second Semester';
  doc.text(`Class Report - ${classInfo?.name || 'Class'} - ${semesterText} ${year}`, pageWidth / 2, 28, { align: 'center' });

  yPos = 50;

  // Statistics Summary
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Class Statistics', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Class Average', 'Highest', 'Lowest', 'Passing', 'Failing', 'Pass Rate']],
    body: [[
      statistics.classAverage.toFixed(2),
      statistics.highestAverage.toFixed(2),
      statistics.lowestAverage.toFixed(2),
      statistics.passingCount.toString(),
      statistics.failingCount.toString(),
      `${statistics.passRate}%`,
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      halign: 'center',
      fontStyle: 'bold',
    },
    margin: { left: margin, right: margin },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // Student Rankings Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Rankings', margin, yPos);
  yPos += 5;

  const studentRows = students.map((s) => [
    `#${s.rank}`,
    s.student.studentId || '-',
    `${s.student.firstName} ${s.student.lastName}`,
    s.student.khmerName,
    s.average.toFixed(2),
    s.gradeLevel,
    s.isPassing ? 'PASS' : 'FAIL',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Rank', 'ID', 'Name', 'Khmer Name', 'Average', 'Grade', 'Status']],
    body: studentRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textColor,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 40 },
      3: { halign: 'left', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Color status column
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.text[0];
        if (status === 'PASS') {
          data.cell.styles.textColor = successColor;
        } else {
          data.cell.styles.textColor = dangerColor;
        }
      }
      // Color grade column
      if (data.column.index === 5 && data.section === 'body') {
        const grade = data.cell.text[0];
        if (grade === 'A' || grade === 'B') {
          data.cell.styles.textColor = [34, 197, 94];
        } else if (grade === 'F') {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(
    `Generated on ${generatedDate} | Stunity Enterprise School Management System`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return doc;
};

/**
 * Download Class Summary PDF
 */
export const downloadClassSummaryPDF = (
  report: ClassReportSummary,
  schoolName?: string
): void => {
  const doc = generateClassSummaryPDF(report, schoolName);
  const filename = `Class_Report_${report.class?.name || 'Class'}_${report.semester === 1 ? 'S1' : 'S2'}_${report.year}.pdf`;
  doc.save(filename);
};
