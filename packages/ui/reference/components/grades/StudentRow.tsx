/**
 * StudentRow - Memoized student row component for the grade grid
 * Only re-renders when its specific data changes
 * Optimized with React.memo for better performance
 */

import { memo } from "react";
import { Lock } from "lucide-react";
import { GradeCell } from "./GradeCell";
import { getSubjectColor, getGradeLevelColor } from "./subjectUtils";
import type { CellState } from "./types";

interface Subject {
  id: string;
  code: string;
  nameKh: string;
  maxScore: number;
  coefficient: number;
  isEditable?: boolean;
  order?: number;
  track?: string | null;
}

interface Student {
  studentId: string;
  studentName: string;
  gender: "MALE" | "FEMALE";
  totalScore: number;
  average: number;
  gradeLevel: string;
  rank: number;
  absent?: number;
  permission?: number;
  grades: { [subjectId: string]: { score: number | null } };
}

interface StudentRowProps {
  student: Student;
  studentIndex: number;
  sortedSubjects: Subject[];
  cells: { [key: string]: CellState };
  pasteMode: boolean;
  pastedCells: Set<string>;
  editedCells: Set<string>;
  isLoading: boolean;
  saving: boolean;
  inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement }>;
  onCellChange: (cellKey: string, value: string) => void;
  onKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
    totalStudents: number,
    totalSubjects: number,
    sortedStudents: any[],
    inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement }>
  ) => void;
  onPaste: (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startSubjectIndex: number
  ) => void;
  onBlur: (cellKey: string) => void;
  totalStudents: number;
  sortedStudents: any[];
}

/**
 * StudentRow Component - Memoized for performance
 * Only re-renders when props change
 */
export const StudentRow = memo(function StudentRow({
  student,
  studentIndex,
  sortedSubjects,
  cells,
  pasteMode,
  pastedCells,
  editedCells,
  isLoading,
  saving,
  inputRefs,
  onCellChange,
  onKeyDown,
  onPaste,
  onBlur,
  totalStudents,
  sortedStudents,
}: StudentRowProps) {
  const rowBg = studentIndex % 2 === 0 ? "bg-white" : "bg-gray-50";

  return (
    <tr
      className={`${rowBg} hover:bg-indigo-50/50 transition-colors`}
    >
      {/* Row Number */}
      <td
        className={`sticky left-0 z-10 ${rowBg} hover:bg-indigo-50/50 px-3 py-2.5 text-center text-sm font-semibold text-gray-700 border-b border-r border-gray-200`}
      >
        {studentIndex + 1}
      </td>

      {/* Student Name */}
      <td
        className={`sticky left-12 z-10 ${rowBg} hover:bg-indigo-50/50 px-4 py-2.5 text-sm font-semibold text-gray-800 border-b border-r border-gray-200`}
      >
        {student.studentName}
      </td>

      {/* Gender */}
      <td
        className={`sticky left-[220px] z-10 ${rowBg} hover:bg-indigo-50/50 px-3 py-2.5 text-center border-b border-r border-gray-200`}
      >
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            student.gender === "MALE"
              ? "bg-blue-100 text-blue-700"
              : "bg-pink-100 text-pink-700"
          }`}
        >
          {student.gender === "MALE" ? "ប" : "ស"}
        </span>
      </td>

      {/* Grade Cells */}
      {sortedSubjects.map((subject, subjectIndex) => {
        const cellKey = `${student.studentId}_${subject.id}`;
        const cell = cells[cellKey];
        const colors = getSubjectColor(
          subject.code,
          subject.isEditable || false
        );

        if (!cell)
          return (
            <td
              key={subject.id}
              className={`border-b border-r border-gray-200 ${colors.cell}`}
            />
          );

        return (
          <td
            key={subject.id}
            className={`px-2 py-2 text-center border-b border-r border-gray-200 ${colors.cell}`}
          >
            <GradeCell
              cell={cell}
              cellKey={cellKey}
              studentIndex={studentIndex}
              subjectIndex={subjectIndex}
              pasteMode={pasteMode}
              pastedCells={pastedCells}
              editedCells={editedCells}
              isLoading={isLoading}
              saving={saving}
              onCellChange={onCellChange}
              onKeyDown={(e, si, subi) =>
                onKeyDown(
                  e,
                  si,
                  subi,
                  totalStudents,
                  sortedSubjects.length,
                  sortedStudents,
                  inputRefs
                )
              }
              onPaste={onPaste}
              onBlur={onBlur}
              inputRef={(el) => {
                if (el) inputRefs.current[cellKey] = el;
              }}
            />
          </td>
        );
      })}

      {/* Total Score */}
      <td className="px-3 py-2.5 text-center text-sm font-bold border-b border-r border-gray-200 bg-blue-50/50 text-blue-700">
        {student.totalScore}
      </td>

      {/* Average */}
      <td className="px-3 py-2.5 text-center text-base font-bold border-b border-r border-gray-200 bg-green-50/50 text-green-700">
        {student.average}
      </td>

      {/* Grade Level */}
      <td className="px-2 py-2.5 text-center border-b border-r border-gray-200 bg-yellow-50/50">
        <span
          className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-bold ${getGradeLevelColor(
            student.gradeLevel
          )}`}
        >
          {student.gradeLevel}
        </span>
      </td>

      {/* Rank */}
      <td className="px-3 py-2.5 text-center text-sm font-bold border-b border-r border-gray-200 bg-indigo-50/50 text-indigo-700">
        #{student.rank}
      </td>

      {/* Absent */}
      <td className="px-3 py-2.5 text-center text-sm font-semibold border-b border-r border-gray-200 bg-red-50/50 text-red-600">
        {student.absent || "-"}
      </td>

      {/* Permission */}
      <td className="px-3 py-2.5 text-center text-sm font-semibold border-b border-gray-200 bg-orange-50/50 text-orange-600">
        {student.permission || "-"}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  // Only re-render if these specific props change

  // Check if student data changed
  if (prevProps.student !== nextProps.student) return false;

  // Check if cells for this student changed
  const studentCellsChanged = nextProps.sortedSubjects.some((subject) => {
    const cellKey = `${nextProps.student.studentId}_${subject.id}`;
    return prevProps.cells[cellKey] !== nextProps.cells[cellKey];
  });
  if (studentCellsChanged) return false;

  // Check if paste/edit mode changed
  if (prevProps.pasteMode !== nextProps.pasteMode) return false;
  if (prevProps.saving !== nextProps.saving) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;

  // Check if any cells in this row are pasted/edited
  const hasPastedCells = nextProps.sortedSubjects.some((subject) => {
    const cellKey = `${nextProps.student.studentId}_${subject.id}`;
    return nextProps.pastedCells.has(cellKey) !== prevProps.pastedCells.has(cellKey) ||
           nextProps.editedCells.has(cellKey) !== prevProps.editedCells.has(cellKey);
  });
  if (hasPastedCells) return false;

  // If none of the above changed, don't re-render (return true means props are equal)
  return true;
});
