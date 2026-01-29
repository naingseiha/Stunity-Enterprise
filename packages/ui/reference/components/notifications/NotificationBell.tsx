"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, Settings } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import NotificationItem from "./NotificationItem";
import NotificationSettings from "./NotificationSettings";
import NotificationToast from "./NotificationToast";
import { Notification } from "@/types/notification";
import * as notificationsApi from "@/lib/api/notifications";
import { socketClient } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getNotifications({ page: 1, limit: 20 });

      // Map backend response to frontend format
      const mappedNotifications: Notification[] = response.data.map((notif: any) => ({
        id: notif.id,
        type: notif.type as any,
        title: notif.title,
        message: notif.message,
        read: notif.isRead,
        createdAt: notif.createdAt,
        actor: notif.actor ? {
          id: notif.actor.id,
          name: `${notif.actor.firstName} ${notif.actor.lastName}`,
          avatar: notif.actor.profilePictureUrl,
        } : undefined,
        link: notif.link,
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(response.unreadCount);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time Socket.IO event listener for new notifications
  useEffect(() => {
    if (!currentUser) return;

    // Handle new notification event from Socket.IO
    const handleNewNotification = (notification: any) => {
      console.log("📬 New notification received via Socket.IO:", notification);

      // Map backend notification to frontend format
      const mappedNotification: Notification = {
        id: notification.id,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        read: notification.isRead || false,
        createdAt: notification.createdAt,
        actor: notification.actor ? {
          id: notification.actor.id,
          name: `${notification.actor.firstName} ${notification.actor.lastName}`,
          avatar: notification.actor.profilePictureUrl,
        } : undefined,
        link: notification.link,
      };

      // Add new notification to the top of the list
      setNotifications((prev) => [mappedNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setHasNewNotification(true);

      // Show toast notification
      setToastNotification(mappedNotification);

      // Play notification sound
      playNotificationSound();

      // Show visual indicator for 3 seconds
      setTimeout(() => setHasNewNotification(false), 3000);
    };

    // Listen to the Socket.IO event
    socketClient.on("notification:new", handleNewNotification);

    // Cleanup listener on unmount
    return () => {
      socketClient.off("notification:new", handleNewNotification);
    };
  }, [currentUser]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/notification.mp3");
        audioRef.current.volume = 0.5;
      }
      audioRef.current.play().catch((error) => {
        console.log("Could not play notification sound:", error);
      });
    } catch (error) {
      console.log("Notification sound not available");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markNotificationAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAsUnread = (id: string) => {
    // Optimistic update
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: false } : n
    ));
    setUnreadCount(unreadCount + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
      const notification = notifications.find(n => n.id === id);
      setNotifications(notifications.filter(n => n.id !== id));

      // Update unread count if deleted notification was unread
      if (notification && !notification.read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={hasNewNotification ? {
          rotate: [0, -15, 15, -15, 15, 0],
          transition: { duration: 0.5 }
        } : {}}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5 shadow-lg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}

        {/* Pulse animation for new notifications */}
        {hasNewNotification && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1.5, 1.5, 1],
              opacity: [0.7, 0, 0, 0, 0.7]
            }}
            transition={{
              duration: 1,
              repeat: 3,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-blue-500"
          />
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowSettings(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-auto"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full"
                  />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    All caught up!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    You have no new notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                      onMarkAsUnread={() => handleMarkAsUnread(notification.id)}
                      onDelete={() => handleDelete(notification.id)}
                      delay={index * 0.05}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Toast Notification */}
      <NotificationToast
        notification={toastNotification}
        onClose={() => setToastNotification(null)}
      />
    </div>
  );
}
