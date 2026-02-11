import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  getAssignmentStatistics
} from '../controllers/assignmentController';

const router = Router();

// Assignment routes
router.post('/clubs/:clubId/assignments', createAssignment);
router.get('/clubs/:clubId/assignments', getAssignments);
router.get('/assignments/:id', getAssignmentById);
router.put('/assignments/:id', updateAssignment);
router.delete('/assignments/:id', deleteAssignment);
router.post('/assignments/:id/publish', publishAssignment);
router.get('/assignments/:id/statistics', getAssignmentStatistics);

export default router;
