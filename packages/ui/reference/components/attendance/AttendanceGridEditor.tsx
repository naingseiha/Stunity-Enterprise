"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, Check } from "lucide-react";
import type {
  AttendanceGridData,
  BulkSaveAttendanceItem,
} from "@/lib/api/attendance";
import { FloatingSavePanel } from "./FloatingSavePanel";

interface AttendanceGridEditorProps {
  gridData: AttendanceGridData;
  onSave: (attendance: BulkSaveAttendanceItem[], isAutoSave?: boolean) => Promise<void>;
  isLoading?: boolean;
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void; // ✅ NEW: Callback for unsaved changes
}

interface CellState {
  studentId: string;
  day: number;
  session: "M" | "A";
  value: string;
  originalValue: string;
  isModified: boolean;
  isSaving: boolean;
  error: string | null;
}

export default function AttendanceGridEditor({
  gridData,
  onSave,
  isLoading = false,
  onUnsavedChanges,
}: AttendanceGridEditorProps) {
  const [cells, setCells] = useState<{ [key: string]: CellState }>({});
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

  // Refs to capture latest state for auto-save
  const cellsRef = useRef(cells);
  const pendingChangesRef = useRef(pendingChanges);

  // Paste mode states
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedCells, setPastedCells] = useState<Set<string>>(new Set());
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
  const [allPendingChanges, setAllPendingChanges] = useState<
    Map<string, BulkSaveAttendanceItem>
  >(new Map());
  const [saving, setSaving] = useState(false);

  // Helper function to get day of week color scheme
  const getDayOfWeek = (day: number): number => {
    const year = gridData.year;
    const monthNumber = gridData.monthNumber;
    const date = new Date(year, monthNumber - 1, day);
    return date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  };

  // Helper function to get day label
  const getDayLabel = (day: number): string => {
    const dayOfWeek = getDayOfWeek(day);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayLabels[dayOfWeek];
  };

  const getDayColorScheme = (day: number, session: "M" | "A", monthNumber: number, year: number) => {
    const dayOfWeek = getDayOfWeek(day);

    // Modern, harmonious color schemes for each day of the week
    // Using the same base color for morning and afternoon with subtle differentiation
    const colorSchemes = {
      0: { // Sunday - Soft Rose
        morning: "bg-rose-50/80 border-rose-200/60",
        afternoon: "bg-rose-100/70 border-rose-200/60",
        header: "bg-gradient-to-b from-rose-100 to-rose-50 text-rose-800",
        morningHeader: "bg-rose-50/90 text-rose-800 border-b border-rose-200/50",
        afternoonHeader: "bg-rose-100/80 text-rose-900 border-b border-rose-200/50",
      },
      1: { // Monday - Sky Blue
        morning: "bg-sky-50/80 border-sky-200/60",
        afternoon: "bg-sky-100/70 border-sky-200/60",
        header: "bg-gradient-to-b from-sky-100 to-sky-50 text-sky-800",
        morningHeader: "bg-sky-50/90 text-sky-800 border-b border-sky-200/50",
        afternoonHeader: "bg-sky-100/80 text-sky-900 border-b border-sky-200/50",
      },
      2: { // Tuesday - Emerald Green
        morning: "bg-emerald-50/80 border-emerald-200/60",
        afternoon: "bg-emerald-100/70 border-emerald-200/60",
        header: "bg-gradient-to-b from-emerald-100 to-emerald-50 text-emerald-800",
        morningHeader: "bg-emerald-50/90 text-emerald-800 border-b border-emerald-200/50",
        afternoonHeader: "bg-emerald-100/80 text-emerald-900 border-b border-emerald-200/50",
      },
      3: { // Wednesday - Amber Gold
        morning: "bg-amber-50/80 border-amber-200/60",
        afternoon: "bg-amber-100/70 border-amber-200/60",
        header: "bg-gradient-to-b from-amber-100 to-amber-50 text-amber-800",
        morningHeader: "bg-amber-50/90 text-amber-800 border-b border-amber-200/50",
        afternoonHeader: "bg-amber-100/80 text-amber-900 border-b border-amber-200/50",
      },
      4: { // Thursday - Violet Purple
        morning: "bg-violet-50/80 border-violet-200/60",
        afternoon: "bg-violet-100/70 border-violet-200/60",
        header: "bg-gradient-to-b from-violet-100 to-violet-50 text-violet-800",
        morningHeader: "bg-violet-50/90 text-violet-800 border-b border-violet-200/50",
        afternoonHeader: "bg-violet-100/80 text-violet-900 border-b border-violet-200/50",
      },
      5: { // Friday - Soft Fuchsia
        morning: "bg-fuchsia-50/80 border-fuchsia-200/60",
        afternoon: "bg-fuchsia-100/70 border-fuchsia-200/60",
        header: "bg-gradient-to-b from-fuchsia-100 to-fuchsia-50 text-fuchsia-800",
        morningHeader: "bg-fuchsia-50/90 text-fuchsia-800 border-b border-fuchsia-200/50",
        afternoonHeader: "bg-fuchsia-100/80 text-fuchsia-900 border-b border-fuchsia-200/50",
      },
      6: { // Saturday - Warm Orange
        morning: "bg-orange-50/80 border-orange-200/60",
        afternoon: "bg-orange-100/70 border-orange-200/60",
        header: "bg-gradient-to-b from-orange-100 to-orange-50 text-orange-800",
        morningHeader: "bg-orange-50/90 text-orange-800 border-b border-orange-200/50",
        afternoonHeader: "bg-orange-100/80 text-orange-900 border-b border-orange-200/50",
      },
    };

    if (dayOfWeek in colorSchemes) {
      return colorSchemes[dayOfWeek as keyof typeof colorSchemes];
    } else {
      console.error(`Invalid dayOfWeek: ${dayOfWeek} for day: ${day}, month: ${monthNumber}, year: ${year}. Falling back to a default color scheme.`);
      // Return a default color scheme to prevent crash
      return {
        morning: "bg-gray-50/70 border-gray-200",
        afternoon: "bg-gray-100/70 border-gray-300",
        header: "bg-gray-50 text-gray-700",
        morningHeader: "bg-gray-100/60 text-gray-700",
        afternoonHeader: "bg-gray-200/60 text-gray-800",
      };
    }
  };

  // Update refs whenever state changes
  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  // ✅ NEW: Notify parent about unsaved changes
  useEffect(() => {
    const hasChanges = pendingChanges.size > 0 || allPendingChanges.size > 0;
    onUnsavedChanges?.(hasChanges);
  }, [pendingChanges, allPendingChanges, onUnsavedChanges]);

  // Calculate real-time totals for each student
  const studentTotals = useMemo(() => {
    const totals: {
      [studentId: string]: { absent: number; permission: number };
    } = {};

    gridData.students.forEach((student) => {
      let absent = 0;
      let permission = 0;

      gridData.days.forEach((day) => {
        // Check morning session
        const morningKey = `${student.studentId}_${day}_M`;
        const morningCell = cells[morningKey];
        if (morningCell?.value === "A") absent++;
        if (morningCell?.value === "P") permission++;

        // Check afternoon session
        const afternoonKey = `${student.studentId}_${day}_A`;
        const afternoonCell = cells[afternoonKey];
        if (afternoonCell?.value === "A") absent++;
        if (afternoonCell?.value === "P") permission++;
      });

      totals[student.studentId] = { absent, permission };
    });

    return totals;
  }, [cells, gridData.students, gridData.days]);

  // Initialize cells with session support
  useEffect(() => {
    console.log("🔄 Initializing attendance cells (2-session)");
    const initialCells: { [key: string]: CellState } = {};

    gridData.students.forEach((student) => {
      gridData.days.forEach((day) => {
        // Morning cell
        const morningKey = `${student.studentId}_${day}_M`;
        const morningData = student.attendance[`${day}_M`];
        const morningValue = morningData?.displayValue || "";

        initialCells[morningKey] = {
          studentId: student.studentId,
          day,
          session: "M",
          value: morningValue,
          originalValue: morningValue,
          isModified: false,
          isSaving: false,
          error: null,
        };

        // Afternoon cell
        const afternoonKey = `${student.studentId}_${day}_A`;
        const afternoonData = student.attendance[`${day}_A`];
        const afternoonValue = afternoonData?.displayValue || "";

        initialCells[afternoonKey] = {
          studentId: student.studentId,
          day,
          session: "A",
          value: afternoonValue,
          originalValue: afternoonValue,
          isModified: false,
          isSaving: false,
          error: null,
        };
      });
    });

    console.log("✅ Initialized cells:", Object.keys(initialCells).length);
    setCells(initialCells);
  }, [gridData]);

  // Auto-save logic (disabled when in paste mode)
  useEffect(() => {
    // Don't auto-save if in paste mode or no changes
    if (pasteMode || pendingChanges.size === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // ✅ OPTIMIZATION: Faster auto-save (500ms) for better UX
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, pasteMode]);

  const handleAutoSave = async () => {
    // Use refs to get the latest state
    const currentCells = cellsRef.current;
    const currentPendingChanges = pendingChangesRef.current;

    if (currentPendingChanges.size === 0) {
      console.log("⏭️ No pending changes to save");
      return;
    }

    const changes: BulkSaveAttendanceItem[] = [];
    const cellKeysToSave: string[] = [];

    currentPendingChanges.forEach((cellKey) => {
      const cell = currentCells[cellKey];
      if (cell && cell.isModified) {
        changes.push({
          studentId: cell.studentId,
          day: cell.day,
          session: cell.session,
          value: cell.value,
        });
        cellKeysToSave.push(cellKey);
      }
    });

    if (changes.length === 0) {
      console.log("⏭️ No modified cells to save");
      return;
    }

    console.log(`💾 Auto-saving ${changes.length} attendance records...`);

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Pass isAutoSave=true for silent auto-save
      await onSave(changes, true);

      console.log(`✅ Auto-saved ${changes.length} records successfully`);

      // Mark as saved - use functional update to get latest state
      setCells((prev) => {
        const updated = { ...prev };
        cellKeysToSave.forEach((cellKey) => {
          if (updated[cellKey]) {
            updated[cellKey] = {
              ...updated[cellKey],
              originalValue: updated[cellKey].value,
              isModified: false,
              isSaving: false,
            };
          }
        });
        return updated;
      });

      // Remove saved changes from pending
      setPendingChanges((prev) => {
        const remaining = new Set(prev);
        cellKeysToSave.forEach((key) => remaining.delete(key));
        return remaining;
      });

      // Show success state
      setIsSaving(false);
      setSaveSuccess(true);

      // Hide success icon after 2 seconds
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error("❌ Auto-save error:", error);
      setIsSaving(false);
      setSaveSuccess(false);
    }
  };

  const handleCellChange = (
    studentId: string,
    day: number,
    session: "M" | "A",
    newValue: string
  ) => {
    const cellKey = `${studentId}_${day}_${session}`;
    const cell = cells[cellKey];

    if (!cell) return;

    // Validate input (A, P, or empty)
    const sanitized = newValue.toUpperCase().trim();
    if (sanitized !== "" && sanitized !== "A" && sanitized !== "P") {
      return; // Invalid input
    }

    // Update cell
    setCells((prev) => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        value: sanitized,
        isModified: sanitized !== prev[cellKey].originalValue,
      },
    }));

    // If in paste mode, track as edited cell and add to allPendingChanges
    if (pasteMode) {
      setEditedCells((prev) => new Set(prev).add(cellKey));
      setAllPendingChanges((prev) => {
        const updated = new Map(prev);
        updated.set(cellKey, {
          studentId,
          day,
          session,
          value: sanitized,
        });
        return updated;
      });
    } else {
      // Normal mode: mark for auto-save
      setPendingChanges((prev) => new Set(prev).add(cellKey));
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    studentId: string,
    day: number,
    session: "M" | "A"
  ) => {
    const currentStudentIndex = gridData.students.findIndex(
      (s) => s.studentId === studentId
    );
    const currentDayIndex = gridData.days.indexOf(day);

    let nextCellKey: string | null = null;

    switch (e.key) {
      case "Enter":
      case "ArrowDown":
        e.preventDefault();
        // Move to next student (same day, same session)
        if (currentStudentIndex < gridData.students.length - 1) {
          const nextStudent = gridData.students[currentStudentIndex + 1];
          nextCellKey = `${nextStudent.studentId}_${day}_${session}`;
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        // Move to previous student (same day, same session)
        if (currentStudentIndex > 0) {
          const prevStudent = gridData.students[currentStudentIndex - 1];
          nextCellKey = `${prevStudent.studentId}_${day}_${session}`;
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        // Move to next session or next day
        if (session === "M") {
          // Move to afternoon of same day
          nextCellKey = `${studentId}_${day}_A`;
        } else if (currentDayIndex < gridData.days.length - 1) {
          // Move to morning of next day
          const nextDay = gridData.days[currentDayIndex + 1];
          nextCellKey = `${studentId}_${nextDay}_M`;
        }
        break;

      case "ArrowLeft":
        e.preventDefault();
        // Move to previous session or previous day
        if (session === "A") {
          // Move to morning of same day
          nextCellKey = `${studentId}_${day}_M`;
        } else if (currentDayIndex > 0) {
          // Move to afternoon of previous day
          const prevDay = gridData.days[currentDayIndex - 1];
          nextCellKey = `${studentId}_${prevDay}_A`;
        }
        break;

      case "Tab":
        e.preventDefault();
        // Tab moves right, Shift+Tab moves left
        if (e.shiftKey) {
          // Same as ArrowLeft
          if (session === "A") {
            nextCellKey = `${studentId}_${day}_M`;
          } else if (currentDayIndex > 0) {
            const prevDay = gridData.days[currentDayIndex - 1];
            nextCellKey = `${studentId}_${prevDay}_A`;
          }
        } else {
          // Same as ArrowRight
          if (session === "M") {
            nextCellKey = `${studentId}_${day}_A`;
          } else if (currentDayIndex < gridData.days.length - 1) {
            const nextDay = gridData.days[currentDayIndex + 1];
            nextCellKey = `${studentId}_${nextDay}_M`;
          }
        }
        break;
    }

    if (nextCellKey) {
      const nextInput = inputRefs.current[nextCellKey];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Paste handler (supports multi-row/column paste)
  const handlePaste = (
    e: React.ClipboardEvent,
    studentId: string,
    day: number,
    session: "M" | "A"
  ) => {
    e.preventDefault();

    const pasteData = e.clipboardData.getData("text");
    const rows = pasteData.split("\n").filter((row) => row.trim());

    const studentIndex = gridData.students.findIndex(
      (s) => s.studentId === studentId
    );
    if (studentIndex === -1) return;

    const updates: { [key: string]: string } = {};
    const pastedCellKeys = new Set<string>();
    const changes = new Map<string, BulkSaveAttendanceItem>();

    rows.forEach((row, rowOffset) => {
      const cols = row.split("\t");
      const targetStudentIndex = studentIndex + rowOffset;

      if (targetStudentIndex >= gridData.students.length) return;

      const targetStudent = gridData.students[targetStudentIndex];

      cols.forEach((col, colOffset) => {
        const targetDay = day + colOffset;

        if (targetDay > gridData.daysInMonth) return;

        const cellKey = `${targetStudent.studentId}_${targetDay}_${session}`;
        const sanitized = col.toUpperCase().trim();

        if (sanitized === "" || sanitized === "A" || sanitized === "P") {
          updates[cellKey] = sanitized;
          pastedCellKeys.add(cellKey);

          // Add to pending changes
          changes.set(cellKey, {
            studentId: targetStudent.studentId,
            day: targetDay,
            session: session,
            value: sanitized,
          });
        }
      });
    });

    // Apply all updates
    setCells((prev) => {
      const updated = { ...prev };
      Object.entries(updates).forEach(([key, value]) => {
        if (updated[key]) {
          updated[key] = {
            ...updated[key],
            value,
            isModified: value !== updated[key].originalValue,
          };
        }
      });
      return updated;
    });

    // Enter paste mode
    setPasteMode(true);
    setPastedCells(pastedCellKeys);
    setAllPendingChanges(changes);
    setPendingChanges(new Set()); // Clear auto-save pending changes

    console.log(`📋 Pasted ${pastedCellKeys.size} cells - waiting for manual save`);
  };

  // Save All handler for paste mode
  const handleSaveAll = async () => {
    if (allPendingChanges.size === 0) return;

    try {
      const changesToSave = Array.from(allPendingChanges.values());
      setSaving(true);
      console.log(`💾 Saving ${changesToSave.length} pasted attendance records`);

      await onSave(changesToSave, false); // isAutoSave = false for manual save

      // Mark all as saved
      setCells((prev) => {
        const updated = { ...prev };
        allPendingChanges.forEach((change, cellKey) => {
          if (updated[cellKey]) {
            updated[cellKey] = {
              ...updated[cellKey],
              originalValue: change.value,
              value: change.value,
              isModified: false,
              isSaving: false,
              error: null,
            };
          }
        });
        return updated;
      });

      // Exit paste mode
      setPasteMode(false);
      setPastedCells(new Set());
      setEditedCells(new Set());
      setAllPendingChanges(new Map());

      console.log(`✅ Successfully saved ${changesToSave.length} attendance records`);
    } catch (error: any) {
      console.error("❌ Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  // Cancel paste handler
  const handleCancelPaste = () => {
    // Revert all pasted cells to original values
    setCells((prev) => {
      const reverted = { ...prev };
      allPendingChanges.forEach((_, cellKey) => {
        const cell = prev[cellKey];
        if (cell) {
          reverted[cellKey] = {
            ...cell,
            value: cell.originalValue,
            isModified: false,
            error: null,
          };
        }
      });
      return reverted;
    });

    // Exit paste mode
    setPasteMode(false);
    setPastedCells(new Set());
    setEditedCells(new Set());
    setAllPendingChanges(new Map());

    console.log("🚫 Cancelled paste - reverted changes");
  };

  const getCellClassName = (cell: CellState, cellKey: string, day: number) => {
    const colorScheme = getDayColorScheme(day, cell.session, gridData.monthNumber, gridData.year);
    const dayColors = cell.session === "M" ? colorScheme.morning : colorScheme.afternoon;

    let base =
      "w-12 h-9 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:z-10 font-semibold text-sm transition-colors ";

    if (cell.isSaving) {
      return base + "bg-blue-50 text-blue-600 animate-pulse border";
    }

    if (cell.error) {
      return base + "bg-red-50 text-red-700 border";
    }

    // Pasted cells (in paste mode)
    if (pastedCells.has(cellKey)) {
      return base + "bg-yellow-100 text-yellow-900 border-2 border-yellow-400";
    }

    // Edited cells after paste (in paste mode)
    if (editedCells.has(cellKey)) {
      return base + "bg-orange-100 text-orange-900 border-2 border-orange-400";
    }

    if (cell.isModified) {
      return base + `bg-yellow-100/80 text-yellow-900 border ${dayColors.split(' ')[1]}`;
    }

    if (cell.value === "A") {
      return base + `bg-red-200/60 text-red-900 font-bold border ${dayColors.split(' ')[1]}`;
    }

    if (cell.value === "P") {
      return base + `bg-orange-200/60 text-orange-900 font-bold border ${dayColors.split(' ')[1]}`;
    }

    return base + `${dayColors} text-gray-700 hover:brightness-95`;
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full min-w-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {gridData.className}
            </h3>
            <p className="text-indigo-100 text-sm mt-1">
              {gridData.month} {gridData.year} • រក្សាស្វ័យប្រវត្តិ
            </p>
          </div>

          {/* ✅ NEW: Inline Save Status */}
          <div className="flex items-center gap-3">
            {isSaving ? (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="text-sm font-medium text-white">
                  កំពុងរក្សាទុក...
                </span>
              </div>
            ) : saveSuccess ? (
              <div className="flex items-center gap-2 bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-lg animate-in fade-in duration-300">
                <Check className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">
                  រក្សាទុកបានជោគជ័យ
                </span>
              </div>
            ) : pendingChanges.size > 0 ? (
              <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-yellow-300/50">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-white">
                  {pendingChanges.size} ការផ្លាស់ប្តូរ
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">រួចរាល់</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className={`border-b px-6 py-3 ${
        pasteMode
          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-100"
      }`}>
        <div className="flex items-start gap-2">
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            pasteMode ? "text-yellow-600" : "text-indigo-600"
          }`} />
          <div className={`text-sm ${pasteMode ? "text-yellow-900" : "text-indigo-900"}`}>
            {pasteMode ? (
              <>
                <p className="font-bold mb-1 text-lg">
                  📋 ទម្រង់បញ្ចូលពី Excel - សូមពិនិត្យ ហើយចុច "រក្សាទុកទាំងអស់"
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-yellow-800">
                  <li>
                    <strong className="text-yellow-600">ពណ៌លឿង</strong> = បានបញ្ចូលពី Excel •{" "}
                    <strong className="text-orange-600">ពណ៌ទឹកក្រូច</strong> = បានកែសម្រួលបន្ថែម
                  </li>
                  <li>
                    ទិន្នន័យនឹងមិនរក្សាទុកភ្លាមៗទេ - សូមពិនិត្យ ហើយចុច{" "}
                    <strong>"រក្សាទុកទាំងអស់"</strong> ខាងក្រោម
                  </li>
                  <li>
                    អ្នកអាចបន្តកែសម្រួលបាន ឬ ចុច <strong>"បោះបង់"</strong>{" "}
                    ដើម្បីលុបចោលការផ្លាស់ប្តូរទាំងអស់
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">
                  វិធីប្រើប្រាស់ (២វេន: ព្រឹក + ល្ងាច):
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-indigo-700">
                  <li>
                    <strong>A</strong> = អវត្តមានអត់ច្បាប់ • <strong>P</strong> =
                    អវត្តមានមានច្បាប់ • <strong>ទទេ</strong> = មករៀន
                  </li>
                  <li>
                    <strong>វាយបញ្ចូលម្តងមួយ</strong> = រក្សាទុកស្វ័យប្រវត្តិ ក្រោយ 1 វិនាទី
                  </li>
                  <li>
                    <strong>Paste ពី Excel</strong> (Ctrl+V) = រង់ចាំសម្រាប់ចុច "រក្សាទុកទាំងអស់"
                  </li>
                  <li>
                    <strong>Enter</strong> = ចុះទៅសិស្សបន្ទាប់ • អាច paste ច្រើន
                    rows/columns ក្នុងពេលតែមួយ
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto overflow-y-auto overflow-clip max-h-[calc(100vh-250px)] relative">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-50">
            {/* Day numbers row */}
            <tr className="bg-gray-100">
              <th
                rowSpan={2}
                className="sticky left-0 z-40 bg-gray-100 px-6 py-3 text-left font-bold text-gray-700 border-r-2 border-gray-300 min-w-[280px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
              >
                <div className="text-sm">សិស្ស</div>
                <div className="text-xs font-normal text-gray-500 mt-0.5">
                  Students
                </div>
              </th>
              {gridData.days.map((day) => {
                const colorScheme = getDayColorScheme(day, "M", gridData.monthNumber, gridData.year);
                const dayLabel = getDayLabel(day);
                return (
                  <th
                    key={day}
                    colSpan={2}
                    className={`px-2 py-2 text-center font-bold border-l border-gray-300 ${colorScheme.header}`}
                  >
                    <div className="text-base font-bold">{day}</div>
                    <div className="text-[10px] font-normal mt-0.5">{dayLabel}</div>
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className="sticky right-0 z-40 bg-gray-100 px-4 py-3 font-bold text-gray-700 border-l-2 border-gray-300 min-w-[180px] shadow-[-2px_0_4px_rgba(0,0,0,0.05)]"
              >
                <div className="text-sm">សរុប</div>
                <div className="text-xs font-normal text-gray-500 mt-0.5">
                  Total
                </div>
              </th>
            </tr>

            {/* Session labels row */}
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              {gridData.days.map((day) => {
                const colorScheme = getDayColorScheme(day, "M", gridData.monthNumber, gridData.year);
                return (
                  <>
                    <th
                      key={`${day}_M`}
                      className={`px-1 py-1.5 text-xs font-semibold border-l border-gray-300 ${colorScheme.morningHeader}`}
                    >
                      <div>ព្រឹក</div>
                      <div className="text-[10px]">M</div>
                    </th>
                    <th
                      key={`${day}_A`}
                      className={`px-1 py-1.5 text-xs font-semibold border-l border-gray-300 ${colorScheme.afternoonHeader}`}
                    >
                      <div>ល្ងាច</div>
                      <div className="text-[10px]">A</div>
                    </th>
                  </>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {gridData.students.map((student, studentIndex) => (
              <tr
                key={student.studentId}
                className={`
                  group hover:bg-indigo-50/30 transition-colors
                  ${studentIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  border-b border-gray-100
                `}
              >
                {/* Student name */}
                <td className={`sticky left-0 z-30 px-6 py-2 border-r-2 border-gray-300 font-medium min-w-[280px] shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${
                  studentIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs font-normal min-w-[24px] text-right">
                      {studentIndex + 1}.
                    </span>
                    <span className="text-gray-900 text-sm whitespace-nowrap">
                      {student.studentName}
                    </span>
                  </div>
                </td>

                {/* Attendance cells */}
                {gridData.days.map((day) => {
                  const morningKey = `${student.studentId}_${day}_M`;
                  const afternoonKey = `${student.studentId}_${day}_A`;
                  const morningCell = cells[morningKey];
                  const afternoonCell = cells[afternoonKey];

                  return (
                    <>
                      {/* Morning */}
                      <td
                        key={morningKey}
                        className={`p-0 border-l border-gray-200 ${
                          morningCell
                            ? (getDayColorScheme(day, "M", gridData.monthNumber, gridData.year)).morning
                            : ""
                        }`}
                      >
                        {morningCell && (
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current[morningKey] = el;
                            }}
                            type="text"
                            value={morningCell.value}
                            onChange={(e) =>
                              handleCellChange(
                                student.studentId,
                                day,
                                "M",
                                e.target.value
                              )
                            }
                            onKeyDown={(e) =>
                              handleKeyDown(e, student.studentId, day, "M")
                            }
                            onPaste={(e) =>
                              handlePaste(e, student.studentId, day, "M")
                            }
                            className={getCellClassName(morningCell, morningKey, day)}
                            maxLength={1}
                            disabled={isLoading}
                          />
                        )}
                      </td>

                      {/* Afternoon */}
                      <td
                        key={afternoonKey}
                        className={`p-0 border-l border-gray-200 ${
                          afternoonCell
                            ? (getDayColorScheme(day, "A", gridData.monthNumber, gridData.year)).afternoon
                            : ""
                        }`}
                      >
                        {afternoonCell && (
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current[afternoonKey] = el;
                            }}
                            type="text"
                            value={afternoonCell.value}
                            onChange={(e) =>
                              handleCellChange(
                                student.studentId,
                                day,
                                "A",
                                e.target.value
                              )
                            }
                            onKeyDown={(e) =>
                              handleKeyDown(e, student.studentId, day, "A")
                            }
                            onPaste={(e) =>
                              handlePaste(e, student.studentId, day, "A")
                            }
                            className={getCellClassName(afternoonCell, afternoonKey, day)}
                            maxLength={1}
                            disabled={isLoading}
                          />
                        )}
                      </td>
                    </>
                  );
                })}

                {/* Total */}
                <td className={`sticky right-0 z-30 border-l-2 border-gray-300 px-4 py-2 min-w-[180px] shadow-[-2px_0_4px_rgba(0,0,0,0.05)] ${
                  studentIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                        អត់ច្បាប់:
                      </span>
                      <span className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded min-w-[32px] text-center">
                        {studentTotals[student.studentId]?.absent || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                        មានច្បាប់:
                      </span>
                      <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded min-w-[32px] text-center">
                        {studentTotals[student.studentId]?.permission || 0}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <span className="font-bold">សិស្សសរុប: </span>{" "}
            <span className="text-indigo-600 font-bold">
              {gridData.students.length}
            </span>{" "}
            នាក់
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-50 border border-red-300 rounded flex items-center justify-center">
                <span className="text-red-700 font-bold text-xs">A</span>
              </div>
              <span className="text-gray-700">អត់ច្បាប់</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-50 border border-orange-300 rounded flex items-center justify-center">
                <span className="text-orange-700 font-bold text-xs">P</span>
              </div>
              <span className="text-gray-700">មានច្បាប់</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-white border border-gray-300 rounded"></div>
              <span className="text-gray-700">មករៀន</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Panel for Paste Mode */}
      {pasteMode && allPendingChanges.size > 0 && (
        <FloatingSavePanel
          pastedCount={pastedCells.size}
          editedCount={editedCells.size}
          totalChanges={allPendingChanges.size}
          saving={saving}
          onSave={handleSaveAll}
          onCancel={handleCancelPaste}
        />
      )}
    </div>
  );
}
