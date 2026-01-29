"use client";

import React from "react";
import { BookOpen, Edit, Trash2, Eye, Award, TrendingUp } from "lucide-react";
import type { Subject } from "@/lib/api/subjects";

interface SubjectCardProps {
  subject: Subject;
  onView: (subject: Subject) => void;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

export default function SubjectCard({
  subject,
  onView,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "science":
        return "bg-gradient-to-br from-purple-500 to-indigo-600";
      case "social":
        return "bg-gradient-to-br from-green-500 to-teal-600";
      default:
        return "bg-gradient-to-br from-blue-500 to-cyan-600";
    }
  };

  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 3.0) return "bg-red-100 text-red-700 border-red-200";
    if (coefficient >= 2.0)
      return "bg-orange-100 text-orange-700 border-orange-200";
    if (coefficient >= 1.5)
      return "bg-green-100 text-green-700 border-green-200";
    if (coefficient >= 1.0) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getCoefficientLabel = (coefficient: number) => {
    if (coefficient >= 3.0) return "Critical";
    if (coefficient >= 2.5) return "Very High";
    if (coefficient >= 2.0) return "Very Important";
    if (coefficient >= 1.5) return "Important";
    if (coefficient >= 1.0) return "Normal";
    return "Extra";
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Header with gradient */}
      <div
        className={`${getCategoryColor(
          subject.category
        )} p-4 text-white relative`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl font-koulen backdrop-blur-sm">
              {subject.code.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-lg">{subject.nameKh}</h1>
              <p className="text-sm text-white text-opacity-90">
                {subject.nameEn || subject.name}
              </p>
            </div>
          </div>
          {subject.isActive && (
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              ✓ សកម្ម
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Code */}
        <div className="flex items-center gap-2 text-gray-600">
          <span className="text-gray-400">#</span>
          <span className="font-mono font-semibold text-gray-800">
            {subject.code}
          </span>
        </div>

        {/* Grade */}
        <div className="flex items-center gap-2 text-gray-600">
          <BookOpen className="w-4 h-4" />
          <span>កម្រិត: ថ្នាក់ទី {subject.grade}</span>
        </div>

        {/* Track */}
        {subject.track && (
          <div className="flex items-center gap-2 text-gray-600">
            <span>ប្រភេទ:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                subject.track === "science"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {subject.track === "science" ? "វិទ្យាសាស្ត្រ" : "សង្គម"}
            </span>
          </div>
        )}

        {/* Max Score */}
        <div className="flex items-center gap-2 text-gray-600">
          <Award className="w-4 h-4" />
          <span>ពិន្ទុ: {subject.maxScore}</span>
        </div>

        {/* ✅ NEW: Coefficient */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">មេគុណពិន្ទុ:</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${getCoefficientColor(
                subject.coefficient
              )}`}
            >
              {subject.coefficient.toFixed(1)}
            </span>
            <span className="text-xs text-gray-500">
              ({getCoefficientLabel(subject.coefficient)})
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onView(subject)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          <span>មើល</span>
        </button>
        <button
          onClick={() => onEdit(subject)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
        >
          <Edit className="w-4 h-4" />
          <span>កែ</span>
        </button>
        <button
          onClick={() => onDelete(subject)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          <span>លុប</span>
        </button>
      </div>
    </div>
  );
}
