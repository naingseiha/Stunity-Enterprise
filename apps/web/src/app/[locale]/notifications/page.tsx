"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  MessageCircle,
  Heart,
  UserPlus,
  Sparkles,
} from "lucide-react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { TokenManager } from "@/lib/api/auth";
import { AUTH_SERVICE_URL } from "@/lib/api/config";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName: string;
  };
}

function timeAgo(dateStr: string, isKm: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isKm ? "ឥឡូវនេះ" : "just now";
  if (mins < 60) return isKm ? `${mins} នាទីមុន` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isKm ? `${hrs} ម៉ោងមុន` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return isKm ? `${days} ថ្ងៃមុន` : `${days}d`;
}

function typeIcon(type: string) {
  const t = (type || "").toUpperCase();
  if (t.includes("MESSAGE") || t.includes("DM")) return MessageCircle;
  if (t.includes("LIKE") || t.includes("REACTION")) return Heart;
  if (t.includes("FOLLOW") || t.includes("CONNECTION")) return UserPlus;
  if (t.includes("ENDORSE") || t.includes("AWARD")) return Sparkles;
  return Bell;
}

export default function NotificationsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = use(props.params);
  const { locale } = params;
  const isKm = locale === "km";
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const data = TokenManager.getUserData();
    setUser(data.user);
    setSchool(data.school);
  }, [locale, router]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = TokenManager.getAccessToken();
      const url = `${AUTH_SERVICE_URL}/auth/notifications?page=1&limit=40${
        filter === "unread" ? "&unreadOnly=true" : ""
      }`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${AUTH_SERVICE_URL}/auth/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${AUTH_SERVICE_URL}/auth/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  const removeOne = async (id: string) => {
    try {
      const token = TokenManager.getAccessToken();
      await fetch(`${AUTH_SERVICE_URL}/auth/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    TokenManager.clearTokens();
    router.push(`/${locale}/auth/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="mobile-app-content max-w-2xl mx-auto px-0 md:px-4 pt-[calc(var(--top-bar-height)+env(safe-area-inset-top,0px))] md:pt-6 pb-24 md:pb-8">
        {/* Filters */}
        <div className="sticky top-[calc(var(--top-bar-height)+env(safe-area-inset-top,0px))] z-10 md:static flex items-center justify-between gap-2 px-4 py-3 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-800 md:border-0 md:bg-transparent md:backdrop-blur-none">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {isKm ? "ទាំងអស់" : "All"}
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === "unread"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {isKm ? "មិនទាន់អាន" : "Unread"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchNotifications}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 dark:hover:bg-gray-800"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={markAllRead}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200/60 dark:hover:bg-gray-800"
              aria-label={isKm ? "អានទាំងអស់" : "Mark all read"}
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">{isKm ? "កំពុងផ្ទុក…" : "Loading…"}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-orange-500" />
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
              {isKm ? "គ្មានការជូនដំណឹង" : "No notifications"}
            </p>
            <p className="text-sm text-gray-500">
              {isKm
                ? "នៅពេលមានសកម្មភាពថ្មី វានឹងបង្ហាញនៅទីនេះ"
                : "When something new happens, it will show up here"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {notifications.map((n) => {
              const Icon = typeIcon(n.type);
              const href = n.link
                ? n.link.startsWith("http")
                  ? n.link
                  : n.link.startsWith("/")
                    ? n.link
                    : `/${locale}/${n.link}`
                : null;

              const body = (
                <div
                  className={`flex gap-3 px-4 py-3.5 transition active:bg-gray-100 dark:active:bg-gray-900 ${
                    !n.isRead ? "bg-orange-50/60 dark:bg-orange-500/5" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      !n.isRead
                        ? "bg-orange-500 text-white"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {n.title}
                      </p>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {timeAgo(n.createdAt, isKm)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="p-1.5 rounded-full text-orange-500 hover:bg-orange-500/10"
                        aria-label="Mark read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeOne(n.id);
                      }}
                      className="p-1.5 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );

              return (
                <li key={n.id}>
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n.id);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
