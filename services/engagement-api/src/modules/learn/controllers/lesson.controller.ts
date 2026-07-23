import { Request, Response } from 'express';
import { prisma } from '../context';
import { CertificateService } from '../services/certificate.service';
import { getRequestedLocale, resolveLocalizedText } from '../utils/localization';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

const resolveAssignmentText = <T extends { instructions: string; rubric?: string | null; instructionsTranslations?: unknown; rubricTranslations?: unknown }>(
  assignment: T,
  locale: string
) => ({
  ...assignment,
  instructions: resolveLocalizedText(assignment.instructions, assignment.instructionsTranslations, locale),
  rubric: resolveLocalizedText(assignment.rubric, assignment.rubricTranslations, locale) || null,
});

const resolveLessonText = <
  T extends {
    title: string;
    description?: string | null;
    content?: string | null;
    titleTranslations?: unknown;
    descriptionTranslations?: unknown;
    contentTranslations?: unknown;
    assignment?: {
      instructions: string;
      rubric?: string | null;
      instructionsTranslations?: unknown;
      rubricTranslations?: unknown;
    } | null;
  }
>(
  lesson: T,
  locale: string
) => ({
  ...lesson,
  title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
  description: resolveLocalizedText(lesson.description, lesson.descriptionTranslations, locale) || null,
  content: resolveLocalizedText(lesson.content, lesson.contentTranslations, locale) || null,
  assignment: lesson.assignment ? resolveAssignmentText(lesson.assignment, locale) : lesson.assignment,
});

