"use client";

import React, { useState } from "react";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";

interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  classes?: any[];
}

interface TeacherDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  onConfirm: () => Promise<void>;
}

export default function TeacherDeleteModal({
  isOpen,
  onClose,
  teacher,
  onConfirm,
}: TeacherDeleteModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const fullName =
    teacher.firstName && teacher.lastName
      ? `${teacher.firstName} ${teacher.lastName}`
      : teacher.name || "Unknown Teacher";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-koulen text-white">លុបគ្រូបង្រៀន</h3>
              <p className="text-sm text-white/90 font-semibold">
                Delete Teacher
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-900 font-bold mb-2">
                  តើអ្នកពិតជាចង់លុបគ្រូបង្រៀននេះមែនទេ?
                </p>
                <p className="text-sm text-gray-700 font-medium mb-3">
                  Are you sure you want to delete this teacher? This action
                  cannot be undone.
                </p>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="font-black text-gray-900 text-lg">{fullName}</p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">
                    {teacher.email}
                  </p>
                  {teacher.classes && teacher.classes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-100">
                      <p className="text-xs text-red-600 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        មានថ្នាក់ប្រចាំ {teacher.classes.length} ថ្នាក់ • Has{" "}
                        {teacher.classes.length} assigned class(es)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors disabled:opacity-50"
            >
              បោះបង់ Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all disabled: opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  កំពុងលុប...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  លុប Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
