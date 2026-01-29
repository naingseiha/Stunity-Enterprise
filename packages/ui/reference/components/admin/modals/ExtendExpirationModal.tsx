"use client";

import { useState } from "react";
import { X, Clock, CheckCircle } from "lucide-react";
import { adminSecurityApi } from "@/lib/api/admin-security";

interface ExtendExpirationModalProps {
  teacherId: string;
  teacherName: string;
  currentExpiresAt: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExtendExpirationModal({
  teacherId,
  teacherName,
  currentExpiresAt,
  onClose,
  onSuccess,
}: ExtendExpirationModalProps) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNewExpirationDate = () => {
    const date = new Date(currentExpiresAt);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("សូមបញ្ចូលហេតុផល | Reason is required");
      return;
    }

    if (days < 1 || days > 30) {
      setError("Days must be between 1 and 30");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await adminSecurityApi.extendExpiration(teacherId, days, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "មានបញ្ហាក្នុងការពន្យារពេល");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Extend Expiration</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Teacher Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teacher
            </label>
            <p className="text-gray-900 font-medium">{teacherName}</p>
          </div>

          {/* Current Expiration */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Expiration
            </label>
            <p className="text-gray-600">
              {new Date(currentExpiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Days Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extend by (days) *
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    days === d
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* New Expiration Preview */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                New Expiration Date
              </p>
              <p className="text-blue-700 font-bold">{getNewExpirationDate()}</p>
            </div>
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
              placeholder="Why are you extending the deadline? (e.g., Teacher on sick leave)"
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
              {isSubmitting ? "Extending..." : "Extend"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
