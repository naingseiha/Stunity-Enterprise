import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  buildPermissionDocument,
  canManageSchoolResource,
  hasPermission,
  isExplicitPermissionDocument,
  resolvePermissions,
  sanitizePermissionGrants,
} from '../../../../../lib/admin-permissions';

interface AdminPermissionRequest extends Request {
  user?: { id: string; role: string; schoolId: string | null; permissions?: unknown };
}

const ADMIN_ROLES = ['ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN'];

export function createAdminPermissionRouter(prisma: PrismaClient) {
  const router = Router();

  const requirePermissionAdministrator = (req: AdminPermissionRequest, res: Response): boolean => {
    if (hasPermission(req.user, PERMISSIONS.MANAGE_ADMINS)) return true;
    res.status(403).json({ success: false, error: 'Admin-management permission required' });
    return false;
  };

  router.get('/permissions/available', (req: AdminPermissionRequest, res: Response) => {
    if (!requirePermissionAdministrator(req, res)) return;
    res.json({ success: true, data: { rbacVersion: 1, permissions: ALL_PERMISSIONS } });
  });

  router.get('/admins/:adminId/permissions', async (req: AdminPermissionRequest, res: Response) => {
    if (!requirePermissionAdministrator(req, res)) return;
    const target = await prisma.user.findUnique({
      where: { id: req.params.adminId },
      select: { id: true, firstName: true, lastName: true, role: true, schoolId: true, permissions: true },
    });
    if (!target || !ADMIN_ROLES.includes(target.role)) {
      return res.status(404).json({ success: false, error: 'Administrator not found' });
    }
    if (req.user?.role !== 'SUPER_ADMIN' && !canManageSchoolResource(req.user, target.schoolId, PERMISSIONS.MANAGE_ADMINS)) {
      return res.status(403).json({ success: false, error: 'You can only manage administrators in your school' });
    }
    return res.json({
      success: true,
      data: {
        adminId: target.id,
        adminName: `${target.firstName} ${target.lastName}`.trim(),
        isSuperAdmin: target.role === 'SUPER_ADMIN',
        explicit: isExplicitPermissionDocument(target.permissions),
        permissions: resolvePermissions(target.role, target.permissions),
      },
    });
  });

  router.put('/admins/:adminId/permissions', async (req: AdminPermissionRequest, res: Response) => {
    if (!requirePermissionAdministrator(req, res)) return;
    if (!Array.isArray(req.body?.permissions)) {
      return res.status(400).json({ success: false, error: 'permissions must be an array' });
    }
    const grants = sanitizePermissionGrants(req.body.permissions);
    if (grants.length !== new Set(req.body.permissions).size) {
      return res.status(400).json({ success: false, error: 'Permission list contains unknown or invalid values' });
    }
    if (req.user?.id === req.params.adminId) {
      return res.status(409).json({ success: false, error: 'Administrators cannot change their own permission set' });
    }
    const target = await prisma.user.findUnique({
      where: { id: req.params.adminId },
      select: { id: true, role: true, schoolId: true, permissions: true },
    });
    if (!target || !ADMIN_ROLES.includes(target.role)) {
      return res.status(404).json({ success: false, error: 'Administrator not found' });
    }
    if (target.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, error: 'Super-admin permissions are platform-managed' });
    }
    if (req.user?.role !== 'SUPER_ADMIN' && !canManageSchoolResource(req.user, target.schoolId, PERMISSIONS.MANAGE_ADMINS)) {
      return res.status(403).json({ success: false, error: 'You can only manage administrators in your school' });
    }
    const document = buildPermissionDocument(grants);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: { permissions: document as any, schoolAccessVersion: { increment: 1 } },
      });
      await tx.platformAuditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'ADMIN_PERMISSIONS_UPDATED',
          resourceType: 'User',
          resourceId: target.id,
          ipAddress: req.ip,
          details: { before: target.permissions, after: document, schoolId: target.schoolId } as any,
        },
      });
    });
    return res.json({ success: true, data: { adminId: target.id, permissions: document.grants } });
  });

  return router;
}
