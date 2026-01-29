import { useCallback, useRef } from "react";
import type { CellState } from "./types";
import type { BulkSaveGradeItem } from "@/lib/api/grades";

export function useAutoSave(
  pendingChanges: Set<string>,
  cells: { [key: string]: CellState },
  setCells: React.Dispatch<React.SetStateAction<{ [key: string]: CellState }>>,
  setPendingChanges: React.Dispatch<React.SetStateAction<Set<string>>>,
  onSave: (grades: BulkSaveGradeItem[], isAutoSave?: boolean) => Promise<void>,
  pasteMode: boolean
) {
  // ✅ FIX: Add ref to prevent concurrent saves
  const isSavingRef = useRef(false);
  const saveQueueRef = useRef<Set<string>>(new Set());

  const handleAutoSave = useCallback(async () => {
    // ✅ FIX: If already saving, queue these changes for next save
    if (isSavingRef.current) {
      console.log(
        "⏳ Save in progress, queuing",
        pendingChanges.size,
        "changes"
      );
      pendingChanges.forEach((cellKey) => saveQueueRef.current.add(cellKey));
      return;
    }

    // ✅ FIX: Snapshot the changes to save at this moment
    const cellsToSave = new Set<string>();
    const changesToSave: BulkSaveGradeItem[] = [];

    pendingChanges.forEach((cellKey) => {
      const cell = cells[cellKey];
      if (cell && cell.isModified && !cell.error && cell.isEditable) {
        const score = cell.value.trim() === "" ? null : parseFloat(cell.value);
        changesToSave.push({
          studentId: cell.studentId,
          subjectId: cell.subjectId,
          score,
        });
        cellsToSave.add(cellKey);
      }
    });

    if (changesToSave.length === 0) return;

    // ✅ FIX: Set saving flag BEFORE starting
    isSavingRef.current = true;

    // ✅ Mark cells as saving
    setCells((prev) => {
      const updated = { ...prev };
      cellsToSave.forEach((cellKey) => {
        updated[cellKey] = { ...prev[cellKey], isSaving: true };
      });
      return updated;
    });

    console.log("💾 Auto-saving", changesToSave.length, "changes (SILENT)");

    try {
      // ✅ CHANGED: Pass true for isAutoSave (silent save)
      await onSave(changesToSave, true);

      // ✅ FIX: Update cells and clear only the changes we actually saved
      setCells((prev) => {
        const updated = { ...prev };
        changesToSave.forEach((change) => {
          const cellKey = `${change.studentId}_${change.subjectId}`;
          const currentCell = prev[cellKey];

          // ✅ FIX: Check if user edited this cell while it was saving
          // If current value differs from what we just saved, keep it as modified
          const currentValue = currentCell.value.trim() === "" ? null : parseFloat(currentCell.value);
          const savedValue = change.score;
          const wasEditedDuringSave = currentValue !== savedValue;

          updated[cellKey] = {
            ...updated[cellKey],
            originalValue: change.score,
            isModified: wasEditedDuringSave, // ✅ Keep modified if user edited during save
            isSaving: false,
            error: wasEditedDuringSave ? null : updated[cellKey].error, // Preserve error if still modified
          };
        });
        return updated;
      });

      // ✅ FIX: Only clear the changes we saved AND weren't edited during save
      setPendingChanges((prev) => {
        const next = new Set(prev);
        changesToSave.forEach((change) => {
          const cellKey = `${change.studentId}_${change.subjectId}`;
          const currentCell = cells[cellKey];
          const currentValue = currentCell.value.trim() === "" ? null : parseFloat(currentCell.value);
          const savedValue = change.score;

          // Only remove from pending if user didn't edit it during save
          if (currentValue === savedValue) {
            next.delete(cellKey);
          }
          // If edited during save, keep it in pendingChanges for next save
        });
        return next;
      });

      console.log("✅ Auto-save completed SILENTLY (no toast)");
    } catch (error: any) {
      console.error("❌ Auto-save failed:", error);
      setCells((prev) => {
        const updated = { ...prev };
        changesToSave.forEach((change) => {
          const cellKey = `${change.studentId}_${change.subjectId}`;
          updated[cellKey] = {
            ...updated[cellKey],
            isSaving: false,
            error: "Failed",
          };
        });
        return updated;
      });
    } finally {
      // ✅ FIX: Clear saving flag
      isSavingRef.current = false;

      // ✅ FIX: If there are queued changes, trigger another save
      if (saveQueueRef.current.size > 0) {
        console.log(
          "🔄 Processing queued changes:",
          saveQueueRef.current.size
        );
        const queued = saveQueueRef.current;
        saveQueueRef.current = new Set();

        // Add queued changes back to pending
        setPendingChanges((prev) => {
          const next = new Set(prev);
          queued.forEach((cellKey) => next.add(cellKey));
          return next;
        });

        // Trigger another save after a short delay
        setTimeout(() => handleAutoSave(), 100);
      }
    }
  }, [pendingChanges, cells, onSave]);

  return { handleAutoSave };
}
