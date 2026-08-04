'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { MESSAGING_SERVICE_URL } from '@/lib/api/config';
import { useAdminConversations, useMessageParents } from '@/hooks/useAdminMessaging';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Search,
  Plus,
  Check,
  CheckCheck,
  Users,
  Filter,
  X,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Copy,
  MoreVertical,
  Phone,
  Video,
  Sparkles,
  Clock,
  UserCheck,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { AdminConversation as Conversation, MessageParent as Parent } from '@/hooks/useAdminMessaging';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'TEACHER' | 'PARENT';
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'error';
}

// In-memory persistent cache for conversation messages across component switches
const messagesCacheMap: Record<string, Message[]> = {};

export default function TeacherMessagesPage(props: { params: Promise<{ locale: string }> }) {
  const autoT = useTranslations();
  const params = use(props.params);
  const { locale } = params;

  const router = useRouter();
  const t = useTranslations('common');
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      return TokenManager.getUserData()?.user || null;
    }
    return null;
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const { conversations, isLoading: conversationsLoading, mutate: mutateConversations } = useAdminConversations(!authChecking);
  const { parents, isLoading: parentsLoading } = useMessageParents(showNewChat);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auth check & initialization
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (!['TEACHER', 'ADMIN', 'STAFF'].includes(userData?.user?.role)) {
      router.replace(`/${locale}/parent`);
      return;
    }

    setUser(userData.user);
    setAuthChecking(false);
  }, [locale, router]);

  // Fetch messages for selected conversation with caching
  const fetchMessages = useCallback(async (conversationId: string, isSilent = false) => {
    if (!isSilent && !messagesCacheMap[conversationId]) {
      setFetchingMessages(true);
    }
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_SERVICE_URL}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        messagesCacheMap[conversationId] = data.data;
        setMessages(data.data);
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setFetchingMessages(false);
    }
  }, []);

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowNewChat(false);

    // Hydrate from cache immediately for 0ms load speed
    if (messagesCacheMap[conv.id]) {
      setMessages(messagesCacheMap[conv.id]);
      setTimeout(() => scrollToBottom('auto'), 50);
    } else {
      setMessages([]);
    }

    fetchMessages(conv.id);

    // Setup polling for live updates every 4 seconds
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      fetchMessages(conv.id, true);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Optimistic message sending for instantaneous feedback
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId: selectedConversation.id,
      senderId: user?.id || 'me',
      senderType: 'TEACHER',
      content: messageText,
      isRead: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // 1. Instant local state & cache update
    setMessages((prev) => {
      const updated = [...prev, optimisticMsg];
      messagesCacheMap[selectedConversation.id] = updated;
      return updated;
    });
    setNewMessage('');
    setTimeout(() => scrollToBottom('smooth'), 50);

    setSending(true);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_SERVICE_URL}/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: messageText }),
      });
      const data = await res.json();
      if (data.success) {
        const confirmedMsg: Message = { ...data.data, status: 'sent' };
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? confirmedMsg : m));
          messagesCacheMap[selectedConversation.id] = updated;
          return updated;
        });
        mutateConversations();
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'error' } : m))
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'error' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async (parent: Parent, studentId?: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_SERVICE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetParentId: parent.id,
          studentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewChat(false);
        await mutateConversations();
        selectConversation(data.data);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const copyMessageText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeFilter === 'unread' && c.unreadCount === 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.parent.firstName.toLowerCase().includes(q) ||
      c.parent.lastName.toLowerCase().includes(q) ||
      c.parent.khmerName?.toLowerCase().includes(q) ||
      c.student?.firstName.toLowerCase().includes(q) ||
      c.student?.lastName.toLowerCase().includes(q)
    );
  });

  const filteredParents = parents.filter((p) => {
    if (!parentSearchQuery.trim()) return true;
    const q = parentSearchQuery.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.khmerName?.toLowerCase().includes(q) ||
      p.phone.includes(parentSearchQuery) ||
      p.children.some(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.studentId?.includes(parentSearchQuery)
      )
    );
  });

  const quickEmojis = ['👍', '❤️', '😊', '🙏', '👏', '✅'];

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (authChecking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[calc(100vh-140px)] bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
            Loading Messaging Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
      {/* Outer Shell Card with Glassmorphism */}
      <div className="bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/5 border border-gray-200/80 dark:border-gray-800/80 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[620px]">
        
        {/* ================= LEFT PANEL: CONVERSATIONS LIST ================= */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200/70 dark:border-gray-800/70 flex flex-col bg-slate-50/50 dark:bg-gray-950/40 ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight kh-heading">
                    <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_ded483c0" />
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 kh-body">Teacher & Parent Portal</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowNewChat(true);
                  setSelectedConversation(null);
                }}
                className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-1 text-xs font-semibold"
                title="Start New Chat"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={autoT("auto.web.locale_dashboard_messages_page.k_43586819")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-gray-800/60 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All Chats
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
                  activeFilter === 'unread'
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>Unread</span>
                {conversations.some((c) => c.unreadCount > 0) && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Conversations List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40 scrollbar-on-hover">
            {conversationsLoading ? (
              // Skeleton Screen
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/60 dark:bg-gray-900/60 animate-pulse flex items-start gap-3 border border-gray-100 dark:border-gray-800">
                    <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-150 dark:bg-gray-850 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center min-h-[250px]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/40">
                  <MessageCircle className="w-7 h-7" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_d206b677" />
                </p>
                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                  <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_a9a1101d" />
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                >
                  Start Conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full p-3.5 flex items-start gap-3 transition-all duration-200 text-left border-l-4 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 shadow-sm'
                        : 'border-transparent hover:bg-white/80 dark:hover:bg-gray-900/60'
                    }`}
                  >
                    {/* Avatar with status indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-teal-500/20 ring-2 ring-white dark:ring-gray-900">
                        {conv.parent.firstName[0]}
                        {conv.parent.lastName[0]}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" title="Active parent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                          {conv.parent.firstName} {conv.parent.lastName}
                        </h3>
                        {conv.lastMessage && (
                          <span className="text-[11px] font-medium text-gray-400 flex-shrink-0">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      {conv.student && (
                        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_7c408ca7" /> {conv.student.firstName} {conv.student.lastName}
                        </p>
                      )}

                      {conv.lastMessage && (
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {conv.lastMessage.senderType === 'TEACHER' && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">You: </span>
                          )}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-sm shadow-blue-500/30 flex-shrink-0 self-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL: CHAT WINDOW ================= */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${!selectedConversation && !showNewChat ? 'hidden md:flex' : 'flex'}`}>
          {showNewChat ? (
            /* New Chat Parent Selection View */
            <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-gray-950/20">
              <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors md:hidden text-gray-600 dark:text-gray-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2 kh-heading">
                      <Users className="w-5 h-5 text-blue-600" />
                      <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_06bf41de" />
                    </h2>
                    <p className="text-xs text-gray-500">Select a parent or student to message</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-gray-900/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={autoT("auto.web.locale_dashboard_messages_page.k_de60a51a")}
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-on-hover">
                {parentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-800 animate-pulse space-y-3 border border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-150 dark:bg-gray-750 rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : filteredParents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                    <p className="font-semibold text-gray-900 dark:text-white">
                      <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_45f9f932" />
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_32e62ae0" />
                    </p>
                  </div>
                ) : (
                  filteredParents.map((parent) => (
                    <div
                      key={parent.id}
                      className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 shadow-sm border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20">
                          {parent.firstName[0]}
                          {parent.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                            {parent.firstName} {parent.lastName}
                          </h3>
                          {parent.khmerName && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium kh-body">
                              {parent.khmerName}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">{parent.phone}</p>
                        </div>
                      </div>

                      {/* Children options */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_46ca7109" />
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {parent.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => startNewConversation(parent, child.id)}
                              className="px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 transition-all flex items-center gap-1.5 shadow-2xs"
                            >
                              <span>
                                {child.firstName} {child.lastName}
                              </span>
                              {child.class && (
                                <span className="px-1.5 py-0.5 bg-blue-200/60 dark:bg-blue-900/80 rounded-md text-[10px] font-bold text-blue-900 dark:text-blue-100">
                                  {child.class.name}
                                </span>
                              )}
                              <ChevronRight className="w-3 h-3 text-blue-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : selectedConversation ? (
            /* Active Chat Messages Window */
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-4 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      if (pollingRef.current) clearInterval(pollingRef.current);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors md:hidden text-gray-600 dark:text-gray-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-teal-500/20">
                      {selectedConversation.parent.firstName[0]}
                      {selectedConversation.parent.lastName[0]}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                      {selectedConversation.parent.firstName} {selectedConversation.parent.lastName}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Active Now
                      </span>
                      {selectedConversation.student && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                          • <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_7c408ca7" /> {selectedConversation.student.firstName} {selectedConversation.student.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchMessages(selectedConversation.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    title="Refresh Messages"
                  >
                    <RefreshCw className={`w-4.5 h-4.5 ${fetchingMessages ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-gray-950/40 scrollbar-on-hover">
                {fetchingMessages && messages.length === 0 ? (
                  <div className="space-y-4 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="w-2/3 h-12 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                    <Sparkles className="w-10 h-10 mb-2 text-blue-400 opacity-60" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No messages yet</p>
                    <p className="text-xs text-gray-500 max-w-xs mt-1">
                      Send a message to start communicating with {selectedConversation.parent.firstName}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderType === 'TEACHER';
                    const showDateHeader =
                      index === 0 ||
                      new Date(msg.createdAt).toDateString() !==
                        new Date(messages[index - 1].createdAt).toDateString();

                    return (
                      <div key={msg.id || index}>
                        {showDateHeader && (
                          <div className="flex justify-center my-3">
                            <span className="px-3 py-1 bg-white/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 text-[11px] font-semibold rounded-full shadow-2xs">
                              {formatDateHeader(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {/* Copy quick action button */}
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center ${isMe ? 'order-1' : 'order-2'}`}>
                            <button
                              onClick={() => copyMessageText(msg.id, msg.content)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800"
                              title="Copy message"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl relative shadow-sm transition-all ${
                              isMe
                                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-br-xs shadow-blue-500/10'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/70 dark:border-gray-700/70 rounded-bl-xs'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-sans">
                              {msg.content}
                            </p>

                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${
                                isMe ? 'text-blue-100/90' : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>

                              {isMe && (
                                msg.status === 'sending' ? (
                                  <Clock className="w-3 h-3 animate-spin text-blue-200" />
                                ) : msg.status === 'error' ? (
                                  <span title="Failed to send">
                                    <AlertCircle className="w-3 h-3 text-red-300" />
                                  </span>
                                ) : msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-blue-200" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Emoji Bar & Input Section */}
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200/70 dark:border-gray-800/70">
                {/* Quick Reaction Emojis */}
                {showEmojiPicker && (
                  <div className="mb-2 p-2 bg-slate-100 dark:bg-gray-800 rounded-xl flex items-center gap-2 animate-fadeIn">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => addEmoji(emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="p-2.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    title="Insert emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={autoT("auto.web.locale_dashboard_messages_page.k_50f3ace3")}
                    className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State when no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30 dark:bg-gray-950/20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/5 animate-float">
                <MessageCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 kh-heading">
                <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_3d76a2ab" />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
                <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_8c4c3738" />
              </p>

              <button
                onClick={() => setShowNewChat(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <AutoI18nText i18nKey="auto.web.locale_dashboard_messages_page.k_839197bf" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
