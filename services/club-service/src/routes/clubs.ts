import { NextFunction, Request, Response, Router } from 'express';
import * as clubController from '../controllers/clubController';

const router = Router();
const requireAuth = (req: Request & { user?: unknown }, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

// Club CRUD
router.post('/', requireAuth, clubController.createClub);
router.get('/', clubController.getClubs);
router.get('/invites/my', requireAuth, clubController.getMyInvites);
router.get('/:id', clubController.getClubById);
router.put('/:id', requireAuth, clubController.updateClub);
router.delete('/:id', requireAuth, clubController.deleteClub);

// Membership
router.post('/:id/join', requireAuth, clubController.joinClub);
router.post('/:id/request-join', requireAuth, clubController.requestJoinClub);
router.post('/:id/leave', requireAuth, clubController.leaveClub);
router.post('/:id/invite', requireAuth, clubController.inviteMember);
router.post('/:id/accept-invite', requireAuth, clubController.acceptInvite);
router.post('/:id/decline-invite', requireAuth, clubController.declineInvite);
router.get('/:id/members', requireAuth, clubController.getClubMembers);
router.get('/:id/join-requests', requireAuth, clubController.getClubJoinRequests);
router.post('/:id/join-requests/:userId/approve', requireAuth, clubController.approveJoinRequest);
router.delete('/:id/join-requests/:userId/reject', requireAuth, clubController.rejectJoinRequest);
router.put('/:id/members/:userId/role', requireAuth, clubController.updateMemberRole);
router.delete('/:id/members/:userId', requireAuth, clubController.removeMember);

export default router;
