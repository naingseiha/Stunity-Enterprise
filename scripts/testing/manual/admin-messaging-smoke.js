const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const ROOT = path.resolve(__dirname, '../../..');
const README_PATH = path.join(ROOT, 'README.md');
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';
const MESSAGING_URL = process.env.MESSAGING_URL || 'http://localhost:3011';
const LOGIN_JSON_PATH = process.env.LOGIN_JSON_PATH || '';
const CONVERSATIONS_JSON_PATH = process.env.CONVERSATIONS_JSON_PATH || '';
const UNREAD_JSON_PATH = process.env.UNREAD_JSON_PATH || '';
const PARENTS_JSON_PATH = process.env.PARENTS_JSON_PATH || '';

function parseSharedAdminCredentials() {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const emailMatch = readme.match(/- Email: `([^`]+)`/);
  const passwordMatch = readme.match(/- Password: `([^`]+)`/);

  if (!emailMatch || !passwordMatch) {
    throw new Error(`Could not parse shared admin credentials from ${README_PATH}`);
  }

  return {
    email: emailMatch[1],
    password: passwordMatch[1],
  };
}

function decodeJwtPayload(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

async function requestJson(url, options = {}) {
  const headers = options.headers || {};
  const args = ['-s', '-m', '10', '-w', 'STATUS:%{http_code}', url];

  if (options.method) {
    args.push('-X', options.method);
  }

  for (const [name, value] of Object.entries(headers)) {
    args.push('-H', `${name}: ${value}`);
  }

  if (options.body) {
    args.push('--data-binary', options.body);
  }

  const result = spawnSync('curl', args, {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `curl failed (${result.status}): ${result.stderr || result.stdout || 'no output'}`
    );
  }

  const raw = result.stdout || '';
  const marker = 'STATUS:';
  const markerIndex = raw.lastIndexOf(marker);
  const text = markerIndex >= 0 ? raw.slice(0, markerIndex) : raw;
  const statusText = markerIndex >= 0 ? raw.slice(markerIndex + marker.length).trim() : '';
  const status = Number(statusText);

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = { raw: text };
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    data,
  };
}

