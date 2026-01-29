import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlyReportData } from "@/lib/api/reports";

export async function generateMonthlyReportPDF(data: MonthlyReportData) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Set font (use default for now, Khmer font requires additional setup)
  doc.setFont("helvetica");

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("របាយការណ៍ប្រចាំខែ", doc.internal.pageSize.getWidth() / 2, 15, {
    align: "center",
  });

  // Subtitle
  doc.setFontSize(12);
  doc.text(
    `${data.className} • ${data.month} ${data.year}`,
    doc.internal.pageSize.getWidth() / 2,
    22,
    { align: "center" }
  );

  if (data.teacherName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `គ្រូបន្ទុក: ${data.teacherName}`,
      doc.internal.pageSize.getWidth() / 2,
      28,
      { align: "center" }
    );
  }

  // Get Khmer short names
  const getKhmerShortName = (code: string): string => {
    const mapping: { [key: string]: string } = {
      KH_W: "តែង. ក្តី",
      KH_R: "ស.អាន",
      MATH: "គណិត",
      PHYSICS: "រូប",
      CHEMISTRY: "គីមី",
      BIOLOGY: "ជីវៈ",
      EARTH_SCI: "ផែនដី",
      MORAL: "សីលធម៌",
      GEO: "ភូមិ",
      HISTORY: "ប្រវត្តិ",
      ENGLISH: "ភាសា",
      HOME_EC: "គេហ",
      PE: "កីឡា",
      AGRI: "កសិកម្ម",
      IT: "ICT",
      KH_LANG: "ខ្មែរ",
    };
    return mapping[code] || code;
  };

  // Prepare table headers
  const headers = [
    "#",
    "គោត្តនាម និងនាម",
    "ភេទ",
    ...data.subjects.map(
      (s) => `${getKhmerShortName(s.code)}\n(${s.coefficient})`
    ),
    "សរុប",
    "ម.ភាគ",
    "និទ្ទេស",
    "ចំ. ថ្នាក់",
    "អ. ច",
    "ម. ច",
  ];

  // Prepare table body
  const body = data.students.map((student, index) => {
    const row = [
      (index + 1).toString(),
      student.studentName,
      student.gender === "MALE" ? "ប" : "ស",
      ...data.subjects.map((subject) => {
        const score = student.grades[subject.id];
        if (score === null) return "-";
        if (score === 0) return "0 (A)"; // Show 0 with absent indicator
        return score.toFixed(1);
      }),
      student.totalScore,
      student.average,
      student.gradeLevel,
      `#${student.rank}`,
      student.absent.toString() || "-",
      student.permission.toString() || "-",
    ];
    return row;
  });

  // Generate table
  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [99, 102, 241], // Indigo
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" }, // #
      1: { cellWidth: 35, halign: "left" }, // Name
      2: { cellWidth: 8, halign: "center" }, // Gender
      // Subjects (dynamic width)
      // Summary columns
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    didParseCell: function (data) {
      // Color code grade levels
      if (data.section === "body" && data.column.index === headers.length - 4) {
        const gradeLevel = data.cell.text[0];
        const colors: { [key: string]: [number, number, number] } = {
          A: [22, 163, 74], // Green
          B: [37, 99, 235], // Blue
          C: [234, 179, 8], // Yellow
          D: [249, 115, 22], // Orange
          E: [239, 68, 68], // Red
          F: [185, 28, 28], // Dark Red
        };
        if (colors[gradeLevel]) {
          data.cell.styles.fillColor = colors[gradeLevel];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `និទ្ទេស: A (≥45) • B (≥40) • C (≥35) • D (≥30) • E (≥25) • F (<25)`,
    14,
    finalY + 10
  );
  doc.text(
    `អត្ថន័យ: អ.ច = អវត្តមានអត់ច្បាប់ • ម.ច = អវត្តមានមានច្បាប់ • (A) = អវត្តមាន (ពិន្ទុ 0 មិនបញ្ចូលក្នុងការគណនា)`,
    14,
    finalY + 15
  );
  doc.text(
    `បង្កើតនៅថ្ងៃទី ${new Date().toLocaleDateString("km-KH")}`,
    doc.internal.pageSize.getWidth() / 2,
    finalY + 22,
    { align: "center" }
  );

  // Save PDF
  const fileName = `របាយការណ៍_${data.className}_${data.month}_${data.year}.pdf`;
  doc.save(fileName);
}
