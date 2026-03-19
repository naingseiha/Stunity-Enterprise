import { Router, Request, Response } from 'express';
import { prisma, prismaRead } from './context';

const router = Router();

// ============================================
// AUTH MIDDLEWARE
// ============================================

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId?: string;
  };
}

// ============================================
// COURSE ENDPOINTS
// ============================================

/**
 * GET /courses - List all published courses
 * Query params: category, level, search, featured, page, limit
 */
router.get('/', async (req: AuthRequest, res: Response) => {
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

    // Transform response
    const transformedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
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
});

/**
 * GET /courses/my-courses - Get user's enrolled courses
 */
router.get('/my-courses', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
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
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    });

    const courses = enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      category: enrollment.course.category,
      level: enrollment.course.level,
      duration: enrollment.course.duration,
      lessonsCount: enrollment.course._count.lessons,
      enrolledCount: enrollment.course.enrolledCount,
      rating: enrollment.course.rating,
      price: enrollment.course.price,
      isFree: enrollment.course.isFree,
      instructor: {
        id: enrollment.course.instructor.id,
        name: `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`,
        avatar: enrollment.course.instructor.profilePictureUrl,
        title: enrollment.course.instructor.professionalTitle,
      },
      // Enrollment data
      progress: enrollment.progress,
      completedLessons: 0, // Will be calculated
      enrolledAt: enrollment.enrolledAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      completedAt: enrollment.completedAt,
    }));

    // Fix N+1: get completed lesson counts for ALL courses in a single query
    if (courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      const allProgress = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lesson: { courseId: { in: courseIds } },
          completed: true,
        },
        select: { lesson: { select: { courseId: true } } },
      });
      const completedMap = new Map<string, number>();
      for (const p of allProgress) {
        const cId = p.lesson.courseId;
        completedMap.set(cId, (completedMap.get(cId) ?? 0) + 1);
      }
      for (const course of courses) {
        course.completedLessons = completedMap.get(course.id) ?? 0;
      }
    }

    res.json({ courses });
  } catch (error: any) {
    console.error('Error fetching my courses:', error);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

/**
 * GET /courses/my-created - Get courses created by the user
 */
router.get('/my-created', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        duration: course.duration,
        lessonsCount: course._count.lessons,
        enrolledCount: course._count.enrollments,
        rating: course.rating,
        price: course.price,
        isFree: course.isFree,
        isPublished: course.isPublished,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          avatar: course.instructor.profilePictureUrl,
          title: course.instructor.professionalTitle,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching created courses:', error);
    res.status(500).json({ message: 'Error fetching created courses', error: error.message });
  }
});

/**
 * GET /courses/learn-hub - Combined endpoint: courses + myCourses + myCreated + paths + stats
 * Replaces 5 separate mobile API calls with a single request.
 * All DB queries run in parallel server-side.
 */
