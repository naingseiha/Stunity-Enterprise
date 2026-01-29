"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  School,
  Users,
  BookOpen,
  Edit,
  Trash2,
  X,
  Info,
  Copy,
  Check,
  ExternalLink,
  Award,
  FileText,
  CreditCard,
  Home,
  Briefcase,
  UserCircle,
  CheckCircle,
} from "lucide-react";
import { studentsApi, Student } from "@/lib/api/students";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

const ROLE_LABELS = {
  GENERAL: "សិស្សទូទៅ",
  CLASS_LEADER: "ប្រធានថ្នាក់",
  VICE_LEADER_1: "អនុប្រធានទី១",
  VICE_LEADER_2: "អនុប្រធានទី២",
};

interface MobileStudentDetailsProps {
  studentId: string;
}

export default function MobileStudentDetails({
  studentId,
}: MobileStudentDetailsProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized values
  const isAdmin = useMemo(() => currentUser?.role === "ADMIN", [currentUser]);

  useEffect(() => {
    loadStudent();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [studentId]);

  const loadStudent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const data = await studentsApi.getById(studentId);
      setStudent(data);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setError(error.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យសិស្ស");
      }
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!isAdmin || !student) return;

    try {
      await studentsApi.delete(student.id);
      setShowDeleteModal(false);
      router.push("/students");
    } catch (error: any) {
      setError(error.message || "មានបញ្ហាក្នុងការលុបសិស្ស");
      setShowDeleteModal(false);
    }
  }, [isAdmin, student, router]);

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy");
    } catch {
      return dateString;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
        {/* Back button skeleton */}
        <div className="fixed top-4 left-4 z-20">
          <div className="w-11 h-11 bg-white rounded-2xl border border-gray-200 animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="px-5 pt-5 pb-24 space-y-4 max-w-2xl mx-auto">
          {/* Instagram-style Profile header skeleton */}
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
            {/* Cover banner skeleton */}
            <div className="h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 animate-pulse"></div>

            <div className="px-5 pb-5">
              <div className="flex flex-col items-center -mt-16 mb-4">
                <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse mb-4"></div>
                <div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Quick Info Grid skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Info sections skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-200">
              <div className="h-16 bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse"></div>
              <div className="p-5 space-y-3">
                <div className="h-20 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse"></div>
                <div className="h-20 bg-gray-50 rounded-2xl border border-gray-100 animate-pulse"></div>
              </div>
            </div>
          ))}

          {/* Actions skeleton */}
          <div>
            <div className="h-5 w-20 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
            <div className="space-y-2">
              <div className="h-16 bg-white rounded-2xl border-2 border-gray-200 animate-pulse"></div>
              <div className="h-16 bg-white rounded-2xl border-2 border-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-gray-200">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="font-koulen text-2xl text-gray-900 mb-2">មានបញ្ហា</h2>
          <p className="font-battambang text-gray-600 mb-6 leading-relaxed">
            {error || "រកមិនឃើញសិស្ស"}
          </p>
          <button
            onClick={() => router.back()}
            className="w-full h-12 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-koulen rounded-2xl hover:from-gray-900 hover:to-black transition-all active:scale-95"
          >
            ត្រឡប់ក្រោយ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      {/* Back Button - Always Visible */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 pt-4 pb-2 px-5">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 bg-white hover:bg-gray-50 rounded-2xl flex items-center justify-center transition-all active:scale-95 border-2 border-gray-300"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Main Content */}
      <div className="px-5 pb-24 space-y-4 max-w-2xl mx-auto">
        {/* Flat Instagram-Style Profile Header */}
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
          {/* Cover/Banner */}
          <div className="relative h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
            </div>
            {/* Account Status Badge */}
            <div className="absolute top-3 right-3">
              <div
                className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  student.isAccountActive
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <span className="text-white text-xs font-bold">
                  {student.isAccountActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Info Section - Center Aligned */}
          <div className="px-5 pb-5">
            {/* Avatar - Overlapping cover - Center Aligned */}
            <div className="flex flex-col items-center -mt-16 mb-4">
              <div className="relative mb-4">
                <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-1">
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
                  {student.khmerName || `${student.firstName} ${student.lastName}`}
                </h1>
                <p className="text-sm text-gray-600 mb-2">
                  {student.englishName || `${student.firstName} ${student.lastName}`}
                </p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="font-medium">{student.studentId || "N/A"}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span className="font-medium">{student.class?.name || "N/A"}</span>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-700">
                    {ROLE_LABELS[student.studentRole as keyof typeof ROLE_LABELS] || "សិស្សទូទៅ"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Grid - Flat Design */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-gray-600 font-bold mb-1">ថ្ងៃកំណើត</p>
              <p className="text-xs font-black text-gray-900 leading-tight">
                {student.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString("km-KH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-2">
                <UserCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-gray-600 font-bold mb-1">ភេទ</p>
              <p className="text-xs font-black text-gray-900">
                {student.gender === "male" ? "ប្រុស" : "ស្រី"}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-2">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-gray-600 font-bold mb-1">ទីកន្លែង</p>
              <p className="text-xs font-black text-gray-900 leading-tight">
                {student.placeOfBirth || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information Section - Flat Design */}
        {(student.email || student.phoneNumber || student.phone || student.currentAddress) && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">ព័ត៌មានផ្ទាល់ខ្លួន</h1>
                  <p className="text-xs text-white/80 font-medium">Personal Information</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {student.email && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-bold mb-1">អ៊ីម៉ែល • Email</p>
                    <p className="text-sm font-bold text-gray-900 break-words">{student.email}</p>
                  </div>
                </div>
              )}

              {(student.phoneNumber || student.phone) && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">លេខទូរស័ព្ទ • Phone</p>
                    <p className="text-sm font-bold text-gray-900">{student.phoneNumber || student.phone}</p>
                  </div>
                </div>
              )}

              {student.currentAddress && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">អាសយដ្ឋានបច្ចុប្បន្ន • Address</p>
                    <p className="text-sm font-bold text-gray-900 leading-relaxed">{student.currentAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Family Information Section - Flat Design */}
        {(student.fatherName || student.motherName || student.parentPhone || student.parentOccupation) && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">ព័ត៌មានគ្រួសារ</h1>
                  <p className="text-xs text-white/80 font-medium">Family Information</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {student.fatherName && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">ឈ្មោះឪពុក • Father</p>
                    <p className="text-sm font-bold text-gray-900">{student.fatherName}</p>
                  </div>
                </div>
              )}

              {student.motherName && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">ឈ្មោះម្តាយ • Mother</p>
                    <p className="text-sm font-bold text-gray-900">{student.motherName}</p>
                  </div>
                </div>
              )}

              {student.parentPhone && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">លេខទូរស័ព្ទ • Phone</p>
                    <p className="text-sm font-bold text-gray-900">{student.parentPhone}</p>
                  </div>
                </div>
              )}

              {student.parentOccupation && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">មុខរបរ • Occupation</p>
                    <p className="text-sm font-bold text-gray-900">{student.parentOccupation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Academic History Section - Flat Design */}
        {(student.previousSchool || student.previousGrade || student.transferredFrom || student.repeatingGrade) && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <School className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">ប្រវត្តិសិក្សា</h1>
                  <p className="text-xs text-white/80 font-medium">Academic History</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {student.previousSchool && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">សាលាមុន • Previous School</p>
                    <p className="text-sm font-bold text-gray-900">{student.previousSchool}</p>
                  </div>
                </div>
              )}

              {student.previousGrade && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">ថ្នាក់មុន • Previous Grade</p>
                    <p className="text-sm font-bold text-gray-900">{student.previousGrade}</p>
                  </div>
                </div>
              )}

              {student.transferredFrom && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl border border-cyan-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">ផ្ទេរពី • Transferred From</p>
                    <p className="text-sm font-bold text-gray-900">{student.transferredFrom}</p>
                  </div>
                </div>
              )}

              {student.repeatingGrade && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200">
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">រៀនឡើងវិញ • Repeating</p>
                    <p className="text-sm font-bold text-gray-900">{student.repeatingGrade}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grade 9 Exam Information - Flat Design */}
        {(student.grade9ExamSession || student.grade9ExamCenter || student.grade9PassStatus) && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">ប្រឡងថ្នាក់ទី៩</h1>
                  <p className="text-xs text-white/80 font-medium">Grade 9 Examination</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {student.grade9ExamSession && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">វគ្គប្រឡង • Session</p>
                    <p className="text-sm font-bold text-gray-900">{student.grade9ExamSession}</p>
                  </div>
                </div>
              )}

              {student.grade9ExamCenter && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">មជ្ឈមណ្ឌល • Center</p>
                    <p className="text-sm font-bold text-gray-900">{student.grade9ExamCenter}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {student.grade9ExamRoom && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-bold mb-0.5">បន្ទប់ • Room</p>
                      <p className="text-sm font-black text-gray-900">{student.grade9ExamRoom}</p>
                    </div>
                  </div>
                )}

                {student.grade9ExamDesk && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-bold mb-0.5">តុ • Desk</p>
                      <p className="text-sm font-black text-gray-900">{student.grade9ExamDesk}</p>
                    </div>
                  </div>
                )}
              </div>

              {student.grade9PassStatus && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  student.grade9PassStatus.toLowerCase().includes("pass") ||
                  student.grade9PassStatus.toLowerCase().includes("ជាប់")
                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                    : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    student.grade9PassStatus.toLowerCase().includes("pass") ||
                    student.grade9PassStatus.toLowerCase().includes("ជាប់")
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : "bg-gradient-to-br from-orange-500 to-amber-600"
                  }`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">លទ្ធផល • Result</p>
                    <p className="text-sm font-black text-gray-900">{student.grade9PassStatus}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grade 12 Exam Information - Flat Design */}
        {(student.grade12ExamSession || student.grade12ExamCenter || student.grade12Track || student.grade12PassStatus) && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">ប្រឡងបាក់ឌុប</h1>
                  <p className="text-xs text-white/80 font-medium">Grade 12 Examination</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {student.grade12Track && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">ផ្នែក • Track</p>
                    <p className="text-sm font-bold text-gray-900">{student.grade12Track}</p>
                  </div>
                </div>
              )}

              {student.grade12ExamSession && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">វគ្គប្រឡង • Session</p>
                    <p className="text-sm font-bold text-gray-900">{student.grade12ExamSession}</p>
                  </div>
                </div>
              )}

              {student.grade12ExamCenter && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                  <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">មជ្ឈមណ្ឌល • Center</p>
                    <p className="text-sm font-bold text-gray-900">{student.grade12ExamCenter}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {student.grade12ExamRoom && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-bold mb-0.5">បន្ទប់ • Room</p>
                      <p className="text-sm font-black text-gray-900">{student.grade12ExamRoom}</p>
                    </div>
                  </div>
                )}

                {student.grade12ExamDesk && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-bold mb-0.5">តុ • Desk</p>
                      <p className="text-sm font-black text-gray-900">{student.grade12ExamDesk}</p>
                    </div>
                  </div>
                )}
              </div>

              {student.grade12PassStatus && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  student.grade12PassStatus.toLowerCase().includes("pass") ||
                  student.grade12PassStatus.toLowerCase().includes("ជាប់")
                    ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                    : "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    student.grade12PassStatus.toLowerCase().includes("pass") ||
                    student.grade12PassStatus.toLowerCase().includes("ជាប់")
                      ? "bg-gradient-to-br from-green-500 to-emerald-600"
                      : "bg-gradient-to-br from-orange-500 to-amber-600"
                  }`}>
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-bold mb-1">លទ្ធផល • Result</p>
                    <p className="text-sm font-black text-gray-900">{student.grade12PassStatus}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remarks Section - Flat Design */}
        {student.remarks && (
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-gray-600 to-slate-700 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-white text-base">កំណត់សម្គាល់</h1>
                  <p className="text-xs text-white/80 font-medium">Remarks</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
                <p className="text-sm text-gray-900 leading-relaxed font-medium">{student.remarks}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h1 className="text-base font-bold text-gray-900 mb-3 px-1">
            សកម្មភាព
          </h1>
          <div className="space-y-2">
            {isAdmin ? (
              <>
                {/* Admin Actions */}
                <button
                  onClick={() => router.push(`/students/edit/${student.id}`)}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 p-4 flex items-center gap-4 hover:border-indigo-300 transition-all active:scale-[0.98]"
                >
                  <div className="bg-indigo-100 p-3 rounded-xl">
                    <Edit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">កែប្រែព័ត៌មាន</p>
                    <p className="text-sm text-gray-600">Edit Information</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 p-4 flex items-center gap-4 hover:border-red-300 transition-all active:scale-[0.98]"
                >
                  <div className="bg-red-100 p-3 rounded-xl">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-900">លុបសិស្ស</p>
                    <p className="text-sm text-gray-600">Delete Student</p>
                  </div>
                </button>
              </>
            ) : (
              /* View-Only Notice */
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-xl shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-sm font-bold text-blue-900 mb-1">
                      មើលប៉ុណ្ណោះ
                    </h1>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      អ្នកមិនមានសិទ្ធិកែប្រែទិន្នន័យសិស្ស។ សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ។
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden animate-scaleIn border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-red-500 via-rose-600 to-red-700 p-8 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-3xl flex items-center justify-center mb-4">
                  <Trash2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="font-koulen text-2xl text-white leading-tight">
                  លុបសិស្ស
                </h2>
                <p className="font-battambang text-white/90 text-sm mt-1">
                  Delete Student
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="font-battambang text-gray-700 text-center mb-2">
                តើអ្នកប្រាកដថាចង់លុបសិស្ស
              </p>
              <p className="font-koulen text-xl text-gray-900 text-center mb-2">
                {student?.khmerName ||
                  `${student?.firstName} ${student?.lastName}`}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-6">
                <p className="font-battambang text-sm text-red-700 text-center font-semibold mb-1">
                  ទិន្នន័យនឹងត្រូវលុបជាអចិន្ត្រៃយ៍
                </p>
                <p className="font-battambang text-xs text-red-600 text-center">
                  This action cannot be undone
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-koulen rounded-2xl transition-all active:scale-95"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="h-12 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-koulen rounded-2xl transition-all active:scale-95"
                >
                  លុប
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Clean Info Row Component
function CleanInfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <span className="font-battambang text-xs text-gray-500 flex-shrink-0 font-medium">
          {label}
        </span>
      </div>
      <span className="font-battambang text-sm font-bold text-gray-900 text-right break-words">
        {value}
      </span>
    </div>
  );
}
