import { Request, Response } from 'express';
import { prisma, prismaRead } from '../context';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId?: string;
  };
}

export class CoursesController {
  /**
   * GET /courses - List all published courses
   */
  static async listCourses(req: AuthRequest, res: Response) {
    try {
      const {
        category,
        level,
        search,
        featured,
        page = '1',
        limit = '12',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {
        isPublished: true,
      };

      if (category && category !== 'All') {
        where.category = category as string;
      }

      if (level) {
        where.level = level as string;
      }

      if (featured === 'true') {
        where.isFeatured = true;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } },
        ];
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                professionalTitle: true,
              },
            },
            _count: {
              select: {
                lessons: true,
                enrollments: true,
                reviews: true,
              },
            },
          },
          orderBy: [
            { isFeatured: 'desc' },
            { enrolledCount: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take,
        }),
        prisma.course.count({ where }),
      ]);

      const transformedCourses = courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        status: course.status,
        duration: course.duration,
        lessonsCount: course._count.lessons,
        enrolledCount: course.enrolledCount,
        rating: course.rating,
        reviewsCount: course._count.reviews,
        price: course.price,
        isFree: course.isFree,
        isFeatured: course.isFeatured,
        isNew: new Date(course.createdAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        tags: course.tags,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          avatar: course.instructor.profilePictureUrl,
          title: course.instructor.professionalTitle,
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      }));

      res.json({
        courses: transformedCourses,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
  }

  /**
   * GET /courses/learn-hub - Aggregated data for mobile/web dashboard
   */
  static async getLearnHub(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      let limit = parseInt((req.query.limit as string) || '30');
      let pathLimit = parseInt((req.query.pathLimit as string) || '20');
      
      if (isNaN(limit) || limit < 1) limit = 30;
      if (isNaN(pathLimit) || pathLimit < 1) pathLimit = 20;

      const [
        rawCourses,
        rawEnrollments,
        rawCreated,
        rawPaths,
        userRecord,
        enrolledCount,
        completedCount,
        completedLessonsCount,
      ] = await Promise.all([
        prismaRead.course.findMany({
          where: { isPublished: true },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
            _count: { select: { lessons: true, enrollments: true, reviews: true } },
          },
          orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }, { createdAt: 'desc' }],
          take: limit,
        }),
        userId ? prismaRead.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
                _count: { select: { lessons: true } },
              },
            },
          },
          orderBy: { lastAccessedAt: 'desc' },
        }) : Promise.resolve([]),
        userId ? prismaRead.course.findMany({
          where: { instructorId: userId },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
            _count: { select: { lessons: true, enrollments: true } },
          },
          orderBy: { createdAt: 'desc' },
        }) : Promise.resolve([]),
        prismaRead.learningPath.findMany({
          where: { isPublished: true },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
            courses: {
              include: { course: { select: { id: true, title: true, thumbnail: true, duration: true } } },
              orderBy: { order: 'asc' },
            },
            _count: { select: { enrollments: true } },
          },
          orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }],
          take: pathLimit,
        }),
        userId ? prismaRead.user.findUnique({
          where: { id: userId },
          select: { totalLearningHours: true, currentStreak: true, totalPoints: true, level: true },
        }) : Promise.resolve(null),
        userId ? prismaRead.enrollment.count({ where: { userId } }) : Promise.resolve(0),
        userId ? prismaRead.enrollment.count({ where: { userId, completedAt: { not: null } } }) : Promise.resolve(0),
        userId ? prismaRead.lessonProgress.count({ where: { userId, completed: true } }) : Promise.resolve(0),
      ]);

      // Batch-resolve completedLessons for enrolled courses
      let completedMap = new Map<string, number>();
      if (userId && rawEnrollments.length > 0) {
        const courseIds = rawEnrollments.map(e => e.courseId);
        const allProgress = await prismaRead.lessonProgress.findMany({
          where: { userId, lesson: { courseId: { in: courseIds } }, completed: true },
          select: { lesson: { select: { courseId: true } } },
        });
        for (const p of allProgress) {
          const cId = p.lesson.courseId;
          completedMap.set(cId, (completedMap.get(cId) ?? 0) + 1);
        }
      }

      const enrolledPathSet = new Set<string>();
      if (userId && rawPaths.length > 0) {
        const pathIds = rawPaths.map(p => p.id);
        const pathEnrollments = await prismaRead.pathEnrollment.findMany({
          where: { userId, pathId: { in: pathIds } },
          select: { pathId: true },
        });
        for (const pe of pathEnrollments) enrolledPathSet.add(pe.pathId);
      }

      const now = Date.now();
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

      res.json({
        courses: rawCourses.map(course => ({
          ...course,
          lessonsCount: course._count.lessons,
          enrolledCount: course.enrolledCount,
          reviewsCount: course._count.reviews,
          isNew: new Date(course.createdAt).getTime() > now - twoWeeksMs,
          instructor: {
            ...course.instructor,
            name: `${course.instructor.firstName} ${course.instructor.lastName}`,
            avatar: course.instructor.profilePictureUrl,
          }
        })),
        myCourses: rawEnrollments.map(e => ({
          ...e.course,
          progress: e.progress,
          certificateUrl: e.certificateUrl,
          completedLessons: completedMap.get(e.courseId) ?? 0,
          instructor: {
            ...e.course.instructor,
            name: `${e.course.instructor.firstName} ${e.course.instructor.lastName}`,
          }
        })),
        myCreated: rawCreated.map(c => ({
          ...c,
          lessonsCount: c._count.lessons,
          enrolledCount: c._count.enrollments,
        })),
        paths: rawPaths.map(p => ({
          ...p,
          isEnrolled: enrolledPathSet.has(p.id),
        })),
        stats: {
          enrolledCourses: enrolledCount,
          completedCourses: completedCount,
          completedLessons: completedLessonsCount,
          hoursLearned: userRecord?.totalLearningHours ?? 0,
          currentStreak: userRecord?.currentStreak ?? 0,
          totalPoints: userRecord?.totalPoints ?? 0,
          level: userRecord?.level ?? 1,
        }
      });
    } catch (error: any) {
      console.error('Error fetching learn hub:', error);
      res.status(500).json({ message: 'Error fetching learn hub', error: error.message });
    }
  }

  /**
   * POST /courses - Create a new course
   */
  static async createCourse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const { title, description, category, level, thumbnail, tags, price, isFree } = req.body;

      const course = await prisma.course.create({
        data: {
          title,
          description,
          category,
          level,
          thumbnail,
          tags: tags || [],
          price: price || 0,
          isFree: isFree !== undefined ? isFree : true,
          instructorId: userId,
          status: 'DRAFT',
        },
      });

      res.status(201).json({ course });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating course', error: error.message });
    }
  }

  /**
   * POST /courses/bulk - Create course plus flat lessons in one request
   */
  static async bulkCreateCourse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const {
        title,
        description,
        category,
        level,
        thumbnail,
        tags,
        lessons = [],
        publish = false,
      } = req.body ?? {};

      const normalizedTitle = String(title ?? '').trim();
      const normalizedDescription = String(description ?? '').trim();
      const normalizedCategory = String(category ?? '').trim();

      if (!normalizedTitle || !normalizedDescription || !normalizedCategory) {
        return res.status(400).json({
          message: 'title, description, and category are required',
        });
      }

      const normalizedLessons = Array.isArray(lessons)
        ? lessons
            .map((lesson: any, index: number) => {
              const lessonTitle = String(lesson?.title ?? '').trim();
              if (!lessonTitle) return null;

              const videoUrl = String(lesson?.videoUrl ?? '').trim();
              const content = String(lesson?.content ?? '').trim();
              const descriptionValue = String(lesson?.description ?? '').trim();
              const duration = Number(lesson?.duration ?? 0);

              return {
                title: lessonTitle,
                description: descriptionValue || null,
                content: content || null,
                videoUrl: videoUrl || null,
                duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
                isFree: Boolean(lesson?.isFree),
                order: Number.isFinite(Number(lesson?.order))
                  ? Number(lesson.order)
                  : index,
                type: lesson?.type
                  ? String(lesson.type)
                  : (videoUrl ? 'VIDEO' : 'ARTICLE'),
              };
            })
            .filter(Boolean)
        : [];

      const totalDuration = normalizedLessons.reduce(
        (sum: number, lesson: any) => sum + Number(lesson.duration ?? 0),
        0
      );

      const course = await prisma.$transaction(async (tx) => {
        const createdCourse = await tx.course.create({
          data: {
            title: normalizedTitle,
            description: normalizedDescription,
            category: normalizedCategory,
            level,
            thumbnail: thumbnail ? String(thumbnail).trim() : undefined,
            tags: Array.isArray(tags)
              ? tags.map((tag) => String(tag).trim()).filter(Boolean)
              : [],
            instructorId: userId,
            status: publish ? 'PUBLISHED' : 'DRAFT',
            isPublished: Boolean(publish),
            isFree: true,
            duration: totalDuration,
            lessonsCount: normalizedLessons.length,
          },
        });

        if (normalizedLessons.length > 0) {
          await tx.lesson.createMany({
            data: normalizedLessons.map((lesson: any) => ({
              courseId: createdCourse.id,
              title: lesson.title,
              description: lesson.description,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              duration: lesson.duration,
              isFree: lesson.isFree,
              order: lesson.order,
              type: lesson.type,
              isPublished: true,
            })),
          });
        }

        return createdCourse;
      });

      res.status(201).json({
        id: course.id,
        course: { id: course.id },
      });
    } catch (error: any) {
      console.error('Error bulk creating course:', error);
      res.status(500).json({ message: 'Error bulk creating course', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/publish - Publish a draft course
   */
  static async publishCourse(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          instructorId: true,
          price: true,
        },
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const publishedLessons = await prisma.lesson.findMany({
        where: {
          courseId,
          isPublished: true,
        },
        select: {
          duration: true,
        },
      });

      if (publishedLessons.length === 0) {
        return res.status(400).json({
          message: 'Add at least one published lesson before publishing this course',
        });
      }

      const duration = publishedLessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          status: 'PUBLISHED',
          isPublished: true,
          isFree: (course.price || 0) <= 0,
          duration,
          lessonsCount: publishedLessons.length,
        },
      });

      res.json({
        success: true,
        course: updatedCourse,
      });
    } catch (error: any) {
      console.error('Error publishing course:', error);
      res.status(500).json({ message: 'Error publishing course', error: error.message });
    }
  }

  /**
   * GET /courses/:id - Course details
   */
  static async getCourseDetail(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const lessonListSelect = {
        id: true,
        title: true,
        description: true,
        duration: true,
        order: true,
        isFree: true,
        type: true,
        assignment: {
          select: {
            id: true,
            maxScore: true,
            passingScore: true,
            instructions: true,
          },
        },
      } as const;

      const course = await prismaRead.course.findUnique({
        where: { id },
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              bio: true,
              professionalTitle: true,
            },
          },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                select: lessonListSelect,
              },
            },
          },
          lessons: { // Backward compatibility for flat structure (lessons not in a section)
            where: { sectionId: null },
            orderBy: { order: 'asc' },
            select: lessonListSelect,
          },
          _count: {
            select: { enrollments: true, reviews: true },
          },
        },
      });

      if (!course) return res.status(404).json({ message: 'Course not found' });

      // Check enrollment and derive per-lesson completion state for the current learner.
      let enrollment = null;
      const completedLessonIds = new Set<string>();
      if (userId) {
        enrollment = await prismaRead.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId: id } },
        });

        if (enrollment) {
          const lessonProgress = await prismaRead.lessonProgress.findMany({
            where: {
              userId,
              lesson: { courseId: id },
              completed: true,
            },
            select: { lessonId: true },
          });
          for (const progress of lessonProgress) {
            completedLessonIds.add(progress.lessonId);
          }
        }
      }

      const isEnrolled = !!enrollment;
      const decorateLesson = (lesson: any) => ({
        ...lesson,
        isCompleted: completedLessonIds.has(lesson.id),
        isLocked: !isEnrolled && !lesson.isFree,
      });

      const decoratedSections = course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map(decorateLesson),
      }));
      const decoratedFlatLessons = course.lessons.map(decorateLesson);

      res.json({ 
        course: {
          ...course,
          sections: decoratedSections,
          lessons: decoratedFlatLessons,
          instructor: {
            ...course.instructor,
            name: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
            avatar: course.instructor.profilePictureUrl,
            title: course.instructor.professionalTitle,
          },
          lessonsCount: decoratedSections.reduce((acc, s) => acc + s.lessons.length, 0) + decoratedFlatLessons.length,
        }, 
        enrollment,
        isEnrolled
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching course detail', error: error.message });
    }
  }

  /**
   * GET /courses/instructor/stats - Instructor analytics
   */
  static async getInstructorStats(req: AuthRequest, res: Response) {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) return res.status(401).json({ message: 'Unauthorized' });

      // 1. Get all courses by this instructor
      const courses = await prisma.course.findMany({
        where: { instructorId },
        include: {
          enrollments: {
            select: { enrolledAt: true }
          },
          _count: {
            select: { enrollments: true, reviews: true }
          }
        }
      });

      // 2. Aggregate basics
      const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
      const totalRevenue = courses.reduce((acc, c) => acc + (c.price * c._count.enrollments), 0);
      const activeCourses = courses.filter(c => c.isPublished).length;
      
      // Calculate avg rating
      const totalRating = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
      const averageRating = courses.length > 0 ? totalRating / courses.length : 0;

      // 3. Performance data (Real monthly growth for visualization based on last 4 months)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const performance = [];
      
      for (let i = 3; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const name = targetDate.toLocaleString('default', { month: 'short' });
        
        // Find enrollments created in this month or earlier (cumulative)
        // Wait, for growth we want the net new students this month, or cumulative?
        // Let's do cumulative total up to the end of that month.
        const endOfMonth = new Date(currentYear, currentMonth - i + 1, 0);

        const enrollmentsUpToMonth = courses.reduce((acc, course) => {
          const enrollmentsCount = course.enrollments.filter(e => new Date(e.enrolledAt) <= endOfMonth).length;
          return acc + enrollmentsCount;
        }, 0);

        const revenueUpToMonth = courses.reduce((acc, course) => {
          const enrollmentsCount = course.enrollments.filter(e => new Date(e.enrolledAt) <= endOfMonth).length;
          return acc + (enrollmentsCount * course.price);
        }, 0);

        performance.push({
          name,
          students: enrollmentsUpToMonth,
          revenue: revenueUpToMonth
        });
      }

      // 4. Course breakdown
      const courseStats = courses.map(c => ({
        id: c.id,
        title: c.title,
        students: c._count.enrollments,
        revenue: c.price * c._count.enrollments,
        rating: c.rating,
      })).sort((a, b) => b.revenue - a.revenue);

      res.json({
        stats: {
          totalRevenue,
          totalStudents,
          activeCourses,
          averageRating
        },
        performance,
        courses: courseStats
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching instructor stats', error: error.message });
    }
  }
}