router.get('/learn-hub', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let limit = parseInt((req.query.limit as string) || '30');
    let pathLimit = parseInt((req.query.pathLimit as string) || '20');
    
    // Safety fallback
    if (isNaN(limit) || limit < 1) limit = 30;
    if (isNaN(pathLimit) || pathLimit < 1) pathLimit = 20;

    // ── 1. Fire all independent queries in parallel ────────────────────────────
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
      // Public courses
      prismaRead.course.findMany({
        where: { isPublished: true },
        include: {
          instructor: {
            select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true },
          },
          _count: { select: { lessons: true, enrollments: true, reviews: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
      // Enrolled courses
      userId ? prismaRead.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: {
                select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true },
              },
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: 'desc' },
      }) : Promise.resolve([]),
      // Created courses
      userId ? prismaRead.course.findMany({
        where: { instructorId: userId },
        include: {
          instructor: {
            select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true },
          },
          _count: { select: { lessons: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }) : Promise.resolve([]),
      // Learning paths
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
      // User stats fields
      userId ? prismaRead.user.findUnique({
        where: { id: userId },
        select: { totalLearningHours: true, currentStreak: true, totalPoints: true, level: true },
      }) : Promise.resolve(null),
      // Enrollment counts
      userId ? prismaRead.enrollment.count({ where: { userId } }) : Promise.resolve(0),
      userId ? prismaRead.enrollment.count({ where: { userId, completedAt: { not: null } } }) : Promise.resolve(0),
      userId ? prismaRead.lessonProgress.count({ where: { userId, completed: true } }) : Promise.resolve(0),
    ]);

    // ── 2. Batch-resolve completedLessons for enrolled courses (one extra query) ─
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

    // ── 3. Batch-resolve path enrollments (one extra query) ───────────────────
    const enrolledPathSet = new Set<string>();
    if (userId && rawPaths.length > 0) {
      const pathIds = rawPaths.map(p => p.id);
      const pathEnrollments = await prismaRead.pathEnrollment.findMany({
        where: { userId, pathId: { in: pathIds } },
        select: { pathId: true },
      });
      for (const pe of pathEnrollments) enrolledPathSet.add(pe.pathId);
    }

    // ── 4. Transform and respond ───────────────────────────────────────────────
    const now = Date.now();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    const courses = rawCourses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
      duration: course.duration,
      lessonsCount: course._count.lessons,
      enrolledCount: course.enrolledCount,
      rating: course.rating,
      reviewsCount: course._count.reviews,
      price: course.price,
      isFree: course.isFree,
      isFeatured: course.isFeatured,
      isNew: new Date(course.createdAt).getTime() > now - twoWeeksMs,
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

    const myCourses = rawEnrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      thumbnail: enrollment.course.thumbnail,
      category: enrollment.course.category,
      level: enrollment.course.level,
      duration: enrollment.course.duration,
      lessonsCount: enrollment.course._count.lessons,
      enrolledCount: enrollment.course.enrolledCount,
      rating: enrollment.course.rating,
      price: enrollment.course.price,
      isFree: enrollment.course.isFree,
      instructor: {
        id: enrollment.course.instructor.id,
        name: `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`,
        avatar: enrollment.course.instructor.profilePictureUrl,
        title: enrollment.course.instructor.professionalTitle,
      },
      progress: enrollment.progress,
      completedLessons: completedMap.get(enrollment.courseId) ?? 0,
      enrolledAt: enrollment.enrolledAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      completedAt: enrollment.completedAt,
    }));

    const myCreated = rawCreated.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
      duration: course.duration,
      lessonsCount: course._count.lessons,
      enrolledCount: course._count.enrollments,
      rating: course.rating,
      price: course.price,
      isFree: course.isFree,
      isPublished: course.isPublished,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      instructor: {
        id: course.instructor.id,
        name: `${course.instructor.firstName} ${course.instructor.lastName}`,
        avatar: course.instructor.profilePictureUrl,
        title: course.instructor.professionalTitle,
      },
    }));

    const paths = rawPaths.map(path => ({
      id: path.id,
      title: path.title,
      description: path.description,
      thumbnail: path.thumbnail,
      level: path.level,
      isFeatured: path.isFeatured,
      totalDuration: path.totalDuration,
      coursesCount: path.coursesCount,
      enrolledCount: path.enrolledCount,
      isEnrolled: enrolledPathSet.has(path.id),
      courses: path.courses.map(pc => ({
        id: pc.course.id,
        title: pc.course.title,
        thumbnail: pc.course.thumbnail,
        duration: pc.course.duration,
        order: pc.order,
      })),
    }));

    const stats = {
      enrolledCourses: enrolledCount,
      completedCourses: completedCount,
      completedLessons: completedLessonsCount,
      hoursLearned: userRecord?.totalLearningHours ?? 0,
      currentStreak: userRecord?.currentStreak ?? 0,
      totalPoints: userRecord?.totalPoints ?? 0,
      level: userRecord?.level ?? 1,
    };

    res.json({ courses, myCourses, myCreated, paths, stats });
  } catch (error: any) {
    console.error('Error fetching learn hub:', error);
    res.status(500).json({ message: 'Error fetching learn hub data', error: error.message });
  }
});

/**
 * GET /courses/featured - Get featured courses
 */
router.get('/featured', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '6' } = req.query;

    const courses = await prisma.course.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        _count: {
          select: { lessons: true },
        },
      },
      orderBy: { enrolledCount: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        duration: course.duration,
        lessonsCount: course._count.lessons,
        enrolledCount: course.enrolledCount,
        rating: course.rating,
        isFree: course.isFree,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          avatar: course.instructor.profilePictureUrl,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching featured courses:', error);
    res.status(500).json({ message: 'Error fetching featured courses', error: error.message });
  }
});

