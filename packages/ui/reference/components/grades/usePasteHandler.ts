import { useCallback } from "react";
import type { CellState } from "./types";
import type { BulkSaveGradeItem } from "@/lib/api/grades";

export function usePasteHandler(
  cells: { [key: string]: CellState },
  setCells: React.Dispatch<React.SetStateAction<{ [key: string]: CellState }>>,
  sortedStudents: any[],
  sortedSubjects: any[],
  setPasteMode: React.Dispatch<React.SetStateAction<boolean>>,
  setPastedCells: React.Dispatch<React.SetStateAction<Set<string>>>,
  setAllPendingChanges: React.Dispatch<
    React.SetStateAction<Map<string, BulkSaveGradeItem>>
  >,
  setPendingChanges: React.Dispatch<React.SetStateAction<Set<string>>>,
  setPastePreview: React.Dispatch<React.SetStateAction<string | null>>,
  pasteMode: boolean
) {
  const handlePaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLInputElement>,
      startStudentIndex: number,
      startSubjectIndex: number
    ) => {
      e.preventDefault();

      try {
        const clipboardData = e.clipboardData.getData("text/plain");
        if (!clipboardData || clipboardData.trim() === "") return;

        const rows = clipboardData
          .split(/\r?\n/)
          .filter((row) => row.trim() !== "");
        const data: string[][] = rows.map((row) =>
          row.split(/\t|,/).map((cell) => cell.trim())
        );

        const pastedCellKeys = new Set<string>();
        const changes = new Map<string, BulkSaveGradeItem>();
        const updatedCells: { [key: string]: CellState } = {};
        let pastedCount = 0;
        let errorCount = 0;

        data.forEach((row, rowOffset) => {
          const studentIndex = startStudentIndex + rowOffset;
          if (studentIndex >= sortedStudents.length) return;

          const student = sortedStudents[studentIndex];

          row.forEach((value, colOffset) => {
            const subjectIndex = startSubjectIndex + colOffset;
            if (subjectIndex >= sortedSubjects.length) return;

            const subject = sortedSubjects[subjectIndex];
            const cellKey = `${student.studentId}_${subject.id}`;

            if (!subject.isEditable) return;

            const cleanValue = value.replace(/[^\d.-]/g, "");
            if (cleanValue !== "" || value === "") {
              const numValue =
                cleanValue === "" ? null : parseFloat(cleanValue);

              let error: string | null = null;
              if (numValue !== null) {
                if (isNaN(numValue)) {
                  error = "Invalid";
                  errorCount++;
                } else if (numValue < 0 || numValue > subject.maxScore) {
                  error = `Max ${subject.maxScore}`;
                  errorCount++;
                }
              }

              if (!error) {
                pastedCellKeys.add(cellKey);
                changes.set(cellKey, {
                  studentId: student.studentId,
                  subjectId: subject.id,
                  score: numValue,
                });

                updatedCells[cellKey] = {
                  studentId: student.studentId,
                  subjectId: subject.id,
                  value: cleanValue,
                  originalValue: cells[cellKey]?.originalValue || null,
                  isModified: true,
                  isSaving: false,
                  error: null,
                  isEditable: true,
                };

                pastedCount++;
              }
            }
          });
        });

        setCells((prev) => ({ ...prev, ...updatedCells }));
        setPasteMode(true);
        setPastedCells(pastedCellKeys);
        setAllPendingChanges(changes);
        setPendingChanges(new Set());
        setPastePreview(
          `📋 បានបញ្ចូល ${pastedCount} cells${
            errorCount > 0 ? ` (${errorCount} errors)` : ""
          } - សូមពិនិត្យ ហើយចុច "រក្សាទុក"`
        );

        setTimeout(() => {
          if (pasteMode) setPastePreview(null);
        }, 5000);
      } catch (error) {
        console.error("❌ Paste error:", error);
        setPastePreview("❌ មានបញ្ហាក្នុងការបញ្ចូលទិន្នន័យ");
        setTimeout(() => setPastePreview(null), 3000);
      }
    },
    [
      cells,
      sortedStudents,
      sortedSubjects,
      setCells,
      setPasteMode,
      setPastedCells,
      setAllPendingChanges,
      setPendingChanges,
      setPastePreview,
      pasteMode,
    ]
  );

  return { handlePaste };
}
