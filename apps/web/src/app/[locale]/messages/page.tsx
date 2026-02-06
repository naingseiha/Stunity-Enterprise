'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle,
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Loader2,
  Plus,
  X,
  User,
  Bell,
  BellOff,
  Trash2,
  Reply,
  Edit3,
} from 'lucide-react';
import { useMessageUpdates, SSEEvent } from '@/hooks/useEventStream';
import { TokenManager } from '@/lib/api/auth';

interface Conversation {
  id: string;
  displayName: string;
  displayAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isMuted: boolean;
  isGroup: boolean;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
    headline?: string;
  }[];
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  mediaUrl?: string;
  senderId: string;
  createdAt: string;
  isEdited: boolean;
  isDeleted: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string; lastName: string };
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  headline?: string;
}

const FEED_API = process.env.NEXT_PUBLIC_FEED_API_URL || 'http://localhost:3010';

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return TokenManager.getAccessToken();
    }
    return null;
  };

  const getCurrentUserId = () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr).id;
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  const currentUserId = getCurrentUserId();

  // SSE for real-time updates
  const { messages: sseMessages, isConnected } = useMessageUpdates(currentUserId);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/dm/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/dm/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.conversation.messages);
        // Update active conversation with full details
        setActiveConversation(prev => ({
          ...prev!,
          participants: data.conversation.participants.map((p: any) => p.user),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle SSE events for real-time updates
  useEffect(() => {
    if (sseMessages.length > 0) {
      const latestEvent = sseMessages[0];
      
      if (latestEvent.type === 'NEW_DM') {
        // Refresh conversations and messages if active
        fetchConversations();
        if (activeConversation && activeConversation.id === latestEvent.data.conversationId) {
          fetchMessages(activeConversation.id);
        }
      } else if (latestEvent.type === 'TYPING_START') {
        if (activeConversation && activeConversation.id === latestEvent.data.conversationId) {
          setTypingUsers(prev => 
            prev.includes(latestEvent.data.userId!) 
              ? prev 
              : [...prev, latestEvent.data.userId!]
          );
        }
      } else if (latestEvent.type === 'TYPING_STOP') {
        if (activeConversation && activeConversation.id === latestEvent.data.conversationId) {
          setTypingUsers(prev => prev.filter(id => id !== latestEvent.data.userId));
        }
      }
    }
  }, [sseMessages, activeConversation, fetchConversations, fetchMessages]);

  // Handle conversation from URL param
  useEffect(() => {
    const conversationId = searchParams.get('c');
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setActiveConversation(conv);
        fetchMessages(conversationId);
      }
    }
  }, [searchParams, conversations, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || isSending) return;
    
    const token = getToken();
    if (!token) return;

    setIsSending(true);
    try {
      const res = await fetch(`${FEED_API}/dm/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          replyToId: replyingTo?.id,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setReplyingTo(null);
        
        // Update conversation list
        setConversations(prev => 
          prev.map(c => 
            c.id === activeConversation.id 
              ? { ...c, lastMessage: newMessage.slice(0, 100), lastMessageAt: new Date().toISOString() }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!activeConversation) return;
    
    const token = getToken();
    if (!token) return;

    if (!isTyping) {
      setIsTyping(true);
      fetch(`${FEED_API}/dm/conversations/${activeConversation.id}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isTyping: true }),
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch(`${FEED_API}/dm/conversations/${activeConversation.id}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isTyping: false }),
      });
    }, 2000);
  };

  // Search users for new chat
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchUsers([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    setIsSearching(true);
    try {
      // Using the profile search endpoint (you may need to create this)
      const res = await fetch(`${FEED_API}/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSearchUsers(data.users.filter((u: User) => u.id !== currentUserId));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Start new conversation
  const handleStartConversation = async (user: User) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${FEED_API}/dm/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantIds: [user.id],
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        const newConv: Conversation = {
          id: data.conversation.id,
          displayName: `${user.firstName} ${user.lastName}`,
          displayAvatar: user.profilePictureUrl,
          lastMessage: null,
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          isMuted: false,
          isGroup: false,
          participants: [user],
        };
        
        if (data.isNew) {
          setConversations(prev => [newConv, ...prev]);
        }
        
        setActiveConversation(newConv);
        setMessages([]);
        setShowNewChat(false);
        setSearchQuery('');
        setSearchUsers([]);
        
        router.push(`/${locale}/messages?c=${data.conversation.id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  // Select conversation
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
    router.push(`/${locale}/messages?c=${conv.id}`);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(c =>
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto h-screen flex">
        {/* Conversation List */}
        <div className={`w-full md:w-96 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link href={`/${locale}/feed`} className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
                {isConnected && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Connected" />
                )}
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={showNewChat ? searchQuery : ''}
                onChange={(e) => showNewChat ? handleSearchUsers(e.target.value) : setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100/80 dark:bg-gray-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:bg-white dark:focus:bg-gray-700 transition-all"
              />
            </div>
          </div>

          {/* New Chat Modal */}
          {showNewChat && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white">New Message</h2>
                  <button onClick={() => { setShowNewChat(false); setSearchQuery(''); setSearchUsers([]); }}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                {isSearching && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                )}
                
                {searchUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-colors"
                  >
                    {user.profilePictureUrl ? (
                      <img src={user.profilePictureUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-100 dark:ring-orange-900/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
                      {user.headline && <p className="text-sm text-gray-500">{user.headline}</p>}
                    </div>
                  </button>
                ))}
                
                {searchQuery && !isSearching && searchUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No users found</p>
                )}
              </div>
            </div>
          )}

          {/* Conversations List */}
          {!showNewChat && (
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-orange-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No messages yet</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  >
                    Start a conversation
                  </button>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all ${
                      activeConversation?.id === conv.id ? 'bg-orange-50 dark:bg-orange-900/20 border-l-3 border-orange-500' : ''
                    }`}
                  >
                    {conv.displayAvatar ? (
                      <img src={conv.displayAvatar} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-md" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                        {conv.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{conv.displayName}</p>
                        <span className="text-xs text-gray-500">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage || 'No messages yet'}</p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 min-w-[20px] h-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-medium rounded-full flex items-center justify-center shadow-sm">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {activeConversation.displayAvatar ? (
                    <img src={activeConversation.displayAvatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-100 dark:ring-orange-900/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold shadow-md">
                      {activeConversation.displayName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{activeConversation.displayName}</p>
                    {typingUsers.length > 0 ? (
                      <p className="text-xs text-orange-500 flex items-center gap-1">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        typing...
                      </p>
                    ) : (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Online
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                  const isOwn = msg.senderId === currentUserId;
                  const showAvatar = !isOwn && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                  
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : ''}`}>
                      {!isOwn && showAvatar && (
                        msg.sender.profilePictureUrl ? (
                          <img src={msg.sender.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-semibold">
                            {msg.sender.firstName[0]}{msg.sender.lastName[0]}
                          </div>
                        )
                      )}
                      {!isOwn && !showAvatar && <div className="w-8" />}
                      
                      <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                        {msg.replyTo && (
                          <div className="mb-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 border-l-2 border-orange-500">
                            <span className="font-medium">{msg.replyTo.sender.firstName}:</span> {msg.replyTo.content.slice(0, 50)}...
                          </div>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-md shadow-md shadow-orange-500/20'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-sm'
                          }`}
                        >
                          {msg.isDeleted ? (
                            <span className="italic text-gray-400">Message deleted</span>
                          ) : (
                            <p className="break-words">{msg.content}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : ''}`}>
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isEdited && <span>· edited</span>}
                          {isOwn && <CheckCheck className="w-3 h-3 text-orange-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview */}
              {replyingTo && (
                <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200/50 dark:border-orange-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-500">Replying to {replyingTo.sender.firstName}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{replyingTo.content}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:bg-white dark:focus:bg-gray-700 transition-all"
                  />
                  <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className={`p-3 rounded-xl transition-all ${
                      newMessage.trim()
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/25 hover:scale-105'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty state
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-12 h-12 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Messages</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Send private messages to friends and connections</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:scale-105"
                >
                  Start a Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
