"use client";

import { useState } from "react";
import { X, AlertTriangle, Copy, CheckCircle } from "lucide-react";
import { adminSecurityApi } from "@/lib/api/admin-security";

interface ResetPasswordModalProps {
  teacherId: string;
  teacherName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordModal({
  teacherId,
  teacherName,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [reason, setReason] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("សូមបញ្ចូលហេតុផល | Reason is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const result = await adminSecurityApi.forcePasswordReset(teacherId, reason);
      setTempPassword(result.tempPassword);
    } catch (err: any) {
      setError(err.message || "មានបញ្ហាក្នុងការប្តូរពាក្យសម្ងាត់");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Reset Password</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!tempPassword ? (
            // Form
            <form onSubmit={handleSubmit}>
              {/* Warning */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Warning</p>
                  <p>This will reset <strong>{teacherName}</strong>'s password to a temporary password. They will have 7 days to change it.</p>
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
                  Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for password reset..."
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
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          ) : (
            // Success - Show Temp Password
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Password Reset Successfully
                </h3>
                <p className="text-sm text-gray-600">
                  Temporary password generated for {teacherName}
                </p>
              </div>

              {/* Temporary Password Display */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono font-bold text-indigo-600 bg-white px-4 py-2 rounded border border-gray-200">
                    {tempPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Copied to clipboard
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Next Steps:
                </p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the temporary password above</li>
                  <li>Send it to the teacher securely</li>
                  <li>Teacher must change it within 7 days</li>
                  <li>Old password will no longer work</li>
                </ol>
              </div>

              {/* Done Button */}
              <button
                onClick={handleDone}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
