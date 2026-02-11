import { Router } from 'express';
import {
  createGrade,
  getClubGrades,
  getStudentGradeSummary,
  updateGrade,
  deleteGrade,
  getGradeStatistics
} from '../controllers/gradeController';

const router = Router();

// Grade routes
router.post('/clubs/:clubId/grades', createGrade);
router.get('/clubs/:clubId/grades', getClubGrades);
router.get('/clubs/:clubId/grades/members/:memberId/summary', getStudentGradeSummary);
router.get('/clubs/:clubId/grades/statistics', getGradeStatistics);
router.put('/:id', updateGrade);
router.delete('/:id', deleteGrade);

export default router;
