"use client";

import React, { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

export interface TeacherRowData {
  id: string;
  lastName: string;
  firstName: string;
  khmerName: string;
  englishName: string; // ✅ NEW
  email: string;
  phone: string;
  gender: "ប" | "ស" | "MALE" | "FEMALE" | "";
  role: "TEACHER" | "INSTRUCTOR" | "";
  dateOfBirth: string;
  hireDate: string;
  address: string;
  position: string;
  subjects: string;
  teachingClasses: string;
  homeroomClass: string;
  errors?: {
    lastName?: string;
    firstName?: string;
    phone?: string;
    email?: string;
    homeroomClass?: string;
    khmerName?: string;
  };
  isValid?: boolean;
  isExisting?: boolean;
  hasChanges?: boolean; // ✅ NEW
}

interface TeacherGridRowProps {
  row: TeacherRowData;
  rowIndex: number;
  onUpdate: (id: string, field: keyof TeacherRowData, value: string) => void;
  onDelete: (id: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, rowIndex: number, field: string) => void;
}

export default function TeacherGridRow({
  row,
  rowIndex,
  onUpdate,
  onDelete,
  onKeyDown,
}: TeacherGridRowProps) {
  const [localRow, setLocalRow] = useState(row);

  useEffect(() => {
    setLocalRow(row);
  }, [row]);

  const handleChange = (field: keyof TeacherRowData, value: string) => {
    setLocalRow((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof TeacherRowData) => {
    onUpdate(row.id, field, localRow[field] as string);
  };

  const getInputClass = (field: keyof TeacherRowData, bgColor: string) => {
    const hasError = row.errors?.[field as keyof typeof row.errors];
    return `w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-inset ${
      hasError
        ? "focus:ring-red-500 bg-red-50 text-red-900"
        : `focus:ring-blue-500 ${bgColor}`
    }`;
  };

  return (
    <tr className="group hover:bg-blue-50/50 transition-colors">
      {/* Row Number */}
      <td className="bg-gray-50 px-3 py-0 text-center border-r border-gray-200 sticky left-0 z-10">
        <div className="h-12 flex items-center justify-center">
          <span className="text-sm font-bold text-blue-600">
            {String(rowIndex + 1).padStart(2, "0")}
          </span>
        </div>
      </td>

      {/* Last Name (គោត្តនាម) */}
      <td className="bg-pink-50 px-0 py-0 border-r border-pink-100">
        <div className="relative h-12">
          <input
            type="text"
            value={localRow.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "lastName")}
            placeholder="គោត្តនាម"
            className={getInputClass("lastName", "bg-pink-50")}
            data-row={rowIndex}
            data-field="lastName"
          />
          {row.errors?.lastName && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.lastName}
            </div>
          )}
        </div>
      </td>

      {/* First Name (នាម) */}
      <td className="bg-pink-50 px-0 py-0 border-r border-pink-100">
        <div className="relative h-12">
          <input
            type="text"
            value={localRow.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "firstName")}
            placeholder="នាម"
            className={getInputClass("firstName", "bg-pink-50")}
            data-row={rowIndex}
            data-field="firstName"
          />
          {row.errors?.firstName && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.firstName}
            </div>
          )}
        </div>
      </td>

      {/* Khmer Name (ឈ្មោះខ្មែរពេញ) */}
      <td className="bg-yellow-50 px-0 py-0 border-r border-yellow-100">
        <div className="relative h-12">
          <input
            type="text"
            value={localRow.khmerName}
            onChange={(e) => handleChange("khmerName", e.target.value)}
            onBlur={() => handleBlur("khmerName")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "khmerName")}
            placeholder="ឈ្មោះពេញខ្មែរ (នឹង split ស្វ័យប្រវត្តិ)"
            className={getInputClass("khmerName", "bg-yellow-50")}
            data-row={rowIndex}
            data-field="khmerName"
          />
          {row.errors?.khmerName && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.khmerName}
            </div>
          )}
        </div>
      </td>

      {/* ✅ NEW: English Name */}
      <td className="bg-yellow-50 px-0 py-0 border-r border-yellow-100">
        <div className="h-12">
          <input
            type="text"
            value={localRow.englishName}
            onChange={(e) => handleChange("englishName", e.target.value)}
            onBlur={() => handleBlur("englishName")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "englishName")}
            placeholder="English Name (optional)"
            className={getInputClass("englishName", "bg-yellow-50")}
            data-row={rowIndex}
            data-field="englishName"
          />
        </div>
      </td>

      {/* Phone */}
      <td className="bg-green-50 px-0 py-0 border-r border-green-100">
        <div className="relative h-12">
          <input
            type="text"
            value={localRow.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "phone")}
            placeholder="012345678 *"
            className={getInputClass("phone", "bg-green-50")}
            data-row={rowIndex}
            data-field="phone"
          />
          {row.errors?.phone && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.phone}
            </div>
          )}
        </div>
      </td>

      {/* Email */}
      <td className="bg-blue-50 px-0 py-0 border-r border-blue-100">
        <div className="relative h-12">
          <input
            type="email"
            value={localRow.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            onKeyDown={(e) => onKeyDown?.(e, rowIndex, "email")}
            placeholder="email@school.com"
            className={getInputClass("email", "bg-blue-50")}
            data-row={rowIndex}
            data-field="email"
          />
          {row.errors?.email && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.email}
            </div>
          )}
        </div>
      </td>

      {/* Gender */}
      <td className="bg-purple-50 px-0 py-0 border-r border-purple-100">
        <div className="h-12">
          <select
            value={localRow.gender}
            onChange={(e) => handleChange("gender", e.target.value)}
            onBlur={() => handleBlur("gender")}
            className="w-full h-full px-2 py-2 text-sm bg-purple-50 border-0 focus:outline-none focus: ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <option value="">-</option>
            <option value="ប">ប (ប្រុស)</option>
            <option value="ស">ស (ស្រី)</option>
          </select>
        </div>
      </td>

      {/* Role */}
      <td className="bg-amber-50 px-0 py-0 border-r border-amber-100">
        <div className="h-12">
          <select
            value={localRow.role}
            onChange={(e) => handleChange("role", e.target.value)}
            onBlur={() => handleBlur("role")}
            className="w-full h-full px-2 py-2 text-sm bg-amber-50 border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <option value="">-</option>
            <option value="TEACHER">គ្រូបង្រៀន</option>
            <option value="INSTRUCTOR">គ្រូប្រចាំថ្នាក់</option>
          </select>
        </div>
      </td>

      {/* Date of Birth */}
      <td className="bg-indigo-50 px-0 py-0 border-r border-indigo-100">
        <div className="h-12">
          <input
            type="text"
            value={localRow.dateOfBirth}
            onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            onBlur={() => handleBlur("dateOfBirth")}
            placeholder="DD/MM/YYYY"
            className={getInputClass("dateOfBirth", "bg-indigo-50")}
            data-row={rowIndex}
            data-field="dateOfBirth"
          />
        </div>
      </td>

      {/* Subjects */}
      <td className="bg-cyan-50 px-0 py-0 border-r border-cyan-100">
        <div className="h-12">
          <input
            type="text"
            value={localRow.subjects}
            onChange={(e) => handleChange("subjects", e.target.value)}
            onBlur={() => handleBlur("subjects")}
            placeholder="គណិតវិទ្យា, រូបវិទ្យា"
            className={getInputClass("subjects", "bg-cyan-50")}
            data-row={rowIndex}
            data-field="subjects"
          />
        </div>
      </td>

      {/* Teaching Classes */}
      <td className="bg-teal-50 px-0 py-0 border-r border-teal-100">
        <div className="h-12">
          <input
            type="text"
            value={localRow.teachingClasses}
            onChange={(e) => handleChange("teachingClasses", e.target.value)}
            onBlur={() => handleBlur("teachingClasses")}
            placeholder="ថ្នាក់ទី១០ក, ថ្នាក់ទី១១ខ"
            className={getInputClass("teachingClasses", "bg-teal-50")}
            data-row={rowIndex}
            data-field="teachingClasses"
          />
        </div>
      </td>

      {/* Homeroom Class */}
      <td className="bg-orange-50 px-0 py-0 border-r border-orange-100">
        <div className="relative h-12">
          <input
            type="text"
            value={localRow.homeroomClass}
            onChange={(e) => handleChange("homeroomClass", e.target.value)}
            onBlur={() => handleBlur("homeroomClass")}
            placeholder={localRow.role === "INSTRUCTOR" ? "ថ្នាក់ទី១០ក *" : "-"}
            disabled={localRow.role !== "INSTRUCTOR"}
            className={`w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-inset ${
              localRow.role === "INSTRUCTOR" && row.errors?.homeroomClass
                ? "focus:ring-red-500 bg-red-50 text-red-900"
                : localRow.role !== "INSTRUCTOR"
                ? "bg-gray-100 cursor-not-allowed text-gray-400"
                : "focus:ring-blue-500 bg-orange-50"
            }`}
            data-row={rowIndex}
            data-field="homeroomClass"
          />
          {row.errors?.homeroomClass && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-100 px-2 py-0.5 text-[10px] text-red-600 font-semibold border-t border-red-200">
              {row.errors.homeroomClass}
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="bg-white px-3 py-0 border-l border-gray-300 sticky right-0 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
        <div className="h-12 flex items-center justify-center">
          <button
            onClick={() => onDelete(row.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
            title="លុបជួរនេះ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
