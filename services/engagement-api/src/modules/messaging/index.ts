import { getSharedPrisma } from '../../core/prisma';
import { getJwtSecret } from '../../../../lib/jwt-secret';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';
import { withPrismaPoolParams, scheduleDbKeepalive, shouldRunDbStartupWarmup } from '../../../../lib/prisma-pool-url';
import { compareSchoolAuthorizationProjection } from './security/schoolAuthorizationProjection';
import { deliverNotification } from '../notification/controllers/notification.controller';

// Load environment variables from root .env

const app = express.Router();
const PORT = process.env.PORT || process.env.MESSAGING_SERVICE_PORT || 3011;
const JWT_SECRET = getJwtSecret();

// ✅ Prisma with Supabase PostgreSQL
const prisma = getSharedPrisma();

// Handle graceful shutdown

// Keep database connection warm
let isDbWarm = false;
const warmUpDb = async () => {
  if (isDbWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbWarm = true;
    console.log('✅ Messaging Service - Database ready');
  } catch (error) {
    console.error('⚠️ Messaging Service - Database warmup failed');
  }
};
scheduleDbKeepalive(() => { isDbWarm = false; void warmUpDb(); });

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(['/conversations', '/messages', '/parents', '/teachers', '/unread-count'], express.json({ limit: '1mb' }));

const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPER_ADMIN';
type MessagingUser = NonNullable<Request['user']>;
const MESSAGE_MAX_LENGTH = 1000;

const messageWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  message: { success: false, error: 'Too many messages sent. Please wait and try again.' },
});

const canAccessConversation = (user: MessagingUser, conversation: { schoolId: string; teacherId: string; parentId: string }) => {
  if (user.role === 'PARENT') {
    return Boolean(user.parentId) && conversation.parentId === user.parentId;
  }

  if (isAdminRole(user.role) && user.schoolId) {
    return conversation.schoolId === user.schoolId;
  }

  if (user.role === 'TEACHER' && user.teacherId) {
    return conversation.teacherId === user.teacherId;
  }

  return false;
};

const getConversationWhereForUser = (user: MessagingUser) => {
  if (user.role === 'PARENT' && user.parentId) {
    return { parentId: user.parentId };
  }

  if (isAdminRole(user.role) && user.schoolId) {
    return { schoolId: user.schoolId };
  }

  if (user.role === 'TEACHER' && user.teacherId) {
    return { teacherId: user.teacherId };
  }

  return null;
};

const messagingCache = new Map<string, { data: any; timestamp: number }>();
const MESSAGING_CACHE_TTL_MS = 60 * 1000;

function readMessagingCache(cacheKey: string) {
  const cached = messagingCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > MESSAGING_CACHE_TTL_MS) {
    messagingCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function writeMessagingCache(cacheKey: string, data: any) {
  messagingCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

function clearMessagingCache() {
  messagingCache.clear();
}

const resolveTeacherIdFromStudent = async (schoolId: string, studentId: string) => {
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
    student.studentClasses[0]?.class.homeroomTeacherId ||
    student.studentClasses[0]?.class.teacherClasses[0]?.teacherId ||
    null
  );
};

const getTeacherClassIds = async (schoolId: string, teacherId: string) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: {
      homeroomClassId: true,
      teacherClasses: {
        select: { classId: true },
      },
    },
  });

  if (!teacher) {
    return null;
  }

  return Array.from(new Set([
    ...(teacher.homeroomClassId ? [teacher.homeroomClassId] : []),
    ...teacher.teacherClasses.map(({ classId }) => classId),
  ]));
};

const parentBelongsToSchool = async (schoolId: string, parentId: string) => {
  const linkedStudent = await prisma.studentParent.findFirst({
    where: {
      parentId,
      student: { schoolId },
    },
    select: { id: true },
  });
  return Boolean(linkedStudent);
};

