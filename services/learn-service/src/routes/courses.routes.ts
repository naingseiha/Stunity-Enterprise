import { Router } from 'express';
import { CoursesController } from '../controllers/courses.controller';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { LessonController } from '../controllers/lesson.controller';
import { PathController } from '../controllers/path.controller';
import { SectionsController } from '../controllers/sections.controller';
import { ItemsController } from '../controllers/items.controller';
import { QAController } from '../controllers/qa.controller';
import { CertificateController } from '../controllers/certificate.controller';
import { ReviewController } from '../controllers/review.controller';

const router = Router();

// ─── Course Management ─────────────────────────────────────────────
router.get('/', CoursesController.listCourses as any);
router.get('/learn-hub', CoursesController.getLearnHub as any);
router.post('/', CoursesController.createCourse as any);
router.get('/stats/instructor', CoursesController.getInstructorStats as any);

// ─── Sections ──────────────────────────────────────────────────────
router.get('/:courseId/sections', SectionsController.listSections as any);
router.post('/:courseId/sections', SectionsController.createSection as any);
router.put('/sections/:id', SectionsController.updateSection as any);
router.delete('/sections/:id', SectionsController.deleteSection as any);

// ─── Items ─────────────────────────────────────────────────────────
router.post('/sections/:sectionId/items', ItemsController.createItem as any);
router.put('/items/:id', ItemsController.updateItem as any);
router.delete('/items/:id', ItemsController.deleteItem as any);

// ─── Enrollment ────────────────────────────────────────────────────
router.post('/:courseId/enroll', EnrollmentController.enroll as any);
router.post('/paths/:pathId/enroll', EnrollmentController.enrollPath as any);
router.get('/my-courses', EnrollmentController.getMyEnrolled as any);
router.get('/stats/my-learning', EnrollmentController.getMyLearningStats as any);
router.get('/my-created', EnrollmentController.getMyCreated as any);

// ─── Lessons & Progress (Legacy/Compatibility) ─────────────────────
router.get('/:courseId/lessons', LessonController.listLessons as any);
router.get('/:courseId/lessons/:lessonId', LessonController.getLessonDetail as any);
router.post('/:courseId/lessons/:lessonId/progress', LessonController.updateProgress as any);
router.post('/:courseId/lessons/:lessonId/assignment/submit', LessonController.submitAssignment as any);
router.get('/:courseId/lessons/:lessonId/submissions', LessonController.listSubmissions as any);
router.patch('/submissions/:submissionId/grade', LessonController.gradeSubmission as any);

// ─── Learning Paths ───────────────────────────────────────────────
router.get('/paths', PathController.listPaths as any);

// ─── Q&A ──────────────────────────────────────────────────────────
router.get('/:courseId/qa', QAController.listThreads as any);
router.post('/:courseId/qa', QAController.createThread as any);
router.get('/qa/:threadId', QAController.getThreadDetail as any);
router.post('/qa/:threadId/answers', QAController.postAnswer as any);

// ─── Certificate ──────────────────────────────────────────────────
router.get('/:courseId/certificate', CertificateController.getMyCertificate as any);

// ─── Reviews ──────────────────────────────────────────────────────
router.get('/:courseId/reviews', ReviewController.listReviews as any);
router.post('/:courseId/reviews', ReviewController.submitReview as any);

// ─── Course Detail (keep after static routes like /my-created) ────
router.get('/:id', CoursesController.getCourseDetail as any);

export default router;
