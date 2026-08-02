import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";
import { endOfMonth, startOfMonth, parseISO, isValid } from "date-fns";

export function registerMonthlyEntryRoutes(
  app: Router,
  prisma: PrismaClient,
  authenticateToken: any,
) {
  // Helper to construct a local date safely avoiding timezone shifts
  const getLocalDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
  };

  // GET /attendance/monthly-entry/grid
  app.get(
    "/attendance/monthly-entry/grid",
    authenticateToken,
    async (req: any, res: Response) => {
      try {
        const { classId, year, monthNumber } = req.query;

        if (!classId || !year || !monthNumber) {
          return res
            .status(400)
            .json({ success: false, message: "Missing required parameters" });
        }

        const numYear = parseInt(String(year));
        const numMonth = parseInt(String(monthNumber));

        // Determine the academic year's start month dynamically
        const classInfo = await prisma.class.findUnique({
          where: { id: String(classId) },
          include: { academicYear: true }
        });
        const ayStartMonth = classInfo?.academicYear?.startDate ? classInfo.academicYear.startDate.getUTCMonth() + 1 : 11;
        const physicalYear = numMonth >= ayStartMonth ? numYear : numYear + 1;
        const monthStartStr = `${physicalYear}-${String(numMonth).padStart(2, "0")}-01T00:00:00.000Z`;
        const dateStart = new Date(monthStartStr);

        if (!isValid(dateStart)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid date constructed" });
        }

        const dateEnd = endOfMonth(dateStart);

        // Get students in this class
        const classRoster = await prisma.studentClass.findMany({
          where: {
            classId: String(classId),
            startedAt: { lte: dateEnd },
            OR: [{ endedAt: null }, { endedAt: { gt: dateStart } }],
          },
          include: {
            student: true,
          },
          orderBy: [
            { student: { firstName: "asc" } },
            { student: { lastName: "asc" } },
          ],
        });

        const studentIds = classRoster.map((r) => r.student.id);

        // Get existing daily attendance for this month from the central Attendance table
        const records = await prisma.attendance.findMany({
          where: {
            classId: String(classId),
            date: {
              gte: dateStart,
              lte: dateEnd,
            },
            studentId: { in: studentIds },
          },
        });

        // Map records by studentId -> { day: status }
        const recordMap = new Map<string, Record<number, string>>();
        records.forEach((r) => {
          if (!recordMap.has(r.studentId)) {
            recordMap.set(r.studentId, {});
          }
          // Extract local day number (1-31)
          const day = r.date.getUTCDate();
          // Since V1 migration defaults to 'MORNING' or might have multiple sessions,
          // we'll just take the first one or prioritize ABSENT over others if there's conflict.
          recordMap.get(r.studentId)![day] = r.status;
        });

        const grid = classRoster.map((r) => {
          return {
            studentId: r.student.id,
            studentCode: r.student.studentId,
            firstName: r.student.firstName,
            lastName: r.student.lastName,
            gender: r.student.gender,
            attendance: recordMap.get(r.student.id) || {},
          };
        });

        return res.json({ success: true, data: grid });
      } catch (error) {
        console.error("[GET /attendance/monthly-entry/grid] Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  // POST /attendance/monthly-entry/cell
  app.post(
    "/attendance/monthly-entry/cell",
    authenticateToken,
    async (req: any, res: Response) => {
      try {
        const { classId, year, monthNumber, studentId, day, status } = req.body;

        if (!classId || !year || !monthNumber || !studentId || !day) {
          return res
            .status(400)
            .json({ success: false, message: "Missing required parameters" });
        }

        const numYear = parseInt(String(year));
        const numMonth = parseInt(String(monthNumber));
        const numDay = parseInt(String(day));

        const classInfo = await prisma.class.findUnique({
          where: { id: String(classId) },
          include: { academicYear: true }
        });
        const ayStartMonth = classInfo?.academicYear?.startDate ? classInfo.academicYear.startDate.getUTCMonth() + 1 : 11;
        const physicalYear = numMonth >= ayStartMonth ? numYear : numYear + 1;
        const targetDateStr = getLocalDateString(
          physicalYear,
          numMonth,
          numDay,
        );
        const targetDate = new Date(targetDateStr);

        if (!isValid(targetDate)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid date" });
        }

        if (status) {
          // Upsert if status is provided in central Attendance table
          // We use MORNING session by default for daily grid bulk entries

          // Find existing record for this day
          const existing = await prisma.attendance.findFirst({
            where: {
              studentId,
              classId,
              date: targetDate,
              session: "MORNING",
            },
          });

          if (existing) {
            await prisma.attendance.update({
              where: { id: existing.id },
              data: { status },
            });
          } else {
            await prisma.attendance.create({
              data: {
                studentId,
                classId,
                date: targetDate,
                status,
                session: "MORNING",
              },
            });
          }
        } else {
          // Delete if status is null/empty
          await prisma.attendance.deleteMany({
            where: {
              studentId,
              classId,
              date: targetDate,
              session: "MORNING",
            },
          });
        }

        return res.json({
          success: true,
          message: "Cell updated successfully",
        });
      } catch (error) {
        console.error("[POST /attendance/monthly-entry/cell] Error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );
}
