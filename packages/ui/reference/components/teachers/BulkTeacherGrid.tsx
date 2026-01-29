"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Save, AlertCircle, Loader2 } from "lucide-react";
import TeacherGridRow, { TeacherRowData } from "./TeacherGridRow";
import { BulkTeacherData, teachersApi } from "@/lib/api/teachers";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/useToast";
import { useData } from "@/context/DataContext";

interface BulkTeacherGridProps {
  subjects: any[];
  existingTeachers?: any[];
  onSave: (teachers: BulkTeacherData[]) => Promise<void>;
}

interface ColumnWidths {
  [key: string]: number;
}

const DEFAULT_WIDTHS: ColumnWidths = {
  rowNumber: 60,
  lastName: 150,
  firstName: 150,
  khmerName: 200,
  englishName: 200,
  phone: 120,
  email: 220,
  gender: 100,
  role: 140,
  dateOfBirth: 130,
  subjects: 250,
  teachingClasses: 250,
  homeroomClass: 150,
  actions: 80,
};

export default function BulkTeacherGrid({
  subjects,
  existingTeachers = [],
  onSave,
}: BulkTeacherGridProps) {
  const [rows, setRows] = useState<TeacherRowData[]>([]);
  const [saving, setSaving] = useState(false);
  const [columnWidths, setColumnWidths] =
    useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const { ToastContainer, success, error, warning, info } = useToast();
  const { classes: allClasses } = useData();

  // ✅ Initialize with existing teachers
  useEffect(() => {
    if (existingTeachers.length > 0) {
      console.log("📊 Loading existing teachers:", existingTeachers.length);

      const existingRows: TeacherRowData[] = existingTeachers.map((teacher) => {
        let gender: TeacherRowData["gender"] = "";
        if (teacher.gender === "MALE") gender = "ប";
        else if (teacher.gender === "FEMALE") gender = "ស";

        const subjectsStr =
          teacher.subjects?.map((s: any) => s.nameKh || s.name).join(", ") ||
          "";
        const teachingClassesStr =
          teacher.teachingClasses?.map((tc: any) => tc.name).join(", ") || "";
        const homeroomClassStr = teacher.homeroomClass?.name || "";

        const row: TeacherRowData = {
          id: teacher.id,
          lastName: teacher.lastName || "",
          firstName: teacher.firstName || "",
          khmerName: teacher.khmerName || "",
          englishName: teacher.englishName || "",
          email: teacher.email || "",
          phone: teacher.phone || "",
          gender,
          role: teacher.role || "TEACHER",
          dateOfBirth: teacher.dateOfBirth || "",
          hireDate: teacher.hireDate || "",
          address: teacher.address || "",
          position: teacher.position || "",
          subjects: subjectsStr,
          teachingClasses: teachingClassesStr,
          homeroomClass: homeroomClassStr,
          isValid: true,
          isExisting: true,
          hasChanges: false,
        };

        return row;
      });

      const emptyRows = Array.from({ length: 10 }, () => createEmptyRow());
      setRows([...existingRows, ...emptyRows]);
    } else {
      const initialRows = Array.from({ length: 10 }, () => createEmptyRow());
      setRows(initialRows);
    }
  }, [existingTeachers]);

  const createEmptyRow = (): TeacherRowData => ({
    id: uuidv4(),
    lastName: "",
    firstName: "",
    khmerName: "",
    englishName: "",
    email: "",
    phone: "",
    gender: "",
    role: "",
    dateOfBirth: "",
    hireDate: "",
    address: "",
    position: "",
    subjects: "",
    teachingClasses: "",
    homeroomClass: "",
    isValid: false,
    isExisting: false,
    hasChanges: false,
  });

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    setResizing(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizing) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(60, startWidth + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizing]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing, startX, startWidth]);

  const getTotalWidth = () => {
    return Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
  };

  const handleAddRows = (count: number = 10) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow());
    setRows((prev) => [...prev, ...newRows]);
  };

  const handleUpdateRow = (
    id: string,
    field: keyof TeacherRowData,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (row.isExisting) {
            updated.hasChanges = true;
          }
          return validateRow(updated);
        }
        return row;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const validateRow = (row: TeacherRowData): TeacherRowData => {
    const errors: TeacherRowData["errors"] = {};

    const safeTrim = (value: string | undefined | null): string => {
      return value?.trim() || "";
    };

    const khmerName = safeTrim(row.khmerName);
    const lastName = safeTrim(row.lastName);
    const firstName = safeTrim(row.firstName);
    const phone = safeTrim(row.phone);
    const email = safeTrim(row.email);

    const hasKhmerName = khmerName !== "";
    const hasLastName = lastName !== "";
    const hasFirstName = firstName !== "";

    if (!hasKhmerName && !hasLastName) {
      errors.lastName = "Required";
    }
    if (!hasKhmerName && !hasFirstName) {
      errors.firstName = "Required";
    }

    if (phone === "") {
      errors.phone = "Required";
    } else {
      const phoneRegex = /^[0-9]{8,15}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        errors.phone = "Invalid";
      }
    }

    if (email !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Invalid";
      }
    }

    if (row.role === "INSTRUCTOR") {
      const homeroomClass = safeTrim(row.homeroomClass);
      if (homeroomClass === "") {
        errors.homeroomClass = "Required";
      }
    }

    const isValid =
      Object.keys(errors).length === 0 &&
      phone !== "" &&
      (hasKhmerName || (hasLastName && hasFirstName));

    return { ...row, errors, isValid };
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();

    const pastedText = e.clipboardData.getData("text");
    const pastedRows = pastedText
      .split("\n")
      .map((line) => line.split("\t"))
      .filter((row) => row.some((cell) => cell?.trim()));

    if (pastedRows.length === 0) {
      warning("គ្មានទិន្នន័យដើម្បី paste!");
      return;
    }

    console.log("📋 Pasted rows:", pastedRows.length);

    const safeTrim = (value: string | undefined | null): string => {
      return value?.trim() || "";
    };

    // ✅ Define column order
    const columnOrder: (keyof TeacherRowData)[] = [
      "lastName",
      "firstName",
      "khmerName",
      "englishName",
      "phone",
      "email",
      "gender",
      "role",
      "dateOfBirth",
      "subjects",
      "teachingClasses",
      "homeroomClass",
    ];

    // ✅ Get the currently focused cell to determine starting column
    let startColumnIndex = 0;
    const activeElement = document.activeElement as HTMLInputElement;
    if (activeElement && activeElement.dataset?.field) {
      const focusedField = activeElement.dataset.field;
      const focusedIndex = columnOrder.indexOf(focusedField as keyof TeacherRowData);
      if (focusedIndex !== -1) {
        startColumnIndex = focusedIndex;
        console.log(`📍 Pasting from column: ${focusedField} (index ${startColumnIndex})`);
      }
    }

    // ✅ Get the starting row index from focused cell
    let startRowIndex = 0;
    if (activeElement && activeElement.dataset?.row) {
      startRowIndex = parseInt(activeElement.dataset.row, 10) || 0;
      console.log(`📍 Pasting from row: ${startRowIndex}`);
    }

    const newRows = pastedRows.map((cells, pastedRowIdx) => {
      // ✅ Create a row with default values
      const row: TeacherRowData = {
        id: uuidv4(),
        lastName: "",
        firstName: "",
        khmerName: "",
        englishName: "",
        email: "",
        phone: "",
        gender: "",
        role: "",
        dateOfBirth: "",
        hireDate: "",
        address: "",
        position: "",
        subjects: "",
        teachingClasses: "",
        homeroomClass: "",
        isValid: false,
        isExisting: false,
        hasChanges: false,
      };

      // ✅ Check if we're updating an existing row
      const targetRowIndex = startRowIndex + pastedRowIdx;
      if (targetRowIndex < rows.length) {
        const existingRow = rows[targetRowIndex];
        // Copy existing row data
        Object.assign(row, {
          id: existingRow.id,
          lastName: existingRow.lastName,
          firstName: existingRow.firstName,
          khmerName: existingRow.khmerName,
          englishName: existingRow.englishName,
          email: existingRow.email,
          phone: existingRow.phone,
          gender: existingRow.gender,
          role: existingRow.role,
          dateOfBirth: existingRow.dateOfBirth,
          hireDate: existingRow.hireDate,
          address: existingRow.address,
          position: existingRow.position,
          subjects: existingRow.subjects,
          teachingClasses: existingRow.teachingClasses,
          homeroomClass: existingRow.homeroomClass,
          isExisting: existingRow.isExisting,
          hasChanges: existingRow.hasChanges,
        });
      }

      // ✅ Fill columns starting from the focused column
      cells.forEach((cellValue, cellIndex) => {
        const targetColumnIndex = startColumnIndex + cellIndex;
        if (targetColumnIndex < columnOrder.length) {
          const fieldName = columnOrder[targetColumnIndex];

          // Parse special fields
          if (fieldName === "gender") {
            let parsedGender: TeacherRowData["gender"] = "";
            const g = safeTrim(cellValue).toUpperCase();
            if (["ប", "ប្រុស", "MALE", "M"].includes(g)) parsedGender = "ប";
            else if (["ស", "ស្រី", "FEMALE", "F"].includes(g)) parsedGender = "ស";
            row[fieldName] = parsedGender;
          } else if (fieldName === "role") {
            let parsedRole: TeacherRowData["role"] = "";
            const r = safeTrim(cellValue).toUpperCase();
            if (r.includes("INSTRUCTOR") || r.includes("ប្រចាំថ្នាក់")) {
              parsedRole = "INSTRUCTOR";
            } else if (r.includes("TEACHER") || r.includes("បង្រៀន")) {
              parsedRole = "TEACHER";
            }
            row[fieldName] = parsedRole;
          } else {
            (row[fieldName] as string) = safeTrim(cellValue);
          }
        }
      });

      // Mark as modified if updating existing row
      if (row.isExisting) {
        row.hasChanges = true;
      }

      return validateRow(row);
    });

    success(`📋 Paste បានជោគជ័យ ${newRows.length} ជួរ!`);

    setRows((prev) => {
      const updatedRows = [...prev];

      // ✅ Update or replace rows starting from the focused row
      newRows.forEach((newRow, idx) => {
        const targetIdx = startRowIndex + idx;
        if (targetIdx < updatedRows.length) {
          updatedRows[targetIdx] = newRow;
        } else {
          updatedRows.push(newRow);
        }
      });

      return updatedRows;
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    field: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow < rows.length) {
        const nextInput = document.querySelector(
          `input[data-row="${nextRow}"][data-field="${field}"]`
        ) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  };

  // ✅ ADD:  Helper function to find class ID by name
  const findClassIdByName = (
    className: string,
    allClasses: any[]
  ): string | undefined => {
    if (!className || !allClasses || allClasses.length === 0) return undefined;

    const cleanName = className.trim();
    const foundClass = allClasses.find(
      (c) =>
        c.name === cleanName ||
        c.name?.toLowerCase() === cleanName.toLowerCase()
    );

    if (foundClass) {
      console.log(`  ✅ Found class:  "${cleanName}" → ID: ${foundClass.id}`);
      return foundClass.id;
    }

    console.warn(`  ⚠️ Class not found: "${cleanName}"`);
    return undefined;
  };

  // ✅ ADD: Helper function to find subject IDs by names
  const findSubjectIdsByNames = (
    subjectsStr: string,
    allSubjects: any[]
  ): string[] => {
    if (!subjectsStr || !allSubjects || allSubjects.length === 0) return [];

    const subjectNames = subjectsStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    const subjectIds: string[] = [];

    for (const name of subjectNames) {
      const found = allSubjects.find(
        (s) =>
          s.name === name ||
          s.nameKh === name ||
          s.name?.toLowerCase() === name.toLowerCase() ||
          s.nameKh?.toLowerCase() === name.toLowerCase()
      );

      if (found) {
        subjectIds.push(found.id);
        console.log(`  ✅ Found subject: "${name}" → ID: ${found.id}`);
      } else {
        console.warn(`  ⚠️ Subject not found: "${name}"`);
      }
    }

    return subjectIds;
  };

  // ✅ ADD: Helper function to find class IDs by names
  const findClassIdsByNames = (
    classesStr: string,
    allClasses: any[]
  ): string[] => {
    if (!classesStr || !allClasses || allClasses.length === 0) return [];

    const classNames = classesStr
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c);
    const classIds: string[] = [];

    for (const name of classNames) {
      const found = allClasses.find(
        (c) => c.name === name || c.name?.toLowerCase() === name.toLowerCase()
      );

      if (found) {
        classIds.push(found.id);
        console.log(`  ✅ Found class: "${name}" → ID: ${found.id}`);
      } else {
        console.warn(`  ⚠️ Class not found:  "${name}"`);
      }
    }

    return classIds;
  };

  // ✅ UPDATED:   handleSave
  const handleSave = async () => {
    const newRows = rows.filter(
      (row) =>
        !row.isExisting &&
        (row.lastName || row.firstName || row.khmerName || row.phone)
    );

    const modifiedRows = rows.filter((row) => row.isExisting && row.hasChanges);

    if (newRows.length === 0 && modifiedRows.length === 0) {
      warning("គ្មានទិន្នន័យថ្មី ឬការកែប្រែដើម្បីរក្សាទុក!");
      return;
    }

    const invalidNew = newRows.filter((row) => !row.isValid);
    const invalidModified = modifiedRows.filter((row) => !row.isValid);

    if (invalidNew.length > 0 || invalidModified.length > 0) {
      error(
        `មានជួរ ${
          invalidNew.length + invalidModified.length
        } ដែលមានកំហុស!  សូមពិនិត្យមើលជួរដែលមានពណ៌ក្រហម។`
      );
      return;
    }

    setSaving(true);

    try {
      const safeTrim = (value: string | undefined | null): string => {
        return value?.trim() || "";
      };

      // ✅ Use classes from DataContext
      console.log(`📚 Using ${allClasses.length} classes from DataContext`);

      const convertRowToData = (row: TeacherRowData) => {
        let finalLastName = safeTrim(row.lastName);
        let finalFirstName = safeTrim(row.firstName);

        const khmerName = safeTrim(row.khmerName);
        if (khmerName && (!finalLastName || !finalFirstName)) {
          const parts = khmerName.split(/\s+/).filter((p) => p);

          if (parts.length >= 2) {
            finalLastName = parts[0];
            finalFirstName = parts.slice(1).join(" ");
          } else {
            finalLastName = khmerName;
            finalFirstName = khmerName;
          }

          console.log(
            `🔄 Auto-split "${khmerName}" → Last: "${finalLastName}", First:  "${finalFirstName}"`
          );
        }

        let gender: "MALE" | "FEMALE" = "MALE";
        const genderStr = safeTrim(row.gender);
        if (["ស", "ស្រី", "FEMALE", "F"].includes(genderStr.toUpperCase())) {
          gender = "FEMALE";
        }

        // ✅ Parse homeroom class name to ID
        let homeroomClassId: string | undefined = undefined;
        if (row.role === "INSTRUCTOR" && row.homeroomClass) {
          homeroomClassId = findClassIdByName(row.homeroomClass, allClasses);
          if (!homeroomClassId) {
            console.warn(`⚠️ Homeroom class not found: "${row.homeroomClass}"`);
          }
        }

        // ✅ Parse teaching classes names to IDs
        const teachingClassIds = row.teachingClasses
          ? findClassIdsByNames(row.teachingClasses, allClasses)
          : [];

        // ✅ Parse subjects names to IDs
        const subjectIds = row.subjects
          ? findSubjectIdsByNames(row.subjects, subjects)
          : [];

        return {
          firstName: finalFirstName,
          lastName: finalLastName,
          khmerName: khmerName || `${finalLastName} ${finalFirstName}`,
          englishName: safeTrim(row.englishName) || undefined,
          email: safeTrim(row.email) || "",
          phone: safeTrim(row.phone),
          gender,
          role: row.role || "TEACHER",
          dateOfBirth: safeTrim(row.dateOfBirth) || undefined,
          hireDate: safeTrim(row.hireDate) || undefined,
          address: safeTrim(row.address) || undefined,
          position: safeTrim(row.position) || undefined,
          // ✅ Send IDs instead of names
          subjectIds: subjectIds.length > 0 ? subjectIds : undefined,
          teachingClassIds:
            teachingClassIds.length > 0 ? teachingClassIds : undefined,
          homeroomClassId: homeroomClassId || undefined,
        };
      };

      let successCount = 0;
      let failCount = 0;
      const successfullyUpdatedIds = new Set<string>(); // Track successful updates

      // ✅ PROCESS NEW TEACHERS
      if (newRows.length > 0) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("➕ Creating NEW teachers:", newRows.length);

        const newTeacherData: BulkTeacherData[] = newRows.map(convertRowToData);

        try {
          await onSave(newTeacherData);
          successCount += newRows.length;
          console.log(`✅ Created ${newRows.length} new teachers`);
        } catch (err: any) {
          failCount += newRows.length;
          console.error("❌ Failed to create new teachers:", err);
          throw err;
        }
      }

      // ✅ PROCESS MODIFIED TEACHERS (BULK UPDATE for maximum speed)
      if (modifiedRows.length > 0) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✏️ Updating MODIFIED teachers:", modifiedRows.length);
        console.log("⚡ Using BULK UPDATE endpoint for maximum speed...");

        try {
          // Prepare bulk update payload
          const teachersToUpdate = modifiedRows.map((row) => ({
            id: row.id,
            ...convertRowToData(row),
          }));

          // Single bulk update request
          const bulkResult = await teachersApi.bulkUpdate(teachersToUpdate);

          // Process results
          const resultData = bulkResult.data || bulkResult;
          successCount += resultData.success || 0;
          failCount += resultData.failed || 0;

          // Track successful updates
          if (resultData.results?.success) {
            resultData.results.success.forEach((item: any) => {
              successfullyUpdatedIds.add(item.id);
            });
          }

          console.log(`⚡ Bulk update completed!`);
        } catch (err: any) {
          failCount += modifiedRows.length;
          console.error("❌ Bulk update failed:", err);
        }
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`✅ Success: ${successCount}`);
      console.log(`❌ Failed: ${failCount}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (successCount > 0) {
        success(
          `✅ រក្សាទុកបានជោគជ័យ ${successCount} គ្រូ! ${
            failCount > 0 ? ` (បរាជ័យ ${failCount})` : ""
          }`
        );
      }

      if (failCount > 0 && successCount === 0) {
        error(`❌ បរាជ័យក្នុងការរក្សាទុក ${failCount} គ្រូ! `);
      }

      // ✅ Update rows: Reset hasChanges for successfully updated rows, keep all existing rows
      setRows((prev) => {
        const updatedRows = prev
          .filter((r) => r.isExisting) // Keep all existing teachers
          .map((r) => {
            // Reset hasChanges flag for successfully updated rows
            if (successfullyUpdatedIds.has(r.id)) {
              return { ...r, hasChanges: false };
            }
            return r;
          });

        const emptyRows = Array.from({ length: 10 }, () => createEmptyRow());
        return [...updatedRows, ...emptyRows];
      });
    } catch (err: any) {
      console.error("❌ Save error:", err);
      error(`បរាជ័យក្នុងការរក្សាទុក:  ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const existingRowCount = rows.filter((row) => row.isExisting).length;
  const modifiedExistingCount = rows.filter(
    (row) => row.isExisting && row.hasChanges
  ).length;
  const newFilledRowCount = rows.filter(
    (row) =>
      !row.isExisting &&
      (row.lastName || row.firstName || row.khmerName || row.phone)
  ).length;
  const newValidRowCount = rows.filter(
    (row) =>
      !row.isExisting &&
      row.isValid &&
      (row.lastName || row.firstName || row.khmerName || row.phone)
  ).length;
  const totalToSave = newValidRowCount + modifiedExistingCount;

  return (
    <>
      <ToastContainer />

      <div className="space-y-4 w-full min-w-0">
        {/* Summary Bar */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-900">
                មានស្រាប់:{" "}
                <strong className="text-blue-700">{existingRowCount}</strong> •
                កែប្រែ:{" "}
                <strong className="text-orange-700">
                  {modifiedExistingCount}
                </strong>{" "}
                • ថ្មី:{" "}
                <strong className="text-emerald-700">
                  {newFilledRowCount}
                </strong>
              </p>
              <p className="text-xs text-green-700">
                ត្រឹមត្រូវ:{" "}
                <strong className="text-emerald-700">{newValidRowCount}</strong>{" "}
                • កំហុស:{" "}
                <strong className="text-red-600">
                  {newFilledRowCount - newValidRowCount}
                </strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || totalToSave === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                កំពុងរក្សាទុក...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                រក្សាទុក ({totalToSave})
              </>
            )}
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleAddRows(10)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            បន្ថែម 10 ជួរ
          </button>

          <div className="text-sm text-gray-600 flex items-center gap-4">
            <span>
              សរុប: <strong className="text-blue-600">{rows.length}</strong>
            </span>
            <span>•</span>
            <span>
              មានស្រាប់:{" "}
              <strong className="text-purple-600">{existingRowCount}</strong>
            </span>
            <span>•</span>
            <span>
              កែប្រែ:{" "}
              <strong className="text-orange-600">
                {modifiedExistingCount}
              </strong>
            </span>
            <span>•</span>
            <span>
              ថ្មី:{" "}
              <strong className="text-green-600">{newFilledRowCount}</strong>
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 របៀបប្រើប្រាស់: </p>
              <ol className="space-y-0.5 text-xs ml-4 list-decimal">
                <li>
                  ចុចលើក្រឡា → ចុច{" "}
                  <kbd className="px-1 py-0.5 bg-white border rounded">
                    Ctrl+V
                  </kbd>{" "}
                  paste ពី Excel
                </li>
                <li>
                  <strong>ឈ្មោះខ្មែរ: </strong> សរសេរឈ្មោះពេញ (គោត្តនាម នាម)
                  វានឹង split ស្វ័យប្រវត្តិ
                </li>
                <li>
                  <strong>English Name:</strong> ស្រេចចិត្ត (optional)
                </li>
                <li>
                  ចុច{" "}
                  <kbd className="px-1 py-0.5 bg-white border rounded">
                    Enter
                  </kbd>{" "}
                  ផ្លាស់ទីជួរ • អូស header resize columns
                </li>
              </ol>
              <p className="text-xs text-blue-700 mt-2 font-semibold border-t border-blue-200 pt-2">
                ⚠️ Required: Phone (*) + (ឈ្មោះខ្មែរ OR គោត្តនាម+នាម) |
                INSTRUCTOR → Homeroom (*)
              </p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm w-full min-w-0"
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table
              ref={tableRef}
              className="border-collapse"
              style={{
                width: `${getTotalWidth()}px`,
                minWidth: "100%",
              }}
            >
              <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 sticky top-0 z-20">
                <tr>
                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-gray-300 sticky left-0 z-30 bg-gray-100 relative group"
                    style={{
                      width: `${columnWidths.rowNumber}px`,
                      minWidth: `${columnWidths.rowNumber}px`,
                    }}
                  >
                    <div className="flex items-center justify-center">ល.រ</div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "rowNumber")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-pink-200 bg-pink-100 relative group"
                    style={{
                      width: `${columnWidths.lastName}px`,
                      minWidth: `${columnWidths.lastName}px`,
                    }}
                  >
                    <div>គោត្តនាម</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Last Name
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "lastName")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-pink-200 bg-pink-100 relative group"
                    style={{
                      width: `${columnWidths.firstName}px`,
                      minWidth: `${columnWidths.firstName}px`,
                    }}
                  >
                    <div>នាម</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      First Name
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "firstName")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-yellow-200 bg-yellow-100 relative group"
                    style={{
                      width: `${columnWidths.khmerName}px`,
                      minWidth: `${columnWidths.khmerName}px`,
                    }}
                  >
                    <div>ឈ្មោះខ្មែរ</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Khmer Name (Full)
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "khmerName")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-yellow-200 bg-yellow-100 relative group"
                    style={{
                      width: `${columnWidths.englishName}px`,
                      minWidth: `${columnWidths.englishName}px`,
                    }}
                  >
                    <div>ឈ្មោះអង់គ្លេស</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      English Name
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover: bg-blue-500 active: bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "englishName")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-green-200 bg-green-100 relative group"
                    style={{
                      width: `${columnWidths.phone}px`,
                      minWidth: `${columnWidths.phone}px`,
                    }}
                  >
                    <div>* ទូរស័ព្ទ</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Phone
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover: bg-blue-500 active: bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "phone")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-blue-200 bg-blue-100 relative group"
                    style={{
                      width: `${columnWidths.email}px`,
                      minWidth: `${columnWidths.email}px`,
                    }}
                  >
                    <div>អ៊ីមែល</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Email
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "email")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-purple-200 bg-purple-100 relative group"
                    style={{
                      width: `${columnWidths.gender}px`,
                      minWidth: `${columnWidths.gender}px`,
                    }}
                  >
                    <div>ភេទ</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Gender
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover: bg-blue-500 active: bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "gender")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-amber-200 bg-amber-100 relative group"
                    style={{
                      width: `${columnWidths.role}px`,
                      minWidth: `${columnWidths.role}px`,
                    }}
                  >
                    <div>តួនាទី</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Role
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "role")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-indigo-200 bg-indigo-100 relative group"
                    style={{
                      width: `${columnWidths.dateOfBirth}px`,
                      minWidth: `${columnWidths.dateOfBirth}px`,
                    }}
                  >
                    <div>ថ្ងៃខែឆ្នាំកំណើត</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      DOB
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "dateOfBirth")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-cyan-200 bg-cyan-100 relative group"
                    style={{
                      width: `${columnWidths.subjects}px`,
                      minWidth: `${columnWidths.subjects}px`,
                    }}
                  >
                    <div>មុខវិជ្ជា</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Subjects
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover: bg-blue-500 active: bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "subjects")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-teal-200 bg-teal-100 relative group"
                    style={{
                      width: `${columnWidths.teachingClasses}px`,
                      minWidth: `${columnWidths.teachingClasses}px`,
                    }}
                  >
                    <div>ថ្នាក់បង្រៀន</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Classes
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "teachingClasses")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-r border-orange-200 bg-orange-100 relative group"
                    style={{
                      width: `${columnWidths.homeroomClass}px`,
                      minWidth: `${columnWidths.homeroomClass}px`,
                    }}
                  >
                    <div>ថ្នាក់ប្រចាំ</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      Homeroom
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600"
                      onMouseDown={(e) => handleMouseDown(e, "homeroomClass")}
                    />
                  </th>

                  <th
                    className="px-3 py-3 text-xs font-bold text-gray-700 border-l border-gray-300 sticky right-0 z-30 bg-white shadow-[-2px_0_4px_rgba(0,0,0,0.1)]"
                    style={{
                      width: `${columnWidths.actions}px`,
                      minWidth: `${columnWidths.actions}px`,
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <TeacherGridRow
                    key={row.id}
                    row={row}
                    rowIndex={index}
                    onUpdate={handleUpdateRow}
                    onDelete={handleDeleteRow}
                    onKeyDown={handleKeyDown}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-koulen text-blue-600">
                {existingRowCount}
              </div>
              <div className="text-xs text-gray-600 font-semibold">
                មានស្រាប់
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-koulen text-orange-600">
                {modifiedExistingCount}
              </div>
              <div className="text-xs text-gray-600 font-semibold">កែប្រែ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-koulen text-green-600">
                {newFilledRowCount}
              </div>
              <div className="text-xs text-gray-600 font-semibold">ថ្មី</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-koulen text-emerald-600">
                {newValidRowCount}
              </div>
              <div className="text-xs text-gray-600 font-semibold">
                ត្រឹមត្រូវ
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-koulen text-red-600">
                {newFilledRowCount - newValidRowCount}
              </div>
              <div className="text-xs text-gray-600 font-semibold">
                មានកំហុស
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .custom-scrollbar: :-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 5px;
          }
          . custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #3b82f6, #6366f1);
            border-radius: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb: hover {
            background: linear-gradient(to bottom, #2563eb, #4f46e5);
          }
        `}</style>
      </div>
    </>
  );
}
