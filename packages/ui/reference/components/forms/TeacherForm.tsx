"use client";

import React, { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  Save,
  X,
  User,
  Mail,
  Phone,
  BookOpen,
  Hash,
  Loader2,
} from "lucide-react";
import type { Teacher } from "@/lib/api/teachers";

interface TeacherFormProps {
  teacher?: Teacher;
  onSave: (teacher: Teacher) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function TeacherForm({
  teacher,
  onSave,
  onCancel,
  isSubmitting = false,
}: TeacherFormProps) {
  const [formData, setFormData] = useState<Partial<Teacher>>(
    teacher || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      employeeId: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📝 Form submitted with:", formData);

    // Validate required fields
    if (!formData.firstName || formData.firstName.trim() === "") {
      alert("First name is required / គោត្តនាមត្រូវតែបំពេញ");
      return;
    }

    if (!formData.lastName || formData.lastName.trim() === "") {
      alert("Last name is required / នាមត្រូវតែបំពេញ");
      return;
    }

    if (!formData.email || formData.email.trim() === "") {
      alert("Email is required / អ៊ីមែលត្រូវតែបំពេញ");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Please enter a valid email address / សូមបញ្ចូលអ៊ីមែលត្រឹមត្រូវ");
      return;
    }

    const teacherData: Teacher = {
      id: teacher?.id || `t${Date.now()}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone?.trim() || undefined,
      subject: formData.subject?.trim() || undefined,
      employeeId: formData.employeeId?.trim() || undefined,
    };

    console.log("✅ Sending teacher data:", teacherData);
    onSave(teacherData);
  };

  const subjectOptions = [
    { value: "", label: "ជ្រើសរើសមុខវិជ្ជា • Select subject (Optional)" },
    { value: "Mathematics", label: "គណិតវិទ្យា • Mathematics" },
    { value: "Physics", label: "រូបវិទ្យា • Physics" },
    { value: "Chemistry", label: "គីមីវិទ្យា • Chemistry" },
    { value: "Biology", label: "ជីវវិទ្យា • Biology" },
    {
      value: "Khmer Literature",
      label: "អក្សរសាស្ត្រខ្មែរ • Khmer Literature",
    },
    { value: "English", label: "អង់គ្លេស • English" },
    { value: "French", label: "បារាំង • French" },
    { value: "History", label: "ប្រវត្តិសាស្ត្រ • History" },
    { value: "Geography", label: "ភូមិសាស្ត្រ • Geography" },
    { value: "Physical Education", label: "អប់រំកាយ • Physical Education" },
    {
      value: "Computer Science",
      label: "វិទ្យាសាស្ត្រកុំព្យូទ័រ • Computer Science",
    },
    { value: "Art", label: "សិល្បៈ • Art" },
    { value: "Music", label: "តន្ត្រី • Music" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ព័ត៌មានផ្ទាល់ខ្លួន • Personal Information
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="គោត្តនាម • Last Name *"
              value={formData.lastName || ""}
              onChange={(e) => {
                const value = e.target.value;
                console.log("Last name changed to:", value);
                setFormData({ ...formData, lastName: value });
              }}
              placeholder="Enter last name"
              required
            />
            <Input
              label="នាម • First Name *"
              value={formData.firstName || ""}
              onChange={(e) => {
                const value = e.target.value;
                console.log("First name changed to:", value);
                setFormData({ ...formData, firstName: value });
              }}
              placeholder="Enter first name"
              required
            />
          </div>

          <Input
            label="អ៊ីមែល • Email *"
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="teacher@school.com"
            required
          />

          <Input
            label="លេខទូរស័ព្ទ • Phone Number (Optional)"
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="012 345 678"
          />
        </div>
      </div>

      {/* Professional Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ព័ត៌មានវិជ្ជាជីវៈ • Professional Information
          </h3>
        </div>

        <div className="space-y-4">
          <Select
            label="មុខវិជ្ជាបង្រៀន • Subject (Optional)"
            value={formData.subject || ""}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            options={subjectOptions}
          />

          <Input
            label="លេខកូដគ្រូបង្រៀន • Employee ID (Optional)"
            value={formData.employeeId || ""}
            onChange={(e) =>
              setFormData({ ...formData, employeeId: e.target.value })
            }
            placeholder="T-001"
          />

          <p className="text-xs text-gray-500 mt-2">
            💡 អ្នកអាចបន្ថែមព័ត៌មានវិជ្ជាជីវៈនៅពេលក្រោយបាន
            <br />
            You can add professional information later.
          </p>
        </div>
      </div>

      {/* Preview Section */}
      {formData.firstName && formData.lastName && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            👁️ ការមើលជាមុន • Preview:
          </h4>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">ឈ្មោះពេញ:</span>{" "}
              <span className="text-gray-900 english-modern">
                {formData.firstName} {formData.lastName}
              </span>
            </p>
            <p>
              <span className="font-medium">អ៊ីមែល:</span>{" "}
              <span className="text-gray-900 english-modern">
                {formData.email || "N/A"}
              </span>
            </p>
            {formData.phone && (
              <p>
                <span className="font-medium">លេខទូរស័ព្ទ:</span>{" "}
                <span className="text-gray-900">{formData.phone}</span>
              </p>
            )}
            {formData.subject && (
              <p>
                <span className="font-medium">មុខវិជ្ជា:</span>{" "}
                <span className="text-gray-900">{formData.subject}</span>
              </p>
            )}
            {formData.employeeId && (
              <p>
                <span className="font-medium">លេខកូដ:</span>{" "}
                <span className="text-gray-900">{formData.employeeId}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Debug Info (Remove in production) */}
      <div className="bg-gray-50 p-3 rounded text-xs">
        <strong>Debug Info:</strong>
        <pre className="mt-1 text-[10px] overflow-auto">
          {JSON.stringify(
            {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              subject: formData.subject,
              employeeId: formData.employeeId,
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
          <span>បោះបង់ Cancel</span>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{teacher ? "រក្សាទុក Update" : "បង្កើត Create"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
