"use client";

import { useState } from "react";
import { X, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { adminSecurityApi } from "@/lib/api/admin-security";

interface SuspendAccountModalProps {
  teacherId: string;
  teacherName: string;
  isSuspended: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SuspendAccountModal({
  teacherId,
  teacherName,
  isSuspended,
  onClose,
  onSuccess,
}: SuspendAccountModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim() && !isSuspended) {
      setError("សូមបញ្ចូលហេតុផល | Reason is required for suspension");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await adminSecurityApi.toggleSuspension(teacherId, !isSuspended, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "មានបញ្ហាក្នុងការធ្វើប្រតិបត្តិការ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between ${
            isSuspended
              ? "bg-gradient-to-r from-green-600 to-emerald-600"
              : "bg-gradient-to-r from-red-600 to-orange-600"
          }`}
        >
          <h2 className="text-xl font-bold text-white">
            {isSuspended ? "Unsuspend Account" : "Suspend Account"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Warning */}
          <div
            className={`border rounded-lg p-4 mb-4 flex gap-3 ${
              isSuspended
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {isSuspended ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className={`text-sm ${isSuspended ? "text-green-800" : "text-red-800"}`}>
              <p className="font-medium mb-1">
                {isSuspended ? "Reactivate Account" : "Warning"}
              </p>
              <p>
                {isSuspended
                  ? `This will reactivate ${teacherName}'s account. They will be able to login again.`
                  : `This will suspend ${teacherName}'s account. They will not be able to login until unsuspended.`}
              </p>
            </div>
          </div>

          {/* Teacher Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher
            </label>
            <p className="text-gray-900 font-medium">{teacherName}</p>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason {!isSuspended && "*"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                isSuspended
                  ? "Optional: Why are you reactivating this account?"
                  : "Why are you suspending this account? (Required)"
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isSuspended
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isSubmitting
                ? "Processing..."
                : isSuspended
                ? "Unsuspend Account"
                : "Suspend Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
