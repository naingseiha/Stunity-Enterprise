"use client";

import React from "react";
import { UserCheck, AlertCircle } from "lucide-react";

interface TeacherBasicInfoFormProps {
  formData: {
    firstName: string;
    lastName: string;
    khmerName: string;
    email: string;
    phone: string;
    gender: string;
    role: string;
    employeeId: string;
    position: string;
    dateOfBirth: string;
    hireDate: string;
    address: string;
  };
  formErrors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function TeacherBasicInfoForm({
  formData,
  formErrors,
  onChange,
}: TeacherBasicInfoFormProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
      <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-blue-600" />
        ព័ត៌មានមូលដ្ឋាន • Basic Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* First Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ឈ្មោះដំបូង • First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            className={`w-full px-4 py-2.5 border ${
              formErrors.firstName ? "border-red-500" : "border-gray-300"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium`}
            placeholder="John"
          />
          {formErrors.firstName && (
            <p className="text-red-500 text-xs mt-1 font-semibold">
              {formErrors.firstName}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            នាមត្រកូល • Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            className={`w-full px-4 py-2.5 border ${
              formErrors.lastName ? "border-red-500" : "border-gray-300"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium`}
            placeholder="Doe"
          />
          {formErrors.lastName && (
            <p className="text-red-500 text-xs mt-1 font-semibold">
              {formErrors.lastName}
            </p>
          )}
        </div>

        {/* Khmer Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ឈ្មោះជាអក្សរខ្មែរ • Khmer Name
          </label>
          <input
            type="text"
            value={formData.khmerName}
            onChange={(e) => onChange("khmerName", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            placeholder="ចន ដូ"
          />
        </div>

        {/* Email */}
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            អ៊ីមែល • Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            className={`w-full px-4 py-2.5 border ${
              formErrors.email ? "border-red-500" : "border-gray-300"
            } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium`}
            placeholder="john. doe@school.com"
          />
          {formErrors.email && (
            <p className="text-red-500 text-xs mt-1 font-semibold">
              {formErrors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            លេខទូរស័ព្ទ • Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            placeholder="012 345 678"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ភេទ • Gender <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
          >
            <option value="MALE">ប្រុស • Male</option>
            <option value="FEMALE">ស្រី • Female</option>
          </select>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            តួនាទី • Role <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.role}
            onChange={(e) => onChange("role", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus: ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
          >
            <option value="TEACHER">
              គ្រូធម្មតា • Teacher (បង្រៀនតែប៉ុណ្ណោះ)
            </option>
            <option value="INSTRUCTOR">
              គ្រូប្រចាំថ្នាក់ • Homeroom Teacher (គ្រប់គ្រង + បង្រៀន)
            </option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {formData.role === "INSTRUCTOR"
              ? "💼 គ្រប់គ្រងថ្នាក់មួយ និងអាចបង្រៀនថ្នាក់ផ្សេងបាន"
              : "📚 បង្រៀនតែប៉ុណ្ណោះ មិនគ្រប់គ្រងថ្នាក់"}
          </p>
        </div>

        {/* Employee ID */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            លេខកូដ • Employee ID
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => onChange("employeeId", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            placeholder="T001"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            តួនាទីការងារ • Position
          </label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => onChange("position", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus: ring-blue-500 focus: border-transparent font-medium"
            placeholder="Senior Teacher"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ថ្ងៃខែឆ្នាំកំណើត • DOB
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
          />
        </div>

        {/* Hire Date */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            ថ្ងៃចូលបម្រើការងារ • Hire Date
          </label>
          <input
            type="date"
            value={formData.hireDate}
            onChange={(e) => onChange("hireDate", e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus: ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            អាសយដ្ឋាន • Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => onChange("address", e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            placeholder="Phnom Penh, Cambodia"
          />
        </div>
      </div>
    </div>
  );
}
