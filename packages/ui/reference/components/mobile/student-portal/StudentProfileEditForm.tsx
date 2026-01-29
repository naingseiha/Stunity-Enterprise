"use client";

import { useState, useCallback, useEffect } from "react";
import { Save, X, Loader2, User, Phone, Mail, MapPin, Calendar, Users, BookOpen, Award, FileText, AlertCircle } from "lucide-react";
import { StudentProfile } from "@/lib/api/student-portal";

interface StudentProfileEditFormProps {
  profile: StudentProfile;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  onUnsavedChanges?: (hasChanges: boolean) => void; // Notify parent of unsaved changes
}

// Move InputField outside component to prevent re-creation
const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  icon,
}: any) => (
  <div className="group">
    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
      {icon && <span className="text-indigo-500">{icon}</span>}
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
    />
  </div>
);

const SectionTitle = ({ title, icon }: { title: string; icon?: any }) => (
  <div className="flex items-center gap-3 mb-5">
    {icon && (
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
        {icon}
      </div>
    )}
    <h1 className="text-xl font-black text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
      {title}
    </h1>
  </div>
);

export default function StudentProfileEditForm({
  profile,
  onSave,
  onCancel,
  isSubmitting,
  onUnsavedChanges,
}: StudentProfileEditFormProps) {
  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [formData, setFormData] = useState({
    // Basic Info
    khmerName: profile.student.khmerName || "",
    englishName: profile.student.englishName || `${profile.firstName} ${profile.lastName}`,
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    gender: profile.student.gender || "MALE",
    dateOfBirth: profile.student.dateOfBirth || "",
    placeOfBirth: profile.student.placeOfBirth || "",

    // Contact Info
    phoneNumber: profile.student.phoneNumber || profile.phone || "",
    email: profile.email || "",
    currentAddress: profile.student.currentAddress || "",

    // Parent Info
    fatherName: (profile.student as any).fatherName || "",
    motherName: (profile.student as any).motherName || "",
    parentPhone: profile.student.parentPhone || "",
    parentOccupation: profile.student.parentOccupation || "",

    // Academic History
    previousGrade: (profile.student as any).previousGrade || "",
    previousSchool: (profile.student as any).previousSchool || "",
    repeatingGrade: (profile.student as any).repeatingGrade || "",
    transferredFrom: (profile.student as any).transferredFrom || "",

    // Grade 9 Exam
    grade9ExamSession: (profile.student as any).grade9ExamSession || "",
    grade9ExamCenter: (profile.student as any).grade9ExamCenter || "",
    grade9ExamRoom: (profile.student as any).grade9ExamRoom || "",
    grade9ExamDesk: (profile.student as any).grade9ExamDesk || "",
    grade9PassStatus: (profile.student as any).grade9PassStatus || "",

    // Grade 12 Exam
    grade12ExamSession: (profile.student as any).grade12ExamSession || "",
    grade12ExamCenter: (profile.student as any).grade12ExamCenter || "",
    grade12ExamRoom: (profile.student as any).grade12ExamRoom || "",
    grade12ExamDesk: (profile.student as any).grade12ExamDesk || "",
    grade12Track: (profile.student as any).grade12Track || "",
    grade12PassStatus: (profile.student as any).grade12PassStatus || "",

    // Remarks
    remarks: (profile.student as any).remarks || "",
  });

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      // Mark as having unsaved changes
      if (!hasUnsavedChanges) {
        setHasUnsavedChanges(true);
        onUnsavedChanges?.(true);
      }
    },
    [hasUnsavedChanges, onUnsavedChanges]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.khmerName.trim()) {
      alert("សូមបញ្ចូលគោត្តនាមនិងនាមជាអក្សរខ្មែរ");
      return;
    }

    if (!formData.dateOfBirth) {
      alert("សូមបញ្ចូលថ្ងៃខែឆ្នាំកំណើត");
      return;
    }

    // Split englishName into firstName and lastName for proper database storage
    const englishNameParts = formData.englishName.trim().split(/\s+/);
    const submitData = {
      ...formData,
      // If englishName has multiple words, use last as lastName, rest as firstName
      firstName: englishNameParts.length > 1 
        ? englishNameParts.slice(0, -1).join(" ") 
        : englishNameParts[0] || "",
      lastName: englishNameParts.length > 1 
        ? englishNameParts[englishNameParts.length - 1] 
        : "",
    };

    await onSave(submitData);
    // Clear unsaved changes flag after successful save
    setHasUnsavedChanges(false);
    onUnsavedChanges?.(false);
  };

  // Handle cancel with unsaved changes check
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setPendingAction(() => onCancel);
      setShowUnsavedWarning(true);
    } else {
      onCancel();
    }
  };

  // Warning dialog handlers
  const handleSaveAndContinue = async () => {
    try {
      await handleSubmit(new Event('submit') as any);
      setShowUnsavedWarning(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error) {
      console.error("Error during save and continue:", error);
      setShowUnsavedWarning(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    onUnsavedChanges?.(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelChange = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
  };

  // Block browser navigation when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="space-y-5 pb-4">
      {/* Improved Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-5 -m-5 mb-0 rounded-b-[2rem] shadow-2xl">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-16 -translate-x-16"></div>
        </div>
        
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight mb-1">កែប្រែព័ត៌មាន</h1>
            <p className="text-xs text-white/90 font-medium">
              សូមបំពេញព័ត៌មានអោយបានគ្រប់គ្រាន់
            </p>
            {hasUnsavedChanges && (
              <div className="mt-2 flex items-center gap-1.5 text-xs bg-yellow-400/20 text-yellow-100 px-3 py-1.5 rounded-full border border-yellow-300/30 backdrop-blur-sm w-fit">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">មានការផ្លាស់ប្តូរមិនទាន់រក្សា</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ព័ត៌មានទូទៅ" 
            icon={<User className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="គោត្តនាមនិងនាម (ខ្មែរ)"
              name="khmerName"
              value={formData.khmerName}
              onChange={handleChange}
              required
              placeholder="ឧ. សុខ ចន្ទា"
            />
            <InputField
              label="ឈ្មោះជាអក្សរឡាតាំង"
              name="englishName"
              value={formData.englishName}
              onChange={handleChange}
              placeholder="Sok Chantha"
            />
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ភេទ <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
              >
                <option value="MALE">ប្រុស (Male)</option>
                <option value="FEMALE">ស្រី (Female)</option>
              </select>
            </div>
            <InputField
              label="ថ្ងៃខែឆ្នាំកំណើត"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              type="date"
              required
            />
            <InputField
              label="ទីកន្លែងកំណើត"
              name="placeOfBirth"
              value={formData.placeOfBirth}
              onChange={handleChange}
              placeholder="ភ្នំពេញ"
            />
            <InputField
              label="អាសយដ្ឋានបច្ចុប្បន្ន"
              name="currentAddress"
              value={formData.currentAddress}
              onChange={handleChange}
              placeholder="ភ្នំពេញ"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ព័ត៌មានទំនាក់ទំនង" 
            icon={<Phone className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="លេខទូរសព្ទ"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              type="tel"
              placeholder="012345678"
            />
            <InputField
              label="អ៊ីមែល"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="student@school.edu.kh"
            />
          </div>
        </div>

        {/* Parent Information */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ព័ត៌មានឪពុកម្តាយ" 
            icon={<Users className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="ឈ្មោះឪពុក"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleChange}
              placeholder="ឈ្មោះឪពុក"
            />
            <InputField
              label="ឈ្មោះម្តាយ"
              name="motherName"
              value={formData.motherName}
              onChange={handleChange}
              placeholder="ឈ្មោះម្តាយ"
            />
            <InputField
              label="លេខទូរសព្ទឪពុកម្តាយ"
              name="parentPhone"
              value={formData.parentPhone}
              onChange={handleChange}
              type="tel"
              placeholder="012345678"
            />
            <InputField
              label="មុខរបរឪពុកម្តាយ"
              name="parentOccupation"
              value={formData.parentOccupation}
              onChange={handleChange}
              placeholder="កសិករ"
            />
          </div>
        </div>

        {/* Academic History */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ប្រវត្តិសិក្សា" 
            icon={<BookOpen className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="ឡើងពីថ្នាក់"
              name="previousGrade"
              value={formData.previousGrade}
              onChange={handleChange}
              placeholder="៦ក"
            />
            <InputField
              label="មកពីសាលា"
              name="previousSchool"
              value={formData.previousSchool}
              onChange={handleChange}
              placeholder="សាលាចាស់"
            />
            <InputField
              label="ត្រួតថ្នាក់ទី"
              name="repeatingGrade"
              value={formData.repeatingGrade}
              onChange={handleChange}
              placeholder="៧ខ"
            />
            <InputField
              label="ផ្ទេរមកពី"
              name="transferredFrom"
              value={formData.transferredFrom}
              onChange={handleChange}
              placeholder="ខេត្ត/ក្រុង"
            />
          </div>
        </div>

        {/* Grade 9 Exam */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ប្រឡងថ្នាក់ទី៩" 
            icon={<Award className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="សម័យប្រឡង"
              name="grade9ExamSession"
              value={formData.grade9ExamSession}
              onChange={handleChange}
              placeholder="២០២៤"
            />
            <InputField
              label="មណ្ឌលប្រឡង"
              name="grade9ExamCenter"
              value={formData.grade9ExamCenter}
              onChange={handleChange}
              placeholder="មណ្ឌល១"
            />
            <InputField
              label="បន្ទប់ប្រឡង"
              name="grade9ExamRoom"
              value={formData.grade9ExamRoom}
              onChange={handleChange}
              placeholder="១"
            />
            <InputField
              label="លេខតុប្រឡង"
              name="grade9ExamDesk"
              value={formData.grade9ExamDesk}
              onChange={handleChange}
              placeholder="០១"
            />
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ស្ថានភាពប្រឡង
              </label>
              <select
                name="grade9PassStatus"
                value={formData.grade9PassStatus}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
              >
                <option value="">-- ជ្រើសរើស --</option>
                <option value="ជាប់">ជាប់ (Passed)</option>
                <option value="ធ្លាក់">ធ្លាក់ (Failed)</option>
                <option value="មិនប្រឡង">មិនប្រឡង (Not Taken)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grade 12 Exam */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="ប្រឡងថ្នាក់ទី១២" 
            icon={<Award className="w-5 h-5 text-white" />}
          />
          <div className="space-y-4">
            <InputField
              label="សម័យប្រឡង"
              name="grade12ExamSession"
              value={formData.grade12ExamSession}
              onChange={handleChange}
              placeholder="២០២៧"
            />
            <InputField
              label="មណ្ឌលប្រឡង"
              name="grade12ExamCenter"
              value={formData.grade12ExamCenter}
              onChange={handleChange}
              placeholder="មណ្ឌល១"
            />
            <InputField
              label="បន្ទប់ប្រឡង"
              name="grade12ExamRoom"
              value={formData.grade12ExamRoom}
              onChange={handleChange}
              placeholder="១"
            />
            <InputField
              label="លេខតុប្រឡង"
              name="grade12ExamDesk"
              value={formData.grade12ExamDesk}
              onChange={handleChange}
              placeholder="០១"
            />
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ផ្លូវសិក្សា
              </label>
              <select
                name="grade12Track"
                value={formData.grade12Track}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
              >
                <option value="">-- ជ្រើសរើស --</option>
                <option value="វិទ្យាសាស្ត្រ">វិទ្យាសាស្ត្រ (Science)</option>
                <option value="សង្គម">សង្គម (Social)</option>
              </select>
            </div>
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ស្ថានភាពប្រឡង
              </label>
              <select
                name="grade12PassStatus"
                value={formData.grade12PassStatus}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
              >
                <option value="">-- ជ្រើសរើស --</option>
                <option value="ជាប់">ជាប់ (Passed)</option>
                <option value="ធ្លាក់">ធ្លាក់ (Failed)</option>
                <option value="មិនប្រឡង">មិនប្រឡង (Not Taken)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <SectionTitle 
            title="កំណត់សម្គាល់" 
            icon={<FileText className="w-5 h-5 text-white" />}
          />
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={4}
            placeholder="កំណត់សម្គាល់ផ្សេងៗ..."
            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 -mx-5 px-5 pb-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="group relative overflow-hidden px-6 py-4 bg-gradient-to-br from-gray-400 to-gray-500 text-white rounded-2xl hover:shadow-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <X className="w-5 h-5 relative z-10" />
            <span className="relative z-10">បោះបង់</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative overflow-hidden px-6 py-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10">កំពុងរក្សាទុក...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 relative z-10" />
                <span className="relative z-10">រក្សាទុក</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <h1 className="font-koulen text-xl text-gray-900">
                  មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក
                </h1>
                <p className="text-sm text-gray-600 font-battambang">
                  Unsaved Changes
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 font-battambang leading-relaxed">
              អ្នកមានព័ត៌មានដែលមិនទាន់រក្សាទុក។ តើអ្នកចង់រក្សាទុកវាឬបោះបង់?
              <br />
              <span className="text-gray-500">
                You have unsaved information. Do you want to save or discard it?
              </span>
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndContinue}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-battambang font-bold py-3.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    កំពុងរក្សា...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    រក្សាទុក • Save
                  </>
                )}
              </button>
              <button
                onClick={handleDiscardChanges}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-battambang font-bold py-3.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                បោះបង់ • Discard
              </button>
              <button
                onClick={handleCancelChange}
                disabled={isSubmitting}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-battambang font-bold py-3.5 px-6 rounded-xl active:scale-[0.98] transition-all"
              >
                ត្រឡប់ក្រោយ • Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
