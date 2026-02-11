import { Router } from 'express';
import {
  markAttendance,
  getSessionAttendance,
  getMemberAttendanceSummary,
  updateAttendance,
  deleteAttendance,
  getAttendanceStatistics
} from '../controllers/attendanceController';

const router = Router();

// Attendance routes (session-based)
router.post('/sessions/:sessionId/attendance', markAttendance);
router.get('/sessions/:sessionId/attendance', getSessionAttendance);
router.get('/clubs/:clubId/attendance/members/:memberId/summary', getMemberAttendanceSummary);
router.get('/clubs/:clubId/attendance/statistics', getAttendanceStatistics);
router.put('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

export default router;
