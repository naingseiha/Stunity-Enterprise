import { Request, Response } from "express";
import { PrismaClient, Gender } from "@prisma/client";
import { generateStudentId } from "../utils/studentIdGenerator";
import { parseDate } from "../utils/dateParser"; // ✅ MUST HAVE THIS

const prisma = new PrismaClient();

/**
 * ✅ GET students LIGHTWEIGHT (for grid/list views - fast loading)
 * ⚡ OPTIMIZED with pagination support
 */
export const getStudentsLightweight = async (req: Request, res: Response) => {
  try {
    console.log("⚡ Fetching students (lightweight)...");

    // ✅ Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // ✅ Filter parameters
    const classId = req.query.classId as string | undefined;
    const gender = req.query.gender as string | undefined;

    console.log(`📄 Page: ${page}, Limit: ${limit}, Skip: ${skip}`);
    if (classId) console.log(`🎓 Filter by class: ${classId}`);
    if (gender) console.log(`👤 Filter by gender: ${gender}`);

    // ✅ Build where clause for filtering
    const where: any = {};
    if (classId && classId !== "all") {
      where.classId = classId;
    }
    if (gender && gender !== "all") {
      where.gender = gender === "male" ? "MALE" : "FEMALE";
    }

    // ✅ Fetch total count with filters
    const totalCount = await prisma.student.count({ where });

    // ✅ Fetch paginated students with filters
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        khmerName: true,
        englishName: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        placeOfBirth: true,
        currentAddress: true,
        phoneNumber: true,
        classId: true,
        isAccountActive: true, // ✅ Added for account status display
        studentRole: true, // ✅ Added for role display
        // Only essential class info
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
        // Parent info for grid
        fatherName: true,
        motherName: true,
        parentPhone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    console.log(`⚡ Fetched ${students.length} students (page ${page}/${totalPages})`);

    res.json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching students (lightweight):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
};

/**
 * ✅ GET all students (FULL DATA - includes all relations)
 */
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    console.log("📋 Fetching all students (full data)...");

    const students = await prisma.student.findMany({
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Fetched ${students.length} students`);

    res.json({
      success: true,
      data: students,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        grades: {
          include: {
            subject: true,
          },
        },
        attendance: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message,
    });
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 CREATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      email,
      dateOfBirth,
      gender,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      remarks,
    } = req.body;

    if (!firstName || firstName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "គោត្តនាម (First name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!lastName || lastName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "នាម (Last name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!khmerName || khmerName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ឈ្មោះជាអក្សរខ្មែរ (Khmer name) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "ថ្ងៃខែឆ្នាំកំណើត (Date of birth) ជាទិន្នន័យចាំបាច់",
      });
    }

    if (!gender || (gender !== "MALE" && gender !== "FEMALE")) {
      return res.status(400).json({
        success: false,
        message: "ភេទត្រូវតែជា MALE ឬ FEMALE",
      });
    }

    const studentId = await generateStudentId(classId);
    console.log(`🎯 Generated Student ID: ${studentId}`);

    const studentEmail =
      email && email.trim() !== ""
        ? email.trim()
        : `${studentId}@student.edu. kh`;

    console.log(`📧 Email: ${studentEmail}`);

    if (classId && classId.trim() !== "") {
      const classExists = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: "រកមិនឃើញថ្នាក់នេះទេ (Class not found)",
        });
      }
    }

    const studentData: any = {
      studentId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      khmerName: khmerName.trim(),
      englishName: englishName?.trim() || null,
      email: studentEmail,
      dateOfBirth,
      gender: gender as Gender,
      placeOfBirth: placeOfBirth?.trim() || "ភ្នំពេញ",
      currentAddress: currentAddress?.trim() || "ភ្នំពេញ",
      phoneNumber: phoneNumber?.trim() || null,
      fatherName: fatherName?.trim() || "ឪពុក",
      motherName: motherName?.trim() || "ម្តាយ",
      parentPhone: parentPhone?.trim() || null,
      parentOccupation: parentOccupation?.trim() || "កសិករ",
      remarks: remarks?.trim() || null,
    };

    if (classId && classId.trim() !== "") {
      studentData.classId = classId;
    }

    console.log("💾 Creating student in database...");

    const student = await prisma.student.create({
      data: studentData,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    console.log("✅ Student created successfully!");
    console.log(`   ID: ${student.id}`);
    console.log(`   Student ID: ${student.studentId}`);
    console.log(`   Name: ${student.khmerName}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: "បង្កើតសិស្សបានជោគជ័យ (Student created successfully)",
      data: student,
    });
  } catch (error: any) {
    console.error("❌ Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការបង្កើតសិស្ស (Error creating student)",
      error: error.message,
    });
  }
};

