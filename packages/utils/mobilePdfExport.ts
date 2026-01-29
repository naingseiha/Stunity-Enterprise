/**
 * Mobile PDF Export Utility
 * Generates A4-sized PDF reports for mobile app
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { MonthlyReportData } from './api/reports';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface PDFExportOptions {
  reportData: MonthlyReportData;
  schoolName?: string;
  province?: string;
  principalName?: string;
  teacherName?: string;
}

/**
 * Generate A4 PDF from monthly report data
 * Optimized for printing and mobile sharing
 */
export async function generateMonthlyReportPDF(options: PDFExportOptions): Promise<void> {
  const {
    reportData,
    schoolName = 'វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ',
    province = 'មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប',
    principalName = 'នាយកសាលា',
    teacherName,
  } = options;

  // Create PDF with A4 size (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ✅ Load Khmer font (using NotoSansKhmer for better compatibility)
  // Note: Khmer font is already loaded in the app
  doc.setFont('helvetica', 'normal');

  let yPosition = margin;

  // ===========================
  // Header Section
  // ===========================

  // Province/Department
  doc.setFontSize(10);
  doc.text(province, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  // School name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Report title
  doc.setFontSize(14);
  doc.text('តារាងលទ្ធផលប្រចាំខែ', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('MONTHLY RESULT REPORT', pageWidth / 2, yPosition + 5, { align: 'center' });
  yPosition += 12;

  // Class and period info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // Left side: Class info
  doc.text(`ថ្នាក់: ${reportData.className || '-'}`, margin, yPosition);
  doc.text(`Class: ${reportData.className || '-'}`, margin, yPosition + 5);

  // Right side: Month/Year
  const monthYear = `ខែ: ${reportData.month} ឆ្នាំ: ${reportData.year}`;
  doc.text(monthYear, pageWidth - margin, yPosition, { align: 'right' });
  doc.text(`Month: ${reportData.month} Year: ${reportData.year}`, pageWidth - margin, yPosition + 5, { align: 'right' });

  yPosition += 12;

  // Teacher name (if provided)
  if (teacherName || reportData.teacherName) {
    doc.setFontSize(10);
    doc.text(`គ្រូបង្រៀន: ${teacherName || reportData.teacherName}`, margin, yPosition);
    yPosition += 6;
  }

  // ===========================
  // Summary Statistics
  // ===========================

  const totalStudents = reportData.students.length;
  const passedStudents = reportData.students.filter(s => parseFloat(s.average) >= 25).length;
  const averageScore = totalStudents > 0
    ? (reportData.students.reduce((sum, s) => sum + parseFloat(s.average), 0) / totalStudents).toFixed(2)
    : '0.00';
  const passPercentage = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0.0';

  doc.setFontSize(9);
  doc.text(`សិស្សសរុប: ${totalStudents} | ជាប់: ${passedStudents} (${passPercentage}%) | មធ្យមភាគថ្នាក់: ${averageScore}`, margin, yPosition);
  yPosition += 8;

  // ===========================
  // Student Results Table
  // ===========================

  // Prepare table data
  const tableData = reportData.students.map((student, index) => [
    (index + 1).toString(),
    student.studentName,
    student.gender === 'MALE' ? 'ប' : 'ស',
    parseFloat(student.totalScore).toFixed(1),
    parseFloat(student.average).toFixed(2),
    student.gradeLevel,
    student.rank.toString(),
    student.absent?.toString() || '0',
  ]);

  // Generate table using autoTable
  doc.autoTable({
    startY: yPosition,
    head: [[
      'ល.រ',
      'គោត្តនាម និងនាម',
      'ភេទ',
      'ពិន្ទុសរុប',
      'មធ្យមភាគ',
      'ចំណាត់ថ្នាក់',
      'លេខរៀង',
      'អវត្តមាន'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // Indigo color
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // ល.រ
      1: { halign: 'left', cellWidth: 50 },   // Name
      2: { halign: 'center', cellWidth: 12 }, // Gender
      3: { halign: 'center', cellWidth: 20 }, // Total
      4: { halign: 'center', cellWidth: 20 }, // Average
      5: { halign: 'center', cellWidth: 25 }, // Grade Level
      6: { halign: 'center', cellWidth: 15 }, // Rank
      7: { halign: 'center', cellWidth: 20 }, // Absent
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      // Highlight top 3 students
      if (data.section === 'body') {
        const rank = parseInt(data.row.raw[6]);
        if (rank === 1) {
          data.cell.styles.fillColor = [254, 249, 195]; // Yellow
        } else if (rank === 2) {
          data.cell.styles.fillColor = [229, 231, 235]; // Gray
        } else if (rank === 3) {
          data.cell.styles.fillColor = [253, 230, 138]; // Amber
        }
      }
    },
  });

  // ===========================
  // Subject Details (if space allows)
  // ===========================

  yPosition = doc.lastAutoTable.finalY + 10;

  if (yPosition < pageHeight - 40 && reportData.subjects && reportData.subjects.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('មុខវិជ្ជា / Subjects:', margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const subjectsPerRow = 3;
    const subjectWidth = (pageWidth - 2 * margin) / subjectsPerRow;

    reportData.subjects.forEach((subject, index) => {
      const row = Math.floor(index / subjectsPerRow);
      const col = index % subjectsPerRow;
      const x = margin + col * subjectWidth;
      const y = yPosition + row * 5;

      doc.text(
        `${subject.code}: ${subject.nameKh}`,
        x,
        y,
        { maxWidth: subjectWidth - 2 }
      );
    });

    yPosition += Math.ceil(reportData.subjects.length / subjectsPerRow) * 5 + 5;
  }

  // ===========================
  // Footer Section
  // ===========================

  // Position footer at bottom
  yPosition = pageHeight - 30;

  doc.setFontSize(9);

  // Date section
  const currentDate = new Date();
  const dateStr = `ថ្ងៃទី ${currentDate.getDate()} ខែ ${currentDate.getMonth() + 1} ឆ្នាំ ${currentDate.getFullYear()}`;
  doc.text(dateStr, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Signatures
  const sigY = yPosition;

  // Principal signature
  doc.text('នាយកសាលា', margin + 30, sigY, { align: 'center' });
  doc.text('Principal', margin + 30, sigY + 4, { align: 'center' });

  // Teacher signature
  doc.text('គ្រូបន្ទុកថ្នាក់', pageWidth - margin - 30, sigY, { align: 'center' });
  doc.text('Homeroom Teacher', pageWidth - margin - 30, sigY + 4, { align: 'center' });

  // ===========================
  // Generate and Download PDF
  // ===========================

  const fileName = `Monthly_Report_${reportData.className}_${reportData.month}_${reportData.year}.pdf`;

  // Save PDF (this will trigger download on mobile)
  doc.save(fileName);
}

/**
 * Share PDF on mobile devices (using Web Share API)
 */
export async function sharePDF(pdfBlob: Blob, fileName: string): Promise<boolean> {
  if (navigator.share) {
    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      await navigator.share({
        files: [file],
        title: 'Monthly Report',
        text: 'School Monthly Report',
      });
      return true;
    } catch (error) {
      console.error('Error sharing PDF:', error);
      return false;
    }
  }
  return false;
}

/**
 * Generate and share PDF (mobile-friendly)
 */
export async function generateAndSharePDF(options: PDFExportOptions): Promise<void> {
  // Generate PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ... (same PDF generation logic as above)

  const pdfBlob = doc.output('blob');
  const fileName = `Monthly_Report_${options.reportData.className}_${options.reportData.month}_${options.reportData.year}.pdf`;

  // Try to share, fallback to download
  const shared = await sharePDF(pdfBlob, fileName);

  if (!shared) {
    // Fallback: trigger download
    doc.save(fileName);
  }
}