/**
 * GET /courses/categories - Get all categories with counts
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.course.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      categories: categories.map(cat => ({
        name: cat.category,
        count: cat._count.id,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// ============================================
// LEARNING PATH ROUTES (must be before /:id to avoid conflicts)
// ============================================

/**
 * GET /learning-paths - Get all published learning paths
 */
router.get('/paths', async (req: AuthRequest, res: Response) => {
  try {
    const { featured, limit = '10' } = req.query;
    const userId = req.user?.id;

    const where: any = { isPublished: true };
    if (featured === 'true') where.isFeatured = true;

    const paths = await prisma.learningPath.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                duration: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }],
      take: parseInt(limit as string),
    });

    const enrolledPathSet = new Set<string>();
    if (userId && paths.length > 0) {
      const enrolledPaths = await prisma.pathEnrollment.findMany({
        where: {
          userId,
          pathId: { in: paths.map(path => path.id) },
        },
        select: { pathId: true },
      });

      for (const enrollment of enrolledPaths) {
        enrolledPathSet.add(enrollment.pathId);
      }
    }

    res.json({
      paths: paths.map(path => ({
        id: path.id,
        title: path.title,
        description: path.description,
        thumbnail: path.thumbnail,
        level: path.level,
        isFeatured: path.isFeatured,
        totalDuration: path.totalDuration,
        coursesCount: path.coursesCount,
        enrolledCount: path.enrolledCount,
        isEnrolled: enrolledPathSet.has(path.id),
        creator: {
          id: path.creator.id,
          name: `${path.creator.firstName} ${path.creator.lastName}`,
          avatar: path.creator.profilePictureUrl,
        },
        courses: path.courses.map(pc => ({
          id: pc.course.id,
          title: pc.course.title,
          thumbnail: pc.course.thumbnail,
          duration: pc.course.duration,
          order: pc.order,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching learning paths:', error);
    res.status(500).json({ message: 'Error fetching learning paths', error: error.message });
  }
});

/**
 * POST /learning-paths/:pathId/enroll - Enroll in a learning path
 */
router.post('/paths/:pathId/enroll', async (req: AuthRequest, res: Response) => {
  try {
    const { pathId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        courses: {
          include: { course: true },
        },
      },
    });

    if (!path || !path.isPublished) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    const publishCourseIds = path.courses
      .filter(pathCourse => pathCourse.course.isPublished)
      .map(pathCourse => pathCourse.courseId);

    const enrollmentResult = await prisma.$transaction(async (tx) => {
      const existingPathEnrollment = await tx.pathEnrollment.findUnique({
        where: { userId_pathId: { userId, pathId } },
      });

      let createdPathEnrollment = false;
      if (!existingPathEnrollment) {
        createdPathEnrollment = true;
        await tx.pathEnrollment.create({
          data: { userId, pathId },
        });

        await tx.learningPath.update({
          where: { id: pathId },
          data: { enrolledCount: { increment: 1 } },
        });
      }

      const existingCourseEnrollments = publishCourseIds.length > 0
        ? await tx.enrollment.findMany({
          where: {
            userId,
            courseId: { in: publishCourseIds },
          },
          select: { courseId: true },
        })
        : [];

      const existingCourseIdSet = new Set(existingCourseEnrollments.map(enrollment => enrollment.courseId));
      const newCourseIds = publishCourseIds.filter(courseId => !existingCourseIdSet.has(courseId));

      if (newCourseIds.length > 0) {
        await tx.enrollment.createMany({
          data: newCourseIds.map(courseId => ({ userId, courseId })),
          skipDuplicates: true,
        });

        await Promise.all(
          newCourseIds.map(courseId => tx.course.update({
            where: { id: courseId },
            data: { enrolledCount: { increment: 1 } },
          }))
        );
      }

      return {
        createdPathEnrollment,
        newCourseCount: newCourseIds.length,
        totalCourseCount: publishCourseIds.length,
      };
    });

    res.status(enrollmentResult.createdPathEnrollment ? 201 : 200).json({
      message: enrollmentResult.createdPathEnrollment
        ? 'Successfully enrolled in learning path'
        : 'Already enrolled in learning path',
      newlyEnrolledCourses: enrollmentResult.newCourseCount,
      alreadyEnrolledCourses: Math.max(0, enrollmentResult.totalCourseCount - enrollmentResult.newCourseCount),
      isEnrolled: true,
    });
  } catch (error: any) {
    console.error('Error enrolling in path:', error);
    res.status(500).json({ message: 'Error enrolling in path', error: error.message });
  }
});

/**
 * GET /courses/:id - Get course details with lessons
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            professionalTitle: true,
            bio: true,
          },
        },
        lessons: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            order: true,
            isFree: true,
            videoUrl: userId ? true : false, // Only show URL if authenticated
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
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    let enrollment: {
      id: string;
      userId: string;
      courseId: string;
      progress: number;
      enrolledAt: Date;
      lastAccessedAt: Date;
      completedAt: Date | null;
      certificateUrl: string | null;
    } | null = null;
    let lessonProgress: Record<string, boolean> = {};

    if (userId) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId: id },
        },
      });

      if (enrollment) {
        const progress = await prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { courseId: id },
          },
          select: {
            lessonId: true,
            completed: true,
          },
        });
        lessonProgress = Object.fromEntries(progress.map(p => [p.lessonId, p.completed]));
      }
    }

    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        duration: course.duration,
        lessonsCount: course._count.lessons,
        enrolledCount: course.enrolledCount,
        rating: course.rating,
        reviewsCount: course._count.reviews,
        price: course.price,
        isFree: course.isFree,
        isFeatured: course.isFeatured,
        tags: course.tags,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          avatar: course.instructor.profilePictureUrl,
          title: course.instructor.professionalTitle,
          bio: course.instructor.bio,
        },
        lessons: course.lessons.map(lesson => ({
          ...lesson,
          isCompleted: lessonProgress[lesson.id] || false,
          isLocked: !enrollment && !lesson.isFree,
        })),
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      isEnrolled: !!enrollment,
      enrollment: enrollment ? {
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt,
        lastAccessedAt: enrollment.lastAccessedAt,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Error fetching course', error: error.message });
  }
});

/**
 * POST /courses/:id/enroll - Enroll in a course
 */
router.post('/:id/enroll', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course || !course.isPublished) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: id },
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId: id,
      },
    });

    // Update enrolled count
    await prisma.course.update({
      where: { id },
      data: { enrolledCount: { increment: 1 } },
    });

    console.log(`✅ User ${userId} enrolled in course ${course.title}`);

    res.status(201).json({
      message: 'Successfully enrolled',
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt,
      },
    });
  } catch (error: any) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Error enrolling in course', error: error.message });
  }
});

