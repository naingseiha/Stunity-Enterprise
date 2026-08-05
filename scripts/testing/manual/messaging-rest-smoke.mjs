#!/usr/bin/env node
/**
 * Live REST-first messaging smoke:
 * admin login → parents → conversation → send → unread → notification → mark-read authz
 *
 * Defaults to Stunity QA School (has parent-student links). Svaythom has students
 * but no StudentParent rows, so admin messaging directory is empty there.
 *
 * Usage:
 *   node scripts/testing/manual/messaging-rest-smoke.mjs
 *
 * Env:
 *   AUTH_URL=http://localhost:3001
 *   MESSAGING_URL=http://localhost:3011
 *   NOTIFICATION_URL=http://localhost:3013
 *   SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD
 *   SMOKE_PARENT_EMAIL / SMOKE_PARENT_PASSWORD
 */

import { PrismaClient } from '@prisma/client';

const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const MESSAGING_URL = process.env.MESSAGING_URL || 'http://localhost:3011';
const NOTIFICATION_URL = process.env.NOTIFICATION_URL || 'http://localhost:3013';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function parseSharedAdminCredentials() {
  if (process.env.SMOKE_ADMIN_EMAIL && process.env.SMOKE_ADMIN_PASSWORD) {
    return {
      email: process.env.SMOKE_ADMIN_EMAIL,
      password: process.env.SMOKE_ADMIN_PASSWORD,
    };
  }

  // Prefer QA school fixture (parent links exist).
  return {
    email: 'qa-admin-20260322064250@stunity.test',
    password: 'QaSchool2026!',
  };
}