// ✅ BULK CREATE WITH DATE PARSING
export const bulkCreateStudents = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 BULK CREATE STUDENTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { classId, students } = req.body;

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "classId and students array are required",
      });
    }

    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, grade: true },
    });

    if (!classExists) {
      return res.status(400).json({
        success: false,
        message: "Class not found",
      });
    }

    console.log(`📊 Class: ${classExists.name} (Grade ${classExists.grade})`);
    console.log(`👥 Students to create: ${students.length}`);

    const results = { success: [], failed: [] };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const rowNumber = i + 1;

      try {
        // Parse name
        const fullName = studentData.name?.trim();
        if (!fullName) throw new Error("Name is required");

        const nameParts = fullName.split(/\s+/);
        const firstName = nameParts.pop() || "";
        const lastName = nameParts.join(" ") || firstName;

        // Parse gender
        let gender: "MALE" | "FEMALE" = "MALE";
        if (studentData.gender) {
          const g = studentData.gender.toString().trim().toUpperCase();
          if (["ប", "ប្រុស", "M", "MALE", "BOY"].includes(g)) {
            gender = "MALE";
          } else if (["ស", "ស្រី", "F", "FEMALE", "GIRL"].includes(g)) {
            gender = "FEMALE";
          }
        }

        // ✅ PARSE DATE using imported parseDate function
        let dateOfBirth: string;
        try {
          if (!studentData.dateOfBirth) {
            throw new Error("Date of birth is required");
          }

          // ✅ USE parseDate function
          dateOfBirth = parseDate(studentData.dateOfBirth);
          console.log(
            `  📅 Row ${rowNumber}: ${studentData.dateOfBirth} → ${dateOfBirth}`
          );
        } catch (dateError: any) {
          throw new Error(`Invalid date: ${dateError.message}`);
        }

        // Generate student ID
        const studentId = await generateStudentId(classId);

        // Create student
        const newStudent = await prisma.student.create({
          data: {
            studentId,
            firstName,
            lastName,
            khmerName: fullName,
            dateOfBirth,
            gender,
            classId,
            email: `${studentId}@student.edu.kh`,

            // Academic history
            previousGrade: studentData.previousGrade?.trim() || null,
            previousSchool: studentData.previousSchool?.trim() || null,
            repeatingGrade: studentData.repeatingGrade?.trim() || null,
            transferredFrom: studentData.transferredFrom?.trim() || null,

            // Grade 9 Exam
            grade9ExamSession: studentData.grade9ExamSession?.trim() || null,
            grade9ExamCenter: studentData.grade9ExamCenter?.trim() || null,
            grade9ExamRoom: studentData.grade9ExamRoom?.trim() || null,
            grade9ExamDesk: studentData.grade9ExamDesk?.trim() || null,
            grade9PassStatus: studentData.grade9PassStatus?.trim() || null,

            // Grade 12 Exam
            grade12ExamSession: studentData.grade12ExamSession?.trim() || null,
            grade12ExamCenter: studentData.grade12ExamCenter?.trim() || null,
            grade12ExamRoom: studentData.grade12ExamRoom?.trim() || null,
            grade12ExamDesk: studentData.grade12ExamDesk?.trim() || null,
            grade12PassStatus: studentData.grade12PassStatus?.trim() || null,
            grade12Track: studentData.grade12Track?.trim() || null,

            // Other
            remarks: studentData.remarks?.trim() || null,

            // Defaults
            placeOfBirth: "ភ្នំពេញ",
            currentAddress: "ភ្នំពេញ",
            fatherName: "ឪពុក",
            motherName: "ម្តាយ",
            parentOccupation: "កសិករ",
          },
          include: {
            class: {
              select: { id: true, name: true, grade: true },
            },
          },
        });

        results.success.push({
          row: rowNumber,
          studentId: newStudent.studentId,
          name: newStudent.khmerName,
        });

        console.log(
          `  ✅ Row ${rowNumber}: ${newStudent.khmerName} (${newStudent.studentId})`
        );
      } catch (error: any) {
        results.failed.push({
          row: rowNumber,
          name: studentData.name || "Unknown",
          error: error.message,
        });
        console.error(`  ❌ Row ${rowNumber}: ${error.message}`);
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Success: ${results.success.length}/${students.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${students.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(201).json({
      success: true,
      message: `Created ${results.success.length} students successfully`,
      data: {
        total: students.length,
        success: results.success.length,
        failed: results.failed.length,
        results,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create students",
      error: error.message,
    });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 UPDATE STUDENT REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { id } = req.params;
    console.log(`📌 Student ID: ${id}`);
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    const {
      firstName,
      lastName,
      khmerName,
      englishName,
      gender,
      dateOfBirth,
      placeOfBirth,
      currentAddress,
      phoneNumber,
      email,
      classId,
      fatherName,
      motherName,
      parentPhone,
      parentOccupation,
      previousGrade,
      previousSchool,
      repeatingGrade,
      transferredFrom,
      grade9ExamSession,
      grade9ExamCenter,
      grade9ExamRoom,
      grade9ExamDesk,
      grade9PassStatus,
      grade12ExamSession,
      grade12ExamCenter,
      grade12ExamRoom,
      grade12ExamDesk,
      grade12PassStatus,
      grade12Track,
      remarks,
      photoUrl,
    } = req.body;

    // ✅ Build update data - FIXED: Handle empty strings properly
    const updateData: any = {};

    // ✅ Required fields
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || "";
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || "";
    if (khmerName !== undefined) updateData.khmerName = khmerName?.trim() || "";
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    // ✅ Optional fields - accept empty string as valid value
    if (englishName !== undefined) {
      updateData.englishName =
        englishName?.trim() === "" ? null : englishName?.trim();
    }
    if (email !== undefined) {
      updateData.email = email?.trim() === "" ? null : email?.trim();
    }
    if (placeOfBirth !== undefined) {
      updateData.placeOfBirth =
        placeOfBirth?.trim() === "" ? null : placeOfBirth?.trim();
    }
    if (currentAddress !== undefined) {
      updateData.currentAddress =
        currentAddress?.trim() === "" ? null : currentAddress?.trim();
    }
    if (phoneNumber !== undefined) {
      updateData.phoneNumber =
        phoneNumber?.trim() === "" ? null : phoneNumber?.trim();
    }
    if (classId !== undefined) {
      updateData.classId = classId?.trim() === "" ? null : classId?.trim();
    }

    // ✅ Parent Information
    if (fatherName !== undefined) {
      updateData.fatherName =
        fatherName?.trim() === "" ? null : fatherName?.trim();
    }
    if (motherName !== undefined) {
      updateData.motherName =
        motherName?.trim() === "" ? null : motherName?.trim();
    }
    if (parentPhone !== undefined) {
      updateData.parentPhone =
        parentPhone?.trim() === "" ? null : parentPhone?.trim();
    }
    if (parentOccupation !== undefined) {
      updateData.parentOccupation =
        parentOccupation?.trim() === "" ? null : parentOccupation?.trim();
    }

    // ✅ Academic History
    if (previousGrade !== undefined) {
      updateData.previousGrade =
        previousGrade?.trim() === "" ? null : previousGrade?.trim();
    }
    if (previousSchool !== undefined) {
      updateData.previousSchool =
        previousSchool?.trim() === "" ? null : previousSchool?.trim();
    }
    if (repeatingGrade !== undefined) {
      updateData.repeatingGrade =
        repeatingGrade?.trim() === "" ? null : repeatingGrade?.trim();
    }
    if (transferredFrom !== undefined) {
      updateData.transferredFrom =
        transferredFrom?.trim() === "" ? null : transferredFrom?.trim();
    }

    // ✅ Grade 9 Exam
    if (grade9ExamSession !== undefined) {
      updateData.grade9ExamSession =
        grade9ExamSession?.trim() === "" ? null : grade9ExamSession?.trim();
    }
    if (grade9ExamCenter !== undefined) {
      updateData.grade9ExamCenter =
        grade9ExamCenter?.trim() === "" ? null : grade9ExamCenter?.trim();
    }
    if (grade9ExamRoom !== undefined) {
      updateData.grade9ExamRoom =
        grade9ExamRoom?.trim() === "" ? null : grade9ExamRoom?.trim();
    }
    if (grade9ExamDesk !== undefined) {
      updateData.grade9ExamDesk =
        grade9ExamDesk?.trim() === "" ? null : grade9ExamDesk?.trim();
    }
    if (grade9PassStatus !== undefined) {
      updateData.grade9PassStatus =
        grade9PassStatus?.trim() === "" ? null : grade9PassStatus?.trim();
    }

    // ✅ Grade 12 Exam
    if (grade12ExamSession !== undefined) {
      updateData.grade12ExamSession =
        grade12ExamSession?.trim() === "" ? null : grade12ExamSession?.trim();
    }
    if (grade12ExamCenter !== undefined) {
      updateData.grade12ExamCenter =
        grade12ExamCenter?.trim() === "" ? null : grade12ExamCenter?.trim();
    }
    if (grade12ExamRoom !== undefined) {
      updateData.grade12ExamRoom =
        grade12ExamRoom?.trim() === "" ? null : grade12ExamRoom?.trim();
    }
    if (grade12ExamDesk !== undefined) {
      updateData.grade12ExamDesk =
        grade12ExamDesk?.trim() === "" ? null : grade12ExamDesk?.trim();
    }
    if (grade12PassStatus !== undefined) {
      updateData.grade12PassStatus =
        grade12PassStatus?.trim() === "" ? null : grade12PassStatus?.trim();
    }
    if (grade12Track !== undefined) {
      updateData.grade12Track =
        grade12Track?.trim() === "" ? null : grade12Track?.trim();
    }

    // ✅ General
    if (remarks !== undefined) {
      updateData.remarks = remarks?.trim() === "" ? null : remarks?.trim();
    }
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl?.trim() === "" ? null : photoUrl?.trim();
    }

    console.log(
      "💾 Update data to be saved:",
      JSON.stringify(updateData, null, 2)
    );

    // ✅ Perform the update
    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
      },
    });

    console.log("✅ Student updated successfully in database!");
    console.log("📊 Updated student:", JSON.stringify(student, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      success: true,
      data: student,
      message: "Student updated successfully",
    });
  } catch (error: any) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ UPDATE STUDENT ERROR:");
    console.error(error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.student.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "លុបសិស្សបានជោគជ័យ (Student deleted successfully)",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "មានបញ្ហាក្នុងការលុបសិស្ស (Error deleting student)",
      error: error.message,
    });
  }
};
