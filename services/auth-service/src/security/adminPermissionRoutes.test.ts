import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { Server } from 'node:http';

import { createAdminPermissionRouter } from './adminPermissionRoutes';
import { PERMISSIONS, buildPermissionDocument } from '../../../lib/admin-permissions';

type Actor = { id: string; role: string; schoolId: string | null; permissions?: unknown };

function createPrisma(target: any) {
  const writes: any[] = [];
  const audits: any[] = [];
  const tx = {
    user: {
      update: async (args: any) => {
        writes.push(args);
        return args;
      },
    },
    platformAuditLog: {
      create: async (args: any) => {
        audits.push(args);
        return args;
      },
    },
  };
  return {
    prisma: {
      user: { findUnique: async () => target },
      $transaction: async (callback: any) => callback(tx),
    } as any,
    writes,
    audits,
  };
}

async function start(actor: Actor, target: any) {
  const store = createPrisma(target);
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = actor;
    next();
  });
  app.use('/admin', createAdminPermissionRouter(store.prisma));
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server failed to bind');
  return { ...store, server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

test('explicitly restricted administrators cannot enumerate permissions', async () => {
  const actor = {
    id: 'admin-a',
    role: 'ADMIN',
    schoolId: 'school-a',
    permissions: buildPermissionDocument([PERMISSIONS.VIEW_DASHBOARD]),
  };
  const runtime = await start(actor, null);
  try {
    const response = await fetch(`${runtime.baseUrl}/admin/permissions/available`);
    assert.equal(response.status, 403);
  } finally {
    await close(runtime.server);
  }
});

test('school A permission administrators cannot inspect school B administrators', async () => {
  const actor = {
    id: 'admin-a',
    role: 'ADMIN',
    schoolId: 'school-a',
    permissions: buildPermissionDocument([PERMISSIONS.MANAGE_ADMINS]),
  };
  const target = { id: 'admin-b', firstName: 'B', lastName: 'Admin', role: 'ADMIN', schoolId: 'school-b', permissions: null };
  const runtime = await start(actor, target);
  try {
    const response = await fetch(`${runtime.baseUrl}/admin/admins/admin-b/permissions`);
    assert.equal(response.status, 403);
  } finally {
    await close(runtime.server);
  }
});

test('same-school permission updates are versioned, audited and invalidate access sessions', async () => {
  const actor = { id: 'admin-a', role: 'ADMIN', schoolId: 'school-a' };
  const target = { id: 'admin-b', role: 'ADMIN', schoolId: 'school-a', permissions: null };
  const runtime = await start(actor, target);
  try {
    const response = await fetch(`${runtime.baseUrl}/admin/admins/admin-b/permissions`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissions: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_REPORTS] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(runtime.writes[0].data.permissions, {
      rbacVersion: 1,
      grants: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_REPORTS],
    });
    assert.deepEqual(runtime.writes[0].data.schoolAccessVersion, { increment: 1 });
    assert.equal(runtime.audits[0].data.action, 'ADMIN_PERMISSIONS_UPDATED');
  } finally {
    await close(runtime.server);
  }
});

test('permission updates reject self-modification and unknown grants', async () => {
  const actor = { id: 'admin-a', role: 'ADMIN', schoolId: 'school-a' };
  const target = { id: 'admin-b', role: 'ADMIN', schoolId: 'school-a', permissions: null };
  const runtime = await start(actor, target);
  try {
    const selfResponse = await fetch(`${runtime.baseUrl}/admin/admins/admin-a/permissions`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissions: [PERMISSIONS.VIEW_DASHBOARD] }),
    });
    assert.equal(selfResponse.status, 409);

    const unknownResponse = await fetch(`${runtime.baseUrl}/admin/admins/admin-b/permissions`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissions: ['UNKNOWN_PERMISSION'] }),
    });
    assert.equal(unknownResponse.status, 400);
    assert.equal(runtime.writes.length, 0);
  } finally {
    await close(runtime.server);
  }
});
