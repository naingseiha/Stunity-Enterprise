"use client";

import React from "react";
import { AlertTriangle, Clock, Lock, X } from "lucide-react";

interface PasswordExpiryWarningProps {
  isDefaultPassword: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  alertLevel: "none" | "info" | "warning" | "danger" | "expired";
  onChangePassword: () => void;
  onDismiss?: () => void;
  canDismiss?: boolean;
}

export default function PasswordExpiryWarning({
  isDefaultPassword,
  daysRemaining,
  hoursRemaining,
  alertLevel,
  onChangePassword,
  onDismiss,
  canDismiss = true,
}: PasswordExpiryWarningProps) {
  // Show warning for all default passwords, not just when alertLevel is active
  if (!isDefaultPassword) {
    return null;
  }

  const getAlertStyles = () => {
    switch (alertLevel) {
      case "danger":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          text: "text-red-800 dark:text-red-200",
          button: "bg-red-600 hover:bg-red-700 text-white",
          icon: "text-red-600 dark:text-red-400",
        };
      case "warning":
        return {
          bg: "bg-orange-50 dark:bg-orange-900/20",
          border: "border-orange-200 dark:border-orange-800",
          text: "text-orange-800 dark:text-orange-200",
          button: "bg-orange-600 hover:bg-orange-700 text-white",
          icon: "text-orange-600 dark:text-orange-400",
        };
      case "info":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800",
          text: "text-blue-900 dark:text-blue-100",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
          icon: "text-blue-700 dark:text-blue-300",
        };
      default:
        return {
          bg: "bg-gray-50 dark:bg-gray-900/20",
          border: "border-gray-200 dark:border-gray-800",
          text: "text-gray-800 dark:text-gray-200",
          button: "bg-gray-600 hover:bg-gray-700 text-white",
          icon: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const getMessage = () => {
    if (alertLevel === "expired") {
      return {
        title: "ពាក្យសម្ងាត់ផុតកំណត់ | Password Expired",
        message: "សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ | Please contact admin",
      };
    }

    if (daysRemaining === 0) {
      return {
        title: "ចាំបាច់ប្តូរពាក្យសម្ងាត់ភ្លាមៗ!",
        message: `នៅសល់តែ ${hoursRemaining} ម៉ោងទៀត | Only ${hoursRemaining} hours remaining`,
      };
    }

    if (daysRemaining === 1) {
      return {
        title: "ចាំបាច់ប្តូរពាក្យសម្ងាត់!",
        message: `នៅសល់ 1 ថ្ងៃទៀត`,
      };
    }

    if (daysRemaining >= 7) {
      return {
        title: "អ្នកកំពុងប្រើពាក្យសម្ងាត់លំនាំដើម",
        message: `សូមប្តូរពាក្យសម្ងាត់ដើម្បីសុវត្ថិភាព | Please change for security (${daysRemaining} days remaining)`,
      };
    }

    return {
      title: "សូមប្តូរពាក្យសម្ងាត់",
      message: `នៅសល់ ${daysRemaining} ថ្ងៃទៀត | ${daysRemaining} days remaining`,
    };
  };

  const styles = getAlertStyles();
  const { title, message } = getMessage();
  const shouldAnimate = alertLevel === "danger";

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} ${styles.text}
        border-2 rounded-xl p-5 mb-6 shadow-sm
        transition-all duration-300
        ${shouldAnimate ? "animate-pulse" : ""}
      `}
      role="alert"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon} mt-1`}>
          {alertLevel === "danger" ? (
            <AlertTriangle className="w-7 h-7" />
          ) : (
            <Lock className="w-7 h-7" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h4 className="font-bold font-koulen text-xl mb-2">{title}</h4>
              
              {/* Time remaining badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3 ${
                alertLevel === "danger" 
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-100" 
                  : alertLevel === "warning"
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-100"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100"
              }`}>
                <Clock className="w-4 h-4" />
                <span>{message}</span>
              </div>

              <div className="text-sm space-y-2 mb-4">
                <p className="flex items-start gap-2">
                  <span className="text-lg">🔒</span>
                  <span>
                    <strong>អ្នកកំពុងប្រើពាក្យសម្ងាត់លំនាំដើម</strong>
                    <br />
                    <span className="text-xs opacity-80">
                      ពាក្យសម្ងាត់លំនាំដើមមិនមានសុវត្ថិភាព។ អ្នកដទៃអាចទាយបានដោយងាយ។
                    </span>
                  </span>
                </p>
              </div>
            </div>

            {/* Dismiss Button */}
            {canDismiss && onDismiss && alertLevel !== "danger" && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onChangePassword}
            className={`
              ${styles.button}
              w-full px-6 py-3 rounded-xl font-bold text-base
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              shadow-md hover:shadow-lg
              flex items-center justify-center gap-2
            `}
          >
            <Lock className="w-5 h-5" />
            <span>ប្តូរពាក្យសម្ងាត់ឥឡូវនេះ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
