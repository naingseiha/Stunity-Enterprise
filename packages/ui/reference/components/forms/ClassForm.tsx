"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  Save,
  X,
  GraduationCap,
  Users,
  Calendar,
  Loader2,
  GitBranch,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

interface ClassFormProps {
  classData?: Class;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ClassForm({
  classData,
  onSave,
  onCancel,
  isSubmitting = false,
}: ClassFormProps) {
  const [formData, setFormData] = useState<Partial<Class>>(
    classData || {
      name: "",
      grade: "",
      section: "",
      track: null,
      academicYear: "2024-2025",
      capacity: 45,
      teacherId: null,
    }
  );

  // ✅ Show track field only for Grade 11 & 12
  const [showTrack, setShowTrack] = useState(false);

  useEffect(() => {
    const gradeNum = formData.grade ? parseInt(formData.grade) : 0;
    setShowTrack(gradeNum === 11 || gradeNum === 12);

    // ✅ Clear track if not Grade 11/12
    if (gradeNum !== 11 && gradeNum !== 12) {
      setFormData((prev) => ({ ...prev, track: null }));
    }
  }, [formData.grade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.grade || !formData.academicYear) {
      alert("Name, grade, and academic year are required!");
      return;
    }

    // ✅ Validate track for Grade 11 & 12
    const gradeNum = parseInt(formData.grade);
    if (gradeNum === 11 || gradeNum === 12) {
      if (!formData.track) {
        alert("សូមជ្រើសរើស ផ្លូវ (Track) សម្រាប់ថ្នាក់ទី១១ និងទី១២!");
        return;
      }
    }

    const data = {
      classId: formData.classId,
      name: formData.name.trim(),
      grade: formData.grade.trim(),
      section: formData.section?.trim() || null,
      track: formData.track || null,
      academicYear: formData.academicYear.trim(),
      capacity: formData.capacity ? parseInt(String(formData.capacity)) : null,
      teacherId: formData.teacherId || null,
    };

    console.log("✅ Submitting class data:", data);
    onSave(data);
  };

  const gradeOptions = [
    { value: "", label: "ជ្រើសរើសថ្នាក់ • Select Grade *" },
    { value: "7", label: "ថ្នាក់ទី៧" },
    { value: "8", label: "ថ្នាក់ទី៨" },
    { value: "9", label: "ថ្នាក់ទី៩" },
    { value: "10", label: "ថ្នាក់ទី១០" },
    { value: "11", label: "ថ្នាក់ទី១១" },
    { value: "12", label: "ថ្នាក់ទី១២" },
  ];

  const sectionOptions = [
    { value: "", label: "គ្មាន • None" },
    { value: "ក", label: "ក" },
    { value: "ខ", label: "ខ" },
    { value: "គ", label: "គ" },
    { value: "ឃ", label: "ឃ" },
    { value: "ង", label: "ង" },
    { value: "ច", label: "ច" },
    { value: "ឆ", label: "ឆ" },
    { value: "ជ", label: "ជ" },
  ];

  const trackOptions = [
    { value: "", label: "ជ្រើសរើសផ្លូវ • Select Track *" },
    { value: "science", label: "🧪 វិទ្យាសាស្ត្រ • Science" },
    { value: "social", label: "📚 សង្គម • Social" },
  ];

  // ✅ Auto-generate Academic Year options
  const academicYearOptions = (() => {
    const currentYear = new Date().getFullYear();
    const years = [];

    years.push({
      value: "",
      label: "ជ្រើសរើសឆ្នាំសិក្សា • Select Academic Year *",
    });

    // Generate from 2 years ago to 5 years ahead
    for (let i = -2; i <= 5; i++) {
      const startYear = currentYear + i;
      const endYear = startYear + 1;
      const yearLabel = `${startYear}-${endYear}`;

      years.push({
        value: yearLabel,
        label: i === 0 ? `${yearLabel} (បច្ចុប្បន្ន)` : yearLabel,
      });
    }

    return years;
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Class Name */}
      <Input
        label="ឈ្មោះថ្នាក់ • Class Name *"
        icon={<GraduationCap className="w-5 h-5" />}
        value={formData.name || ""}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="ថ្នាក់ទី៧ក"
        required
      />

      {/* Grade and Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="ថ្នាក់ • Grade *"
          icon={<GraduationCap className="w-5 h-5" />}
          value={formData.grade || ""}
          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
          options={gradeOptions}
          required
        />

        <Select
          label="ផ្នែក • Section"
          value={formData.section || ""}
          onChange={(e) =>
            setFormData({ ...formData, section: e.target.value })
          }
          options={sectionOptions}
        />
      </div>

      {/* Track Field (Only for Grade 11 & 12) */}
      {showTrack && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
          <Select
            label="ផ្លូវ • Track *"
            icon={<GitBranch className="w-5 h-5 text-blue-600" />}
            value={formData.track || ""}
            onChange={(e) =>
              setFormData({ ...formData, track: e.target.value })
            }
            options={trackOptions}
            required={showTrack}
          />
          <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
            <span>💡</span>
            <span>ថ្នាក់ទី១១ និងទី១២ ត្រូវជ្រើសរើស វិទ្យាសាស្ត្រ ឬ សង្គម</span>
          </p>
        </div>
      )}

      {/* ✅ UPDATED: Academic Year as Select + Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="ឆ្នាំសិក្សា • Academic Year *"
          icon={<Calendar className="w-5 h-5" />}
          value={formData.academicYear || ""}
          onChange={(e) =>
            setFormData({ ...formData, academicYear: e.target.value })
          }
          options={academicYearOptions}
          required
        />

        <Input
          label="សមត្ថភាព • Capacity"
          icon={<Users className="w-5 h-5" />}
          type="number"
          value={formData.capacity || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              capacity: parseInt(e.target.value) || undefined,
            })
          }
          placeholder="45"
          min={1}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          variant="primary"
          icon={
            isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )
          }
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? "កំពុងរក្សាទុក..."
            : classData
            ? "កែប្រែ • Update"
            : "បង្កើត • Create"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          icon={<X className="w-5 h-5" />}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          បោះបង់ • Cancel
        </Button>
      </div>
    </form>
  );
}
