"use client";

import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgGradient: "from-green-500 to-emerald-600",
      bgLight: "bg-green-50/95",
      borderColor: "border-green-300",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    error: {
      icon: AlertCircle,
      bgGradient: "from-red-500 to-rose-600",
      bgLight: "bg-red-50/95",
      borderColor: "border-red-300",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    warning: {
      icon: AlertTriangle,
      bgGradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50/95",
      borderColor: "border-amber-300",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    info: {
      icon: Info,
      bgGradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50/95",
      borderColor: "border-blue-300",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  };

  const style = config[type];
  const Icon = style.icon;

  return (
    <div className="animate-in slide-in-from-top-5 fade-in duration-300 ease-out">
      <div
        className={`${style.bgLight} ${style.borderColor} border-2 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm`}
      >
        {/* Gradient Top Bar */}
        <div className={`h-1 bg-gradient-to-r ${style.bgGradient}`} />

        {/* Content */}
        <div className="p-4 flex items-center gap-3">
          {/* Icon */}
          <div
            className={`flex-shrink-0 w-10 h-10 ${style.iconBg} rounded-xl flex items-center justify-center shadow-sm`}
          >
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className="text-gray-800 font-bold text-sm leading-snug">
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-500 hover:bg-gray-200 p-1.5 rounded-lg transition-colors duration-150 active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-1 bg-gray-200/50">
          <div
            className={`h-full bg-gradient-to-r ${style.bgGradient}`}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
