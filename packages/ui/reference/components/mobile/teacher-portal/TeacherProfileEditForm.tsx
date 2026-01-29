"use client";

import { useState, useCallback } from "react";
import {
  Save,
  X,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import {
  TeacherProfile,
  UpdateTeacherProfileData,
} from "@/lib/api/teacher-portal";

interface TeacherProfileEditFormProps {
  profile: TeacherProfile;
  onSave: (data: UpdateTeacherProfileData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

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

export default function TeacherProfileEditForm({
  profile,
  onSave,
  onCancel,
  isSubmitting,
  onUnsavedChanges,
}: TeacherProfileEditFormProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Info
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    khmerName: profile.khmerName || "",
    englishName:
      profile.englishName || `${profile.firstName} ${profile.lastName}`,
    gender: profile.gender || "MALE",
    dateOfBirth: profile.dateOfBirth || "",

    // Contact Info
    email: profile.email || "",
    phone: profile.phone || "",
    address: profile.address || "",

    // Work Info
    position: profile.position || "",
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

    if (!formData.email.trim()) {
      alert("សូមបញ្ចូលអ៊ីមែល");
      return;
    }

    const submitData: UpdateTeacherProfileData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      khmerName: formData.khmerName.trim(),
      englishName: formData.englishName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      gender: formData.gender as "MALE" | "FEMALE",
      dateOfBirth: formData.dateOfBirth || undefined,
      address: formData.address.trim() || undefined,
      position: formData.position.trim() || undefined,
    };

    await onSave(submitData);
    setHasUnsavedChanges(false);
    onUnsavedChanges?.(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sticky Action Buttons */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 -mx-4 px-4 py-4 flex gap-3 border-b border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
          <span>បោះបង់</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>កំពុងរក្សាទុក...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>រក្សាទុក</span>
            </>
          )}
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-900 mb-1">
            កែប្រែព័ត៌មានរបស់អ្នក
          </p>
          <p className="text-xs text-blue-700">
            សូមបំពេញព័ត៌មានឱ្យបានត្រឹមត្រូវ និងពេញលេញ។ ប្រអប់ដែលមានសញ្ញា (*)
            គឺជាចាំបាច់ត្រូវបំពេញ។
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
        <SectionTitle
          title="ព័ត៌មានផ្ទាល់ខ្លួន"
          icon={<User className="w-5 h-5 text-white" />}
        />
        <div className="space-y-4">
          <InputField
            label="គោត្តនាមនិងនាមជាអក្សរខ្មែរ"
            name="khmerName"
            value={formData.khmerName}
            onChange={handleChange}
            required
            placeholder="ឧ. ស៊ុន សុខា"
            icon={<User className="w-4 h-4" />}
          />

          <InputField
            label="First Name (English)"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            icon={<User className="w-4 h-4" />}
          />

          <InputField
            label="Last Name (English)"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            icon={<User className="w-4 h-4" />}
          />

          <InputField
            label="គោត្តនាមនិងនាមជាអក្សរឡាតាំង"
            name="englishName"
            value={formData.englishName}
            onChange={handleChange}
            placeholder="ឧ. Sun Sokha"
            icon={<User className="w-4 h-4" />}
          />

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              ភេទ <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300"
            >
              <option value="MALE">ប្រុស</option>
              <option value="FEMALE">ស្រី</option>
            </select>
          </div>

          <InputField
            label="ថ្ងៃខែឆ្នាំកំណើត"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            type="date"
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
        <SectionTitle
          title="ព័ត៌មានទំនាក់ទំនង"
          icon={<Phone className="w-5 h-5 text-white" />}
        />
        <div className="space-y-4">
          <InputField
            label="អ៊ីមែល"
            name="email"
            value={formData.email}
            onChange={handleChange}
            type="email"
            required
            placeholder="example@school.com"
            icon={<Mail className="w-4 h-4" />}
          />

          <InputField
            label="លេខទូរស័ព្ទ"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            type="tel"
            placeholder="012345678"
            icon={<Phone className="w-4 h-4" />}
          />

          <div className="group">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              អាសយដ្ឋាន
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="បញ្ចូលអាសយដ្ឋានពេញលេញ..."
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 font-medium bg-white transition-all hover:border-gray-300 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Work Information */}
      <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
        <SectionTitle
          title="ព័ត៌មានការងារ"
          icon={<Briefcase className="w-5 h-5 text-white" />}
        />
        <div className="space-y-4">
          <InputField
            label="តួនាទី/មុខតំណែង"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="ឧ. គ្រូបង្រៀនគណិតវិទ្យា, ប្រធានផ្នែក, ជំនួយការ..."
            icon={<Briefcase className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Bottom Spacing for Fixed Buttons */}
      <div className="h-20"></div>
    </form>
  );
}
