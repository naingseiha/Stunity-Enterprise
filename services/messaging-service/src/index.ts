import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = 3011; // Messaging service uses port 3011
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// ✅ Prisma with Supabase PostgreSQL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

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
warmUpDb();
setInterval(() => { isDbWarm = false; warmUpDb(); }, 4 * 60 * 1000);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3011'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phone?: string;
    role: string;
    schoolId: string;
    teacherId?: string;
    parentId?: string;
    children?: Array<{ id: string; firstName: string; lastName: string }>;
  };
}

// Auth Middleware
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      phone: decoded.phone,
      role: decoded.role,
      schoolId: decoded.schoolId,
      teacherId: decoded.teacherId,
      parentId: decoded.parentId,
      children: decoded.children,
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
app.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, teacherId, parentId } = req.user!;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let where: any = {};

    // Filter based on user role
    if (role === 'PARENT' && parentId) {
      where.parentId = parentId;
    } else if ((role === 'TEACHER' || role === 'ADMIN') && teacherId) {
      where.teacherId = teacherId;
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Only non-archived conversations
    where.isArchived = false;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              khmerName: true,
              photoUrl: true,
              phone: true,
            },
          },
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              khmerName: true,
              phone: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              khmerName: true,
              studentId: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
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

    res.json({
      success: true,
      data: conversationsWithUnread,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversations', details: error.message });
  }
});