export class LessonController {
  private static async getAccessibleLesson(courseId: string, lessonId: string, userId?: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
        isFree: true,
      },
    });

    if (!lesson || lesson.courseId !== courseId) {
      return { error: 'Lesson not found', status: 404 as const, lesson: null };
    }

    if (!userId) {
      return { error: 'Unauthorized', status: 401 as const, lesson: null };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { id: true },
    });

    if (!enrollment && !lesson.isFree) {
      return { error: 'Not enrolled', status: 403 as const, lesson: null };
    }

    return { lesson, enrollment, error: null, status: 200 as const };
  }

  private static async recalculateEnrollmentProgress(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      return {
        progress: 0,
        completedLessons: 0,
        totalLessons: 0,
        certificateIssued: false,
        certificateUrl: null as string | null,
      };
    }

    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({ where: { courseId, isPublished: true } }),
      prisma.lessonProgress.count({ where: { userId, lesson: { courseId }, completed: true } }),
    ]);

    const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progress,
        lastAccessedAt: new Date(),
        completedAt: progress >= 100 ? new Date() : null,
      },
    });

    let certificate = null;
    if (progress >= 100) {
      certificate = await CertificateService.issueCertificate(userId, courseId, enrollment.id);
    }

    return {
      progress,
      completedLessons,
      totalLessons,
      certificateIssued: !!certificate,
      certificateUrl: certificate ? `/verify/${certificate.verificationCode}` : null,
    };
  }

  /**
   * GET /courses/:courseId/lessons - List lessons for a course
   */
  static async listLessons(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const { courseId } = req.params;
      const userId = req.user?.id;

      const lessons = await (prisma.lesson as any).findMany({
        where: { courseId, isPublished: true },
        orderBy: { order: 'asc' },
        include: {
          resources: {
            orderBy: [
              { isDefault: 'desc' },
              { locale: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          textTracks: true,
        },
      });

      let progress: Record<string, boolean> = {};
      let isEnrolled = false;

      if (userId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        });
        isEnrolled = !!enrollment;

        if (isEnrolled) {
          const lessonProgress = await prisma.lessonProgress.findMany({
            where: { userId, lesson: { courseId } },
          });
          progress = Object.fromEntries(lessonProgress.map(p => [p.lessonId, p.completed]));
        }
      }

      res.json({
        lessons: lessons.map(lesson => resolveLessonText({
          ...lesson,
          videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
          isCompleted: progress[lesson.id] || false,
          isLocked: !isEnrolled && !lesson.isFree,
        }, locale)),
        isEnrolled,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lessons', error: error.message });
    }
  }

  /**
   * GET /courses/:courseId/lessons/:lessonId - Get lesson details
   */
  static async getLessonDetail(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;
      
      const lesson = await (prisma.lesson as any).findUnique({
        where: { id: lessonId },
        include: {
          resources: {
            orderBy: [
              { isDefault: 'desc' },
              { locale: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          textTracks: {
            orderBy: [
              { isDefault: 'desc' },
              { locale: 'asc' },
              { createdAt: 'asc' },
            ],
          },
          quiz: {
            include: {
              questions: {
                orderBy: { order: 'asc' },
                include: {
                  options: true
                }
              }
            }
          },
          assignment: true,
          exercise: true,
        }
      });

      if (!lesson || lesson.courseId !== courseId) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      let isEnrolled = false;
      let progress = null;
      let assignmentSubmission = null;

      if (userId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } }
        });
        isEnrolled = !!enrollment;

        if (isEnrolled) {
          progress = await prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId, lessonId } }
          });
          
          if (lesson.type === 'ASSIGNMENT' && lesson.assignment) {
            assignmentSubmission = await prisma.assignmentSubmission.findUnique({
              where: {
                assignmentId_userId: {
                  assignmentId: lesson.assignment.id,
                  userId: userId
                }
              }
            });
          }
        }
      }

      res.json({
        lesson: resolveLessonText({
          ...lesson,
          videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
          isCompleted: progress?.completed || false,
          watchTime: progress?.watchTime || 0,
          isLocked: !isEnrolled && !lesson.isFree,
          assignmentSubmission,
        }, locale),
      });

    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lesson', error: error.message });
    }
  }

  /**
   * GET /courses/:courseId/lessons/:lessonId/note - Get learner note for a lesson
   */
  static async getLessonNote(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;

      const access = await LessonController.getAccessibleLesson(courseId, lessonId, userId);
      if (access.error || !userId) {
        return res.status(access.status).json({ message: access.error });
      }

      const note = await prisma.courseNote.findUnique({
        where: {
          userId_lessonId: { userId, lessonId },
        },
        select: {
          id: true,
          content: true,
          timestamp: true,
          updatedAt: true,
        },
      });

      res.json({ note });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lesson note', error: error.message });
    }
  }

  /**
   * PUT /courses/:courseId/lessons/:lessonId/note - Create or update learner note for a lesson
   */
  static async upsertLessonNote(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const { content, timestamp } = req.body;
      const userId = req.user?.id;

      const access = await LessonController.getAccessibleLesson(courseId, lessonId, userId);
      if (access.error || !userId) {
        return res.status(access.status).json({ message: access.error });
      }

      const normalizedContent = typeof content === 'string' ? content.trim() : '';

      if (!normalizedContent) {
        await prisma.courseNote.deleteMany({
          where: { userId, lessonId },
        });

        return res.json({ note: null, deleted: true });
      }

      const note = await prisma.courseNote.upsert({
        where: {
          userId_lessonId: { userId, lessonId },
        },
        update: {
          content: normalizedContent,
          timestamp: Number.isFinite(Number(timestamp)) ? Number(timestamp) : null,
        },
        create: {
          userId,
          lessonId,
          content: normalizedContent,
          timestamp: Number.isFinite(Number(timestamp)) ? Number(timestamp) : null,
        },
        select: {
          id: true,
          content: true,
          timestamp: true,
          updatedAt: true,
        },
      });

      res.json({ note });
    } catch (error: any) {
      res.status(500).json({ message: 'Error saving lesson note', error: error.message });
    }
  }

  /**
   * GET /courses/:courseId/bookmarks - List learner bookmarks for a course
   */
  static async listCourseBookmarks(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const bookmarks = await prisma.lessonBookmark.findMany({
        where: {
          userId,
          lesson: {
            courseId,
            isPublished: true,
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          lessonId: true,
          createdAt: true,
        },
      });

      res.json({
        bookmarks,
        lessonIds: bookmarks.map((bookmark) => bookmark.lessonId),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lesson bookmarks', error: error.message });
    }
  }

  /**
   * PUT /courses/:courseId/lessons/:lessonId/bookmark - Create or remove learner bookmark for a lesson
   */
  static async setLessonBookmark(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;
      const bookmarked = req.body?.bookmarked !== false;

      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
          id: true,
          courseId: true,
        },
      });

      if (!lesson || lesson.courseId !== courseId) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      if (!bookmarked) {
        await prisma.lessonBookmark.deleteMany({
          where: { userId, lessonId },
        });

        return res.json({ bookmarked: false, lessonId });
      }

      const bookmark = await prisma.lessonBookmark.upsert({
        where: {
          userId_lessonId: { userId, lessonId },
        },
        update: {},
        create: {
          userId,
          lessonId,
        },
        select: {
          lessonId: true,
          createdAt: true,
        },
      });

      res.json({ bookmarked: true, bookmark });
    } catch (error: any) {
      res.status(500).json({ message: 'Error updating lesson bookmark', error: error.message });
    }
  }

  /**
   * GET /courses/bookmarked-lessons - List learner bookmarks across courses
   */
  static async listBookmarkedLessons(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      let limit = parseInt((req.query.limit as string) || '12', 10);
      if (Number.isNaN(limit) || limit < 1) limit = 12;
      limit = Math.min(limit, 48);

      const bookmarks = await prisma.lessonBookmark.findMany({
        where: {
          userId,
          lesson: {
            isPublished: true,
            course: {
              isPublished: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          createdAt: true,
          lesson: {
            select: {
              id: true,
              courseId: true,
              title: true,
              titleTranslations: true,
              duration: true,
              type: true,
              isFree: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  titleTranslations: true,
                  thumbnail: true,
                  category: true,
                  level: true,
                },
              },
            },
          },
        },
      });

      const courseIds = Array.from(new Set(bookmarks.map((bookmark) => bookmark.lesson.courseId)));
      const lessonIds = bookmarks.map((bookmark) => bookmark.lesson.id);

      const [enrollments, progress] = await Promise.all([
        courseIds.length
          ? prisma.enrollment.findMany({
              where: {
                userId,
                courseId: { in: courseIds },
              },
              select: { courseId: true },
            })
          : Promise.resolve([]),
        lessonIds.length
          ? prisma.lessonProgress.findMany({
              where: {
                userId,
                lessonId: { in: lessonIds },
              },
              select: {
                lessonId: true,
                completed: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));
      const completedLessonIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));

      res.json({
        lessons: bookmarks.map((bookmark) => {
          const lesson = bookmark.lesson;
          const course = lesson.course;
          const isEnrolled = enrolledCourseIds.has(lesson.courseId);

          return {
            lessonId: lesson.id,
            courseId: lesson.courseId,
            title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
            duration: lesson.duration,
            type: lesson.type,
            isFree: lesson.isFree,
            isCompleted: completedLessonIds.has(lesson.id),
            isEnrolled,
            isLocked: !isEnrolled && !lesson.isFree,
            bookmarkedAt: bookmark.createdAt,
            course: {
              id: course.id,
              title: resolveLocalizedText(course.title, course.titleTranslations, locale),
              thumbnail: course.thumbnail,
              category: course.category,
              level: course.level,
            },
          };
        }),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching bookmarked lessons', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/lessons/:lessonId/progress - Update progress
   */
  static async updateProgress(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const { completed, watchTime } = req.body;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Ensure enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

      const hasCompletedUpdate = typeof completed === 'boolean';
      const normalizedWatchTime = Number.isFinite(Number(watchTime)) ? Number(watchTime) : undefined;

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          completed: hasCompletedUpdate ? completed : undefined,
          watchTime: normalizedWatchTime,
          completedAt: completed === true ? new Date() : undefined,
          // Keep update timestamps fresh for resume/recently-opened signals.
          ...(hasCompletedUpdate || normalizedWatchTime !== undefined
            ? {}
            : { watchTime: { increment: 0 } }),
        },
        create: {
          userId,
          lessonId,
          completed: hasCompletedUpdate ? completed : false,
          watchTime: normalizedWatchTime ?? 0,
          completedAt: completed === true ? new Date() : undefined,
        },
      });

      const progressState = await LessonController.recalculateEnrollmentProgress(userId, courseId);
      res.json(progressState);
    } catch (error: any) {
      res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/lessons/:lessonId/assignment/submit - Submit assignment
   */
  static async submitAssignment(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const { submissionText, submissionUrl, fileUrl, fileName } = req.body;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Ensure enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

      // Ensure assignment exists
      const assignment = await prisma.courseAssignment.findUnique({
        where: { lessonId: lessonId }
      });
      if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

      const submission = await prisma.assignmentSubmission.upsert({
        where: {
          assignmentId_userId: {
            assignmentId: assignment.id,
            userId: userId
          }
        },
        update: {
          submissionText,
          submissionUrl,
          fileUrl,
          fileName,
          status: 'SUBMITTED',
          submittedAt: new Date()
        },
        create: {
          assignmentId: assignment.id,
          userId,
          courseId,
          lessonId,
          submissionText,
          submissionUrl,
          fileUrl,
          fileName,
          status: 'SUBMITTED'
        }
      });

      res.json({ success: true, submission });
    } catch (error: any) {
      res.status(500).json({ message: 'Error submitting assignment', error: error.message });
    }
  }

  /**
   * GET /courses/:courseId/lessons/:lessonId/submissions - List submissions for instructor
   */
  static async listSubmissions(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;

      // Verify instructor
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const submissions = await prisma.assignmentSubmission.findMany({
        where: { lessonId },
        orderBy: { submittedAt: 'desc' },
        include: {
          assignment: {
            select: {
              id: true,
              maxScore: true,
              passingScore: true,
            },
          },
        },
      });

      const submitterIds = Array.from(
        new Set(submissions.map(submission => String(submission.userId)))
      );
      const submitters = submitterIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: submitterIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePictureUrl: true,
            },
          })
        : [];
      const submitterMap = new Map(submitters.map(user => [user.id, user]));

      res.json({
        success: true,
        submissions: submissions.map(submission => ({
          ...submission,
          user: submitterMap.get(submission.userId) || null,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error listing submissions', error: error.message });
    }
  }

  /**
   * PATCH /submissions/:submissionId/grade - Grade a submission
   */
  static async gradeSubmission(req: AuthRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const { score, feedback } = req.body;
      const userId = req.user?.id;
      const numericScore = Number(score);

      if (!Number.isFinite(numericScore)) {
        return res.status(400).json({ message: 'Score must be a valid number' });
      }

      const submission = await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId },
        include: { assignment: true }
      });

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      const course = await prisma.course.findUnique({
        where: { id: submission.courseId },
        select: { instructorId: true },
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const updated = await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score: Math.round(numericScore),
          feedback,
          status: 'GRADED',
          gradedAt: new Date(),
          gradedBy: userId,
        },
        include: {
          assignment: {
            select: {
              id: true,
              maxScore: true,
              passingScore: true,
            },
          },
        },
      });

      // If passed, mark lesson as complete for the student
      const passingScore = submission.assignment.passingScore || 80;
      if (numericScore >= passingScore) {
        await prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: submission.userId, lessonId: submission.lessonId } },
          update: { completed: true, completedAt: new Date() },
          create: { userId: submission.userId, lessonId: submission.lessonId, completed: true, completedAt: new Date() }
        });
      }

      const progressState = await LessonController.recalculateEnrollmentProgress(submission.userId, submission.courseId);
      const submitter = await prisma.user.findUnique({
        where: { id: updated.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profilePictureUrl: true,
        },
      });

      res.json({
        success: true,
        submission: {
          ...updated,
          user: submitter,
        },
        progress: progressState,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error grading submission', error: error.message });
    }
  }
}
