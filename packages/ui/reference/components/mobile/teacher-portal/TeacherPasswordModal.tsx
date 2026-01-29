"use client";

import { useState } from "react";
import {
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { teacherPortalApi } from "@/lib/api/teacher-portal";

interface TeacherPasswordModalProps {
  onClose: () => void;
}

export default function TeacherPasswordModal({
  onClose,
}: TeacherPasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({
        type: "error",
        text: "សូមបំពេញព័ត៌មានឱ្យគ្រប់គ្រាន់",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "ពាក្យសម្ងាត់ថ្មីមិនត្រូវគ្នាទេ",
      });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "ពាក្យសម្ងាត់ត្រូវតែមានយ៉ាងតិច ៦ តួអក្សរ",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      await teacherPortalApi.changePassword({
        oldPassword,
        newPassword,
      });
      setMessage({
        type: "success",
        text: "✅ ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ",
      });
      // Clear form and close after success
      setTimeout(() => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "មិនអាចផ្លាស់ប្តូរពាក្យសម្ងាត់បានទេ",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center max-w-md mx-auto backdrop-blur-sm">
      <div className="w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-white">ផ្លាស់ប្តូរពាក្យសម្ងាត់</h1>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all active:scale-95"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Form Content - with bottom padding for nav bar */}
        <form onSubmit={handleSubmit} className="p-6 pb-24">
          {message && (
            <div
              className={`mb-5 p-4 rounded-2xl border-2 flex items-start gap-3 ${
                message.type === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm font-bold ${
                  message.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <div className="space-y-5">
            {/* Old Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ពាក្យសម្ងាត់ចាស់ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.old ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none font-medium bg-white transition-all"
                  placeholder="បញ្ចូលពាក្យសម្ងាត់ចាស់"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({ ...prev, old: !prev.old }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword.old ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ពាក្យសម្ងាត់ថ្មី <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.new ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none font-medium bg-white transition-all"
                  placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៦ តួអក្សរ)"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({ ...prev, new: !prev.new }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword.new ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                បញ្ជាក់ពាក្យសម្ងាត់ថ្មី <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none font-medium bg-white transition-all"
                  placeholder="បញ្ជាក់ពាក្យសម្ងាត់ថ្មីម្តងទៀត"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      confirm: !prev.confirm,
                    }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword.confirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>កំពុងរក្សាទុក...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>ផ្លាស់ប្តូរ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