// POST /conversations - Create or get existing conversation
app.post('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, teacherId, parentId, schoolId } = req.user!;
    const { targetTeacherId, targetParentId, studentId } = req.body;

    let finalTeacherId: string;
    let finalParentId: string;

    // Determine teacher and parent based on who is initiating
    if (role === 'PARENT' && parentId) {
      if (!targetTeacherId) {
        return res.status(400).json({ success: false, error: 'Target teacher ID is required' });
      }
      finalTeacherId = targetTeacherId;
      finalParentId = parentId;
    } else if ((role === 'TEACHER' || role === 'ADMIN') && teacherId) {
      if (!targetParentId) {
        return res.status(400).json({ success: false, error: 'Target parent ID is required' });
      }
      finalTeacherId = teacherId;
      finalParentId = targetParentId;
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
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
            khmerName: true,
            photoUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            studentId: true,
          },
        },
      },
    });

    // Create new conversation if doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          schoolId: schoolId!,
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
              khmerName: true,
              photoUrl: true,
            },
          },
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              khmerName: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              khmerName: true,
              studentId: true,
            },
          },
        },
      });
    }

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
app.get('/conversations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, teacherId, parentId } = req.user!;
    const conversationId = req.params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            photoUrl: true,
            phone: true,
          },
        },
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            phone: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            khmerName: true,
            studentId: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Verify user is part of this conversation
    if (role === 'PARENT' && conversation.parentId !== parentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if ((role === 'TEACHER' || role === 'ADMIN') && conversation.teacherId !== teacherId) {
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
app.put('/conversations/:id/archive', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { role, teacherId, parentId } = req.user!;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Verify user is part of this conversation
    if (role === 'PARENT' && conversation.parentId !== parentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if ((role === 'TEACHER' || role === 'ADMIN') && conversation.teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isArchived: true },
    });

    res.json({ success: true, message: 'Conversation archived' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to archive conversation' });
  }
});

// ========================================
// MESSAGES ENDPOINTS
// ========================================

// GET /conversations/:id/messages - Get messages for a conversation
app.get('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { role, teacherId, parentId } = req.user!;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (role === 'PARENT' && conversation.parentId !== parentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if ((role === 'TEACHER' || role === 'ADMIN') && conversation.teacherId !== teacherId) {
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
app.post('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { content } = req.body;
    const { id: userId, role, teacherId, parentId } = req.user!;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    let senderType: 'TEACHER' | 'PARENT';
    let senderId: string;

    if (role === 'PARENT' && parentId) {
      if (conversation.parentId !== parentId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      senderType = 'PARENT';
      senderId = parentId;
    } else if ((role === 'TEACHER' || role === 'ADMIN') && teacherId) {
      if (conversation.teacherId !== teacherId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
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
app.put('/messages/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const messageId = req.params.id;

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Message marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// PUT /conversations/:id/read-all - Mark all messages in conversation as read
app.put('/conversations/:id/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = req.params.id;
    const { role, teacherId, parentId } = req.user!;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
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

    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

// GET /conversations/unread-count - Get total unread message count
app.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, teacherId, parentId } = req.user!;

    let conversationFilter: any = {};
    let senderTypeFilter: 'TEACHER' | 'PARENT';

    if (role === 'PARENT' && parentId) {
      conversationFilter = { parentId };
      senderTypeFilter = 'TEACHER';
    } else if ((role === 'TEACHER' || role === 'ADMIN') && teacherId) {
      conversationFilter = { teacherId };
      senderTypeFilter = 'PARENT';
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
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
app.get('/teachers', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, children, schoolId } = req.user!;

    if (role !== 'PARENT') {
      return res.status(403).json({ success: false, error: 'Only parents can access this endpoint' });
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
      },
      select: { classId: true },
    });

    const classIds = studentClasses.map(sc => sc.classId);

    // Get teachers associated with those classes
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { homeroomClassId: { in: classIds } },
          { teacherClasses: { some: { classId: { in: classIds } } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        khmerName: true,
        photoUrl: true,
        phone: true,
        position: true,
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
      data: teachers,
    });
  } catch (error: any) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get teachers' });
  }
});

// GET /parents - Get parents for teacher to message
app.get('/parents', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, teacherId } = req.user!;
    const { classId, search } = req.query;

    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only teachers can access this endpoint' });
    }

    // Get students in teacher's classes
    let studentFilter: any = {};

    if (classId) {
      studentFilter.classId = classId;
    } else if (teacherId) {
      // Get all classes the teacher is assigned to
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId },
        select: { classId: true },
      });
      const classIds = teacherClasses.map(tc => tc.classId);

      // Also get homeroom class
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { homeroomClassId: true },
      });
      if (teacher?.homeroomClassId) {
        classIds.push(teacher.homeroomClassId);
      }

      if (classIds.length > 0) {
        studentFilter.classId = { in: classIds };
      }
    }

    // Get students and their parents
    const students = await prisma.student.findMany({
      where: {
        ...studentFilter,
        isAccountActive: true,
      },
      include: {
        studentParents: {
          include: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                khmerName: true,
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
          khmerName: student.khmerName,
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
        p.khmerName?.toLowerCase().includes(searchLower) ||
        p.phone.includes(search) ||
        p.children.some((c: any) =>
          c.firstName.toLowerCase().includes(searchLower) ||
          c.lastName.toLowerCase().includes(searchLower) ||
          c.studentId?.includes(search)
        )
      );
    }

    res.json({
      success: true,
      data: parents,
    });
  } catch (error: any) {
    console.error('Get parents error:', error);
    res.status(500).json({ success: false, error: 'Failed to get parents' });
  }
});

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   💬 Messaging Service - Stunity Enterprise v1.0   ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Messaging Endpoints:');
  console.log('   GET  /conversations             - List conversations');
  console.log('   POST /conversations             - Create conversation');
  console.log('   GET  /conversations/:id         - Get conversation');
  console.log('   GET  /conversations/:id/messages - Get messages');
  console.log('   POST /conversations/:id/messages - Send message');
  console.log('   PUT  /conversations/:id/archive - Archive conversation');
  console.log('   PUT  /conversations/:id/read-all - Mark all read');
  console.log('   PUT  /messages/:id/read         - Mark message read');
  console.log('   GET  /unread-count              - Get unread count');
  console.log('   GET  /teachers                  - Teachers for parent');
  console.log('   GET  /parents                   - Parents for teacher');
  console.log('');
});
