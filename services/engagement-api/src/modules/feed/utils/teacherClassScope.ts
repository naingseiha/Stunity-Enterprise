import { PrismaClient } from '@prisma/client';

export interface TeacherClassOption {
  id: string;
  name: string;
}

export async function resolveTeacherClassScope(
  prisma: PrismaClient,
  userId: string,
  classId?: string | null,
): Promise<{
  classes: TeacherClassOption[];
  studentUserIds: Set<string> | null;
  activeClassId: string | null;
}> {
  const teacher = await prisma.teacher.findFirst({
    where: { user: { id: userId } },
    include: {
      teacherClasses: {
        include: {
          class: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!teacher) {
    return { classes: [], studentUserIds: null, activeClassId: null };
  }

  const classes: TeacherClassOption[] = teacher.teacherClasses.map((row) => ({
    id: row.class.id,
    name: row.class.name,
  }));

  if (!classId) {
    return { classes, studentUserIds: null, activeClassId: null };
  }

  const allowed = teacher.teacherClasses.some((row) => row.classId === classId);
  if (!allowed) {
    const error = new Error('You do not teach this class');
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const students = await prisma.student.findMany({
    where: {
      OR: [{ classId }, { studentClasses: { some: { classId } } }],
      user: { isNot: null },
    },
    select: {
      user: { select: { id: true } },
    },
  });

  const studentUserIds = new Set(
    students.map((row) => row.user?.id).filter((id): id is string => Boolean(id)),
  );

  return { classes, studentUserIds, activeClassId: classId };
}
