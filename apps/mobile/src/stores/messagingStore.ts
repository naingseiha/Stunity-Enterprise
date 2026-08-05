/**
 * Messaging Store
 * 
 * Manages school messaging with REST as the source of truth.
 * Supabase Realtime, Broadcast, and Presence remain isolated behind a
 * separate security flag; screens use lifecycle-aware polling by default.
 */

import { create } from 'zustand';
import { messagingApi } from '@/api/client';
import { fetchPresenceBatch } from '@/api/presence';
import { useAuthStore } from './authStore';
import { supabase } from '@/lib/supabase';
import { realtimeService } from '@/services/realtimeService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { debounce } from '@/utils/debounce';
import { FEATURE_FLAGS } from '@/config/featureFlags';

const debouncedFetchConversations = debounce(() => {
    useMessagingStore.getState().fetchConversations();
}, 1000);

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

/** Directory row from GET /parents or GET /teachers for composing school chats. */
export interface MessagingDirectoryPerson {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    photoUrl?: string;
    phone?: string;
    children?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        studentId?: string;
        class?: { id: string; name: string; grade?: string } | null;
    }>;
    homeroomClass?: { id: string; name: string; grade?: string } | null;
    position?: string | null;
}

export type StartSchoolConversationInput = {
    targetParentId?: string;
    targetTeacherId?: string;
    studentId?: string;
};

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

    /** Last successful conversations list fetch (for focus deduping) */
    lastConversationsFetchedAt: number;

    // Actions — Conversations
    fetchConversations: () => Promise<void>;
    fetchMessagingDirectory: (search?: string) => Promise<MessagingDirectoryPerson[]>;
    startSchoolConversation: (input: StartSchoolConversationInput) => Promise<DMConversation | null>;
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
    lastConversationsFetchedAt: 0,
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
            const response = await messagingApi.get('/conversations');

            if (response.data.success) {
                // messaging-service returns data in 'data' field
                const conversations: DMConversation[] = (response.data.data || []).map((c: any) => {
                    const { role } = useAuthStore.getState().user || {};
                    
                    // Map teacher/parent/student to participants
                    const participants: DMUser[] = [];
                    if (c.teacher) participants.push({ 
                        id: c.teacher.id, 
                        firstName: c.teacher.firstName, 
                        lastName: c.teacher.lastName, 
                        profilePictureUrl: c.teacher.photoUrl 
                    });
                    if (c.parent) participants.push({ 
                        id: c.parent.id, 
                        firstName: c.parent.firstName, 
                        lastName: c.parent.lastName 
                    });

                    // Determine display name
                    let displayName = 'Unknown';
                    let displayAvatar = undefined;

                    if (role === 'PARENT' && c.teacher) {
                        displayName = `${c.teacher.firstName} ${c.teacher.lastName}`;
                        displayAvatar = c.teacher.photoUrl;
                    } else if (c.parent) {
                        displayName = `${c.parent.firstName} ${c.parent.lastName}`;
                    }

                    return {
                        id: c.id,
                        isGroup: false, // messaging-service currently 1:1
                        lastMessage: c.lastMessage ? {
                            content: c.lastMessage.content,
                            createdAt: c.lastMessage.createdAt,
                            senderId: c.lastMessage.senderId,
                        } : undefined,
                        lastMessageAt: c.lastMessageAt,
                        unreadCount: c.unreadCount || 0,
                        participants,
                        displayName,
                        displayAvatar,
                    };
                });

                let presenceMap: Record<string, boolean> = {};
                const participantIds = [
                    ...new Set(
                        conversations.flatMap((conversation) =>
                            conversation.participants.map((participant) => participant.id)
                        )
                    ),
                ];

                if (FEATURE_FLAGS.MESSAGING_REALTIME_ENABLED && participantIds.length > 0) {
                    try {
                        presenceMap = await fetchPresenceBatch(participantIds);
                    } catch (error) {
                        if (__DEV__) {
                            console.warn('[Messaging] Failed to fetch participant presence:', error);
                        }
                    }
                }

                const conversationsWithPresence = conversations.map((conversation) => ({
                    ...conversation,
                    participants: conversation.participants.map((participant) => ({
                        ...participant,
                        isOnline: presenceMap[participant.id] ?? false,
                    })),
                }));

                const totalUnreadCount = conversationsWithPresence.reduce((sum, c) => sum + c.unreadCount, 0);
                const onlineUsers = new Set(
                    Object.entries(presenceMap)
                        .filter(([, isOnline]) => isOnline)
                        .map(([userId]) => userId)
                );

                set({
                    conversations: conversationsWithPresence,
                    totalUnreadCount,
                    onlineUsers,
                    isLoadingConversations: false,
                    lastConversationsFetchedAt: Date.now(),
                });
            } else {
                set({ isLoadingConversations: false });
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            set({ isLoadingConversations: false });
        }
    },

    fetchMessagingDirectory: async (search) => {
        try {
            const { user } = useAuthStore.getState();
            if (!user) return [];

            const trimmed = search?.trim();
            if (user.role === 'PARENT') {
                const response = await messagingApi.get('/teachers');
                const rows: MessagingDirectoryPerson[] = response.data?.success
                    ? (response.data.data || [])
                    : [];
                if (!trimmed) return rows;
                const q = trimmed.toLowerCase();
                return rows.filter((row) =>
                    `${row.firstName} ${row.lastName} ${row.name || ''} ${row.position || ''}`
                        .toLowerCase()
                        .includes(q)
                );
            }

            const response = await messagingApi.get('/parents', {
                params: trimmed ? { search: trimmed } : undefined,
            });
            return response.data?.success ? (response.data.data || []) : [];
        } catch (error) {
            console.error('Failed to fetch messaging directory:', error);
            return [];
        }
    },

    startSchoolConversation: async (input) => {
        try {
            const { user } = useAuthStore.getState();
            if (!user) return null;

            const payload: StartSchoolConversationInput = {};
            if (input.targetTeacherId) payload.targetTeacherId = input.targetTeacherId;
            if (input.targetParentId) payload.targetParentId = input.targetParentId;
            if (input.studentId) payload.studentId = input.studentId;

            if (!payload.targetParentId && !payload.targetTeacherId) {
                return null;
            }

            const response = await messagingApi.post('/conversations', payload);
            if (!response.data?.success || !response.data?.data?.id) {
                return null;
            }

            await get().fetchConversations();
            const createdId = response.data.data.id as string;
            const fromList = get().conversations.find((c) => c.id === createdId);
            if (fromList) return fromList;

            return {
                id: createdId,
                isGroup: false,
                lastMessageAt: response.data.data.lastMessageAt || new Date().toISOString(),
                unreadCount: 0,
                participants: [],
                displayName: 'Conversation',
            };
        } catch (error) {
            console.error('Failed to start school conversation:', error);
            return null;
        }
    },

    startConversation: async (participantIds) => {
        // Legacy helper used by class screens: treat first id as parent/teacher roster id.
        const { user } = useAuthStore.getState();
        if (!user || !participantIds[0]) return null;
        if (user.role === 'PARENT') {
            return get().startSchoolConversation({ targetTeacherId: participantIds[0] });
        }
        return get().startSchoolConversation({ targetParentId: participantIds[0] });
    },

    leaveConversation: async (conversationId) => {
        try {
            await messagingApi.put(`/conversations/${conversationId}/archive`);
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
            const response = await messagingApi.get(`/conversations/${conversationId}/messages`, {
                params: { page, limit: 50 },
            });

            if (response.data.success) {
                // messaging-service returns messages directly in 'data'
                const fetchedMessages: DirectMessage[] = (response.data.data || []).map((m: any) => ({
                    id: m.id,
                    conversationId: m.conversationId,
                    senderId: m.senderId,
                    content: m.content,
                    messageType: m.messageType || 'TEXT',
                    isEdited: m.isEdited || false,
                    isDeleted: m.isDeleted || false,
                    createdAt: m.createdAt,
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
            const response = await messagingApi.post(`/conversations/${conversationId}/messages`, {
                content,
                messageType,
            });

            if (response.data.success) {
                const realMessage = response.data.data;
                // Replace the optimistic message with the real one
                set(state => ({
                    messages: state.messages.map(m =>
                        m._tempId === tempId
                            ? {
                                id: realMessage.id,
                                conversationId: realMessage.conversationId,
                                senderId: realMessage.senderId,
                                content: realMessage.content,
                                messageType: realMessage.messageType || 'TEXT',
                                createdAt: realMessage.createdAt,
                                isEdited: false,
                                isDeleted: false,
                                _isPending: false
                            }
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
            await messagingApi.put(`/messages/${messageId}`, { content });
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
            await messagingApi.delete(`/messages/${messageId}`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    },

    markAsRead: async (conversationId) => {
        // Optimistic local unread clear, then persist via API.
        set((state) => {
            const conversations = state.conversations.map((conversation) =>
                conversation.id === conversationId
                    ? { ...conversation, unreadCount: 0 }
                    : conversation,
            );
            return {
                conversations,
                totalUnreadCount: conversations.reduce(
                    (sum, conversation) => sum + (conversation.unreadCount || 0),
                    0,
                ),
            };
        });

        try {
            await messagingApi.put(`/conversations/${conversationId}/read-all`);
        } catch (error) {
            console.error('Failed to mark as read:', error);
            void get().getUnreadCount();
        }
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
        if (!FEATURE_FLAGS.MESSAGING_REALTIME_ENABLED) return;
        const { unsubscribeAll } = get();

        // Subscribe to new messages across all conversations
        const conversationsChannel = realtimeService.subscribeMultiple(
            `dm:user:${userId}`,
            [
                {
                    table: 'messages',
                    event: 'INSERT',
                    callback: (payload) => {
                        const newMsg = payload.new as any;
                        const { activeConversationId, messages, conversations } = get();

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
                                    isEdited: false,
                                    isDeleted: false,
                                    createdAt: newMsg.createdAt,
                                };
                                set(state => ({
                                    messages: [...state.messages, msg],
                                }));
                            }
                        }

                        // Patch conversation list locally; full fetch only if unknown or debounced
                        const currentUserId = useAuthStore.getState().user?.id;
                        const convIndex = conversations.findIndex(
                            (c) => c.id === newMsg.conversationId,
                        );

                        if (convIndex >= 0) {
                            const updatedConversations = [...conversations];
                            const conv = { ...updatedConversations[convIndex] };
                            conv.lastMessage = {
                                content: newMsg.content,
                                createdAt: newMsg.createdAt,
                                senderId: newMsg.senderId,
                            };
                            conv.lastMessageAt = newMsg.createdAt;
                            if (
                                newMsg.conversationId !== activeConversationId &&
                                newMsg.senderId !== currentUserId
                            ) {
                                conv.unreadCount = (conv.unreadCount || 0) + 1;
                            }
                            updatedConversations.splice(convIndex, 1);
                            updatedConversations.unshift(conv);
                            const totalUnreadCount = updatedConversations.reduce(
                                (sum, c) => sum + (c.unreadCount || 0),
                                0,
                            );
                            set({ conversations: updatedConversations, totalUnreadCount });
                        } else {
                            debouncedFetchConversations();
                        }

                        // Clear typing indicator for this user
                        set(state => {
                            const newTyping = new Map(state.typingUsers);
                            newTyping.delete(newMsg.senderId);
                            return { typingUsers: newTyping };
                        });
                    },
                },
                {
                    table: 'messages',
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
                    table: 'conversations',
                    event: 'UPDATE',
                    callback: () => {
                        // Conversation metadata changed — debounced refresh
                        debouncedFetchConversations();
                    },
                },
            ]
        );

        set({ conversationsChannel });
    },

    subscribeToMessages: (conversationId: string) => {
        if (!FEATURE_FLAGS.MESSAGING_REALTIME_ENABLED) return;
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
            const response = await messagingApi.get('/unread-count');
            if (response.data.success) {
                set({ totalUnreadCount: response.data.data.unreadCount || 0 });
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
