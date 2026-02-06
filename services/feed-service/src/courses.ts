import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

    // Get completed lessons count for each course
    for (const course of courses) {
      const completedCount = await prisma.lessonProgress.count({
        where: {
          userId,
          lesson: { courseId: course.id },
          completed: true,
        },
      });
      course.completedLessons = completedCount;
    }

    res.json({ courses });
  } catch (error: any) {
    console.error('Error fetching my courses:', error);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
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

    const where: any = {};
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

    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }

    // Enroll in path
    await prisma.pathEnrollment.upsert({
      where: { userId_pathId: { userId, pathId } },
      update: {},
      create: { userId, pathId },
    });

    // Enroll in all courses in the path
    for (const pathCourse of path.courses) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId, courseId: pathCourse.courseId } },
        update: {},
        create: { userId, courseId: pathCourse.courseId },
      });

      // Update enrolled count
      await prisma.course.update({
        where: { id: pathCourse.courseId },
        data: { enrolledCount: { increment: 1 } },
      });
    }

    // Update path enrolled count
    await prisma.learningPath.update({
      where: { id: pathId },
      data: { enrolledCount: { increment: 1 } },
    });

    res.status(201).json({ message: 'Successfully enrolled in learning path' });
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
 * POST /courses - Create a new course (instructors only)
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only teachers and admins can create courses
    if (!['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
      return res.status(403).json({ message: 'Only teachers can create courses' });
    }

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
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN') {
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
    if (course.instructorId !== userId && req.user?.role !== 'ADMIN') {
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
