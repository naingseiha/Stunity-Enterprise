"use client";

import React, { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useData } from "@/context/DataContext";

export default function ImportTeachers() {
  const { addTeacher } = useData();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = `ឈ្មោះគ្រូ,លេខទូរស័ព្ទ,អ៊ីមែល,គ្រូបន្ទុកថ្នាក់
សុខ វិបុល,012345678,sok@school.edu.kh,true
ចន្ទ សុភា,012345679,chan@school.edu.kh,false`;

    const blob = new Blob(["\uFEFF" + template], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "teacher_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");

        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",");
          if (values.length < 4) continue;

          const teacher = {
            id: `t${Date.now()}_${i}`,
            name: values[0].trim(),
            phone: values[1].trim(),
            email: values[2].trim(),
            subjects: [],
            classes: [],
            isClassTeacher: values[3].trim().toLowerCase() === "true",
          };

          addTeacher(teacher);
          imported++;
        }

        setSuccess(`បាននាំចូលគ្រូបង្រៀនសរុប ${imported} នាក់ដោយជោគជ័យ`);
      } catch (err) {
        setError("មានបញ្ហាក្នុងការនាំចូលទិន្នន័យ។ សូមពិនិត្យមើលទម្រង់ឯកសារ។");
      } finally {
        setImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-purple-600" />
          នាំចូលគ្រូបង្រៀនពី Excel/CSV
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              ជំហានទី១: ទាញយកឯកសារគំរូ (Template)
            </p>
            <Button onClick={downloadTemplate} variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              ទាញយកឯកសារគំរូ
            </Button>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              ជំហានទី២: នាំចូលឯកសារ CSV
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="teacher-file-upload"
            />
            <label htmlFor="teacher-file-upload">
              <Button as="span" disabled={importing}>
                <Upload className="w-4 h-4 mr-2" />
                {importing ? "កំពុងនាំចូល..." : "ជ្រើសរើសឯកសារ CSV"}
              </Button>
            </label>
          </div>

          {error && (
            <div className="flex items-start space-x-2 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
