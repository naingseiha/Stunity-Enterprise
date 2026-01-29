"use client";

import React, { useState } from "react";
import { Student } from "@/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useData } from "@/context/DataContext";
import {
  Save,
  X,
  User,
  Calendar,
  Phone,
  MapPin,
  Users,
  Loader2,
  GraduationCap,
} from "lucide-react";

interface StudentFormProps {
  student?: Student;
  onSave: (student: Student) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function StudentForm({
  student,
  onSave,
  onCancel,
  isSubmitting = false,
}: StudentFormProps) {
  const { classes } = useData();
  const [formData, setFormData] = useState<Student>(
    student || {
      id: "",
      firstName: "",
      lastName: "",
      email: "",
      gender: "male",
      dateOfBirth: "",
      classId: "",
      phone: "",
      address: "",
      guardianName: "",
      guardianPhone: "",
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

    if (!formData.dateOfBirth) {
      alert("Date of birth is required / ថ្ងៃខែឆ្នាំកំណើតត្រូវតែបំពេញ");
      return;
    }

    const studentData: Student = {
      id: student?.id || `s${Date.now()}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email:
        formData.email ||
        `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@student.com`,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      phone: formData.phone?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      guardianName: formData.guardianName?.trim() || undefined,
      guardianPhone: formData.guardianPhone?.trim() || undefined,
      classId:
        formData.classId && formData.classId.trim() !== ""
          ? formData.classId
          : undefined,
    };

    console.log("✅ Sending student data:", studentData);
    onSave(studentData);
  };

  const classOptions = [
    { value: "", label: "គ្មានថ្នាក់ • No Class (Optional)" },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.name} (${c._count?.students || 0} សិស្ស)`,
    })),
  ];

  const genderOptions = [
    { value: "male", label: "ប្រុស • Male" },
    { value: "female", label: "ស្រី • Female" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
            <User className="w-5 h-5 text-indigo-600" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="ភេទ • Gender *"
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as "male" | "female",
                })
              }
              options={genderOptions}
              required
            />
            <Input
              label="ថ្ងៃខែឆ្នាំកំណើត • Date of Birth *"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              required
            />
          </div>

          <Input
            label="អ៊ីមែល • Email (Optional)"
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="student@example.com"
          />
        </div>
      </div>

      {/* Academic Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
            <GraduationCap className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ព័ត៌មានសិក្សា • Academic Information
          </h3>
        </div>

        <Select
          label="ថ្នាក់រៀន • Class (Optional)"
          value={formData.classId || ""}
          onChange={(e) =>
            setFormData({ ...formData, classId: e.target.value })
          }
          options={classOptions}
        />

        <p className="text-xs text-gray-500 mt-2">
          💡 អ្នកអាចបន្ថែមសិស្សដោយមិនកំណត់ថ្នាក់រៀន ហើយកំណត់ពេលក្រោយបាន
          <br />
          You can add students without assigning a class and assign them later.
        </p>
      </div>

      {/* Contact Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ព័ត៌មានទំនាក់ទំនង • Contact Information
          </h3>
        </div>

        <div className="space-y-4">
          <Input
            label="លេខទូរស័ព្ទ • Phone"
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="012 345 678"
          />

          <Input
            label="អាសយដ្ឋាន • Address"
            value={formData.address || ""}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="Enter address"
          />
        </div>
      </div>

      {/* Guardian Information Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            ព័ត៌មានអាណាព្យាបាល • Guardian Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ឈ្មោះអាណាព្យាបាល • Guardian Name"
            value={formData.guardianName || ""}
            onChange={(e) =>
              setFormData({ ...formData, guardianName: e.target.value })
            }
            placeholder="Enter guardian name"
          />
          <Input
            label="លេខទូរស័ព្ទអាណាព្យាបាល • Guardian Phone"
            value={formData.guardianPhone || ""}
            onChange={(e) =>
              setFormData({ ...formData, guardianPhone: e.target.value })
            }
            placeholder="012 345 678"
          />
        </div>
      </div>

      {/* Debug Info (Remove in production) */}
      <div className="bg-gray-50 p-3 rounded text-xs">
        <strong>Debug Info:</strong>
        <pre className="mt-1 text-[10px] overflow-auto">
          {JSON.stringify(
            {
              firstName: formData.firstName,
              lastName: formData.lastName,
              gender: formData.gender,
              dateOfBirth: formData.dateOfBirth,
              classId: formData.classId,
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
              <span>{student ? "រក្សាទុក Update" : "បន្ថែម Add"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
