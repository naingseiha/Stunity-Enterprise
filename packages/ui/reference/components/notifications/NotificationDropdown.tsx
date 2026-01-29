"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  CheckCheck,
  Trash2,
  Loader2,
  Bell,
  BellOff,
} from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  Notification,
} from "@/lib/api/notifications";
import { useRouter } from "next/navigation";

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationRead: () => void;
  onMarkAllAsRead: () => void;
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  MENTION: AtSign,
  FOLLOW: UserPlus,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  LIKE: "text-red-500",
  COMMENT: "text-blue-500",
  REPLY: "text-blue-500",
  MENTION: "text-purple-500",
  FOLLOW: "text-green-500",
};

export default function NotificationDropdown({
  onClose,
  onNotificationRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [showUnreadOnly, page]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await getNotifications({
        page,
        limit: 10,
        unreadOnly: showUnreadOnly,
      });
      
      if (page === 1) {
        setNotifications(response.data);
      } else {
        setNotifications((prev) => [...prev, ...response.data]);
      }
      
      setHasMore(response.pagination.hasMore);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if unread
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
        onNotificationRead();
      }

      // Navigate to link if provided
      if (notification.link) {
        router.push(notification.link);
        onClose();
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      onMarkAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDeleteNotification = async (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const Icon = NOTIFICATION_ICONS[type] || Bell;
    const color = NOTIFICATION_COLORS[type] || "text-gray-500";
    return <Icon className={`w-5 h-5 ${color}`} />;
  };

  const getAvatarText = (actor: any) => {
    if (!actor) return "?";
    return `${actor.firstName?.[0] || ""}${actor.lastName?.[0] || ""}`.toUpperCase();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowUnreadOnly(false);
              setPage(1);
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
              !showUnreadOnly
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setShowUnreadOnly(true);
              setPage(1);
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
              showUnreadOnly
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[450px]">
        {isLoading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BellOff className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {showUnreadOnly
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""
                }`}
              >
                {/* Avatar/Icon */}
                <div className="relative flex-shrink-0">
                  {notification.actor?.profilePictureUrl ? (
                    <img
                      src={notification.actor.profilePictureUrl}
                      alt={`${notification.actor.firstName} ${notification.actor.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {getAvatarText(notification.actor)}
                    </div>
                  )}
                  {/* Type Icon Badge */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                  <button
                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={isLoading}
                className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
