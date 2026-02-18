/**
 * Messaging Store
 * 
 * Manages Direct Messages with Hybrid Architecture:
 * - REST API calls (via feed-service /dm/* endpoints) for data operations
 * - Supabase Realtime for instant message delivery
 * - Supabase Broadcast for typing indicators
 * - Supabase Presence for online status
 */

import { create } from 'zustand';
import { feedApi } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { realtimeService } from '@/services/realtimeService';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export interface DMUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    isOnline?: boolean;
}

export interface DMConversation {
    id: string;
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    };
    lastMessageAt: string;
    unreadCount: number;
    participants: DMUser[];
    displayName: string;
    displayAvatar?: string;
}

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: string;
    mediaUrl?: string;
    mediaType?: string;
    replyToId?: string;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    sender?: DMUser;
    // Optimistic UI
    _isPending?: boolean;
    _tempId?: string;
}

interface TypingUser {
    userId: string;
    firstName: string;
    timestamp: number;
}

interface MessagingState {
    // Conversation list
    conversations: DMConversation[];
    isLoadingConversations: boolean;
    totalUnreadCount: number;

    // Active conversation messages
    activeConversationId: string | null;
    messages: DirectMessage[];
    isLoadingMessages: boolean;
    hasMoreMessages: boolean;
    messagePage: number;

    // Typing indicators
    typingUsers: Map<string, TypingUser>;

    // Online presence
    onlineUsers: Set<string>;

    // Channels
    conversationsChannel: RealtimeChannel | null;
    messagesChannel: RealtimeChannel | null;
    typingChannel: RealtimeChannel | null;

    // Actions — Conversations
    fetchConversations: () => Promise<void>;
    startConversation: (participantIds: string[], isGroup?: boolean, groupName?: string) => Promise<DMConversation | null>;
    leaveConversation: (conversationId: string) => Promise<void>;

