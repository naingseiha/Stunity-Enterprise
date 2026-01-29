"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import type { GradeGridData, BulkSaveGradeItem } from "@/lib/api/grades";
import { gradeApi } from "@/lib/api/grades";
import { attendanceApi } from "@/lib/api/attendance";
import { getOrderingMessage } from "@/lib/subjectOrder";
import { useVirtualizer } from "@tanstack/react-virtual";

import { GridHeader } from "./GridHeader";
import { PasteNotification } from "./PasteNotification";
import { GradeCell } from "./GradeCell";
import { GridFooter } from "./GridFooter";
import { FloatingSavePanel } from "./FloatingSavePanel";
import { StudentRow } from "./StudentRow";
import { useGradeSorting } from "./useGradeSorting";
import { useGradeCalculations } from "./useGradeCalculations";
import { useGradeHandlers } from "./useGradeHandlers";
import {
  getKhmerShortName,
  getSubjectColor,
  getGradeLevelColor,
} from "./subjectUtils";
import { usePasteHandler } from "./usePasteHandler";
import { useAutoSave } from "./useAutoSave";
import type { CellState } from "./types";

// Around line 15-20, UPDATE interface:

interface GradeGridEditorProps {
  gridData: GradeGridData;
  onSave: (grades: BulkSaveGradeItem[], isAutoSave?: boolean) => Promise<void>;
  isLoading?: boolean;
  currentUser?: any;
}

