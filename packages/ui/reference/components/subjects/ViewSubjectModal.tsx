"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import {
  BookOpen,
  Hash,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  FileText,
  Tag,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import type { Subject } from "@/lib/api/subjects";

interface ViewSubjectModalProps {
  subject: Subject | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewSubjectModal({
  subject,
  isOpen,
  onClose,
}: ViewSubjectModalProps) {
  if (!subject) return null;

  const getCoefficientColor = (coefficient: number) => {
    if (coefficient >= 3.0) return "bg-red-100 text-red-700 border-red-300";
    if (coefficient >= 2.5) return "bg-red-50 text-red-600 border-red-200";
    if (coefficient >= 2.0)
      return "bg-orange-100 text-orange-700 border-orange-300";
    if (coefficient >= 1.5)
      return "bg-green-100 text-green-700 border-green-300";
    if (coefficient >= 1.0) return "bg-blue-100 text-blue-700 border-blue-300";
    return "bg-gray-100 text-gray-700 border-gray-300";
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Eye className="w-6 h-6 text-blue-600" />
          <span>មើលព័ត៌មានមុខវិជ្ជា • View Subject Details</span>
        </span>
      }
      size="large"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-koulen text-gray-900">
                {subject.nameKh}
              </h2>
              {subject.nameEn && (
                <p className="text-lg text-gray-600">{subject.nameEn}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                  {subject.code}
                </span>
                {subject.isActive ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    សកម្ម • Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                    <XCircle className="w-4 h-4" />
                    អសកម្ម • Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grade */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  កម្រិតថ្នាក់ • Grade Level
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  ថ្នាក់ទី {subject.grade}
                </p>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ប្រភេទ • Category</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.category === "science"
                    ? "វិទ្យាសាស្ត្រ • Science"
                    : "សង្គម • Social"}
                </p>
              </div>
            </div>
          </div>

          {/* Track */}
          {subject.track && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">ផ្លូវសិក្សា • Track</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subject.track === "science"
                      ? "វិទ្យាសាស្ត្រ • Science"
                      : "សង្គម • Social"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Max Score */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  ពិន្ទុអតិបរមា • Max Score
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.maxScore}
                </p>
              </div>
            </div>
          </div>

          {/* Coefficient */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    មេគុណពិន្ទុ • Coefficient
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getCoefficientLabel(subject.coefficient)}
                  </p>
                </div>
              </div>
              <div
                className={`px-6 py-3 rounded-lg border-2 ${getCoefficientColor(
                  subject.coefficient
                )}`}
              >
                <span className="text-2xl font-koulen">
                  {subject.coefficient.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Hours */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  ម៉ោង/សប្តាហ៍ • Weekly Hours
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.weeklyHours} ម៉ោង
                </p>
              </div>
            </div>
          </div>

          {/* Annual Hours */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">
                  ម៉ោង/ឆ្នាំ • Annual Hours
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.annualHours} ម៉ោង
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {subject.description && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              ការពណ៌នា • Description:
            </h3>
            <p className="text-gray-600">{subject.description}</p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            បិទ • Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
