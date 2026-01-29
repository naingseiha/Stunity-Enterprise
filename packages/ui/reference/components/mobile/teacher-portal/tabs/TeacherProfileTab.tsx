"use client";

import { useState } from "react";
import {
  User,
  Calendar,
  Lock,
  Edit,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Award,
  Users,
  BookOpen,
  Home,
  CheckCircle,
  School,
  Clock,
} from "lucide-react";
import { TeacherProfile, UpdateTeacherProfileData } from "@/lib/api/teacher-portal";
import TeacherProfileEditForm from "../TeacherProfileEditForm";

const ROLE_LABELS = {
  TEACHER: "គ្រូបង្រៀន",
  INSTRUCTOR: "គ្រូថ្នាក់",
  ADMIN: "អ្នកគ្រប់គ្រង",
};

interface TeacherProfileTabProps {
  profile: TeacherProfile;
  isEditingProfile: boolean;
  isSubmittingProfile: boolean;
  onEdit: () => void;
  onSave: (data: UpdateTeacherProfileData) => Promise<void>;
  onCancel: () => void;
  onChangePassword: () => void;
  onUnsavedChanges: (hasChanges: boolean) => void;
}

export default function TeacherProfileTab({
  profile,
  isEditingProfile,
  isSubmittingProfile,
  onEdit,
  onSave,
  onCancel,
  onChangePassword,
  onUnsavedChanges,
}: TeacherProfileTabProps) {
  if (isEditingProfile) {
    return (
      <TeacherProfileEditForm
        profile={profile}
        onSave={onSave}
        onCancel={onCancel}
        onUnsavedChanges={onUnsavedChanges}
        isSubmitting={isSubmittingProfile}
      />
    );
  }

  return (
    <div className="space-y-4 hide-scrollbar">
      {/* Instagram-Style Profile Header */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
        {/* Cover/Banner */}
        <div className="relative h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          {/* Role Badge */}
          <div className="absolute top-3 right-3">
            <div className="px-3 py-1 rounded-full flex items-center gap-1.5 bg-white/90 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-gray-800 text-xs font-bold">
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info Section - Center Aligned */}
        <div className="px-5 pb-5">
          {/* Avatar - Overlapping cover - Center Aligned */}
          <div className="flex flex-col items-center -mt-16 mb-4">
            <div className="relative mb-4">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-1">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <User className="w-16 h-16 text-indigo-600" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Name & Bio - Center Aligned */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-black text-gray-900 mb-1">
                {profile.khmerName || `${profile.firstName} ${profile.lastName}`}
              </h1>
              <p className="text-sm text-gray-600 mb-2">
                {profile.englishName || `${profile.firstName} ${profile.lastName}`}
              </p>
              <div className="flex items-center justify-center gap-2 mb-3">
                {profile.teacherId && (
                  <>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Award className="w-3.5 h-3.5" />
                      <span className="font-medium">{profile.teacherId}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                  </>
                )}
                {profile.position && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="font-medium">{profile.position}</span>
                  </div>
                )}
              </div>

              {/* Role Badge */}
              <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1.5 rounded-full">
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">
                  {ROLE_LABELS[profile.role] || profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 py-4 border-t border-gray-100">
            {/* Homeroom Class */}
            {profile.role === "INSTRUCTOR" && profile.homeroomClass && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3.5 border border-blue-100">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-2">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-600 mb-0.5">
                      ថ្នាក់ទទួលបន្ទុក
                    </p>
                    <p className="text-sm font-black text-gray-900">
                      {profile.homeroomClass.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Classes */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-3.5 border border-purple-100">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">
                    ថ្នាក់បង្រៀន
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {profile.teachingClasses?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Subjects */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3.5 border border-green-100">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-2">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">
                    មុខវិជ្ជា
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {profile.subjects?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={onEdit}
              aria-label="កែប្រែព័ត៌មាន / Edit profile"
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[44px]"
            >
              <Edit className="w-5 h-5" />
              <span>កែប្រែ</span>
            </button>
            <button
              onClick={onChangePassword}
              aria-label="ប្តូរពាក្យសម្ងាត់ / Change password"
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[44px]"
            >
              <Lock className="w-5 h-5" />
              <span>ពាក្យសម្ងាត់</span>
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 mb-4">
          <User className="w-5 h-5 text-indigo-600" />
          <span>ព័ត៌មានផ្ទាល់ខ្លួន</span>
        </h2>
        <div className="space-y-3">
          {profile.gender && (
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="ភេទ"
              value={profile.gender === "MALE" ? "ប្រុស" : "ស្រី"}
            />
          )}
          {profile.dateOfBirth && (
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="ថ្ងៃខែឆ្នាំកំណើត"
              value={new Date(profile.dateOfBirth).toLocaleDateString("km-KH")}
            />
          )}
          {profile.hireDate && (
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="ថ្ងៃចូលបម្រើការងារ"
              value={new Date(profile.hireDate).toLocaleDateString("km-KH")}
            />
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 mb-4">
          <Phone className="w-5 h-5 text-green-600" />
          <span>ព័ត៌មានទំនាក់ទំនង</span>
        </h2>
        <div className="space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="អ៊ីមែល" value={profile.email} />
          {profile.phone && (
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="លេខទូរស័ព្ទ"
              value={profile.phone}
            />
          )}
          {profile.address && (
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="អាសយដ្ឋាន"
              value={profile.address}
            />
          )}
        </div>
      </div>

      {/* Teaching Information */}
      {(profile.subjects && profile.subjects.length > 0) ||
        (profile.teachingClasses && profile.teachingClasses.length > 0) ||
        (profile.homeroomClass && (
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-900 mb-4">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span>ព័ត៌មានការបង្រៀន</span>
            </h2>
            <div className="space-y-4">
              {/* Homeroom Class */}
              {profile.role === "INSTRUCTOR" && profile.homeroomClass && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    ថ្នាក់ទទួលបន្ទុក
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {profile.homeroomClass.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {profile.homeroomClass._count?.students || 0} សិស្ស
                        </p>
                      </div>
                      {profile.homeroomClass.track && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                          {profile.homeroomClass.track}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Teaching Classes */}
              {profile.teachingClasses && profile.teachingClasses.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    ថ្នាក់បង្រៀន ({profile.teachingClasses.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {profile.teachingClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-2.5"
                      >
                        <p className="font-bold text-sm text-gray-900">{cls.name}</p>
                        <p className="text-xs text-gray-600">
                          {cls._count?.students || 0} សិស្ស
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects */}
              {profile.subjects && profile.subjects.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    មុខវិជ្ជាបង្រៀន ({profile.subjects.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-3 py-2"
                      >
                        <p className="text-xs font-bold text-gray-900">
                          {subject.nameKh || subject.name}
                        </p>
                        <p className="text-[10px] text-gray-600">{subject.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

// Info Row Component
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}