    // Actions — Messages
    fetchMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
    sendMessage: (conversationId: string, content: string, messageType?: string) => Promise<void>;
    editMessage: (messageId: string, content: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    markAsRead: (conversationId: string) => Promise<void>;

    // Actions — Typing
    sendTypingIndicator: (conversationId: string, userId: string, firstName: string) => void;

    // Actions — Realtime
    subscribeToConversations: (userId: string) => void;
    subscribeToMessages: (conversationId: string) => void;
    unsubscribeFromMessages: () => void;
    unsubscribeAll: () => void;

    // Actions — Utility
    setActiveConversation: (conversationId: string | null) => void;
    getUnreadCount: () => Promise<void>;
    reset: () => void;
}

const initialState = {
    conversations: [],
    isLoadingConversations: false,
    totalUnreadCount: 0,
    activeConversationId: null,
    messages: [],
    isLoadingMessages: false,
    hasMoreMessages: true,
    messagePage: 1,
    typingUsers: new Map<string, TypingUser>(),
    onlineUsers: new Set<string>(),
    conversationsChannel: null,
    messagesChannel: null,
    typingChannel: null,
};

// ============================================
// Store
// ============================================

export const useMessagingStore = create<MessagingState>((set, get) => ({
    ...initialState,

    // ========================================
    // Conversations
    // ========================================

    fetchConversations: async () => {
        set({ isLoadingConversations: true });
        try {
            const response = await feedApi.get('/dm/conversations');

            if (response.data.success) {
                const conversations: DMConversation[] = (response.data.conversations || []).map((c: any) => ({
                    id: c.id,
                    isGroup: c.isGroup,
                    groupName: c.groupName,
                    groupAvatar: c.groupAvatar,
                    lastMessage: c.lastMessage ? {
                        content: c.lastMessage.content,
                        createdAt: c.lastMessage.createdAt,
                        senderId: c.lastMessage.senderId,
                    } : undefined,
                    lastMessageAt: c.lastMessageAt,
                    unreadCount: c.unreadCount || 0,
                    participants: c.participants || [],
                    displayName: c.displayName || 'Unknown',
                    displayAvatar: c.displayAvatar,
                }));

                const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
                set({ conversations, totalUnreadCount, isLoadingConversations: false });
            } else {
                set({ isLoadingConversations: false });
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            set({ isLoadingConversations: false });
        }
    },

    startConversation: async (participantIds, isGroup = false, groupName?) => {
        try {
            const response = await feedApi.post('/dm/conversations', {
                participantIds,
                isGroup,
                groupName,
            });

            if (response.data.success) {
                const conversation = response.data.conversation;
                // Refresh conversation list
                await get().fetchConversations();
                return conversation;
            }
            return null;
        } catch (error) {
            console.error('Failed to start conversation:', error);
            return null;
        }
    },

    leaveConversation: async (conversationId) => {
        try {
            await feedApi.delete(`/dm/conversations/${conversationId}`);
            // Remove from local state
            set(state => ({
                conversations: state.conversations.filter(c => c.id !== conversationId),
            }));
        } catch (error) {
            console.error('Failed to leave conversation:', error);
        }
    },

    // ========================================
    // Messages
    // ========================================

    fetchMessages: async (conversationId, refresh = false) => {
        const { messagePage, messages } = get();
        const page = refresh ? 1 : messagePage;

        set({ isLoadingMessages: true });

        try {
            const response = await feedApi.get(`/dm/conversations/${conversationId}`, {
                params: { page, limit: 50 },
            });

            if (response.data.success) {
                const conversation = response.data.conversation;
                const fetchedMessages: DirectMessage[] = (conversation.messages || []).map((m: any) => ({
                    id: m.id,
                    conversationId: m.conversationId,
                    senderId: m.senderId,
                    content: m.content,
                    messageType: m.messageType || 'TEXT',
                    mediaUrl: m.mediaUrl,
                    mediaType: m.mediaType,
                    replyToId: m.replyToId,
                    isEdited: m.isEdited || false,
                    isDeleted: m.isDeleted || false,
                    createdAt: m.createdAt,
                    sender: m.sender ? {
                        id: m.sender.id,
                        firstName: m.sender.firstName,
                        lastName: m.sender.lastName,
                        profilePictureUrl: m.sender.profilePictureUrl,
                    } : undefined,
                }));

                set({
                    messages: refresh ? fetchedMessages : [...messages, ...fetchedMessages],
                    isLoadingMessages: false,
                    hasMoreMessages: fetchedMessages.length === 50,
                    messagePage: page + 1,
                    activeConversationId: conversationId,
                });
            } else {
                set({ isLoadingMessages: false });
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            set({ isLoadingMessages: false });
        }
    },

    sendMessage: async (conversationId, content, messageType = 'TEXT') => {
        // Optimistic: add message immediately
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: DirectMessage = {
            id: tempId,
            conversationId,
            senderId: 'me', // Will be resolved on render
            content,
            messageType,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            _isPending: true,
            _tempId: tempId,
        };

        set(state => ({
            messages: [...state.messages, optimisticMessage],
        }));

        try {
            const response = await feedApi.post(`/dm/conversations/${conversationId}/messages`, {
                content,
                messageType,
            });

            if (response.data.success) {
                const realMessage = response.data.message;
                // Replace the optimistic message with the real one
                set(state => ({
                    messages: state.messages.map(m =>
                        m._tempId === tempId
                            ? { ...realMessage, _isPending: false }
                            : m
                    ),
                }));
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            // Mark as failed
            set(state => ({
                messages: state.messages.filter(m => m._tempId !== tempId),
            }));
        }
    },

    editMessage: async (messageId, content) => {
        // Optimistic update
        set(state => ({
            messages: state.messages.map(m =>
                m.id === messageId
                    ? { ...m, content, isEdited: true }
                    : m
            ),
        }));

        try {
            await feedApi.put(`/dm/messages/${messageId}`, { content });
        } catch (error) {
            console.error('Failed to edit message:', error);
            // Revert — refetch
            const { activeConversationId } = get();
            if (activeConversationId) {
                get().fetchMessages(activeConversationId, true);
            }
        }
    },

    deleteMessage: async (messageId) => {
        // Optimistic: mark as deleted
        set(state => ({
            messages: state.messages.map(m =>
                m.id === messageId
                    ? { ...m, isDeleted: true, content: 'Message deleted' }
                    : m
            ),
        }));

        try {
            await feedApi.delete(`/dm/messages/${messageId}`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    },

    markAsRead: async (conversationId) => {
        // Optimistic: clear unread count
        set(state => ({
            conversations: state.conversations.map(c =>
                c.id === conversationId
                    ? { ...c, unreadCount: 0 }
                    : c
            ),
            totalUnreadCount: state.conversations.reduce(
                (sum, c) => sum + (c.id === conversationId ? 0 : c.unreadCount), 0
            ),
        }));

        // The backend marks as read when fetching conversation — no separate call needed
    },

    // ========================================
    // Typing Indicators
    // ========================================

    sendTypingIndicator: (conversationId, userId, firstName) => {
        const { typingChannel } = get();
        if (typingChannel) {
            typingChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { conversationId, userId, firstName },
            });
        }
    },

    // ========================================
    // Realtime Subscriptions
    // ========================================

    subscribeToConversations: (userId: string) => {
        const { unsubscribeAll } = get();

        // Subscribe to new messages across all conversations
        const conversationsChannel = realtimeService.subscribeMultiple(
            `dm:user:${userId}`,
            [
                {
                    table: 'direct_messages',
                    event: 'INSERT',
                    callback: (payload) => {
                        const newMsg = payload.new as any;
                        const { activeConversationId, messages } = get();

                        // If this message is for the active conversation, add it
                        if (newMsg.conversationId === activeConversationId) {
                            // Check if we already have this message (from optimistic update)
                            const alreadyExists = messages.some(m => m.id === newMsg.id);
                            if (!alreadyExists) {
                                const msg: DirectMessage = {
                                    id: newMsg.id,
                                    conversationId: newMsg.conversationId,
                                    senderId: newMsg.senderId,
                                    content: newMsg.content,
                                    messageType: newMsg.messageType || 'TEXT',
                                    mediaUrl: newMsg.mediaUrl,
                                    isEdited: false,
                                    isDeleted: false,
                                    createdAt: newMsg.createdAt,
                                };
                                set(state => ({
                                    messages: [...state.messages, msg],
                                }));
                            }
                        }

                        // Update conversation list (last message, unread count)
                        get().fetchConversations();

                        // Clear typing indicator for this user
                        set(state => {
                            const newTyping = new Map(state.typingUsers);
                            newTyping.delete(newMsg.senderId);
                            return { typingUsers: newTyping };
                        });
                    },
                },
                {
                    table: 'direct_messages',
                    event: 'UPDATE',
                    callback: (payload) => {
                        const updated = payload.new as any;
                        set(state => ({
                            messages: state.messages.map(m =>
                                m.id === updated.id
                                    ? { ...m, content: updated.content, isEdited: updated.isEdited, isDeleted: updated.isDeleted }
                                    : m
                            ),
                        }));
                    },
                },
                {
                    table: 'dm_conversations',
                    event: 'UPDATE',
                    callback: () => {
                        // Conversation metadata changed — refresh list
                        get().fetchConversations();
                    },
                },
            ]
        );

        set({ conversationsChannel });
    },

    subscribeToMessages: (conversationId: string) => {
        // Unsubscribe from previous active chat channels
        get().unsubscribeFromMessages();

        // Typing indicator channel (broadcast — no DB)
        const typingChannel = realtimeService.createBroadcastChannel(
            `typing:${conversationId}`,
            (event, payload) => {
                if (event === 'typing' && payload.conversationId === conversationId) {
                    set(state => {
                        const newTyping = new Map(state.typingUsers);
                        newTyping.set(payload.userId, {
                            userId: payload.userId,
                            firstName: payload.firstName,
                            timestamp: Date.now(),
                        });
                        return { typingUsers: newTyping };
                    });

                    // Clear typing after 3 seconds
                    setTimeout(() => {
                        set(state => {
                            const newTyping = new Map(state.typingUsers);
                            const entry = newTyping.get(payload.userId);
                            if (entry && Date.now() - entry.timestamp >= 2800) {
                                newTyping.delete(payload.userId);
                            }
                            return { typingUsers: newTyping };
                        });
                    }, 3000);
                }
            }
        );

        set({ typingChannel });
    },

    unsubscribeFromMessages: () => {
        const { activeConversationId } = get();
        if (activeConversationId) {
            realtimeService.unsubscribe(`typing:${activeConversationId}`);
        }
        set({ typingChannel: null, typingUsers: new Map() });
    },

    unsubscribeAll: () => {
        const { conversationsChannel, activeConversationId } = get();

        if (conversationsChannel) {
            supabase.removeChannel(conversationsChannel);
        }
        get().unsubscribeFromMessages();

        set({
            conversationsChannel: null,
            messagesChannel: null,
            typingChannel: null,
        });
    },

    // ========================================
    // Utility
    // ========================================

    setActiveConversation: (conversationId) => {
        set({
            activeConversationId: conversationId,
            messages: [],
            messagePage: 1,
            hasMoreMessages: true,
            typingUsers: new Map(),
        });
    },

    getUnreadCount: async () => {
        try {
            const response = await feedApi.get('/dm/unread-count');
            if (response.data.success) {
                set({ totalUnreadCount: response.data.count || 0 });
            }
        } catch (error) {
            console.error('Failed to get unread count:', error);
        }
    },

    reset: () => {
        get().unsubscribeAll();
        set(initialState);
    },
}));

export default useMessagingStore;
