import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 🎯 Generate Unique Student ID (Multi-tenant version)
 * Format: YYCCNNNN (8 digits)
 *
 * - YY: Year enrolled (2 digits) - Ex: 25 for 2025
 * - CC: Grade/Class code (2 digits) - Ex: 07, 08, 09, 10, 11, 12
 * - NNNN: Sequential number (4 digits) - Ex: 0001, 0002, ...
 *
 * Examples:
 * - 25070001 = Enrolled in 2025, Grade 7, Student #1
 * - 25120045 = Enrolled in 2025, Grade 12, Student #45
 * - 26080123 = Enrolled in 2026, Grade 8, Student #123
 */
export async function generateStudentId(classId?: string, schoolId?: string): Promise<string> {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎯 Generating Student ID...");

    // Get current year (last 2 digits)
    const year = new Date().getFullYear().toString().slice(-2);
    console.log(`   Year: 20${year}`);

    // Get grade code from class
    let gradeCode = "00"; // Default if no class assigned

    if (classId) {
      const whereClause: any = { id: classId };
      if (schoolId) whereClause.schoolId = schoolId; // Multi-tenant filter

      const classInfo = await prisma.class.findFirst({
        where: whereClause,
        select: { grade: true, name: true },
      });

      if (classInfo) {
        // Extract grade number (7, 8, 9, 10, 11, 12)
        const gradeMatch = classInfo.grade.match(/\d+/);
        if (gradeMatch) {
          const gradeNum = parseInt(gradeMatch[0]);
          gradeCode = gradeNum.toString().padStart(2, "0");
          console.log(`   Class: ${classInfo.name} (Grade ${gradeNum})`);
        }
      }
    } else {
      console.log(`   Class: Not assigned (using default 00)`);
    }

    // Find highest sequential number for this year+grade combination
    const prefix = `${year}${gradeCode}`;
    console.log(`   Prefix: ${prefix}`);

    const whereClause: any = {
      studentId: {
        startsWith: prefix,
      },
    };
    if (schoolId) whereClause.schoolId = schoolId; // Multi-tenant filter

    const lastStudent = await prisma.student.findFirst({
      where: whereClause,
      orderBy: {
        studentId: "desc",
      },
      select: {
        studentId: true,
      },
    });

    let sequential = 1;

    if (lastStudent?.studentId) {
      // Extract last 4 digits and increment
      const lastSeq = parseInt(lastStudent.studentId.slice(-4));
      sequential = lastSeq + 1;
      console.log(
        `   Last Student ID: ${lastStudent.studentId} → Sequential: ${sequential}`
      );
    } else {
      console.log(`   First student for ${prefix}`);
    }

    // Format: YYCCNNNN
    const studentId = `${prefix}${sequential.toString().padStart(4, "0")}`;

    console.log(`✅ Generated: ${studentId}`);
    console.log(
      `   └─ ${year} (Year) + ${gradeCode} (Grade) + ${sequential
        .toString()
        .padStart(4, "0")} (Sequential)`
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return studentId;
  } catch (error: any) {
    console.error("❌ Error generating student ID:", error);
    // Fallback: timestamp-based unique ID
    const fallback = `99${Date.now().toString().slice(-6)}`;
    console.log(`⚠️  Using fallback ID: ${fallback}`);
    return fallback;
  }
}
