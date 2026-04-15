import { Request, Response } from 'express';
import { prisma } from '../context';
import { CertificateService } from '../services/certificate.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class LessonController {
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
      const { courseId } = req.params;
      const userId = req.user?.id;

      const lessons = await prisma.lesson.findMany({
        where: { courseId, isPublished: true },
        orderBy: { order: 'asc' },
        include: { resources: true },
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
        lessons: lessons.map(lesson => ({
          ...lesson,
          videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
          isCompleted: progress[lesson.id] || false,
          isLocked: !isEnrolled && !lesson.isFree,
        })),
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
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;
      
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          resources: true,
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
        lesson: {
          ...lesson,
          videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
          isCompleted: progress?.completed || false,
          watchTime: progress?.watchTime || 0,
          isLocked: !isEnrolled && !lesson.isFree,
          assignmentSubmission,
        },
      });

    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lesson', error: error.message });
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

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          completed: completed ?? undefined,
          watchTime: watchTime ?? undefined,
          completedAt: completed ? new Date() : undefined,
        },
        create: {
          userId,
          lessonId,
          completed: completed || false,
          watchTime: watchTime || 0,
          completedAt: completed ? new Date() : undefined,
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