const areTeacherAndParentLinked = async (
  schoolId: string,
  teacherId: string,
  parentId: string,
) => {
  const classIds = await getTeacherClassIds(schoolId, teacherId);
  if (!classIds || classIds.length === 0) {
    return false;
  }

  const linkedStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      recordStatus: 'ACTIVE',
      studentParents: { some: { parentId } },
      OR: [
        { classId: { in: classIds } },
        {
          studentClasses: {
            some: {
              classId: { in: classIds },
              status: 'ACTIVE',
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(linkedStudent);
};

const isValidConversationStudent = async (
  schoolId: string,
  studentId: string,
  teacherId: string,
  parentId: string,
) => {
  const classIds = await getTeacherClassIds(schoolId, teacherId);
  if (!classIds || classIds.length === 0) {
    return false;
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId,
      recordStatus: 'ACTIVE',
      studentParents: { some: { parentId } },
      OR: [
        { classId: { in: classIds } },
        {
          studentClasses: {
            some: {
              classId: { in: classIds },
              status: 'ACTIVE',
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(student);
};

// Auth Middleware (Request.user augmented via express.d.ts)
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    let teacherId = decoded.teacherId;
    let parentId = decoded.parentId;
    let schoolId = decoded.schoolId;
    let children = decoded.children;

    if (!teacherId || !parentId || !schoolId || (decoded.role === 'PARENT' && !children)) {
      const linkedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          schoolId: true,
          teacherId: true,
          parentId: true,
          parent: {
            select: {
              studentParents: {
                select: {
                  student: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (linkedUser) {
        teacherId = teacherId || linkedUser.teacherId;
        parentId = parentId || linkedUser.parentId;
        schoolId = schoolId || linkedUser.schoolId;
        if ((!children || !Array.isArray(children)) && linkedUser.parent) {
          children = linkedUser.parent.studentParents.map(({ student }) => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
          }));
        }
      }
    }

    // Phase 5 shadow read: compare the legacy User projection against
    // SchoolMembership without changing the live authorization decision
    // above. Only logs when the two sources disagree, to avoid spamming
    // logs on every request while this is a temporary QA/rollout signal.
    if (process.env.MESSAGING_SCHOOL_MEMBERSHIP_DUAL_READ_ENABLED === 'true') {
      try {
        const [legacyUser, membership] = await Promise.all([
          prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { schoolId: true, studentId: true, teacherId: true, role: true },
          }),
          prisma.schoolMembership.findFirst({
            where: schoolId ? { userId: decoded.userId, schoolId } : { userId: decoded.userId, status: 'ACTIVE' },
            select: { schoolId: true, studentId: true, teacherId: true, role: true, status: true },
            orderBy: { updatedAt: 'desc' },
          }),
        ]);
        if (legacyUser) {
          const comparison = compareSchoolAuthorizationProjection(
            {
              schoolId: legacyUser.schoolId,
              studentId: legacyUser.studentId,
              teacherId: legacyUser.teacherId,
              role: legacyUser.role,
            },
            membership,
          );
          if (!comparison.migrationSafe) {
            console.warn(
              `[school_membership_projection] mismatch user=${decoded.userId} code=${comparison.comparisonCode}`,
            );
          }
        }
      } catch (shadowError) {
        console.warn('[school_membership_projection] shadow read failed', shadowError);
      }
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
      schoolId,
      teacherId,
      parentId,
      children,
    };
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'messaging-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// CONVERSATIONS ENDPOINTS
// ========================================

// GET /conversations - Get user's conversations
app.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role, schoolId, teacherId, parentId } = req.user!;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const cacheKey = `conversations:${role}:${schoolId || ''}:${teacherId || ''}:${parentId || ''}:${page}:${limit}`;
    const cachedResponse = readMessagingCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const conversationWhere = getConversationWhereForUser(req.user!);
    if (!conversationWhere) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const where = {
      ...conversationWhere,
      isArchived: false,
    };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
              photoUrl: true,
              phone: true,
            },
          },
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
              phone: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
              studentId: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              senderId: true,
              senderType: true,
              isRead: true,
              createdAt: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.conversation.count({ where }),
    ]);

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isRead: false,
            senderType: role === 'PARENT' ? 'TEACHER' : 'PARENT',
          },
        });
        return {
          ...conv,
          lastMessage: conv.messages[0] || null,
          unreadCount,
        };
      })
    );

    const responseBody = {
      success: true,
      data: conversationsWithUnread,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };

    writeMessagingCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversations', details: error.message });
  }
});