/**
 * POST /courses/bulk - Create a course and all its lessons in one transaction
 */
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      title,
      description,
      category,
      level = 'BEGINNER',
      thumbnail,
      tags = [],
      lessons = [],
      publish = false,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Missing required fields (title, description, category)' });
    }

    // Use a transaction to ensure atomic creation
    const result = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          title,
          description,
          category,
          level,
          thumbnail: thumbnail || null,
          tags,
          instructorId: userId,
          isPublished: publish,
          lessons: {
            create: lessons.map((lesson: any, index: number) => ({
              title: lesson.title,
              description: lesson.description || '',
              duration: lesson.duration || 0,
              isFree: lesson.isFree || false,
              content: lesson.content || '',
              videoUrl: lesson.videoUrl || '',
              order: index + 1,
            })),
          },
        },
        include: {
          lessons: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true, profilePictureUrl: true },
          },
        },
      });
      return course;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in POST /courses/bulk:', error);
    res.status(500).json({ message: 'Internal server error during bulk course creation', error: error.message });
  }
});

/**
 * POST /courses - Create a new course (instructors only)
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Open Platform: Anyone can create courses
    const {
      title,
      description,
      thumbnail,
      category,
      level = 'BEGINNER',
      duration = 0,
      price = 0,
      isFree = true,
      tags = [],
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        thumbnail,
        category,
        level,
        duration,
        price,
        isFree: price === 0,
        tags,
        instructorId: userId,
        isPublished: false,
      },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`✅ Course created: ${course.title} by ${course.instructor.firstName}`);

    res.status(201).json({ course });
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

/**
 * PUT /courses/:id - Update a course
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check ownership
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized to edit this course' });
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: req.body,
    });

    res.json({ course: updatedCourse });
  } catch (error: any) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
});

/**
 * POST /courses/:id/publish - Publish a course
 */
router.post('/:id/publish', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const course = await prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true } } },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (course._count.lessons === 0) {
      return res.status(400).json({ message: 'Course must have at least one lesson' });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { isPublished: true },
    });

    res.json({ message: 'Course published', course: updated });
  } catch (error: any) {
    console.error('Error publishing course:', error);
    res.status(500).json({ message: 'Error publishing course', error: error.message });
  }
});