function readJsonFileIfPresent(filePath) {
  if (!filePath) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function resolveTeacherIdFromStudent(prisma, schoolId, studentId) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId,
    },
    select: {
      class: {
        select: {
          homeroomTeacherId: true,
          teacherClasses: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { teacherId: true },
          },
        },
      },
      studentClasses: {
        where: { status: 'ACTIVE' },
        orderBy: { enrolledAt: 'desc' },
        take: 1,
        select: {
          class: {
            select: {
              homeroomTeacherId: true,
              teacherClasses: {
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: { teacherId: true },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  return (
    student.class?.homeroomTeacherId ||
    student.class?.teacherClasses[0]?.teacherId ||
    student.studentClasses[0]?.class?.homeroomTeacherId ||
    student.studentClasses[0]?.class?.teacherClasses[0]?.teacherId ||
    null
  );
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const { email, password } = parseSharedAdminCredentials();

    console.log('Admin messaging smoke test');
    console.log(`Auth URL: ${AUTH_URL}`);
    console.log(`Messaging URL: ${MESSAGING_URL}`);
    console.log(`Email: ${email}`);

    const login = LOGIN_JSON_PATH
      ? { ok: true, status: 200, data: readJsonFileIfPresent(LOGIN_JSON_PATH) }
      : await requestJson(`${AUTH_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

    if (!login.ok || !login.data?.success) {
      throw new Error(`Login failed (${login.status}): ${JSON.stringify(login.data)}`);
    }

    const accessToken = login.data.data.tokens.accessToken;
    const payload = decodeJwtPayload(accessToken);
    const schoolId = payload.schoolId;

    console.log('');
    console.log('Login');
    console.log(`Role: ${payload.role}`);
    console.log(`schoolId: ${payload.schoolId || '(missing)'}`);
    console.log(`teacherId in JWT: ${payload.teacherId || '(missing)'}`);
    console.log(`parentId in JWT: ${payload.parentId || '(missing)'}`);

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    const conversationsRes = CONVERSATIONS_JSON_PATH
      ? { ok: true, status: 200, data: readJsonFileIfPresent(CONVERSATIONS_JSON_PATH) }
      : await requestJson(`${MESSAGING_URL}/conversations`, {
          headers: authHeaders,
        });
    const unreadRes = UNREAD_JSON_PATH
      ? { ok: true, status: 200, data: readJsonFileIfPresent(UNREAD_JSON_PATH) }
      : await requestJson(`${MESSAGING_URL}/unread-count`, {
          headers: authHeaders,
        });
    const parentsRes = PARENTS_JSON_PATH
      ? { ok: true, status: 200, data: readJsonFileIfPresent(PARENTS_JSON_PATH) }
      : await requestJson(`${MESSAGING_URL}/parents`, {
          headers: authHeaders,
        });

    console.log('');
    console.log('Endpoint checks');
    console.log(`GET /conversations -> ${conversationsRes.status}`);
    console.log(`GET /unread-count -> ${unreadRes.status}`);
    console.log(`GET /parents -> ${parentsRes.status}`);

    if (!conversationsRes.ok || !conversationsRes.data?.success) {
      throw new Error(`GET /conversations failed: ${JSON.stringify(conversationsRes.data)}`);
    }
    if (!unreadRes.ok || !unreadRes.data?.success) {
      throw new Error(`GET /unread-count failed: ${JSON.stringify(unreadRes.data)}`);
    }
    if (!parentsRes.ok || !parentsRes.data?.success) {
      throw new Error(`GET /parents failed: ${JSON.stringify(parentsRes.data)}`);
    }

    const conversations = conversationsRes.data.data || [];
    const parents = parentsRes.data.data || [];

    console.log('');
    console.log('Dataset');
    console.log(`Conversations visible to admin: ${conversations.length}`);
    console.log(`Parents available to admin: ${parents.length}`);
    console.log(`Unread count: ${unreadRes.data.data?.unreadCount ?? 'n/a'}`);

    let resolvableChildren = 0;
    let unresolvedChildren = 0;
    let firstResolvable = null;

    for (const parent of parents.slice(0, 100)) {
      for (const child of parent.children || []) {
        const resolvedTeacherId = await resolveTeacherIdFromStudent(prisma, schoolId, child.id);
        if (resolvedTeacherId) {
          resolvableChildren += 1;
          if (!firstResolvable) {
            firstResolvable = {
              parentId: parent.id,
              parentName: `${parent.firstName} ${parent.lastName}`,
              studentId: child.id,
              studentName: `${child.firstName} ${child.lastName}`,
              resolvedTeacherId,
            };
          }
        } else {
          unresolvedChildren += 1;
        }
      }
    }

    console.log('');
    console.log('Teacher resolution');
    console.log(`Resolvable children checked: ${resolvableChildren}`);
    console.log(`Unresolved children checked: ${unresolvedChildren}`);

    if (firstResolvable) {
      console.log(
        `First resolvable child: ${firstResolvable.studentName} -> teacher ${firstResolvable.resolvedTeacherId} (parent ${firstResolvable.parentName})`
      );
    } else {
      console.log('No resolvable child found in the sampled parent list.');
    }

    const reusableConversation = conversations.find((conversation) => {
      if (!conversation.studentId || !conversation.parentId || !conversation.teacherId) {
        return false;
      }

      return parents.some((parent) =>
        parent.id === conversation.parentId &&
        (parent.children || []).some((child) => child.id === conversation.studentId)
      );
    });

    if (reusableConversation) {
      const expectedTeacherId = await resolveTeacherIdFromStudent(
        prisma,
        schoolId,
        reusableConversation.studentId
      );

      console.log('');
      console.log('POST /conversations reuse check');
      console.log(`Candidate conversation: ${reusableConversation.id}`);
      console.log(`Resolved teacher for candidate student: ${expectedTeacherId || '(none)'}`);

      if (expectedTeacherId && expectedTeacherId === reusableConversation.teacherId) {
        const reuseRes = await requestJson(`${MESSAGING_URL}/conversations`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetParentId: reusableConversation.parentId,
            studentId: reusableConversation.studentId,
          }),
        });

        console.log(`POST /conversations -> ${reuseRes.status}`);
        if (!reuseRes.ok || !reuseRes.data?.success) {
          throw new Error(`POST /conversations failed: ${JSON.stringify(reuseRes.data)}`);
        }

        console.log(`Returned conversation id: ${reuseRes.data.data?.id || '(missing)'}`);
        console.log(
          `Reused existing conversation: ${reuseRes.data.data?.id === reusableConversation.id ? 'yes' : 'no'}`
        );
      } else {
        console.log('Skipped POST /conversations because the candidate student resolved to a different teacher.');
      }
    } else {
      console.log('');
      console.log('POST /conversations reuse check');
      console.log('Skipped: no existing conversation with a student-linked parent candidate was found.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('');
  console.error('Smoke test failed');
  console.error(error.stack || error.message);
  process.exit(1);
});