// POST /conversations - Create or get existing conversation
app.post('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role, teacherId, parentId, schoolId } = req.user!;
    const { targetTeacherId, targetParentId, studentId } = req.body;

    if (!schoolId) {
      return res.status(403).json({ success: false, error: 'An active school context is required' });
    }

    let finalTeacherId: string;
    let finalParentId: string;

    // Determine teacher and parent based on who is initiating
    if (role === 'PARENT' && parentId) {
      if (!targetTeacherId) {
        return res.status(400).json({ success: false, error: 'Target teacher ID is required' });
      }
      finalTeacherId = targetTeacherId;
      finalParentId = parentId;
    } else if (isAdminRole(role) && schoolId) {
      if (!targetParentId) {
        return res.status(400).json({ success: false, error: 'Target parent ID is required' });
      }

      if (targetTeacherId) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            id: targetTeacherId,
            schoolId,
          },
          select: { id: true },
        });

        if (!teacher) {
          return res.status(400).json({ success: false, error: 'Target teacher not found in this school' });
        }

        finalTeacherId = teacher.id;
      } else if (studentId) {
        const resolvedTeacherId = await resolveTeacherIdFromStudent(schoolId, studentId);
        if (!resolvedTeacherId) {
          return res.status(400).json({
            success: false,
            error: 'Could not determine a teacher for this student. Provide a student with a linked class teacher.',
          });
        }
        finalTeacherId = resolvedTeacherId;
      } else if (teacherId) {
        finalTeacherId = teacherId;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Admin conversation creation requires a studentId, targetTeacherId, or linked teacherId',
        });
      }

      finalParentId = targetParentId;
    } else if (role === 'TEACHER' && teacherId) {
      if (!targetParentId) {
        return res.status(400).json({ success: false, error: 'Target parent ID is required' });
      }
      finalTeacherId = teacherId;
      finalParentId = targetParentId;
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const participantsValid = isAdminRole(role)
      ? Boolean(await getTeacherClassIds(schoolId, finalTeacherId)) &&
        await parentBelongsToSchool(schoolId, finalParentId)
      : await areTeacherAndParentLinked(schoolId, finalTeacherId, finalParentId);

    if (!participantsValid) {
      return res.status(403).json({
        success: false,
        error: 'Teacher and parent must belong to the same school and share an active class relationship',
      });
    }

    if (
      studentId &&
      !await isValidConversationStudent(
        schoolId,
        studentId,
        finalTeacherId,
        finalParentId,
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Student is not linked to both conversation participants',
      });
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findUnique({
      where: {
        teacherId_parentId: {
          teacherId: finalTeacherId,
          parentId: finalParentId,
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
            photoUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
            studentId: true,
          },
        },
      },
    });

    // Create new conversation if doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          schoolId,
          teacherId: finalTeacherId,
          parentId: finalParentId,
          studentId: studentId || null,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
              photoUrl: true,
            },
          },
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              customFields: true,
              studentId: true,
            },
          },
        },
      });
    }

    clearMessagingCache();

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation', details: error.message });
  }
});

