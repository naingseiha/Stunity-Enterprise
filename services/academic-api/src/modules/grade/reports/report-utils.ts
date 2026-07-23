import type { PrismaClient } from '@prisma/client';

export function parseAcademicStartYearName(name?: string | null) {
  if (!name) return null;
  const match = name.match(/^(\d{4})/);
  if (!match) return null;

  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
}

export async function resolveReportAcademicStartYear(
  prisma: PrismaClient,
  schoolId: string | null,
  requestedYear?: string | number | null
) {
  const parsedYear = Number(requestedYear);
  if (Number.isInteger(parsedYear)) return parsedYear;

  if (schoolId) {
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true,
      },
      orderBy: [{ startDate: 'desc' }, { name: 'desc' }],
    });

    const nameStartYear = parseAcademicStartYearName(currentAcademicYear?.name);
    if (nameStartYear) return nameStartYear;
    if (currentAcademicYear?.startDate) return currentAcademicYear.startDate.getUTCFullYear();
  }

  return new Date().getFullYear();
}
