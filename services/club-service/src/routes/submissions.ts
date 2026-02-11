import { Router } from 'express';
import {
  submitAssignment,
  getAssignmentSubmissions,
  getMemberSubmissions,
  getSubmissionById,
  gradeSubmission,
  deleteSubmission
} from '../controllers/submissionController';

const router = Router();

// Submission routes
router.post('/assignments/:assignmentId/submit', submitAssignment);
router.get('/assignments/:assignmentId/submissions', getAssignmentSubmissions);
router.get('/clubs/:clubId/members/:memberId/submissions', getMemberSubmissions);
router.get('/submissions/:id', getSubmissionById);
router.put('/submissions/:id/grade', gradeSubmission);
router.delete('/submissions/:id', deleteSubmission);

export default router;