// ============================================
// LESSON ENDPOINTS
// ============================================

/**
 * GET /courses/:courseId/lessons - Get all lessons for a course
 */
router.get('/:courseId/lessons', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    const lessons = await prisma.lesson.findMany({
      where: { courseId, isPublished: true },
      orderBy: { order: 'asc' },
      include: {
        resources: true,
      },
    });

    // Check enrollment
    let isEnrolled = false;
    let progress: Record<string, boolean> = {};

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
    console.error('Error fetching lessons:', error);
    res.status(500).json({ message: 'Error fetching lessons', error: error.message });
  }
});

/**
 * GET /courses/:courseId/lessons/:lessonId - Get single lesson
 */
router.get('/:courseId/lessons/:lessonId', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user?.id;

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId },
      include: { resources: true },
    });

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check access
    let hasAccess = lesson.isFree;
    let progress: {
      id: string;
      userId: string;
      lessonId: string;
      completed: boolean;
      watchTime: number;
      completedAt: Date | null;
      updatedAt: Date;
    } | null = null;

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      hasAccess = hasAccess || !!enrollment;

      if (enrollment) {
        progress = await prisma.lessonProgress.findUnique({
          where: { userId_lessonId: { userId, lessonId } },
        });

        // Update last accessed
        await prisma.enrollment.update({
          where: { userId_courseId: { userId, courseId } },
          data: { lastAccessedAt: new Date() },
        });
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Enroll to access this lesson' });
    }

    res.json({
      lesson: {
        ...lesson,
        isCompleted: progress?.completed || false,
        watchTime: progress?.watchTime || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ message: 'Error fetching lesson', error: error.message });
  }
});

/**
 * POST /courses/:courseId/lessons/:lessonId/progress - Update lesson progress
 */
router.post('/:courseId/lessons/:lessonId/progress', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, lessonId } = req.params;
    const { completed, watchTime } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Update or create progress
    const progress = await prisma.lessonProgress.upsert({
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

    // Calculate and update course progress
    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({ where: { courseId, isPublished: true } }),
      prisma.lessonProgress.count({
        where: { userId, lesson: { courseId }, completed: true },
      }),
    ]);

    const courseProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progress: courseProgress,
        lastAccessedAt: new Date(),
        completedAt: courseProgress >= 100 ? new Date() : null,
      },
    });

    res.json({
      progress,
      courseProgress,
      completedLessons,
      totalLessons,
    });
  } catch (error: any) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Error updating progress', error: error.message });
  }
});

/**
 * POST /courses/:courseId/lessons - Add a lesson (instructor only)
 */
router.post('/:courseId/lessons', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    // Check ownership
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.instructorId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, content, videoUrl, duration, isFree } = req.body;

    // Get next order
    const lastLesson = await prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        description,
        content,
        videoUrl,
        duration: duration || 0,
        isFree: isFree || false,
        order: (lastLesson?.order || 0) + 1,
      },
    });

    // Update course lesson count and duration
    await prisma.course.update({
      where: { id: courseId },
      data: {
        lessonsCount: { increment: 1 },
        duration: { increment: Math.ceil((duration || 0) / 60) }, // Convert minutes to hours
      },
    });

    res.status(201).json({ lesson });
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
});

// ============================================
// STATS ENDPOINTS
// ============================================

/**
 * GET /courses/stats/my-learning - Get user's learning statistics
 */
router.get('/stats/my-learning', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [enrollments, completedCourses, completedLessons] = await Promise.all([
      prisma.enrollment.count({ where: { userId } }),
      prisma.enrollment.count({ where: { userId, completedAt: { not: null } } }),
      prisma.lessonProgress.count({ where: { userId, completed: true } }),
    ]);

    // Get user streak and hours from user model
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalLearningHours: true,
        currentStreak: true,
        totalPoints: true,
        level: true,
      },
    });

    res.json({
      enrolledCourses: enrollments,
      completedCourses,
      completedLessons,
      hoursLearned: user?.totalLearningHours || 0,
      currentStreak: user?.currentStreak || 0,
      totalPoints: user?.totalPoints || 0,
      level: user?.level || 1,
    });
  } catch (error: any) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

export default router;
