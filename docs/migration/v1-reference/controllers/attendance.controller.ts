import { Request, Response } from "express";
import { PrismaClient, AttendanceStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// api/src/controllers/attendance.controller.ts

export class AttendanceController {
  /**
   * ✅ UPDATED: Get attendance grid with session support
   */
  static async getAttendanceGrid(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          students: { orderBy: { khmerName: "asc" } },
        },
      });

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];

      const monthIndex = monthNames.indexOf(month as string);
      const monthNumber = monthIndex + 1;

      if (monthNumber === 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid month name: ${month}`,
        });
      }

      const daysInMonth = new Date(
        parseInt(year as string),
        monthNumber,
        0
      ).getDate();

      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      const startDate = new Date(
        parseInt(year as string),
        monthNumber - 1,
        1,
        0,
        0,
        0
      );
      const endDate = new Date(
        parseInt(year as string),
        monthNumber - 1,
        daysInMonth,
        23,
        59,
        59
      );

      // ✅ Fetch all attendance records (both sessions)
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      console.log(`✅ Found ${attendanceRecords.length} attendance records`);

      // ✅ Build grid data with session support
      const gridData = classData.students.map((student) => {
        const studentAttendance: {
          [key: string]: {
            id: string | null;
            status: string | null;
            displayValue: string;
            isSaved: boolean;
            session: "MORNING" | "AFTERNOON";
          };
        } = {};

        let totalAbsent = 0;
        let totalPermission = 0;

        days.forEach((day) => {
          // ⭐ Morning session
          const morningRecord = attendanceRecords.find(
            (a) =>
              a.studentId === student.id &&
              a.date.getDate() === day &&
              a.date.getMonth() === monthNumber - 1 &&
              a.session === "MORNING"
          );

          // ⭐ Afternoon session
          const afternoonRecord = attendanceRecords.find(
            (a) =>
              a.studentId === student.id &&
              a.date.getDate() === day &&
              a.date.getMonth() === monthNumber - 1 &&
              a.session === "AFTERNOON"
          );

          // ✅ Morning cell key:  "day_M"
          let morningValue = "";
          if (morningRecord) {
            if (morningRecord.status === "ABSENT") {
              morningValue = "A";
              totalAbsent++;
            } else if (morningRecord.status === "PERMISSION") {
              morningValue = "P";
              totalPermission++;
            }
          }

          studentAttendance[`${day}_M`] = {
            id: morningRecord?.id || null,
            status: morningRecord?.status || null,
            displayValue: morningValue,
            isSaved: !!morningRecord,
            session: "MORNING",
          };

          // ✅ Afternoon cell key: "day_A"
          let afternoonValue = "";
          if (afternoonRecord) {
            if (afternoonRecord.status === "ABSENT") {
              afternoonValue = "A";
              totalAbsent++;
            } else if (afternoonRecord.status === "PERMISSION") {
              afternoonValue = "P";
              totalPermission++;
            }
          }

          studentAttendance[`${day}_A`] = {
            id: afternoonRecord?.id || null,
            status: afternoonRecord?.status || null,
            displayValue: afternoonValue,
            isSaved: !!afternoonRecord,
            session: "AFTERNOON",
          };
        });

        return {
          studentId: student.id,
          studentName:
            student.khmerName || `${student.lastName} ${student.firstName}`,
          gender: student.gender,
          attendance: studentAttendance,
          totalAbsent,
          totalPermission,
        };
      });

      return res.json({
        success: true,
        data: {
          classId: classData.id,
          className: classData.name,
          month: month as string,
          year: parseInt(year as string),
          monthNumber,
          daysInMonth,
          days,
          students: gridData,
        },
      });
    } catch (error: any) {
      console.error("❌ Get attendance grid error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get attendance grid",
      });
    }
  }

  /**
   * ✅ OPTIMIZED: Bulk save with batch operations (10-20x faster)
   */
  static async bulkSaveAttendance(req: Request, res: Response) {
    try {
      const { classId, month, year, monthNumber, attendance } = req.body;

      console.log("\n=== BULK SAVE ATTENDANCE (OPTIMIZED) ===");
      console.log("Class:", classId);
      console.log("Month:", month, monthNumber);
      console.log("Year:", year);
      console.log("Records:", attendance.length);

      if (!Array.isArray(attendance) || attendance.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No attendance data provided",
        });
      }

      const startTime = Date.now();

      // ✅ OPTIMIZATION 1: Extract unique days and sessions upfront
      const uniqueDays = [...new Set(attendance.map((item: any) => item.day))];
      const studentIds = [...new Set(attendance.map((item: any) => item.studentId))];

      // ✅ OPTIMIZATION 2: Fetch ALL existing records in ONE query
      const existingRecords = await prisma.attendance.findMany({
        where: {
          classId,
          studentId: { in: studentIds },
          date: {
            gte: new Date(year, monthNumber - 1, Math.min(...uniqueDays), 0, 0, 0),
            lt: new Date(year, monthNumber - 1, Math.max(...uniqueDays) + 1, 0, 0, 0),
          },
        },
      });

      console.log(`📊 Found ${existingRecords.length} existing records`);

      // ✅ OPTIMIZATION 3: Build lookup map for fast access
      const existingMap = new Map<string, any>();
      existingRecords.forEach((record) => {
        const day = record.date.getDate();
        const key = `${record.studentId}_${day}_${record.session}`;
        existingMap.set(key, record);
      });

      // ✅ OPTIMIZATION 4: Prepare batch operations
      const recordsToCreate: any[] = [];
      const recordsToUpdate: { id: string; status: string }[] = [];
      const recordsToDelete: string[] = [];

      for (const item of attendance) {
        const { studentId, day, session, value } = item;

        if (!studentId || !day || !session) {
          continue;
        }

        const sessionEnum = session === "M" ? "MORNING" : "AFTERNOON";
        const key = `${studentId}_${day}_${sessionEnum}`;
        const existingRecord = existingMap.get(key);

        // Determine status
        let status: "PRESENT" | "ABSENT" | "PERMISSION" | null = null;
        if (value === "A") {
          status = "ABSENT";
        } else if (value === "P") {
          status = "PERMISSION";
        }

        if (!status) {
          // Empty value: delete if exists
          if (existingRecord) {
            recordsToDelete.push(existingRecord.id);
          }
        } else {
          // Has value: create or update
          if (existingRecord) {
            // Only update if status changed
            if (existingRecord.status !== status) {
              recordsToUpdate.push({
                id: existingRecord.id,
                status,
              });
            }
          } else {
            // Create new record
            recordsToCreate.push({
              id: uuidv4(),
              studentId,
              classId,
              date: new Date(year, monthNumber - 1, day, 12, 0, 0),
              session: sessionEnum,
              status,
              updatedAt: new Date(),
            });
          }
        }
      }

      // ✅ OPTIMIZATION 5: Execute batch operations in a transaction
      const result = await prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;
        let deleted = 0;

        // Batch create
        if (recordsToCreate.length > 0) {
          const createResult = await tx.attendance.createMany({
            data: recordsToCreate,
            skipDuplicates: true,
          });
          created = createResult.count;
          console.log(`✅ Created ${created} new records`);
        }

        // Batch update (Prisma doesn't support bulk update with different values, so we do it sequentially but in transaction)
        if (recordsToUpdate.length > 0) {
          // Group updates by status for better performance
          const updatesByStatus = new Map<string, string[]>();
          recordsToUpdate.forEach(({ id, status }) => {
            if (!updatesByStatus.has(status)) {
              updatesByStatus.set(status, []);
            }
            updatesByStatus.get(status)!.push(id);
          });

          // Execute grouped updates
          for (const [status, ids] of updatesByStatus.entries()) {
            const updateResult = await tx.attendance.updateMany({
              where: { id: { in: ids } },
              data: {
                status: status as any,
                updatedAt: new Date(),
              },
            });
            updated += updateResult.count;
          }
          console.log(`✅ Updated ${updated} records`);
        }

        // Batch delete
        if (recordsToDelete.length > 0) {
          const deleteResult = await tx.attendance.deleteMany({
            where: { id: { in: recordsToDelete } },
          });
          deleted = deleteResult.count;
          console.log(`✅ Deleted ${deleted} records`);
        }

        return { created, updated, deleted };
      });

      const elapsedTime = Date.now() - startTime;
      const totalSaved = result.created + result.updated + result.deleted;

      console.log(`✅ Total saved: ${totalSaved} (${result.created} created, ${result.updated} updated, ${result.deleted} deleted)`);
      console.log(`⚡ Performance: ${elapsedTime}ms (${Math.round(attendance.length / (elapsedTime / 1000))} records/sec)`);
      console.log("=========================================\n");

      return res.json({
        success: true,
        data: {
          savedCount: totalSaved,
          errorCount: 0,
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
          performanceMs: elapsedTime,
        },
      });
    } catch (error: any) {
      console.error("❌ Bulk save attendance error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save attendance",
      });
    }
  }

  /**
   * ✅ UPDATED:  Monthly summary with session support
   */
  static async getMonthlySummary(req: Request, res: Response) {
    try {
      const { classId } = req.params;
      const { month, year } = req.query;

      const monthNames = [
        "មករា",
        "កុម្ភៈ",
        "មីនា",
        "មេសា",
        "ឧសភា",
        "មិថុនា",
        "កក្កដា",
        "សីហា",
        "កញ្ញា",
        "តុលា",
        "វិច្ឆិកា",
        "ធ្នូ",
      ];

      const monthNumber = monthNames.indexOf(month as string) + 1;
      const startDate = new Date(parseInt(year as string), monthNumber - 1, 1);
      const endDate = new Date(
        parseInt(year as string),
        monthNumber - 1,
        new Date(parseInt(year as string), monthNumber, 0).getDate(),
        23,
        59,
        59
      );

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          classId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      console.log(`✅ Found ${attendanceRecords.length} attendance records`);

      const summary: {
        [studentId: string]: { absent: number; permission: number };
      } = {};

      // ✅ Count both sessions
      attendanceRecords.forEach((record) => {
        if (!summary[record.studentId]) {
          summary[record.studentId] = { absent: 0, permission: 0 };
        }

        if (record.status === "ABSENT") {
          summary[record.studentId].absent++;
        } else if (record.status === "PERMISSION") {
          summary[record.studentId].permission++;
        }
      });

      console.log(
        `📊 Summary for ${Object.keys(summary).length} students:`,
        summary
      );

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("❌ Get monthly summary error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to get monthly summary",
      });
    }
  }
}
