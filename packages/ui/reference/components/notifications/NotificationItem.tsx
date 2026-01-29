"use client";

import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  BarChart3, 
  AtSign, 
  UserPlus, 
  Info,
  Check,
  Trash2,
  MoreVertical
} from "lucide-react";
import { useState } from "react";
import { Notification } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
  delay?: number;
}

export default function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  delay = 0
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case "LIKE":
        return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case "COMMENT":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "POLL_VOTE":
      case "POLL_RESULT":
        return <BarChart3 className="w-5 h-5 text-green-500" />;
      case "MENTION":
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case "FOLLOW":
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case "SYSTEM":
        return <Info className="w-5 h-5 text-gray-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTimeAgo = () => {
    try {
      return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`relative group ${
        !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div
        onClick={onClick}
        className="flex gap-3 p-4 cursor-pointer"
      >
        {/* Icon/Avatar */}
        <div className="flex-shrink-0">
          {notification.actor?.avatar ? (
            <img
              src={notification.actor.avatar}
              alt={notification.actor.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              {getIcon()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm text-gray-900 dark:text-white">
              {notification.actor && (
                <span className="font-bold">{notification.actor.name} </span>
              )}
              <span className="text-gray-600 dark:text-gray-400">
                {notification.message}
              </span>
            </p>

            {/* Unread indicator */}
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>

          {/* Post preview if available */}
          {notification.post && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-1">
              "{notification.post.content}"
            </p>
          )}

          {/* Time */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {getTimeAgo()}
          </p>
        </div>

        {/* Actions Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-opacity"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Actions Menu */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-2 top-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[150px]"
        >
          {notification.read ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsUnread();
                setShowActions(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="w-4 h-4 rounded-full border-2 border-blue-500" />
              Mark as unread
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
                setShowActions(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Check className="w-4 h-4 text-blue-500" />
              Mark as read
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowActions(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
