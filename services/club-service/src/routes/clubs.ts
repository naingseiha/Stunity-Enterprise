import { Router } from 'express';
import * as clubController from '../controllers/clubController';

const router = Router();

// Club CRUD
router.post('/', clubController.createClub);
router.get('/', clubController.getClubs);
router.get('/:id', clubController.getClubById);
router.put('/:id', clubController.updateClub);
router.delete('/:id', clubController.deleteClub);

// Membership
router.post('/:id/join', clubController.joinClub);
router.post('/:id/leave', clubController.leaveClub);
router.get('/:id/members', clubController.getClubMembers);
router.put('/:id/members/:userId/role', clubController.updateMemberRole);
router.delete('/:id/members/:userId', clubController.removeMember);

export default router;
