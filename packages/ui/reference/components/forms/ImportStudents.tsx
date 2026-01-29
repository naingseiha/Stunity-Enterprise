"use client";

import React, { useState, useRef } from "react";
import Button from "@/components/ui/Button";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useData } from "@/context/DataContext";

export default function ImportStudents() {
  const { addStudent, classes } = useData();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = `គោត្តនាម,នាម,ភេទ,ថ្ងៃខែឆ្នាំកំណើត,លេខថ្នាក់,លេខទូរស័ព្ទ,អាសយដ្ឋាន,ឈ្មោះអាណាព្យាបាល,លេខទូរស័ព្ទអាណាព្យាបាល
សុខ,ពិសី,male,2010-05-15,c1,012345678,ភ្នំពេញ,សុខ សុភា,012999999
ចន្ទ,សុភា,female,2010-08-20,c1,012345679,ភ្នំពេញ,ចន្ទ រតនា,012888888`;

    const blob = new Blob(["\uFEFF" + template], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_template.csv");
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
        const headers = lines[0].split(",");

        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",");
          if (values.length < 9) continue;

          const student = {
            id: `s${Date.now()}_${i}`,
            lastName: values[0].trim(),
            firstName: values[1].trim(),
            gender: values[2].trim() as "male" | "female",
            dateOfBirth: values[3].trim(),
            classId: values[4].trim(),
            phone: values[5].trim(),
            address: values[6].trim(),
            guardianName: values[7].trim(),
            guardianPhone: values[8].trim(),
          };

          addStudent(student);
          imported++;
        }

        setSuccess(`បាននាំចូលសិស្សសរុប ${imported} នាក់ដោយជោគជ័យ`);
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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" />
          នាំចូលសិស្សពី Excel/CSV
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
              ជំហានទី២: បំពេញព័ត៌មានក្នុងឯកសារ Excel ហើយរក្សាទុកជា CSV
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              ជំហានទី៣: នាំចូលឯកសារ CSV
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="student-file-upload"
            />
            <label htmlFor="student-file-upload">
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

      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800 font-semibold mb-2">
          ⚠️ ចំណាំសំខាន់:
        </p>
        <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
          <li>ឯកសារត្រូវតែជាទម្រង់ CSV (Comma Separated Values)</li>
          <li>ភេទត្រូវបំពេញជា "male" ឬ "female"</li>
          <li>
            ថ្ងៃខែឆ្នាំកំណើតត្រូវបំពេញជាទម្រង់ YYYY-MM-DD (ឧទាហរណ៍: 2010-05-15)
          </li>
          <li>លេខថ្នាក់ត្រូវតែត្រឹមត្រូវ (ឧ: c1, c2...)</li>
        </ul>
      </div>
    </div>
  );
}