function parseParentCredentials() {
  return {
    email: process.env.SMOKE_PARENT_EMAIL || 'qa-parent-20260322064250-7@stunity.test',
    password: process.env.SMOKE_PARENT_PASSWORD || 'ParentPass2026!',
  };
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(options.timeoutMs || 15000));
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function decodeJwtPayload(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

async function main() {
  const prisma = new PrismaClient();
  const { email, password } = parseSharedAdminCredentials();
  const marker = `smoke-${Date.now()}`;

  console.log('Messaging REST smoke');
  console.log(`Auth: ${AUTH_URL}`);
  console.log(`Messaging: ${MESSAGING_URL}`);
  console.log(`Notifications: ${NOTIFICATION_URL}`);
  console.log(`Admin: ${email}`);
  console.log('');

  try {
    for (const [name, url] of [
      ['auth health', `${AUTH_URL}/health`],
      ['messaging health', `${MESSAGING_URL}/health`],
      ['notification health', `${NOTIFICATION_URL}/health`],
    ]) {
      const health = await requestJson(url);
      if (health.ok) pass(name, `HTTP ${health.status}`);
      else fail(name, `HTTP ${health.status}`);
    }

    const login = await requestJson(`${AUTH_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!login.ok || !login.data?.success) {
      fail('admin login', JSON.stringify(login.data));
      throw new Error('Cannot continue without admin login');
    }

    const accessToken = login.data.data.tokens.accessToken;
    const payload = decodeJwtPayload(accessToken);
    const schoolId = payload.schoolId;
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    pass('admin login', `role=${payload.role} schoolId=${schoolId || 'missing'}`);

    const [conversationsRes, unreadRes, parentsRes] = await Promise.all([
      requestJson(`${MESSAGING_URL}/conversations`, { headers: authHeaders }),
      requestJson(`${MESSAGING_URL}/unread-count`, { headers: authHeaders }),
      requestJson(`${MESSAGING_URL}/parents`, { headers: authHeaders }),
    ]);

    if (conversationsRes.ok && conversationsRes.data?.success) {
      pass('GET /conversations', `${(conversationsRes.data.data || []).length} rows`);
    } else {
      fail('GET /conversations', JSON.stringify(conversationsRes.data));
    }

    if (unreadRes.ok && unreadRes.data?.success) {
      pass('GET /unread-count', `unread=${unreadRes.data.data?.unreadCount ?? 'n/a'}`);
    } else {
      fail('GET /unread-count', JSON.stringify(unreadRes.data));
    }

    if (parentsRes.ok && parentsRes.data?.success) {
      pass('GET /parents', `${(parentsRes.data.data || []).length} rows`);
    } else {
      fail('GET /parents', JSON.stringify(parentsRes.data));
      throw new Error('Cannot continue without parent directory');
    }

    const parents = parentsRes.data.data || [];
    const parentCreds = parseParentCredentials();
    const knownParentUser = await prisma.user.findFirst({
      where: {
        isActive: true,
        email: parentCreds.email,
        parentId: { not: null },
      },
      select: { id: true, email: true, phone: true, parentId: true },
    });

    const candidate =
      parents.find(
        (parent) =>
          parent.id === knownParentUser?.parentId && (parent.children || []).length > 0,
      ) || parents.find((parent) => (parent.children || []).length > 0);

    if (!candidate) {
      fail('select parent candidate', 'no parents with children');
      throw new Error('No messaging candidate');
    }

    const child = candidate.children[0];
    const createRes = await requestJson(`${MESSAGING_URL}/conversations`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        targetParentId: candidate.id,
        studentId: child.id,
      }),
    });

    if (!createRes.ok || !createRes.data?.success || !createRes.data?.data?.id) {
      fail('POST /conversations', JSON.stringify(createRes.data));
      throw new Error('Conversation create/reuse failed');
    }

    const conversation = createRes.data.data;
    pass(
      'POST /conversations',
      `id=${conversation.id} parent=${candidate.firstName} ${candidate.lastName}`,
    );

    const sendRes = await requestJson(
      `${MESSAGING_URL}/conversations/${conversation.id}/messages`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content: `[QA] ${marker} hello from admin` }),
      },
    );

    if (!sendRes.ok || !sendRes.data?.success || !sendRes.data?.data?.id) {
      fail('POST /messages', JSON.stringify(sendRes.data));
      throw new Error('Send message failed');
    }

    const message = sendRes.data.data;
    pass('POST /messages', `id=${message.id}`);

    const listRes = await requestJson(
      `${MESSAGING_URL}/conversations/${conversation.id}/messages?page=1&limit=20`,
      { headers: authHeaders },
    );
    const listed = listRes.data?.data || [];
    if (listRes.ok && listed.some((row) => row.id === message.id)) {
      pass('GET /messages contains sent message');
    } else {
      fail('GET /messages contains sent message', JSON.stringify(listRes.data));
    }

    const emptyRes = await requestJson(
      `${MESSAGING_URL}/conversations/${conversation.id}/messages`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content: '   ' }),
      },
    );
    if (emptyRes.status === 400) pass('reject empty message', `HTTP ${emptyRes.status}`);
    else fail('reject empty message', `HTTP ${emptyRes.status}`);

    const oversizeRes = await requestJson(
      `${MESSAGING_URL}/conversations/${conversation.id}/messages`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content: 'x'.repeat(1001) }),
      },
    );
    if (oversizeRes.status === 400) pass('reject oversize message', `HTTP ${oversizeRes.status}`);
    else fail('reject oversize message', `HTTP ${oversizeRes.status}`);

    const parentUser =
      knownParentUser ||
      (await prisma.user.findFirst({
        where: { parentId: candidate.id, isActive: true },
        select: { id: true, email: true, phone: true, parentId: true },
      }));

    if (!parentUser) {
      pass('notification / parent round-trip skipped', 'no linked parent user');
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const notification = await prisma.notification.findFirst({
        where: {
          recipientId: parentUser.id,
          type: 'MESSAGE',
          link: `/messages/${conversation.id}`,
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, message: true, link: true, type: true },
      });

      if (notification) {
        pass(
          'MESSAGE notification created',
          `id=${notification.id} recipient=${parentUser.id}`,
        );
      } else {
        fail(
          'MESSAGE notification created',
          `no recent MESSAGE notification for parent user ${parentUser.id}`,
        );
      }

      const parentLogin = await requestJson(`${AUTH_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: parentUser.email || parentCreds.email,
          password: parentCreds.password,
        }),
      });

      let parentToken = null;
      if (parentLogin.ok && parentLogin.data?.data?.tokens?.accessToken) {
        parentToken = parentLogin.data.data.tokens.accessToken;
        const parentPayload = decodeJwtPayload(parentToken);
        if (parentPayload.parentId) {
          pass('parent login for authz check', `jwt.parentId=${parentPayload.parentId}`);
        } else {
          fail(
            'parent login for authz check',
            'access token missing parentId (expected on /auth/login JWT)',
          );
        }
      } else {
        fail('parent login for authz check', JSON.stringify(parentLogin.data));
      }

      if (parentToken) {
        const parentHeaders = {
          Authorization: `Bearer ${parentToken}`,
          'Content-Type': 'application/json',
        };

        const parentUnread = await requestJson(`${MESSAGING_URL}/unread-count`, {
          headers: parentHeaders,
        });
        if (parentUnread.ok && parentUnread.data?.success) {
          const unread = parentUnread.data.data?.unreadCount ?? 0;
          if (unread > 0) pass('parent unread-count', `unread=${unread}`);
          else fail('parent unread-count', `expected unread>0, got ${unread}`);
        } else {
          fail('parent unread-count', JSON.stringify(parentUnread.data));
        }

        const parentMessages = await requestJson(
          `${MESSAGING_URL}/conversations/${conversation.id}/messages?page=1&limit=5`,
          { headers: parentHeaders },
        );
        if (parentMessages.ok && parentMessages.data?.success) {
          pass('parent can read conversation messages');
        } else {
          fail('parent can read conversation messages', JSON.stringify(parentMessages.data));
        }

        const markReadRes = await requestJson(
          `${MESSAGING_URL}/messages/${message.id}/read`,
          { method: 'PUT', headers: parentHeaders },
        );
        if (markReadRes.ok && markReadRes.data?.success) {
          pass('parent mark-read received message');
        } else {
          fail('parent mark-read received message', JSON.stringify(markReadRes.data));
        }

        const idorRes = await requestJson(
          `${MESSAGING_URL}/messages/does-not-exist-${Date.now()}/read`,
          { method: 'PUT', headers: parentHeaders },
        );
        if (idorRes.status === 404 || idorRes.status === 403) {
          pass('mark-read rejects unknown message', `HTTP ${idorRes.status}`);
        } else {
          fail('mark-read rejects unknown message', `HTTP ${idorRes.status}`);
        }
      }
    }

    const markOwnOutgoing = await requestJson(`${MESSAGING_URL}/messages/${message.id}/read`, {
      method: 'PUT',
      headers: authHeaders,
    });
    if (markOwnOutgoing.status === 403) {
      pass('admin cannot mark own outgoing as received-read', `HTTP ${markOwnOutgoing.status}`);
    } else {
      fail(
        'admin cannot mark own outgoing as received-read',
        `HTTP ${markOwnOutgoing.status} body=${JSON.stringify(markOwnOutgoing.data)}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  const failed = results.filter((row) => !row.ok);
  const passed = results.filter((row) => row.ok);
  console.log(`Summary: ${passed.length} passed, ${failed.length} failed, ${results.length} total`);

  if (failed.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const row of failed) {
      console.log(`- ${row.name}: ${row.detail}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('');
  console.error('Smoke harness crashed');
  console.error(error.stack || error.message);
  process.exit(1);
});
