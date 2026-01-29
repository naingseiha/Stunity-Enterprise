"use client";

import { Trash2 } from "lucide-react";
import { useRef, useEffect } from "react";

export interface StudentRowData {
  no: number;
  id?: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  previousGrade?: string;
  previousSchool?: string;
  repeatingGrade?: string;
  transferredFrom?: string;
  remarks?: string;
  grade9ExamSession?: string;
  grade9ExamCenter?: string;
  grade9ExamRoom?: string;
  grade9ExamDesk?: string;
  grade9PassStatus?: string;
  grade12ExamSession?: string;
  grade12ExamCenter?: string;
  grade12ExamRoom?: string;
  grade12ExamDesk?: string;
  grade12PassStatus?: string;
  grade12Track?: string;
  englishName?: string;
  email?: string;
  placeOfBirth?: string;
  currentAddress?: string;
  phoneNumber?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  parentOccupation?: string;
  photoUrl?: string;
}

interface StudentGridRowProps {
  rowIndex: number;
  data: StudentRowData;
  grade: string;
  onChange: (rowIndex: number, field: string, value: string) => void;
  onDelete: (rowIndex: number) => void;
  isExisting?: boolean;
  columnHeaders: any[];
  inputRefs?: React.MutableRefObject<{
    [key: string]: HTMLInputElement | null;
  }>;
  totalRows: number;
}

// ✅ Column colors (soft pastels)
const getColumnColor = (key: string): string => {
  const colors: { [key: string]: string } = {
    no: "bg-slate-50",
    name: "bg-rose-50",
    gender: "bg-sky-50",
    dateOfBirth: "bg-amber-50",
    previousGrade: "bg-emerald-50",
    previousSchool: "bg-violet-50",
    repeatingGrade: "bg-orange-50",
    transferredFrom: "bg-cyan-50",
    grade9ExamSession: "bg-pink-50",
    grade9ExamCenter: "bg-fuchsia-50",
    grade9ExamRoom: "bg-purple-50",
    grade9ExamDesk: "bg-indigo-50",
    grade9PassStatus: "bg-rose-50",
    grade12ExamSession: "bg-lime-50",
    grade12ExamCenter: "bg-teal-50",
    grade12ExamRoom: "bg-blue-50",
    grade12ExamDesk: "bg-slate-50",
    grade12PassStatus: "bg-red-50",
    grade12Track: "bg-zinc-50",
    remarks: "bg-gray-50",
    englishName: "bg-blue-50",
    email: "bg-cyan-50",
    placeOfBirth: "bg-green-50",
    currentAddress: "bg-teal-50",
    phoneNumber: "bg-indigo-50",
    fatherName: "bg-purple-50",
    motherName: "bg-pink-50",
    parentPhone: "bg-fuchsia-50",
    parentOccupation: "bg-violet-50",
    photoUrl: "bg-slate-50",
    actions: "bg-slate-50",
  };
  return colors[key] || "bg-white";
};

export default function StudentGridRow({
  rowIndex,
  data,
  grade,
  onChange,
  onDelete,
  isExisting,
  columnHeaders,
  inputRefs,
  totalRows,
}: StudentGridRowProps) {
  const localInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const refs = inputRefs || localInputRefs;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < totalRows) {
        const nextInputKey = `${nextRow}-${field}`;
        const nextInput = refs.current[nextInputKey];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    field: string
  ) => {
    const pasteData = e.clipboardData.getData("text");

    if (pasteData.includes("\n") || pasteData.includes("\t")) {
      e.preventDefault();

      const rows = pasteData.split("\n").map((row) => row.split("\t"));

      window.dispatchEvent(
        new CustomEvent("multiRowPaste", {
          detail: {
            startRow: rowIndex,
            startField: field,
            data: rows,
          },
        })
      );
    }
  };

  const renderCell = (key: string, header: any) => {
    const value = (data as any)[key] || "";
    const inputKey = `${rowIndex}-${key}`;
    const columnColor = getColumnColor(key);

    return (
      <td
        key={key}
        style={{
          width: `${header.width}px`,
          minWidth: `${header.width}px`,
        }}
        className={`
          border border-gray-300 p-0
          ${columnColor}
          ${header.sticky && key === "no" ? "sticky left-0 z-10" : ""}
          ${header.sticky && key === "actions" ? "sticky right-0 z-10" : ""}
        `}
      >
        {key === "no" ? (
          <div className="px-3 py-2 text-center">
            <span
              className={
                isExisting
                  ? "text-blue-700 font-semibold"
                  : "text-gray-700 font-semibold"
              }
            >
              {String(data.no).padStart(2, "0")}
            </span>
          </div>
        ) : key === "actions" ? (
          <div className="flex items-center justify-center h-full py-2">
            <button
              onClick={() => onDelete(rowIndex)}
              className="text-red-500 hover:text-red-700 transition-colors p-1"
              title="Delete row"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : (
          <input
            ref={(el) => (refs.current[inputKey] = el)}
            type="text"
            value={value}
            onChange={(e) => onChange(rowIndex, key, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, key)}
            onPaste={(e) => handlePaste(e, key)}
            className={`
              w-full h-full px-3 py-2
              bg-transparent
              border-0 
              focus:outline-none 
              focus:ring-2 focus:ring-blue-400 focus:ring-inset
              hover:bg-white hover:bg-opacity-50
              transition-all
              ${
                key === "gender" ||
                key === "previousGrade" ||
                key === "repeatingGrade"
                  ? "text-center"
                  : ""
              }
            `}
            placeholder=""
          />
        )}
      </td>
    );
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {columnHeaders.map((header) => renderCell(header.key, header))}
    </tr>
  );
}
