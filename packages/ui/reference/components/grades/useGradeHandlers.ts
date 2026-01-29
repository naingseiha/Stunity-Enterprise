import { useCallback } from "react";
import type { CellState } from "./types";
import type { BulkSaveGradeItem } from "@/lib/api/grades";

export function useGradeHandlers(
  cells: { [key: string]: CellState },
  setCells: React.Dispatch<React.SetStateAction<{ [key: string]: CellState }>>,
  sortedSubjects: any[],
  pasteMode: boolean,
  setEditedCells: React.Dispatch<React.SetStateAction<Set<string>>>,
  setAllPendingChanges: React.Dispatch<
    React.SetStateAction<Map<string, BulkSaveGradeItem>>
  >,
  setPendingChanges: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const handleCellChange = useCallback(
    (cellKey: string, value: string) => {
      const cell = cells[cellKey];
      if (!cell) return;

      if (!cell.isEditable) {
        console.log("🚫 Cannot edit this subject");
        return;
      }

      const subject = sortedSubjects.find((s) => s.id === cell.subjectId);
      if (!subject) return;

      let error: string | null = null;
      if (value.trim() !== "") {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          error = "Invalid";
        } else if (numValue < 0 || numValue > subject.maxScore) {
          error = `Max ${subject.maxScore}`;
        }
      }

      const isModified =
        value !==
        (cell.originalValue !== null ? String(cell.originalValue) : "");

      // ✅ FIX: If user edits a cell that's currently saving, clear the saving state
      // This prevents the spinner from getting stuck
      setCells((prev) => ({
        ...prev,
        [cellKey]: {
          ...prev[cellKey],
          value,
          isModified,
          error,
          isSaving: false, // ✅ Clear saving state when user edits
        },
      }));

      if (pasteMode) {
        setEditedCells((prev) => new Set(prev).add(cellKey));
        const numValue = value.trim() === "" ? null : parseFloat(value);

        setAllPendingChanges((prev) => {
          const updated = new Map(prev);
          if (!error) {
            updated.set(cellKey, {
              studentId: cell.studentId,
              subjectId: cell.subjectId,
              score: numValue,
            });
          } else {
            updated.delete(cellKey);
          }
          return updated;
        });
      } else {
        if (isModified && !error) {
          setPendingChanges((prev) => new Set(prev).add(cellKey));
        } else {
          setPendingChanges((prev) => {
            const updated = new Set(prev);
            updated.delete(cellKey);
            return updated;
          });
        }
      }
    },
    [
      cells,
      sortedSubjects,
      pasteMode,
      setCells,
      setEditedCells,
      setAllPendingChanges,
      setPendingChanges,
    ]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      studentIndex: number,
      subjectIndex: number,
      totalStudents: number,
      totalSubjects: number,
      sortedStudents: any[],
      inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement }>
    ) => {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        if (studentIndex < totalStudents - 1) {
          const nextKey = `${sortedStudents[studentIndex + 1].studentId}_${
            sortedSubjects[subjectIndex].id
          }`;
          inputRefs.current[nextKey]?.focus();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (studentIndex > 0) {
          const prevKey = `${sortedStudents[studentIndex - 1].studentId}_${
            sortedSubjects[subjectIndex].id
          }`;
          inputRefs.current[prevKey]?.focus();
        }
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        if (subjectIndex < totalSubjects - 1) {
          const nextKey = `${sortedStudents[studentIndex].studentId}_${
            sortedSubjects[subjectIndex + 1].id
          }`;
          inputRefs.current[nextKey]?.focus();
        }
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (subjectIndex > 0) {
          const prevKey = `${sortedStudents[studentIndex].studentId}_${
            sortedSubjects[subjectIndex - 1].id
          }`;
          inputRefs.current[prevKey]?.focus();
        }
      }
    },
    [sortedSubjects]
  );

  return { handleCellChange, handleKeyDown };
}
