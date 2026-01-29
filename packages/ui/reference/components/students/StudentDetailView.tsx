"use client";

import { Student } from "@/lib/api/students";
import {
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Users,
  FileText,
  Award,
  BookOpen,
  Home,
  Briefcase,
  School,
  ClipboardCheck,
  UserCircle,
  Building2,
  AlertCircle,
} from "lucide-react";

interface StudentDetailViewProps {
  student: Student;
}

export default function StudentDetailView({ student }: StudentDetailViewProps) {
  const formatGender = (gender: string) => {
    return gender === "male" || gender === "MALE"
      ? "ប្រុស (Male)"
      : "ស្រី (Female)";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("km-KH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group">
      <div className="bg-white p-3 rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-600 font-medium mb-1">{label}</div>
        <div className="text-base font-bold text-gray-900 break-words">
          {value || (
            <span className="text-gray-400 font-normal">មិនមានទិន្នន័យ</span>
          )}
        </div>
      </div>
    </div>
  );

  const SectionTitle = ({ title, icon: Icon, badge }: any) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-lg shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-koulen text-gray-900">{title}</h3>
      </div>
      {badge && (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">
          {badge}
        </span>
      )}
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
      <AlertCircle className="w-5 h-5 text-gray-400" />
      <p className="text-sm text-gray-500 italic">{message}</p>
    </div>
  );

  // Check if any Grade 9 exam data exists
  const hasGrade9Data =
    student.grade9ExamSession ||
    student.grade9ExamCenter ||
    student.grade9ExamRoom ||
    student.grade9ExamDesk ||
    student.grade9PassStatus;

  // Check if any Grade 12 exam data exists
  const hasGrade12Data =
    student.grade12ExamSession ||
    student.grade12ExamCenter ||
    student.grade12ExamRoom ||
    student.grade12ExamDesk ||
    student.grade12PassStatus ||
    student.grade12Track;

  return (
    <div className="space-y-6">
      {/* ✅ Student Header Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
            <span className="text-6xl">
              {student.gender === "male" || student.gender === "MALE"
                ? "👨‍🎓"
                : "👩‍🎓"}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-100 mb-1">
              អត្តលេខសិស្ស • Student ID
            </div>
            <div className="text-3xl font-moul mb-3 tracking-wide">
              {student.studentId || "N/A"}
            </div>
            <div className="text-2xl font-koulen mb-2">
              {student.khmerName || `${student.firstName} ${student.lastName}`}
            </div>
            {student.englishName && (
              <div className="text-lg text-blue-100 font-medium">
                {student.englishName}
              </div>
            )}
          </div>
          <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="text-sm text-blue-100 mb-1">ថ្នាក់ • Class</div>
            <div className="text-2xl font-koulen">
              {student.class?.name || (
                <span className="text-lg text-blue-200">មិនមានថ្នាក់</span>
              )}
            </div>
            {student.class?.grade && (
              <div className="text-sm text-blue-100 mt-1">
                Grade {student.class.grade}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Section 1: Basic Information */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <SectionTitle title="ព័ត៌មានមូលដ្ឋាន • Basic Information" icon={User} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label="ភេទ • Gender"
            value={formatGender(student.gender)}
            icon={UserCircle}
          />
          <InfoRow
            label="ថ្ងៃខែឆ្នាំកំណើត • Date of Birth"
            value={formatDate(student.dateOfBirth)}
            icon={Calendar}
          />
          <InfoRow
            label="ទីកន្លែងកំណើត • Place of Birth"
            value={student.placeOfBirth}
            icon={MapPin}
          />
          <InfoRow
            label="អាសយដ្ឋានបច្ចុប្បន្ន • Current Address"
            value={student.currentAddress}
            icon={Home}
          />
          <InfoRow
            label="លេខទូរស័ព្ទ • Phone Number"
            value={student.phoneNumber}
            icon={Phone}
          />
          <InfoRow label="អ៊ីមែល • Email" value={student.email} icon={Mail} />
        </div>
      </div>

      {/* ✅ Section 2: Class Information */}
      {student.class && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <SectionTitle
            title="ព័ត៌មានថ្នាក់រៀន • Class Information"
            icon={GraduationCap}
            badge="ថ្នាក់បច្ចុប្បន្ន"
          />
          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <InfoRow
              label="ឈ្មោះថ្នាក់ • Class Name"
              value={student.class.name}
              icon={School}
            />
            <InfoRow
              label="កម្រិតថ្នាក់ • Grade Level"
              value={`ថ្នាក់ទី ${student.class.grade}`}
              icon={BookOpen}
            />
            {student.class.section && (
              <InfoRow
                label="ផ្នែក • Section"
                value={student.class.section}
                icon={Building2}
              />
            )}
            {student.class.classId && (
              <InfoRow
                label="លេខកូដថ្នាក់ • Class Code"
                value={student.class.classId}
                icon={FileText}
              />
            )}
          </div>
        </div>
      )}

      {/* ✅ Section 3: Parent/Guardian Information */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <SectionTitle
          title="ព័ត៌មានឪពុកម្តាយ • Parent Information"
          icon={Users}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label="ឈ្មោះឪពុក • Father's Name"
            value={student.fatherName}
            icon={User}
          />
          <InfoRow
            label="ឈ្មោះម្តាយ • Mother's Name"
            value={student.motherName}
            icon={User}
          />
          <InfoRow
            label="លេខទូរស័ព្ទអាណាព្យាបាល • Parent Phone"
            value={student.parentPhone}
            icon={Phone}
          />
          <InfoRow
            label="មុខរបរអាណាព្យាបាល • Parent Occupation"
            value={student.parentOccupation}
            icon={Briefcase}
          />
        </div>
      </div>

      {/* ✅ Section 4: Academic History */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <SectionTitle
          title="ប្រវត្តិការសិក្សា • Academic History"
          icon={BookOpen}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            label="ឡើងពីថ្នាក់ • Previous Grade"
            value={student.previousGrade}
            icon={GraduationCap}
          />
          <InfoRow
            label="មកពីសាលា • Previous School"
            value={student.previousSchool}
            icon={School}
          />
          <InfoRow
            label="ត្រួតថ្នាក់ទី • Repeating Grade"
            value={student.repeatingGrade}
            icon={ClipboardCheck}
          />
          <InfoRow
            label="ផ្ទេរមកពី • Transferred From"
            value={student.transferredFrom}
            icon={MapPin}
          />
        </div>
      </div>

      {/* ✅ Section 5: Grade 9 Exam Information */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <SectionTitle
          title="ប្រឡងបញ្ចប់ថ្នាក់ទី៩ • Grade 9 Exam"
          icon={Award}
          badge="សញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ"
        />
        {hasGrade9Data ? (
          <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
            <InfoRow
              label="វគ្គប្រឡង • Exam Session"
              value={student.grade9ExamSession}
              icon={Calendar}
            />
            <InfoRow
              label="មណ្ឌលប្រឡង • Exam Center"
              value={student.grade9ExamCenter}
              icon={Building2}
            />
            <InfoRow
              label="បន្ទប់ប្រឡង • Exam Room"
              value={student.grade9ExamRoom}
              icon={School}
            />
            <InfoRow
              label="លេខតុប្រឡង • Desk Number"
              value={student.grade9ExamDesk}
              icon={FileText}
            />
            <InfoRow
              label="ស្ថានភាពប្រឡង • Pass Status"
              value={student.grade9PassStatus}
              icon={ClipboardCheck}
            />
          </div>
        ) : (
          <EmptyState message="មិនទាន់មានព័ត៌មានប្រឡងថ្នាក់ទី៩ • No Grade 9 exam information yet" />
        )}
      </div>

      {/* ✅ Section 6: Grade 12 Exam Information */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <SectionTitle
          title="ប្រឡងបញ្ចប់ថ្នាក់ទី១២ • Grade 12 Exam"
          icon={Award}
          badge="សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ"
        />
        {hasGrade12Data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              label="វគ្គប្រឡង • Exam Session"
              value={student.grade12ExamSession}
              icon={Calendar}
            />
            <InfoRow
              label="មណ្ឌលប្រឡង • Exam Center"
              value={student.grade12ExamCenter}
              icon={Building2}
            />
            <InfoRow
              label="បន្ទប់ប្រឡង • Exam Room"
              value={student.grade12ExamRoom}
              icon={School}
            />
            <InfoRow
              label="លេខតុប្រឡង • Desk Number"
              value={student.grade12ExamDesk}
              icon={FileText}
            />
            <InfoRow
              label="ផ្លូវសិក្សា • Track"
              value={student.grade12Track}
              icon={BookOpen}
            />
            <InfoRow
              label="ស្ថានភាពប្រឡង • Pass Status"
              value={student.grade12PassStatus}
              icon={ClipboardCheck}
            />
          </div>
        ) : (
          <EmptyState message="មិនទាន់មានព័ត៌មានប្រឡងថ្នាក់ទី១២ • No Grade 12 exam information yet" />
        )}
      </div>

      {/* ✅ Section 7: Additional Information */}
      {student.remarks && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <SectionTitle title="ផ្សេងៗ • Remarks" icon={FileText} />
          <div className="p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {student.remarks}
            </p>
          </div>
        </div>
      )}

      {/* ✅ Footer Info */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              បង្កើតនៅ:{" "}
              {student.createdAt ? formatDate(student.createdAt) : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>
              ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ:{" "}
              {student.updatedAt ? formatDate(student.updatedAt) : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
