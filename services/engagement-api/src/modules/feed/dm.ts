/**
 * Direct Messages (DM) API Routes
 * Handles user-to-user messaging for the social feed
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventPublisher } from './redis';

const router = Router();

// Initialize Prisma (will be passed from main app)
let prisma: PrismaClient;

export function initDMRoutes(prismaClient: PrismaClient) {
  prisma = prismaClient;
  return router;
}

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

// ========================================
// Conversation Management
// ========================================

/**
 * GET /dm/conversations - Get all conversations for current user
 */
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const conversations = await prisma.dMParticipant.findMany({
      where: {
        userId,
        leftAt: null, // Only active conversations
      },
      include: {
        conversation: {
          include: {
            participants: {
              where: { leftAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePictureUrl: true,
                    headline: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      skip,
      take: Number(limit),
    });

    // Format response
    const formattedConversations = conversations.map(p => {
      const otherParticipants = p.conversation.participants
        .filter(op => op.userId !== userId)
        .map(op => op.user);

      return {
        id: p.conversation.id,
        isGroup: p.conversation.isGroup,
        groupName: p.conversation.groupName,
        groupAvatar: p.conversation.groupAvatar,
        lastMessage: p.conversation.lastMessage,
        lastMessageAt: p.conversation.lastMessageAt,
        unreadCount: p.unreadCount,
        isMuted: p.isMuted,
        participants: otherParticipants,
        // For 1:1 chats, use the other person's info as "conversation" info
        displayName: p.conversation.isGroup 
          ? p.conversation.groupName 
          : otherParticipants[0]?.firstName + ' ' + otherParticipants[0]?.lastName,
        displayAvatar: p.conversation.isGroup 
          ? p.conversation.groupAvatar 
          : otherParticipants[0]?.profilePictureUrl,
      };
    });

    res.json({ success: true, conversations: formattedConversations });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversations' });
  }
});

/**
 * POST /dm/conversations - Start new conversation or get existing one
 */
router.post('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { participantIds, isGroup = false, groupName } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ success: false, error: 'participantIds is required' });
    }

    // For 1:1 chats, check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const otherUserId = participantIds[0];
      
      // Find existing 1:1 conversation
      const existing = await prisma.dMConversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: { in: [userId, otherUserId] },
              leftAt: null,
            },
          },
        },
        include: {
          participants: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      });

      if (existing) {
        return res.json({ success: true, conversation: existing, isNew: false });
      }
    }

    // Create new conversation
    const allParticipantIds = [userId, ...participantIds.filter((id: string) => id !== userId)];
    
    const conversation = await prisma.dMConversation.create({
      data: {
        isGroup,
        groupName: isGroup ? groupName : null,
        participants: {
          create: allParticipantIds.map((pId: string) => ({
            userId: pId,
            isAdmin: pId === userId && isGroup, // Creator is admin of group
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, conversation, isNew: true });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

/**
 * GET /dm/conversations/:id - Get single conversation with messages
 */
router.get('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verify user is participant
    const participant = await prisma.dMParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(403).json({ success: false, error: 'Not a member of this conversation' });
    }

    // Get conversation with messages
    const conversation = await prisma.dMConversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                headline: true,
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Mark messages as read
    await prisma.dMParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
      data: {
        lastReadAt: new Date(),
        unreadCount: 0,
      },
    });

    // Reverse messages so oldest first (for display)
    conversation.messages.reverse();

    res.json({ success: true, conversation });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

/**
 * DELETE /dm/conversations/:id - Leave/delete conversation
 */
router.delete('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    // Mark as left
    await prisma.dMParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
      data: { leftAt: new Date() },
    });

    res.json({ success: true, message: 'Left conversation' });
  } catch (error: any) {
    console.error('Leave conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to leave conversation' });
  }
});

// ========================================
// Message Management
// ========================================

/**
 * POST /dm/conversations/:id/messages - Send message
 */
router.post('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id: conversationId } = req.params;
    const { content, messageType = 'TEXT', mediaUrl, replyToId } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Content or media is required' });
    }

    // Verify user is participant
    const participant = await prisma.dMParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, profilePictureUrl: true },
        },
        conversation: {
          include: {
            participants: {
              where: { leftAt: null },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(403).json({ success: false, error: 'Not a member of this conversation' });
    }

    // Create message
    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: content?.trim() || '',
        messageType,
        mediaUrl,
        replyToId,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Update conversation's last message
    await prisma.dMConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content?.slice(0, 100) || '[Media]',
        lastMessageAt: new Date(),
      },
    });

    // Increment unread count for other participants
    const otherParticipantIds = participant.conversation.participants
      .filter(p => p.userId !== userId)
      .map(p => p.userId);

    await prisma.dMParticipant.updateMany({
      where: {
        conversationId,
        userId: { in: otherParticipantIds },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    // 🔔 Send real-time event to other participants
    const senderName = `${participant.user.firstName} ${participant.user.lastName}`;
    for (const recipientId of otherParticipantIds) {
      EventPublisher.newDM(
        recipientId,
        userId,
        senderName,
        conversationId,
        message.id,
        content || '[Media]'
      );
    }

    res.status(201).json({ success: true, message });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * PUT /dm/messages/:id - Edit message
 */
router.put('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const { content } = req.body;

    const message = await prisma.directMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ success: false, error: 'Can only edit own messages' });
    }

    const updated = await prisma.directMessage.update({
      where: { id },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
    });

    res.json({ success: true, message: updated });
  } catch (error: any) {
    console.error('Edit message error:', error);
    res.status(500).json({ success: false, error: 'Failed to edit message' });
  }
});

/**
 * DELETE /dm/messages/:id - Delete message
 */
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    const message = await prisma.directMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ success: false, error: 'Can only delete own messages' });
    }

    // Soft delete
    await prisma.directMessage.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '', // Clear content
      },
    });

    res.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

/**
 * POST /dm/conversations/:id/read - Mark conversation as read
 */
router.post('/conversations/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;

    await prisma.dMParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
      data: {
        lastReadAt: new Date(),
        unreadCount: 0,
      },
    });

    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

/**
 * POST /dm/conversations/:id/typing - Send typing indicator
 */
router.post('/conversations/:id/typing', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id: conversationId } = req.params;
    const { isTyping = true } = req.body;

    // Get other participants
    const participants = await prisma.dMParticipant.findMany({
      where: {
        conversationId,
        leftAt: null,
      },
      select: { userId: true },
    });

    const participantIds = participants.map(p => p.userId);

    // Send typing indicator via SSE
    EventPublisher.typingIndicator(conversationId, participantIds, userId, isTyping);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Typing indicator error:', error);
    res.status(500).json({ success: false, error: 'Failed to send typing indicator' });
  }
});

/**
 * PUT /dm/conversations/:id/mute - Mute/unmute conversation
 */
router.put('/conversations/:id/mute', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const { muted, mutedUntil } = req.body;

    await prisma.dMParticipant.update({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
      data: {
        isMuted: muted,
        mutedUntil: mutedUntil ? new Date(mutedUntil) : null,
      },
    });

    res.json({ success: true, muted });
  } catch (error: any) {
    console.error('Mute conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to mute conversation' });
  }
});

/**
 * GET /dm/unread-count - Get total unread messages count
 */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const result = await prisma.dMParticipant.aggregate({
      where: {
        userId,
        leftAt: null,
        isMuted: false,
      },
      _sum: {
        unreadCount: true,
      },
    });

    res.json({
      success: true,
      unreadCount: result._sum.unreadCount || 0,
    });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

export default router;
