"use client";

import React, { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useData } from "@/context/DataContext";

export default function ImportGrades() {
  const { classes, subjects, students, grades, updateGrades } = useData();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("1");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classOptions = [
    { value: "", label: "ជ្រើសរើសថ្នាក់ - Select Class" },
    ...classes.map((c) => ({ value: c.id, label: c.name })),
  ];

  const monthOptions = [
    { value: "1", label: "មករា - January" },
    { value: "2", label: "កុម្ភៈ - February" },
    { value: "3", label: "មីនា - March" },
    { value: "4", label: "មេសា - April" },
    { value: "5", label: "ឧសភា - May" },
    { value: "6", label: "មិថុនា - June" },
    { value: "7", label: "កក្កដា - July" },
    { value: "8", label: "សីហា - August" },
    { value: "9", label: "កញ្ញា - September" },
    { value: "10", label: "តុលា - October" },
    { value: "11", label: "វិច្ឆិកា - November" },
    { value: "12", label: "ធ្នូ - December" },
  ];

  const downloadTemplate = () => {
    if (!selectedClassId) {
      setError("សូមជ្រើសរើសថ្នាក់មុនពេលទាញយកគំរូ");
      return;
    }

    const classStudents = students.filter((s) => s.classId === selectedClassId);
    const headers = ["លេខសិស្ស", "ឈ្មោះសិស្ស", ...subjects.map((s) => s.name)];
    const rows = classStudents.map((student) => [
      student.id,
      `${student.lastName} ${student.firstName}`,
      ...subjects.map(() => ""),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `grades_template_${selectedClassId}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedClassId || !selectedMonth) {
      setError("សូមជ្រើសរើសថ្នាក់ និងខែ");
      return;
    }

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
        const headers = lines[0].split(",");

        const newGrades = [...grades];
        let imported = 0;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",");
          if (values.length < 3) continue;

          const studentId = values[0].trim();

          for (let j = 2; j < values.length && j - 2 < subjects.length; j++) {
            const score = values[j].trim();
            if (!score) continue;

            const subjectId = subjects[j - 2].id;
            const existingGrade = newGrades.find(
              (g) =>
                g.studentId === studentId &&
                g.subjectId === subjectId &&
                g.month === selectedMonth
            );

            if (existingGrade) {
              existingGrade.score = score;
            } else {
              newGrades.push({
                id: `g${Date.now()}_${i}_${j}`,
                studentId,
                subjectId,
                classId: selectedClassId,
                score,
                month: selectedMonth,
                term: "1",
                year: new Date().getFullYear(),
              });
            }
            imported++;
          }
        }

        updateGrades(newGrades);
        setSuccess(`បាននាំចូលពិន្ទុសរុប ${imported} ជោគជ័យ`);
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
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
          នាំចូលពិន្ទុពី Excel/CSV
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Select
            label="ជ្រើសរើសថ្នាក់"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={classOptions}
          />
          <Select
            label="ជ្រើសរើសខែ"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={monthOptions}
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              ជំហានទី១: ទាញយកឯកសារគំរូ (Template)
            </p>
            <Button
              onClick={downloadTemplate}
              variant="secondary"
              size="sm"
              disabled={!selectedClassId}
            >
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
              id="grade-file-upload"
            />
            <label htmlFor="grade-file-upload">
              <Button
                as="span"
                disabled={importing || !selectedClassId || !selectedMonth}
              >
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
