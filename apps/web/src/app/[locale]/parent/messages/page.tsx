'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  User,
  Search,
  Plus,
  Check,
  CheckCheck,
  Users,
} from 'lucide-react';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  khmerName?: string;
  photoUrl?: string;
  phone?: string;
  position?: string;
  homeroomClass?: {
    id: string;
    name: string;
    grade: string;
  };
}

interface Conversation {
  id: string;
  teacherId: string;
  parentId: string;
  studentId?: string;
  lastMessageAt: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName?: string;
    photoUrl?: string;
  };
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    studentId: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderType: 'TEACHER' | 'PARENT';
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'TEACHER' | 'PARENT';
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

const MESSAGING_API = 'http://localhost:3011';

export default function ParentMessagesPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    setUser(userData.user);
    setLoading(false);
    fetchConversations();
  }, [locale, router]);

  const fetchConversations = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_API}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_API}/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_API}/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTeachers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
    setShowNewChat(false);

    // Start polling for new messages
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      fetchMessages(conv.id);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_API}/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessage('');
        setTimeout(scrollToBottom, 100);
        fetchConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    setSending(false);
  };

  const startNewConversation = async (teacher: Teacher) => {
    try {
      const token = TokenManager.getAccessToken();
      const res = await fetch(`${MESSAGING_API}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetTeacherId: teacher.id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewChat(false);
        fetchConversations();
        selectConversation(data.data);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex h-[calc(100vh-200px)] min-h-[500px]">
          {/* Conversation List - Left Panel */}
          <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                  Messages
                </h1>
                <button
                  onClick={() => {
                    setShowNewChat(true);
                    setSelectedConversation(null);
                    fetchTeachers();
                  }}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm mt-1">Start a chat with a teacher</p>
                </div>
              ) : (
                conversations
                  .filter((c) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      c.teacher.firstName.toLowerCase().includes(q) ||
                      c.teacher.lastName.toLowerCase().includes(q) ||
                      c.teacher.khmerName?.toLowerCase().includes(q)
                    );
                  })
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        selectedConversation?.id === conv.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                        {conv.teacher.firstName[0]}{conv.teacher.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conv.teacher.firstName} {conv.teacher.lastName}
                          </h3>
                          {conv.lastMessage && (
                            <span className="text-xs text-gray-400">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {conv.lastMessage.senderType === 'PARENT' && 'You: '}
                            {conv.lastMessage.content}
                          </p>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-green-600 rounded-full mt-1">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Chat Window - Right Panel */}
          <div className={`flex-1 flex flex-col ${!selectedConversation && !showNewChat ? 'hidden md:flex' : 'flex'}`}>
            {showNewChat ? (
              /* New Chat - Teacher Selection */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="font-semibold text-gray-900">New Message</h2>
                </div>

                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4">Select a teacher to start a conversation:</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                  {teachers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No teachers found for your children</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {teachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => startNewConversation(teacher)}
                          className="w-full p-4 flex items-center gap-4 bg-gray-50 hover:bg-green-50 rounded-xl transition-colors text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {teacher.firstName} {teacher.lastName}
                            </h3>
                            {teacher.khmerName && (
                              <p className="text-sm text-gray-500" style={{ fontFamily: 'Battambang, sans-serif' }}>
                                {teacher.khmerName}
                              </p>
                            )}
                            {teacher.homeroomClass && (
                              <p className="text-xs text-green-600 mt-1">
                                Homeroom: {teacher.homeroomClass.name}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedConversation ? (
              /* Chat Messages */
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedConversation(null);
                      if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                    {selectedConversation.teacher.firstName[0]}{selectedConversation.teacher.lastName[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.teacher.firstName} {selectedConversation.teacher.lastName}
                    </h2>
                    {selectedConversation.student && (
                      <p className="text-xs text-gray-500">
                        About: {selectedConversation.student.firstName} {selectedConversation.student.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg, index) => {
                    const isMe = msg.senderType === 'PARENT';
                    const showTime =
                      index === 0 ||
                      new Date(msg.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000;

                    return (
                      <div key={msg.id}>
                        {showTime && (
                          <div className="text-center text-xs text-gray-400 mb-2">
                            {formatTime(msg.createdAt)}
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isMe
                                ? 'bg-green-600 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                              <span className="text-xs">
                                {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMe && (
                                msg.isRead ? (
                                  <CheckCheck className="w-4 h-4" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your Messages</h3>
                  <p className="text-gray-500 mb-4">
                    Select a conversation or start a new chat with a teacher
                  </p>
                  <button
                    onClick={() => {
                      setShowNewChat(true);
                      fetchTeachers();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    New Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