export default function GradeGridEditor({
  gridData,
  onSave,
  isLoading = false,
  currentUser,
}: GradeGridEditorProps) {
  const [cells, setCells] = useState<{ [key: string]: CellState }>({});
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  const [pastePreview, setPastePreview] = useState<string | null>(null);

  const [pasteMode, setPasteMode] = useState(false);
  const [pastedCells, setPastedCells] = useState<Set<string>>(new Set());
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
  const [allPendingChanges, setAllPendingChanges] = useState<
    Map<string, BulkSaveGradeItem>
  >(new Map());
  const [saving, setSaving] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    [studentId: string]: { absent: number; permission: number };
  }>({});

  // ✅ NEW: Confirmation state
  const [confirmations, setConfirmations] = useState<
    Map<
      string,
      {
        id: string;
        confirmedBy: string;
        confirmedAt: Date;
        user: {
          firstName: string;
          lastName: string;
          email: string;
          role: string;
        };
      }
    >
  >(new Map());

  // Use custom hooks
  const { sortedSubjects, sortedStudents } = useGradeSorting(
    gridData.subjects,
    gridData.students,
    gridData.className
  );

  const totalCoefficientForClass = useMemo(() => {
    return parseFloat(
      gridData.subjects
        .reduce((sum, subject) => sum + subject.coefficient, 0)
        .toFixed(2)
    );
  }, [gridData.subjects]);

  const { rankedStudents } = useGradeCalculations(
    sortedStudents,
    gridData.subjects,
    cells,
    attendanceSummary
  );

  const { handleCellChange, handleKeyDown } = useGradeHandlers(
    cells,
    setCells,
    sortedSubjects,
    pasteMode,
    setEditedCells,
    setAllPendingChanges,
    setPendingChanges
  );

  const { handlePaste } = usePasteHandler(
    cells,
    setCells,
    sortedStudents,
    sortedSubjects,
    setPasteMode,
    setPastedCells,
    setAllPendingChanges,
    setPendingChanges,
    setPastePreview,
    pasteMode
  );

  const { handleAutoSave } = useAutoSave(
    pendingChanges,
    cells,
    setCells,
    setPendingChanges,
    onSave,
    pasteMode
  );

  const orderingMessage = useMemo(() => {
    const gradeMatch = gridData.className?.match(/^(\d+)/);
    const grade = gradeMatch ? parseInt(gradeMatch[1]) : undefined;
    return getOrderingMessage(grade);
  }, [gridData.className]);

  const subjectStats = useMemo(() => {
    const editable = sortedSubjects.filter((s) => s.isEditable).length;
    const viewOnly = sortedSubjects.length - editable;
    return { editable, viewOnly, total: sortedSubjects.length };
  }, [sortedSubjects]);

  // ✅ NEW: Calculate unconfirmed subjects
  const unconfirmedSubjects = useMemo(() => {
    return sortedSubjects.filter(
      (subject) => subject.isEditable && !confirmations.has(subject.id)
    );
  }, [sortedSubjects, confirmations]);

  // Initialize cells
  useEffect(() => {
    const initialCells: { [key: string]: CellState } = {};

    sortedStudents.forEach((student) => {
      sortedSubjects.forEach((subject) => {
        const cellKey = `${student.studentId}_${subject.id}`;
        const gradeData = student.grades[subject.id];

        initialCells[cellKey] = {
          studentId: student.studentId,
          subjectId: subject.id,
          value: gradeData.score !== null ? String(gradeData.score) : "",
          originalValue: gradeData.score,
          isModified: false,
          isSaving: false,
          error: null,
          isEditable: subject.isEditable,
        };
      });
    });

    setCells(initialCells);
  }, [gridData, sortedStudents, sortedSubjects]);

  // Fetch attendance
  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      try {
        const summary = await attendanceApi.getMonthlySummary(
          gridData.classId,
          gridData.month,
          gridData.year
        );
        setAttendanceSummary(summary);
      } catch (error: any) {
        console.error("❌ Failed to fetch attendance summary:", error);
        setAttendanceSummary({});
      }
    };

    if (gridData && gridData.classId && gridData.month && gridData.year) {
      fetchAttendanceSummary();
    }
  }, [gridData.classId, gridData.month, gridData.year]);

  // ✅ NEW: Fetch confirmations
  useEffect(() => {
    const fetchConfirmations = async () => {
      try {
        const data = await gradeApi.getConfirmations(
          gridData.classId,
          gridData.month,
          gridData.year
        );

        // Convert array to Map for quick lookup by subjectId
        const confirmationMap = new Map(
          data.map((confirmation) => [
            confirmation.subjectId,
            {
              id: confirmation.id,
              confirmedBy: confirmation.confirmedBy,
              confirmedAt: confirmation.confirmedAt,
              user: confirmation.user,
            },
          ])
        );

        setConfirmations(confirmationMap);
      } catch (error: any) {
        console.error("❌ Failed to fetch confirmations:", error);
        setConfirmations(new Map());
      }
    };

    if (gridData && gridData.classId && gridData.month && gridData.year) {
      fetchConfirmations();
    }
  }, [gridData.classId, gridData.month, gridData.year]);

  // Auto-save effect - increased to 3 seconds to prevent partial saves while typing
  useEffect(() => {
    if (pasteMode || pendingChanges.size === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 3000); // ✅ Increased from 1s to 3s

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, pasteMode, handleAutoSave]);

  const handleSaveAll = async () => {
    if (allPendingChanges.size === 0) return;

    try {
      const changesToSave = Array.from(allPendingChanges.values());
      setSaving(true);
      await onSave(changesToSave);

      setCells((prev) => {
        const updated = { ...prev };
        allPendingChanges.forEach((change, cellKey) => {
          updated[cellKey] = {
            ...updated[cellKey],
            originalValue: change.score,
            value: change.score !== null ? String(change.score) : "",
            isModified: false,
            isSaving: false,
            error: null,
          };
        });
        return updated;
      });

      setPasteMode(false);
      setPastedCells(new Set());
      setEditedCells(new Set());
      setAllPendingChanges(new Map());
      setPastePreview(`✅ បានរក្សាទុក ${changesToSave.length} cells រួចរាល់`);
      setTimeout(() => setPastePreview(null), 3000);
    } catch (error: any) {
      setPastePreview(`❌ មានបញ្ហាក្នុងការរក្សាទុក:  ${error.message}`);
      setTimeout(() => setPastePreview(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPaste = () => {
    setCells((prev) => {
      const reverted = { ...prev };
      allPendingChanges.forEach((_, cellKey) => {
        const cell = prev[cellKey];
        if (cell) {
          reverted[cellKey] = {
            ...cell,
            value:
              cell.originalValue !== null ? String(cell.originalValue) : "",
            isModified: false,
            error: null,
          };
        }
      });
      return reverted;
    });

    setPasteMode(false);
    setPastedCells(new Set());
    setEditedCells(new Set());
    setAllPendingChanges(new Map());
    setPastePreview("🚫 បានបោះបង់ការផ្លាស់ប្តូរ");
    setTimeout(() => setPastePreview(null), 2000);
  };

  // ✅ Handle blur - trigger immediate save when user leaves cell
  const handleBlur = (cellKey: string) => {
    if (pasteMode) return; // Don't auto-save in paste mode
    if (pendingChanges.has(cellKey)) {
      // Cancel pending timeout and save immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleAutoSave();
    }
  };

  // ✅ Setup virtualization for the table
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rankedStudents.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 45, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above and below for smooth scrolling
  });

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 relative w-full min-w-0">
      <GridHeader
        className={gridData.className}
        month={gridData.month}
        year={gridData.year}
        studentCount={sortedStudents.length}
        totalCoefficient={totalCoefficientForClass}
        pasteMode={pasteMode}
        currentUserRole={currentUser?.role}
        editableCount={subjectStats.editable}
        totalSubjects={subjectStats.total}
      />

      {orderingMessage && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 px-6 py-2">
          <p className="text-sm font-semibold text-blue-800">
            {orderingMessage}
          </p>
        </div>
      )}

      {/* ✅ NEW: Warning Banner for Unconfirmed Subjects */}
      {unconfirmedSubjects.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">
                ⚠️ មានមុខវិជ្ជា {unconfirmedSubjects.length} មិនទាន់បានបញ្ជាក់ •{" "}
                {unconfirmedSubjects.length} Subject
                {unconfirmedSubjects.length > 1 ? "s" : ""} Not Confirmed
              </p>
              <p className="text-xs text-orange-700 mt-1">
                សូមប្រើកម្មវិធីទូរស័ព្ទដើម្បីពិនិត្យនិងបញ្ជាក់ពិន្ទុ • Use the mobile
                app to review and confirm scores
              </p>
            </div>
          </div>
        </div>
      )}

      {pastePreview && <PasteNotification message={pastePreview} />}

      <div
        ref={tableContainerRef}
        className="overflow-auto"
        style={{
          maxHeight: "calc(100vh - 260px)",
          scrollbarWidth: "thin",
          scrollbarColor: "#9333ea #f3f4f6",
        }}
      >
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 shadow-md">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-100 px-3 py-3 text-xs font-bold text-gray-700 border-b-2 border-r border-gray-300 w-12">
                #
              </th>
              <th className="sticky left-12 z-30 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-700 border-b-2 border-r border-gray-300 min-w-[180px]">
                គោត្តនាម. នាម
              </th>
              <th className="sticky left-[220px] z-30 bg-gray-100 px-3 py-3 text-xs font-bold text-gray-700 border-b-2 border-r border-gray-300 w-14">
                ភេទ
              </th>

              {sortedSubjects.map((subject) => {
                const colors = getSubjectColor(
                  subject.code,
                  subject.isEditable || false
                );
                const khmerName = getKhmerShortName(subject.code);
                const confirmation = confirmations.get(subject.id);
                const isConfirmed = !!confirmation;

                return (
                  <th
                    key={subject.id}
                    className={`px-3 py-3 text-center text-sm font-bold border-b-2 border-r border-gray-300 min-w-[70px] ${colors.header}`}
                    title={`${subject.nameKh} (Max: ${
                      subject.maxScore
                    }, Coefficient: ${subject.coefficient})${
                      !subject.isEditable ? " - មើលប៉ុណ្ណោះ" : ""
                    }${
                      isConfirmed
                        ? `\n✓ បានបញ្ជាក់ដោយ: ${confirmation.user.firstName} ${confirmation.user.lastName}\nនៅ: ${new Date(
                            confirmation.confirmedAt
                          ).toLocaleString("km-KH")}`
                        : subject.isEditable
                        ? "\n⚠️ មិនទាន់បញ្ជាក់"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-1">
                        {!subject.isEditable && <Lock className="w-3 h-3" />}
                        <span>{khmerName}</span>
                      </div>
                      {subject.isEditable && (
                        <div className="flex items-center gap-1">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[10px] font-semibold">
                              <CheckCircle className="w-2.5 h-2.5" />
                              បញ្ជាក់
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-semibold">
                              <AlertCircle className="w-2.5 h-2.5" />
                              មិនទាន់
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="px-3 py-3 text-center text-sm font-bold text-blue-800 border-b-2 border-r border-gray-300 min-w-[70px] bg-blue-100">
                សរុប
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-green-800 border-b-2 border-r border-gray-300 min-w-[70px] bg-green-100">
                ម. ភាគ
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-yellow-800 border-b-2 border-r border-gray-300 min-w-[65px] bg-yellow-100">
                និទ្ទេស
              </th>
              <th className="px-3 py-3 text-center text-sm font-bold text-indigo-800 border-b-2 border-r border-gray-300 min-w-[70px] bg-indigo-100">
                ចំ. ថ្នាក់
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-red-800 border-b-2 border-r border-gray-300 w-12 bg-red-100">
                អ. ច្បាប់
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-orange-800 border-b-2 border-gray-300 w-12 bg-orange-100">
                ម. ច្បាប់
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Spacer row for virtual scrolling - top padding */}
            {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].index > 0 && (
              <tr>
                <td
                  colSpan={sortedSubjects.length + 9}
                  style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}
                />
              </tr>
            )}

            {/* Render only visible rows */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const studentIndex = virtualRow.index;
              const student = rankedStudents[studentIndex];

              return (
                <StudentRow
                  key={student.studentId}
                  student={student}
                  studentIndex={studentIndex}
                  sortedSubjects={sortedSubjects}
                  cells={cells}
                  pasteMode={pasteMode}
                  pastedCells={pastedCells}
                  editedCells={editedCells}
                  isLoading={isLoading}
                  saving={saving}
                  inputRefs={inputRefs}
                  onCellChange={handleCellChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onBlur={handleBlur}
                  totalStudents={sortedStudents.length}
                  sortedStudents={sortedStudents}
                />
              );
            })}

            {/* Spacer row for virtual scrolling - bottom padding */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr>
                <td
                  colSpan={sortedSubjects.length + 9}
                  style={{
                    height: `${
                      rowVirtualizer.getTotalSize() -
                      (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)
                    }px`,
                  }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <GridFooter pasteMode={pasteMode} currentUserRole={currentUser?.role} />

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
