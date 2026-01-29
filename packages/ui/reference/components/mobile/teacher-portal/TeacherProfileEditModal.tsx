"use client";

import { useState } from "react";
import {
  X,
  Save,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";
import {
  TeacherProfile,
  UpdateTeacherProfileData,
} from "@/lib/api/teacher-portal";
import { useToast } from "@/hooks/useToast";

interface TeacherProfileEditModalProps {
  profile: TeacherProfile;
  onClose: () => void;
  onSave: (data: UpdateTeacherProfileData) => Promise<void>;
}

export default function TeacherProfileEditModal({
  profile,
  onClose,
  onSave,
}: TeacherProfileEditModalProps) {
  const { success, error: showError, ToastContainer } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    khmerName: profile.khmerName || "",
    englishName:
      profile.englishName || `${profile.firstName} ${profile.lastName}`,
    gender: profile.gender || "MALE",
    dateOfBirth: profile.dateOfBirth || "",
    email: profile.email || "",
    phone: profile.phone || "",
    address: profile.address || "",
    position: profile.position || "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.khmerName.trim()) {
      showError("សូមបញ្ចូលគោត្តនាមនិងនាមជាអក្សរខ្មែរ");
      return;
    }

    if (!formData.email.trim()) {
      showError("សូមបញ្ចូលអ៊ីមែល");
      return;
    }

    try {
      setIsSubmitting(true);
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
      // Success toast is now shown in parent component
    } catch (error: any) {
      showError(error.message || "មិនអាចធ្វើបច្ចុប្បន្នភាពបានទេ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center max-w-md mx-auto backdrop-blur-sm">
        <div className="w-full max-h-[92vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-white">កែប្រែព័ត៌មាន</h1>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all active:scale-95"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar"
        >
          {/* Basic Info Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border-2 border-indigo-100">
            <h4 className="text-lg font-koulen font-black text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <span>ព័ត៌មានផ្ទាល់ខ្លួន</span>
            </h4>
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
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First"
                  icon={<User className="w-4 h-4" />}
                />
                <InputField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last"
                  icon={<User className="w-4 h-4" />}
                />
              </div>
              <InputField
                label="ឈ្មោះជាអក្សរឡាតាំង"
                name="englishName"
                value={formData.englishName}
                onChange={handleChange}
                placeholder="Sun Sokha"
                icon={<User className="w-4 h-4" />}
              />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  ភេទ <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none font-medium bg-white transition-all"
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

          {/* Contact Info Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-5 border-2 border-green-100">
            <h4 className="text-lg font-koulen font-black text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              <span>ព័ត៌មានទំនាក់ទំនង</span>
            </h4>
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  អាសយដ្ឋាន
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="បញ្ចូលអាសយដ្ឋានពេញលេញ..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:border-green-500 focus:outline-none font-medium bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Work Info Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-5 border-2 border-blue-100">
            <h4 className="text-lg font-koulen font-black text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span>ព័ត៌មានការងារ</span>
            </h4>
            <InputField
              label="តួនាទី/មុខតំណែង"
              name="position"
              value={formData.position}
              onChange={handleChange}
              placeholder="ឧ. គ្រូបង្រៀនគណិតវិទ្យា, ប្រធានផ្នែក..."
              icon={<Briefcase className="w-4 h-4" />}
            />
          </div>
        </form>

        {/* Footer Actions - with bottom padding for nav bar */}
        <div className="px-6 py-4 pb-24 border-t-2 border-gray-100 bg-white shadow-lg flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
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
      </div>
    </div>
    </>
  );
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
  <div>
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
      className="w-full px-4 py-3 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none font-medium bg-white transition-all"
    />
  </div>
);
