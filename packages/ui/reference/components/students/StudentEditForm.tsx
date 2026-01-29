"use client";

import { useState } from "react";
import { Student } from "@/lib/api/students";
import { useData } from "@/context/DataContext";
import { Save, X, Loader2 } from "lucide-react";

interface StudentEditFormProps {
  student: Student | null;
  onSave: (data: Partial<Student>) => void;
  onCancel: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
}

// ✅ Move these components outside to prevent re-creation on every render
const InputField = ({
  label,
  name,
  type = "text",
  required = false,
  placeholder = "",
  value,
  onChange,
}: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
    />
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
  <h4 className="text-lg font-black text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
    {title}
  </h4>
);

export default function StudentEditForm({
  student,
  onSave,
  onCancel,
  isSaving,
  isSubmitting,
}: StudentEditFormProps) {
  const { classes } = useData();
  const [formData, setFormData] = useState({
    khmerName: student?.khmerName || "",
    englishName:
      student?.englishName ||
      (student ? `${student.firstName} ${student.lastName}` : ""),
    firstName: student?.firstName || "",
    lastName: student?.lastName || "",
    gender: student?.gender || "male",
    dateOfBirth: student?.dateOfBirth || "",
    placeOfBirth: (student as any)?.placeOfBirth || "",
    currentAddress: (student as any)?.currentAddress || "",
    phoneNumber: student?.phoneNumber || student?.phone || "",
    email: student?.email || "",
    classId: student?.classId || "",
    fatherName: (student as any)?.fatherName || "",
    motherName: (student as any)?.motherName || "",
    parentPhone: (student as any)?.parentPhone || "",
    parentOccupation: (student as any)?.parentOccupation || "",
    previousGrade: (student as any)?.previousGrade || "",
    previousSchool: (student as any)?.previousSchool || "",
    repeatingGrade: (student as any)?.repeatingGrade || "",
    transferredFrom: (student as any)?.transferredFrom || "",
    grade9ExamSession: (student as any)?.grade9ExamSession || "",
    grade9ExamCenter: (student as any)?.grade9ExamCenter || "",
    grade9ExamRoom: (student as any)?.grade9ExamRoom || "",
    grade9ExamDesk: (student as any)?.grade9ExamDesk || "",
    grade9PassStatus: (student as any)?.grade9PassStatus || "",
    grade12ExamSession: (student as any)?.grade12ExamSession || "",
    grade12ExamCenter: (student as any)?.grade12ExamCenter || "",
    grade12ExamRoom: (student as any)?.grade12ExamRoom || "",
    grade12ExamDesk: (student as any)?.grade12ExamDesk || "",
    grade12Track: (student as any)?.grade12Track || "",
    grade12PassStatus: (student as any)?.grade12PassStatus || "",
    remarks: (student as any)?.remarks || "",
  });

  const saving = isSaving || isSubmitting;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Auto-populate firstName and lastName from khmerName
    if (name === "khmerName" && value.trim()) {
      const parts = value.trim().split(/\s+/);
      if (parts.length >= 2) {
        setFormData((prev) => ({
          ...prev,
          khmerName: value,
          lastName: parts[0], // First word as lastName
          firstName: parts.slice(1).join(" "), // Rest as firstName
        }));
      } else if (parts.length === 1) {
        setFormData((prev) => ({
          ...prev,
          khmerName: value,
          lastName: parts[0],
          firstName: "",
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      {/* Basic Information */}
      <div>
        <SectionTitle title="ព័ត៌មានទូទៅ" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <InputField
              label="គោត្តនាមនិងនាម (ខ្មែរ)"
              name="khmerName"
              required
              placeholder="ឧ.  សុខ ចន្ទា"
              value={formData.khmerName}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 វាលខាងក្រោមនឹងត្រូវបំពេញដោយស្វ័យប្រវត្តិពីឈ្មោះពេញខាងលើ
            </p>
          </div>
          <InputField
            label="គោត្តនាម (នាមត្រកូល)"
            name="lastName"
            placeholder="សុខ"
            value={formData.lastName}
            onChange={handleChange}
          />
          <InputField
            label="នាម (ឈ្មោះផ្ទាល់ខ្លួន)"
            name="firstName"
            placeholder="ចន្ទា"
            value={formData.firstName}
            onChange={handleChange}
          />
          <InputField
            label="ឈ្មោះជាអក្សរឡាតាំង"
            name="englishName"
            placeholder="Sok Chantha"
            value={formData.englishName}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ភេទ <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="male">ប្រុស (Male)</option>
              <option value="female">ស្រី (Female)</option>
            </select>
          </div>
          <InputField
            label="ថ្ងៃខែឆ្នាំកំណើត"
            name="dateOfBirth"
            type="date"
            required
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
          <InputField
            label="ទីកន្លែងកំណើត"
            name="placeOfBirth"
            placeholder="ភ្នំពេញ"
            value={formData.placeOfBirth}
            onChange={handleChange}
          />
          <InputField
            label="អាសយដ្ឋានបច្ចុប្បន្ន"
            name="currentAddress"
            placeholder="ភ្នំពេញ"
            value={formData.currentAddress}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <SectionTitle title="ព័ត៌មានទំនាក់ទំនង" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="លេខទូរសព្ទ"
            name="phoneNumber"
            type="tel"
            placeholder="012345678"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
          <InputField
            label="អ៊ីមែល"
            name="email"
            type="email"
            placeholder="student@school.edu. kh"
            value={formData.email}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ថ្នាក់
            </label>
            <select
              name="classId"
              value={formData.classId}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">មិនមានថ្នាក់</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parent Information */}
      <div>
        <SectionTitle title="ព័ត៌មានឪពុកម្តាយ" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="ឈ្មោះឪពុក"
            name="fatherName"
            value={formData.fatherName}
            onChange={handleChange}
            placeholder="ឪពុក"
          />
          <InputField
            label="ឈ្មោះម្តាយ"
            name="motherName"
            placeholder="ម្តាយ"
            value={formData.motherName}
            onChange={handleChange}
          />
          <InputField
            label="លេខទូរសព្ទឪពុកម្តាយ"
            name="parentPhone"
            type="tel"
            placeholder="012345678"
            value={formData.parentPhone}
            onChange={handleChange}
          />
          <InputField
            label="មុខរបរឪពុកម្តាយ"
            name="parentOccupation"
            placeholder="កសិករ"
            value={formData.parentOccupation}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Academic History */}
      <div>
        <SectionTitle title="ប្រវត្តិសិក្សា" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="ឡើងពីថ្នាក់"
            name="previousGrade"
            placeholder="៦ក"
            value={formData.previousGrade}
            onChange={handleChange}
          />
          <InputField
            label="មកពីសាលា"
            name="previousSchool"
            placeholder="សាលាចាស់"
            value={formData.previousSchool}
            onChange={handleChange}
          />
          <InputField
            label="ត្រួតថ្នាក់ទី"
            name="repeatingGrade"
            placeholder="៧ខ"
            value={formData.repeatingGrade}
            onChange={handleChange}
          />
          <InputField
            label="ផ្ទេរមកពី"
            name="transferredFrom"
            placeholder="ខេត្ត/ក្រុង"
            value={formData.transferredFrom}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Grade 9 Exam */}
      <div>
        <SectionTitle title="ប្រឡងថ្នាក់ទី៩ (សញ្ញាបត្រមធ្យមសិក្សាបឋមភូមិ)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="សម័យប្រឡង"
            name="grade9ExamSession"
            placeholder="២០២៤"
            value={formData.grade9ExamSession}
            onChange={handleChange}
          />
          <InputField
            label="មណ្ឌលប្រឡង"
            name="grade9ExamCenter"
            placeholder="មណ្ឌល១"
            value={formData.grade9ExamCenter}
            onChange={handleChange}
          />
          <InputField
            label="បន្ទប់ប្រឡង"
            name="grade9ExamRoom"
            placeholder="១"
            value={formData.grade9ExamRoom}
            onChange={handleChange}
          />
          <InputField
            label="លេខតុប្រឡង"
            name="grade9ExamDesk"
            placeholder="០១"
            value={formData.grade9ExamDesk}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ស្ថានភាពប្រឡង
            </label>
            <select
              name="grade9PassStatus"
              value={formData.grade9PassStatus}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- ជ្រើសរើស --</option>
              <option value="ជាប់">ជាប់ (Passed)</option>
              <option value="ធ្លាក់">ធ្លាក់ (Failed)</option>
              <option value="មិនប្រលង">មិនប្រលង (Not Taken)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grade 12 Exam */}
      <div>
        <SectionTitle title="ប្រឡងថ្នាក់ទី១២ (សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ)" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="សម័យប្រឡង"
            name="grade12ExamSession"
            placeholder="២០២៧"
            value={formData.grade12ExamSession}
            onChange={handleChange}
          />
          <InputField
            label="មណ្ឌលប្រឡង"
            name="grade12ExamCenter"
            placeholder="មណ្ឌល១"
            value={formData.grade12ExamCenter}
            onChange={handleChange}
          />
          <InputField
            label="បន្ទប់ប្រឡង"
            name="grade12ExamRoom"
            placeholder="១"
            value={formData.grade12ExamRoom}
            onChange={handleChange}
          />
          <InputField
            label="លេខតុប្រឡង"
            name="grade12ExamDesk"
            placeholder="០១"
            value={formData.grade12ExamDesk}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ផ្លូវសិក្សា
            </label>
            <select
              name="grade12Track"
              value={formData.grade12Track}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- ជ្រើសរើស --</option>
              <option value="វិទ្យាសាស្ត្រ">វិទ្យាសាស្ត្រ (Science)</option>
              <option value="សង្គម">សង្គម (Social)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ស្ថានភាពប្រឡង
            </label>
            <select
              name="grade12PassStatus"
              value={formData.grade12PassStatus}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- ជ្រើសរើស --</option>
              <option value="ជាប់">ជាប់ (Passed)</option>
              <option value="ធ្លាក់">ធ្លាក់ (Failed)</option>
              <option value="មិនប្រលង">មិនប្រលង (Not Taken)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <SectionTitle title="កំណត់សម្គាល់" />
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          rows={4}
          placeholder="កំណត់សម្គាល់ផ្សេងៗ..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          បោះបង់
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              កំពុងរក្សាទុក...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              រក្សាទុក
            </>
          )}
        </button>
      </div>
    </form>
  );
}
