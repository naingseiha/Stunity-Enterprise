import { Router } from 'express';
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  assignInstructor
} from '../controllers/subjectController';

const router = Router();

// Subject routes
router.post('/clubs/:clubId/subjects', createSubject);
router.get('/clubs/:clubId/subjects', getSubjects);
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);
router.put('/:id/instructor', assignInstructor);

export default router;