// GET /conversations/:id - Get conversation with messages
app.get('/conversations/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
            photoUrl: true,
            phone: true,
          },
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
            phone: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customFields: true,
            studentId: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Verify user is part of this conversation
    if (!canAccessConversation(req.user!, conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

// PUT /conversations/:id/archive - Archive conversation
app.put('/conversations/:id/archive', authenticateToken, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Verify user is part of this conversation
    if (!canAccessConversation(req.user!, conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true },
    });

    clearMessagingCache();

    res.json({ success: true, message: 'Conversation archived' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to archive conversation' });
  }
});

// ========================================
// MESSAGES ENDPOINTS
// ========================================

// GET /conversations/:id/messages - Get messages for a conversation
app.get('/conversations/:id/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { role } = req.user!;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!canAccessConversation(req.user!, conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' }, // Newest first for pagination
        skip,
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Mark messages as read
    const senderTypeToMark = role === 'PARENT' ? 'TEACHER' : 'PARENT';
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderType: senderTypeToMark as any,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    clearMessagingCache();

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// POST /conversations/:id/messages - Send a message
app.post('/conversations/:id/messages', authenticateToken, messageWriteLimiter, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { content } = req.body;
    const { id: userId, role, teacherId, parentId, schoolId } = req.user!;

    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    if (content.trim().length > MESSAGE_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Message content cannot exceed ${MESSAGE_MAX_LENGTH} characters`,
      });
    }

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!canAccessConversation(req.user!, conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    let senderType: 'TEACHER' | 'PARENT';
    let senderId: string;

    if (role === 'PARENT' && parentId) {
      senderType = 'PARENT';
      senderId = parentId;
    } else if (isAdminRole(role) && schoolId) {
      senderType = 'TEACHER';
      senderId = userId;
    } else if (role === 'TEACHER' && teacherId) {
      senderType = 'TEACHER';
      senderId = teacherId;
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Create message and update conversation's lastMessageAt
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId,
          senderType,
          content: content.trim(),
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    clearMessagingCache();

    try {
      const recipient = senderType === 'PARENT'
        ? await prisma.user.findFirst({
            where: {
              teacherId: conversation.teacherId,
              schoolId: conversation.schoolId,
              isActive: true,
            },
            select: { id: true },
          })
        : await prisma.user.findFirst({
            where: {
              parentId: conversation.parentId,
              isActive: true,
            },
            select: { id: true },
          });

      if (recipient && recipient.id !== userId) {
        await deliverNotification({
          userId: recipient.id,
          title: 'New school message',
          body: 'You have a new message in Stunity.',
          data: {
            type: 'MESSAGE',
            conversationId,
            actorId: userId,
            // Mobile deep-links parse /messages/:id; web still handles list pages.
            link: `/messages/${conversationId}`,
          },
        });
      }
    } catch (notificationError) {
      // The message is durable; notification delivery is best effort and must
      // not cause the client to retry and create a duplicate message.
      console.error('Message notification delivery failed:', notificationError);
    }

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
});

// PUT /messages/:id/read - Mark a message as read
app.put('/messages/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id;
    const { role } = req.user!;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (!canAccessConversation(req.user!, message.conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const incomingSenderType = role === 'PARENT' ? 'TEACHER' : 'PARENT';
    if (message.senderType !== incomingSenderType) {
      return res.status(403).json({
        success: false,
        error: 'Only received messages can be marked as read',
      });
    }

    await prisma.message.updateMany({
      where: {
        id: messageId,
        conversationId: message.conversationId,
        senderType: incomingSenderType,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    clearMessagingCache();

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// PUT /conversations/:id/read-all - Mark all messages in conversation as read
app.put('/conversations/:id/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { role } = req.user!;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!canAccessConversation(req.user!, conversation)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Mark messages from the other party as read
    const senderTypeToMark = role === 'PARENT' ? 'TEACHER' : 'PARENT';

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderType: senderTypeToMark as any,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    clearMessagingCache();

    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

// GET /conversations/unread-count - Get total unread message count
app.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role } = req.user!;

    const conversationFilter = getConversationWhereForUser(req.user!);
    let senderTypeFilter: 'TEACHER' | 'PARENT';

    if (role === 'PARENT') {
      senderTypeFilter = 'TEACHER';
    } else if (conversationFilter) {
      senderTypeFilter = 'PARENT';
    } else {
      // General students / unlinked accounts do not use parent-teacher messaging.
      // Return zero instead of 403 so mobile clients can poll unread safely.
      return res.json({ success: true, data: { unreadCount: 0 } });
    }

    const unreadCount = await prisma.message.count({
      where: {
        conversation: conversationFilter,
        senderType: senderTypeFilter,
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// GET /teachers - Get teachers for parent to message
app.get('/teachers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role, children, schoolId } = req.user!;

    if (role !== 'PARENT') {
      return res.status(403).json({ success: false, error: 'Only parents can access this endpoint' });
    }

    if (!schoolId) {
      return res.status(403).json({ success: false, error: 'An active school context is required' });
    }

    // Get teachers related to parent's children (homeroom teachers and subject teachers)
    const childIds = children?.map(c => c.id) || [];

    if (childIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get class IDs for children
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        studentId: { in: childIds },
        status: 'ACTIVE',
        student: { schoolId },
      },
      select: { classId: true },
    });

    const classIds = studentClasses.map(sc => sc.classId);

    // Get teachers associated with those classes
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        OR: [
          { homeroomClassId: { in: classIds } },
          { teacherClasses: { some: { classId: { in: classIds } } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customFields: true,
        photoUrl: true,
        phone: true,
        homeroomClass: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: teachers.map(t => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        name: (t.customFields as any)?.regional?.khmerName || `${t.firstName} ${t.lastName}`,
        photoUrl: t.photoUrl,
        phone: (t as any).phone,
        position: (t.customFields as any)?.regional?.position || null,
        homeroomClass: (t as any).homeroomClass,
      })),
    });
  } catch (error: any) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get teachers' });
  }
});

// GET /parents - Get parents for teacher to message
app.get('/parents', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { role, teacherId, schoolId } = req.user!;
    const { classId, search } = req.query;
    const cacheKey = `parents:${role}:${schoolId || ''}:${teacherId || ''}:${classId || ''}:${search || ''}`;
    const cachedResponse = readMessagingCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Only teachers can access this endpoint' });
    }

    if (!schoolId) {
      return res.status(403).json({ success: false, error: 'An active school context is required' });
    }

    // Get students in the caller's authorized classes. Never allow a teacher
    // with no assigned classes to fall through to a school-wide parent list.
    const studentFilter: any = { schoolId };
    if (isAdminRole(role)) {
      if (classId) {
        const targetClass = await prisma.class.findFirst({
          where: { id: String(classId), schoolId },
          select: { id: true },
        });
        if (!targetClass) {
          return res.status(404).json({ success: false, error: 'Class not found in this school' });
        }
        studentFilter.classId = targetClass.id;
      }
    } else if (teacherId) {
      const authorizedClassIds = await getTeacherClassIds(schoolId, teacherId);
      if (!authorizedClassIds) {
        return res.status(403).json({ success: false, error: 'Teacher is not active in this school' });
      }

      if (classId) {
        if (!authorizedClassIds.includes(String(classId))) {
          return res.status(403).json({ success: false, error: 'Teacher is not assigned to this class' });
        }
        studentFilter.classId = String(classId);
      } else {
        if (authorizedClassIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
        studentFilter.OR = [
          { classId: { in: authorizedClassIds } },
          {
            studentClasses: {
              some: {
                classId: { in: authorizedClassIds },
                status: 'ACTIVE',
              },
            },
          },
        ];
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'A linked teacher profile is required',
      });
    }

    // Get students and their parents
    const students = await prisma.student.findMany({
      where: {
        ...studentFilter,
        recordStatus: "ACTIVE",
      },
      include: {
        studentParents: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                customFields: true,
                phone: true,
                relationship: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    // Format data - group by parent
    const parentsMap = new Map<string, any>();

    students.forEach(student => {
      student.studentParents.forEach(sp => {
        const parent = sp.parent;
        if (!parentsMap.has(parent.id)) {
          parentsMap.set(parent.id, {
            ...parent,
            children: [],
          });
        }
        parentsMap.get(parent.id).children.push({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          khmerName: (student.customFields as any)?.regional?.khmerName || `${student.firstName} ${student.lastName}`,
          studentId: student.studentId,
          class: student.class,
        });
      });
    });

    let parents = Array.from(parentsMap.values());

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      parents = parents.filter(p =>
        p.firstName.toLowerCase().includes(searchLower) ||
        p.lastName.toLowerCase().includes(searchLower) ||
        (p.customFields as any)?.regional?.khmerName?.toLowerCase().includes(searchLower) ||
        p.phone.includes(search) ||
        p.children.some((c: any) =>
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.studentId?.includes(search)
        )
      );
    }

    const responseBody = {
      success: true,
      data: parents,
    };

    writeMessagingCache(cacheKey, responseBody);
    res.json(responseBody);
  } catch (error: any) {
    console.error('Get parents error:', error);
    res.status(500).json({ success: false, error: 'Failed to get parents' });
  }
});

// ========================================
// Start Server
// ========================================


export default app;
