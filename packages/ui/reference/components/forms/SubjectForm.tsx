"use client";

import React, { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  Save,
  X,
  BookOpen,
  Hash,
  Clock,
  Calendar,
  Loader2,
  Tag,
  FileText,
  Award,
  TrendingUp,
} from "lucide-react";
import type { Subject } from "@/lib/api/subjects";

interface SubjectFormProps {
  subject?: Subject;
  onSave: (subject: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function SubjectForm({
  subject,
  onSave,
  onCancel,
  isSubmitting = false,
}: SubjectFormProps) {
  const [formData, setFormData] = useState<Partial<Subject>>(() => {
    if (subject) {
      return {
        name: subject.name || "",
        nameKh: subject.nameKh || "",
        nameEn: subject.nameEn || "",
        code: subject.code || "",
        description: subject.description || "",
        grade: subject.grade || "",
        track: subject.track || "",
        category: subject.category || "social",
        weeklyHours: subject.weeklyHours || 0,
        annualHours: subject.annualHours || 0,
        maxScore: subject.maxScore || 100,
        coefficient: subject.coefficient || 1.0,
        isActive: subject.isActive !== false,
      };
    } else {
      return {
        name: "",
        nameKh: "",
        nameEn: "",
        code: "",
        description: "",
        grade: "",
        track: "",
        category: "social",
        weeklyHours: 0,
        annualHours: 0,
        maxScore: 100,
        coefficient: 1.0,
        isActive: true,
      };
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted with:", formData);

    if (!formData.nameKh || formData.nameKh.trim() === "") {
      alert("Khmer name is required");
      return;
    }

    if (!formData.code || formData.code.trim() === "") {
      alert("Subject code is required");
      return;
    }

    if (!formData.grade || formData.grade.trim() === "") {
      alert("Grade is required");
      return;
    }

    const coefficientValue = parseFloat(String(formData.coefficient || 1.0));
    if (
      isNaN(coefficientValue) ||
      coefficientValue < 0.1 ||
      coefficientValue > 5.0
    ) {
      alert("Coefficient must be between 0.1 and 5.0");
      return;
    }

    const subjectData = {
      name: formData.nameKh.trim(),
      nameKh: formData.nameKh.trim(),
      nameEn: formData.nameEn?.trim() || undefined,
      code: formData.code.trim(),
      description: formData.description?.trim() || undefined,
      grade: formData.grade.trim(),
      track: formData.track?.trim() || undefined,
      category: formData.category || "core",
      weeklyHours: parseFloat(String(formData.weeklyHours)) || 0,
      annualHours: parseInt(String(formData.annualHours)) || 0,
      maxScore: parseInt(String(formData.maxScore)) || 100,
      coefficient: coefficientValue,
      isActive: formData.isActive !== false,
    };

    console.log("Sending subject data:", subjectData);
    onSave(subjectData);
  };

  const gradeOptions = [
    { value: "", label: "Select Grade" },
    { value: "7", label: "Grade 7" },
    { value: "8", label: "Grade 8" },
    { value: "9", label: "Grade 9" },
    { value: "10", label: "Grade 10" },
    { value: "11", label: "Grade 11" },
    { value: "12", label: "Grade 12" },
  ];

  const trackOptions = [
    { value: "", label: "None" },
    { value: "science", label: "Science" },
    { value: "social", label: "Social" },
  ];

  const categoryOptions = [
    { value: "social", label: "Social" },
    { value: "science", label: "Science" },
  ];

  // ✅ Coefficient quick presets (optional - click to apply)
  const coefficientPresets = [
    { value: 0.5, label: "0.5", color: "text-gray-600" },
    { value: 1.0, label: "1.0", color: "text-blue-600" },
    { value: 1.5, label: "1.5", color: "text-green-600" },
    { value: 2.0, label: "2.0", color: "text-orange-600" },
    { value: 2.5, label: "2.5", color: "text-red-500" },
    { value: 3.0, label: "3.0", color: "text-red-700" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Khmer Name"
          icon={<BookOpen className="w-5 h-5" />}
          value={formData.nameKh || ""}
          onChange={(e) => {
            setFormData({
              ...formData,
              nameKh: e.target.value,
              name: e.target.value || formData.name,
            });
          }}
          placeholder="គណិតវិទ្យា"
          required
        />

        <Input
          label="English Name"
          icon={<BookOpen className="w-5 h-5" />}
          value={formData.nameEn || ""}
          onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
          placeholder="Mathematics"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Subject Code"
          icon={<Hash className="w-5 h-5" />}
          value={formData.code || ""}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="MATH-G10"
          required
        />

        <Select
          label="Category"
          icon={<Tag className="w-5 h-5" />}
          value={formData.category || "core"}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          options={categoryOptions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Grade"
          icon={<Calendar className="w-5 h-5" />}
          value={formData.grade || ""}
          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
          options={gradeOptions}
          required
        />

        <Select
          label="Track"
          icon={<FileText className="w-5 h-5" />}
          value={formData.track || ""}
          onChange={(e) => setFormData({ ...formData, track: e.target.value })}
          options={trackOptions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Max Score"
          icon={<Award className="w-5 h-5" />}
          type="number"
          value={formData.maxScore || ""}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({
              ...formData,
              maxScore: value === "" ? undefined : parseInt(value),
            });
          }}
          placeholder="100"
          min={0}
          required
        />

        <div>
          {/* ✅ FIXED: Free text coefficient input */}
          <Input
            label="Coefficient (0.1 - 5.0)"
            icon={<TrendingUp className="w-5 h-5" />}
            type="number"
            value={formData.coefficient ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              // ✅ Allow empty string or any valid number
              setFormData({
                ...formData,
                coefficient: value === "" ? undefined : parseFloat(value),
              });
            }}
            placeholder="1.0"
            step="0.01"
            min={0.1}
            max={5.0}
            required
          />

          {/* Quick presets */}
          <div className="mt-2 flex flex-wrap gap-2">
            {coefficientPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, coefficient: preset.value })
                }
                className={`text-xs px-3 py-1.5 rounded-lg border-2 transition-all font-medium ${
                  formData.coefficient === preset.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                    : "bg-white border-gray-300 hover:border-blue-400 hover:shadow-sm"
                } ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Weekly Hours"
          icon={<Clock className="w-5 h-5" />}
          type="number"
          value={formData.weeklyHours ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({
              ...formData,
              weeklyHours: value === "" ? undefined : parseFloat(value),
            });
          }}
          placeholder="4"
          step="0.5"
          min={0}
        />

        <Input
          label="Annual Hours"
          icon={<Clock className="w-5 h-5" />}
          type="number"
          value={formData.annualHours ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            setFormData({
              ...formData,
              annualHours: value === "" ? undefined : parseInt(value),
            });
          }}
          placeholder="120"
          min={0}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Subject description..."
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive !== false}
          onChange={(e) =>
            setFormData({ ...formData, isActive: e.target.checked })
          }
          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Active Subject
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">About Coefficient:</p>
            <p>
              Coefficient is used to calculate weighted average based on subject
              importance.
              <br />
              <strong>Formula:</strong> Average = (Score × Coefficient) / Total
              Coefficient
              <br />
              <strong>Examples:</strong> 0.5 (extra), 1.0 (normal), 1.5
              (important), 2.0 (very important)
            </p>
          </div>
        </div>
      </div>

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
          {isSubmitting ? "Saving..." : subject ? "Update" : "Create"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          icon={<X className="w-5 h-5" />}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
