"use client";

import { motion } from "framer-motion";
import { X, Bell, BellOff, Volume2, VolumeX, Mail } from "lucide-react";
import { useState } from "react";

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState({
    likes: true,
    comments: true,
    polls: true,
    mentions: true,
    follows: true,
    system: true,
    soundEnabled: true,
    emailEnabled: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationTypes = [
    { key: 'likes' as const, label: 'Likes', description: 'When someone likes your post', icon: '❤️' },
    { key: 'comments' as const, label: 'Comments', description: 'When someone comments on your post', icon: '💬' },
    { key: 'polls' as const, label: 'Polls', description: 'Poll votes and results', icon: '📊' },
    { key: 'mentions' as const, label: 'Mentions', description: 'When someone mentions you', icon: '@' },
    { key: 'follows' as const, label: 'Follows', description: 'New followers', icon: '👥' },
    { key: 'system' as const, label: 'System', description: 'Important updates and announcements', icon: 'ℹ️' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Notification Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Notification Types */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Notification Types
            </h3>
            <div className="space-y-3">
              {notificationTypes.map((type) => (
                <div
                  key={type.key}
                  className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {type.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(type.key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      settings[type.key] ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings[type.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Additional Settings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Additional Settings
            </h3>
            <div className="space-y-3">
              {/* Sound */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-purple-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Sound
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Play sound for notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('soundEnabled')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    settings.soundEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className={`w-5 h-5 ${settings.emailEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Email Notifications
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('emailEnabled')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    settings.emailEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Stay Updated
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  We'll only send you important notifications. You can change these settings anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
