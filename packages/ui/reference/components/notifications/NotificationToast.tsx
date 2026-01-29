"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, MessageCircle, AtSign, UserPlus, Bell } from "lucide-react";
import { useEffect } from "react";

interface NotificationToastProps {
  notification: {
    id: string;
    type: string;
    message: string;
    actor?: {
      name: string;
      avatar?: string;
    };
  } | null;
  onClose: () => void;
  autoCloseDuration?: number;
}

export default function NotificationToast({
  notification,
  onClose,
  autoCloseDuration = 5000,
}: NotificationToastProps) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [notification, autoCloseDuration, onClose]);

  const getIcon = () => {
    if (!notification) return null;

    switch (notification.type) {
      case "LIKE":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "COMMENT":
      case "REPLY":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "MENTION":
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case "FOLLOW":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 right-4 z-[100] max-w-md"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
            {/* Icon/Avatar */}
            <div className="flex-shrink-0">
              {notification.actor?.avatar ? (
                <img
                  src={notification.actor.avatar}
                  alt={notification.actor.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {getIcon()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                New Notification
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: autoCloseDuration / 1000, ease: "linear" }}
            className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-b-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
