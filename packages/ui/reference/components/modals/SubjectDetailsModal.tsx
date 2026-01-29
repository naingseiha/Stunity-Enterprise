"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  BookOpen,
  Hash,
  Clock,
  Calendar,
  Tag,
  UserCheck,
  Users,
  GraduationCap,
  Mail,
  Phone,
  Award,
  X as XIcon,
} from "lucide-react";
import type { Subject } from "@/lib/api/subjects";

interface SubjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
}

export default function SubjectDetailsModal({
  isOpen,
  onClose,
  subject,
}: SubjectDetailsModalProps) {
  // Get category badge
  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        core: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          label: "មូលដ្ឋាន • Core",
        },
        science: {
          bg: "bg-green-100",
          text: "text-green-700",
          label: "វិទ្យាសាស្ត្រ • Science",
        },
        social: {
          bg: "bg-purple-100",
          text: "text-purple-700",
          label: "សង្គម • Social",
        },
        arts: {
          bg: "bg-pink-100",
          text: "text-pink-700",
          label: "សិល្បៈ • Arts",
        },
        technology: {
          bg: "bg-orange-100",
          text: "text-orange-700",
          label: "បច្ចេកវិទ្យា • Technology",
        },
        other: {
          bg: "bg-gray-100",
          text: "text-gray-700",
          label: "ផ្សេងៗ • Other",
        },
      };
    return badges[category] || badges.other;
  };

  const categoryBadge = getCategoryBadge(subject.category);
  const teacherCount = subject.teacherAssignments?.length || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ព័ត៌មានលម្អិត ${
        subject.nameKh || subject.name
      } • Subject Details`}
      size="large"
    >
      <div className="space-y-6">
        {/* Subject Info Card */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-4 border-white/30">
                {subject.nameKh?.charAt(0) || subject.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-koulen mb-1">
                  {subject.nameKh || subject.name}
                </h1>
                <p className="text-white/90 text-lg english-modern">
                  {subject.nameEn || subject.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    ថ្នាក់ទី {subject.grade}
                  </span>
                  {subject.track && (
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {subject.track === "science"
                        ? "វិទ្យាសាស្ត្រ"
                        : "សង្គមវិទ្យា"}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${categoryBadge.bg} ${categoryBadge.text}`}
                  >
                    {categoryBadge.label}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <BookOpen className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <UserCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-koulen text-gray-900">{teacherCount}</p>
            <p className="text-sm text-gray-600">គ្រូបង្រៀន • Teachers</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-koulen text-gray-900">
              {subject.weeklyHours}h
            </p>
            <p className="text-sm text-gray-600">ម៉ោង/សប្តាហ៍ • Weekly Hours</p>
          </div>
        </div>

        {/* Subject Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            ព័ត៌មានមុខវិជ្ជា • Subject Information
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Hash className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">លេខកូដ • Code</p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {subject.code}
                </p>
              </div>
            </div>

            {subject.description && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">
                    ការពិពណ៌នា • Description
                  </p>
                  <p className="text-sm text-gray-900">{subject.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">ប្រភេទ • Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {categoryBadge.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <div
                  className={`w-3 h-3 rounded-full ${
                    subject.isActive ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></div>
              </div>
              <div>
                <p className="text-xs text-gray-600">ស្ថានភាព • Status</p>
                <p className="text-sm font-medium text-gray-900">
                  {subject.isActive ? "សកម្ម Active" : "អសកម្ម Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Hours */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            ម៉ោងសិក្សា • Study Hours
          </h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">
                  ម៉ោងក្នុងមួយសប្តាហ៍ • Weekly Hours
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {subject.weeklyHours} ម៉ោង
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">
                  ម៉ោងក្នុងមួយឆ្នាំ • Annual Hours
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {subject.annualHours} ម៉ោង
                </p>
              </div>
            </div>

            {subject.createdAt && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">
                    កាលបរិច្ឆេទបង្កើត • Created Date
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(subject.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Teachers */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            គ្រូបង្រៀន • Assigned Teachers ({teacherCount})
          </h3>
          {teacherCount === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>មិនទាន់មានគ្រូបង្រៀន • No teachers assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subject.teacherAssignments?.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                        {assignment.teacher.firstName?.charAt(0)}
                        {assignment.teacher.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate english-modern">
                          {assignment.teacher.firstName}{" "}
                          {assignment.teacher.lastName}
                        </h4>
                        {assignment.teacher.email && (
                          <p className="text-sm text-gray-600 truncate english-modern">
                            {assignment.teacher.email}
                          </p>
                        )}
                        {assignment.teacher.subject && (
                          <p className="text-xs text-green-600 mt-1">
                            Primary: {assignment.teacher.subject}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <UserCheck className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            <XIcon className="w-5 h-5" />
            <span>បិទ Close</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
