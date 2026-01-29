"use client";

import { useState, useEffect, useRef } from "react";
import StudentGridRow, { StudentRowData } from "./StudentGridRow";
import {
  Loader2,
  Save,
  Plus,
  RefreshCw,
  Info,
  CheckCircle2,
  GripVertical,
} from "lucide-react";
import { parseDate, formatToKhmerDate } from "@/lib/utils/dateParser";
import { studentsApi } from "@/lib/api/students";

interface BulkStudentGridProps {
  classId: string;
  grade: string;
  onSave: (students: StudentRowData[]) => Promise<void>;
}

interface ColumnHeader {
  key: string;
  label: string;
  width: number;
  required?: boolean;
  sticky?: boolean;
  color?: string;
}

export default function BulkStudentGrid({
  classId,
  grade,
  onSave,
}: BulkStudentGridProps) {
  const [rows, setRows] = useState<StudentRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [existingStudentsCount, setExistingStudentsCount] = useState(0);
  const [modifiedRows, setModifiedRows] = useState<Set<number>>(new Set());
  const [columnHeaders, setColumnHeaders] = useState<ColumnHeader[]>([]);
  const [resizing, setResizing] = useState<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (classId) {
      loadExistingStudents();
    }
  }, [classId]);

  useEffect(() => {
    // Initialize column headers with widths
    const headers = getInitialColumnHeaders();
    setColumnHeaders(headers);
  }, [grade]);

  useEffect(() => {
    const handleMultiRowPaste = (e: any) => {
      const { startRow, startField, data } = e.detail;
      handlePasteData(startRow, startField, data);
    };

    window.addEventListener("multiRowPaste", handleMultiRowPaste);
    return () =>
      window.removeEventListener("multiRowPaste", handleMultiRowPaste);
  }, [rows, grade]);

  // ✅ Column Resize Handlers
  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({
      index,
      startX: e.clientX,
      startWidth: columnHeaders[index].width,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;

    const diff = e.clientX - resizing.startX;
    const newWidth = Math.max(80, resizing.startWidth + diff);

    setColumnHeaders((prev) =>
      prev.map((col, i) =>
        i === resizing.index ? { ...col, width: newWidth } : col
      )
    );
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing]);

  const loadExistingStudents = async () => {
    try {
      setLoadingStudents(true);
      setSaveStatus("⚡ Loading existing students...");

      const response = await studentsApi.getAllLightweight(1, 10000, classId);
      const allStudents = response.success && Array.isArray(response.data) ? response.data : [];

      if (allStudents.length > 0) {
        const sortedClassStudents = [...allStudents].sort((a, b) => {
          let nameA = "";
          let nameB = "";

          if ((a as any).lastName || (a as any).firstName) {
            nameA = `${(a as any).lastName || ""} ${
              (a as any).firstName || ""
            }`.trim();
          } else if ((a as any).khmerName) {
            nameA = (a as any).khmerName;
          } else if (a.name) {
            nameA = a.name;
          }

          if ((b as any).lastName || (b as any).firstName) {
            nameB = `${(b as any).lastName || ""} ${
              (b as any).firstName || ""
            }`.trim();
          } else if ((b as any).khmerName) {
            nameB = (b as any).khmerName;
          } else if (b.name) {
            nameB = b.name;
          }

          return nameA.localeCompare(nameB, "en-US");
        });

        const studentRows: StudentRowData[] = sortedClassStudents.map(
          (student, index) => {
            let studentName = "";

            if ((student as any).lastName || (student as any).firstName) {
              studentName = `${(student as any).lastName || ""} ${
                (student as any).firstName || ""
              }`.trim();
            } else if ((student as any).khmerName) {
              studentName = (student as any).khmerName;
            } else if (student.name) {
              studentName = student.name;
            }

            return {
              no: index + 1,
              id: student.id,
              name: studentName,
              gender:
                student.gender === "male"
                  ? "ប"
                  : student.gender === "female"
                  ? "ស"
                  : student.gender || "",
              dateOfBirth: student.dateOfBirth
                ? formatToKhmerDate(student.dateOfBirth)
                : "",
              previousGrade: (student as any).previousGrade || "",
              previousSchool: (student as any).previousSchool || "",
              repeatingGrade: (student as any).repeatingGrade || "",
              transferredFrom: (student as any).transferredFrom || "",
              grade9ExamSession: (student as any).grade9ExamSession || "",
              grade9ExamCenter: (student as any).grade9ExamCenter || "",
              grade9ExamRoom: (student as any).grade9ExamRoom || "",
              grade9ExamDesk: (student as any).grade9ExamDesk || "",
              grade9PassStatus: (student as any).grade9PassStatus || "",
              grade12ExamSession: (student as any).grade12ExamSession || "",
              grade12ExamCenter: (student as any).grade12ExamCenter || "",
              grade12ExamRoom: (student as any).grade12ExamRoom || "",
              grade12ExamDesk: (student as any).grade12ExamDesk || "",
              grade12PassStatus: (student as any).grade12PassStatus || "",
              grade12Track: (student as any).grade12Track || "",
              remarks: (student as any).remarks || "",
              englishName: (student as any).englishName || "",
              email: (student as any).email || "",
              placeOfBirth: (student as any).placeOfBirth || "",
              currentAddress: (student as any).currentAddress || "",
              phoneNumber: (student as any).phoneNumber || "",
              fatherName: (student as any).fatherName || "",
              motherName: (student as any).motherName || "",
              parentPhone: (student as any).parentPhone || "",
              parentOccupation: (student as any).parentOccupation || "",
              photoUrl: (student as any).photoUrl || "",
            };
          }
        );

        setExistingStudentsCount(studentRows.length);
        const emptyRows = createEmptyRows(10, studentRows.length);
        setRows([...studentRows, ...emptyRows]);
        setModifiedRows(new Set());

        setSaveStatus(
          `✅ Loaded ${studentRows.length} existing students (sorted A-Z)`
        );
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setExistingStudentsCount(0);
        const emptyRows = createEmptyRows(10, 0);
        setRows(emptyRows);
        setSaveStatus(
          "ℹ️ No existing students found.  Ready to add new students."
        );
        setTimeout(() => setSaveStatus(""), 3000);
      }
    } catch (error: any) {
      console.error("❌ Failed to load students:", error);
      setSaveStatus(`❌ Failed to load students:  ${error.message}`);
      setTimeout(() => setSaveStatus(""), 5000);

      const emptyRows = createEmptyRows(10, 0);
      setRows(emptyRows);
    } finally {
      setLoadingStudents(false);
    }
  };

  const createEmptyRows = (
    count: number,
    startIndex: number
  ): StudentRowData[] => {
    const newRows: StudentRowData[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        no: startIndex + i + 1,
        name: "",
        gender: "",
        dateOfBirth: "",
        previousGrade: "",
        previousSchool: "",
        repeatingGrade: "",
        transferredFrom: "",
        remarks: "",
      });
    }
    return newRows;
  };

  const addEmptyRows = (count: number) => {
    const emptyRows = createEmptyRows(count, rows.length);
    setRows([...rows, ...emptyRows]);
  };

  const handleCellChange = (rowIndex: number, field: string, value: string) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };
    setRows(updatedRows);
    setModifiedRows((prev) => new Set(prev).add(rowIndex));
  };

  const handleDeleteRow = (rowIndex: number) => {
    const updatedRows = rows.filter((_, index) => index !== rowIndex);
    const renumbered = updatedRows.map((row, index) => ({
      ...row,
      no: index + 1,
    }));
    setRows(renumbered);

    if (rowIndex < existingStudentsCount) {
      setExistingStudentsCount((prev) => prev - 1);
    }

    setModifiedRows((prev) => {
      const updated = new Set(prev);
      updated.delete(rowIndex);
      return updated;
    });
  };

  const getFieldOrder = (grade: string): string[] => {
    const baseFields = [
      "name",
      "gender",
      "dateOfBirth",
      "previousGrade",
      "previousSchool",
      "repeatingGrade",
      "transferredFrom",
    ];

    const gradeNum = parseInt(grade);

    if (gradeNum >= 9) {
      baseFields.push(
        "grade9ExamSession",
        "grade9ExamCenter",
        "grade9ExamRoom",
        "grade9ExamDesk",
        "grade9PassStatus"
      );
    }

    if (gradeNum >= 12) {
      baseFields.push(
        "grade12ExamSession",
        "grade12ExamCenter",
        "grade12ExamRoom",
        "grade12ExamDesk",
        "grade12PassStatus",
        "grade12Track"
      );
    }

    baseFields.push(
      "remarks",
      "englishName",
      "email",
      "placeOfBirth",
      "currentAddress",
      "phoneNumber",
      "fatherName",
      "motherName",
      "parentPhone",
      "parentOccupation",
      "photoUrl"
    );

    return baseFields;
  };

  const handlePasteData = (
    startRow: number,
    startField: string,
    data: string[][]
  ) => {
    const updatedRows = [...rows];
    const requiredRows = startRow + data.length;

    if (requiredRows > rows.length) {
      const rowsToAdd = requiredRows - rows.length;
      const emptyRows = createEmptyRows(rowsToAdd, rows.length);
      updatedRows.push(...emptyRows);
    }

    const fields = getFieldOrder(grade);
    const startFieldIndex = fields.indexOf(startField);

    if (startFieldIndex === -1) {
      console.warn(`Field "${startField}" not found in field order`);
      return;
    }

    const newModified = new Set(modifiedRows);

    data.forEach((rowData, rowOffset) => {
      const rowIndex = startRow + rowOffset;
      if (rowIndex < updatedRows.length) {
        rowData.forEach((cellValue, colOffset) => {
          const fieldIndex = startFieldIndex + colOffset;
          if (fieldIndex < fields.length) {
            const fieldName = fields[fieldIndex];
            updatedRows[rowIndex] = {
              ...updatedRows[rowIndex],
              [fieldName]: cellValue || "",
            };
          }
        });
        newModified.add(rowIndex);
      }
    });

    setRows(updatedRows);
    setModifiedRows(newModified);
  };

  const splitKhmerName = (
    fullName: string
  ): { firstName: string; lastName: string } => {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0) {
      return { firstName: "", lastName: "" };
    } else if (parts.length === 1) {
      return { firstName: "", lastName: parts[0] };
    } else {
      const lastName = parts[0];
      const firstName = parts.slice(1).join(" ");
      return { firstName, lastName };
    }
  };

  const handleSave = async () => {
    const validRows = rows.filter(
      (row) =>
        row.name.trim() !== "" &&
        row.gender.trim() !== "" &&
        row.dateOfBirth.trim() !== ""
    );

    if (validRows.length === 0) {
      setSaveStatus("⚠️ No valid data to save");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    const errors: string[] = [];
    validRows.forEach((row) => {
      try {
        parseDate(row.dateOfBirth);
      } catch (error: any) {
        errors.push(`Row ${row.no}: ${error.message}`);
      }
    });

    if (errors.length > 0) {
      setSaveStatus(`❌ ${errors[0]}`);
      setTimeout(() => setSaveStatus(""), 5000);
      return;
    }

    setLoading(true);
    setSaveStatus("💾 Saving...");

    try {
      const existingStudents = validRows.filter(
        (row, index) => row.id && modifiedRows.has(index)
      );
      const newStudents = validRows.filter((row) => !row.id);

      console.log(
        `📊 Save Summary:  ${existingStudents.length} updates, ${newStudents.length} creates`
      );

      let updatedCount = 0;
      let createdCount = 0;

      if (existingStudents.length > 0) {
        setSaveStatus(
          `💾 Updating ${existingStudents.length} modified students...`
        );
        console.time("⏱️ Update Students");

        const updatePromises = existingStudents.map((student) => {
          const { firstName, lastName } = splitKhmerName(student.name);
          const khmerName = `${lastName} ${firstName}`.trim();

          const updateData: any = {
            firstName,
            lastName,
            khmerName,
            gender:
              student.gender === "ប"
                ? "male"
                : student.gender === "ស"
                ? "female"
                : student.gender,
            dateOfBirth: parseDate(student.dateOfBirth),
            previousGrade: student.previousGrade || "",
            previousSchool: student.previousSchool || "",
            repeatingGrade: student.repeatingGrade || "",
            transferredFrom: student.transferredFrom || "",
            remarks: student.remarks || "",
            englishName: student.englishName || "",
            email: student.email || "",
            placeOfBirth: student.placeOfBirth || "",
            currentAddress: student.currentAddress || "",
            phoneNumber: student.phoneNumber || "",
            fatherName: student.fatherName || "",
            motherName: student.motherName || "",
            parentPhone: student.parentPhone || "",
            parentOccupation: student.parentOccupation || "",
            photoUrl: student.photoUrl || "",
            grade9ExamSession: student.grade9ExamSession || "",
            grade9ExamCenter: student.grade9ExamCenter || "",
            grade9ExamRoom: student.grade9ExamRoom || "",
            grade9ExamDesk: student.grade9ExamDesk || "",
            grade9PassStatus: student.grade9PassStatus || "",
            grade12ExamSession: student.grade12ExamSession || "",
            grade12ExamCenter: student.grade12ExamCenter || "",
            grade12ExamRoom: student.grade12ExamRoom || "",
            grade12ExamDesk: student.grade12ExamDesk || "",
            grade12PassStatus: student.grade12PassStatus || "",
            grade12Track: student.grade12Track || "",
          };

          console.log(`🔄 Updating student ${student.id}: `, updateData);

          return studentsApi.update(student.id!, updateData).catch((error) => {
            console.error(`Failed to update student ${student.id}:`, error);
            return null;
          });
        });

        const results = await Promise.all(updatePromises);
        updatedCount = results.filter((r) => r !== null).length;

        console.timeEnd("⏱️ Update Students");
      }

      if (newStudents.length > 0) {
        setSaveStatus(`💾 Creating ${newStudents.length} new students...`);
        console.time("⏱️ Create Students");

        await onSave(newStudents);
        createdCount = newStudents.length;

        console.timeEnd("⏱️ Create Students");
      }

      const messages = [];
      if (updatedCount > 0) messages.push(`${updatedCount} updated`);
      if (createdCount > 0) messages.push(`${createdCount} created`);
      if (existingStudents.length === 0 && newStudents.length === 0) {
        messages.push("No changes detected");
      }

      setSaveStatus(`✅ Success:  ${messages.join(", ")}! `);

      setTimeout(() => {
        loadExistingStudents();
        setSaveStatus("");
      }, 2000);
    } catch (error: any) {
      setSaveStatus(`❌ Error: ${error.message}`);
      setTimeout(() => setSaveStatus(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getInitialColumnHeaders = (): ColumnHeader[] => {
    const baseHeaders: ColumnHeader[] = [
      { key: "no", label: "ល. រ", width: 80, sticky: true },
      { key: "name", label: "គោត្តនាម និង នាម", width: 250, required: true },
      { key: "gender", label: "ភេទ", width: 100, required: true },
      {
        key: "dateOfBirth",
        label: "ថ្ងៃខែឆ្នាំកំណើត",
        width: 150,
        required: true,
      },
      { key: "previousGrade", label: "ឡើងពីថ្នាក់", width: 120 },
      { key: "previousSchool", label: "មកពីសាលា", width: 200 },
      { key: "repeatingGrade", label: "ត្រួតថ្នាក់ទី", width: 120 },
      { key: "transferredFrom", label: "ផ្ទេរមកពី", width: 180 },
    ];

    const gradeNum = parseInt(grade);

    if (gradeNum >= 9) {
      baseHeaders.push(
        { key: "grade9ExamSession", label: "វគ្គប្រឡងទី៩", width: 130 },
        { key: "grade9ExamCenter", label: "មណ្ឌលប្រឡងទី៩", width: 200 },
        { key: "grade9ExamRoom", label: "បន្ទប់", width: 100 },
        { key: "grade9ExamDesk", label: "លេខតុ", width: 100 },
        { key: "grade9PassStatus", label: "ស្ថានភាពប្រឡង", width: 150 }
      );
    }

    if (gradeNum >= 12) {
      baseHeaders.push(
        { key: "grade12ExamSession", label: "វគ្គប្រឡងទី១២", width: 130 },
        { key: "grade12ExamCenter", label: "មណ្ឌលប្រឡងទី១២", width: 200 },
        { key: "grade12ExamRoom", label: "បន្ទប់", width: 100 },
        { key: "grade12ExamDesk", label: "លេខតុ", width: 100 },
        { key: "grade12PassStatus", label: "ស្ថានភាពប្រឡង", width: 150 },
        { key: "grade12Track", label: "ផ្លូវ", width: 130 }
      );
    }

    baseHeaders.push(
      { key: "remarks", label: "ផ្សេងៗ", width: 200 },
      { key: "englishName", label: "ឈ្មោះអង់គ្លេស", width: 200 },
      { key: "email", label: "អ៊ីមែល", width: 220 },
      { key: "placeOfBirth", label: "ទីកន្លែងកំណើត", width: 160 },
      { key: "currentAddress", label: "អាសយដ្ឋានបច្ចុប្បន្ន", width: 220 },
      { key: "phoneNumber", label: "លេខទូរស័ព្ទ", width: 130 },
      { key: "fatherName", label: "ឈ្មោះឪពុក", width: 200 },
      { key: "motherName", label: "ឈ្មោះម្តាយ", width: 200 },
      { key: "parentPhone", label: "លេខទូរស័ព្ទអាណាព្យាបាល", width: 180 },
      { key: "parentOccupation", label: "មុខរបរអាណាព្យាបាល", width: 180 },
      { key: "photoUrl", label: "រូបថត URL", width: 240 },
      { key: "actions", label: "ACTIONS", width: 100, sticky: true }
    );

    return baseHeaders;
  };

  return (
    <div className="space-y-4 w-full max-w-full">
      {existingStudentsCount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-emerald-900 mb-0. 5">
                រកឃើញសិស្សដែលមានរួចហើយ{" "}
                <span className="text-emerald-600">
                  {existingStudentsCount} នាក់
                </span>
                {modifiedRows.size > 0 && (
                  <span className="ml-2 text-orange-600">
                    • {modifiedRows.size} កែប្រែ
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-700">
                ទ្រង់ទ្រាយឈ្មោះ: <strong>គោត្តនាម នាមខ្លួន</strong> (ឧ. ស៊ុន
                សុខា) • បំបែកស្វ័យប្រវត្តិពេល Save
              </p>
            </div>
            <button
              onClick={loadExistingStudents}
              disabled={loadingStudents}
              className="flex-shrink-0 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingStudents ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">ផ្ទុកឡើងវិញ</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => addEmptyRows(10)}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              បន្ថែម 10 ជួរ
            </button>

            <div className="h-10 px-4 bg-gray-50 border rounded-lg flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">សរុប: </span>
              <span className="text-base font-bold text-gray-900">
                {rows.length}
              </span>
              <span className="text-xs text-gray-500">ជួរ</span>
              {existingStudentsCount > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-semibold text-blue-600">
                    {existingStudentsCount} ចាស់
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
            {saveStatus && (
              <div className="h-10 px-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Loader2 className="w-3. 5 h-3.5 animate-spin flex-shrink-0" />
                <span className="truncate">{saveStatus}</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={loading || loadingStudents}
              className="h-10 px-5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  កំពុងរក្សាទុក...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  រក្សាទុកទាំងអស់
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-blue-900 mb-2">
              💡 របៀបប្រើប្រាស់
            </h4>
            <div className="grid grid-cols-1 md: grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>ឈ្មោះ: គោត្តនាម នាមខ្លួន (ឧ. ស៊ុន សុខា)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                <span>ចុច Enter = លោតទៅ cell ខាងក្រោម</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Paste Excel (Ctrl+V) = រហ័ស</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  4
                </span>
                <span>ទាញគែមស្តាំ header ដើម្បី resize column</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loadingStudents ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-semibold">
            កំពុងផ្ទុកទិន្នន័យសិស្ស...
          </p>
          <p className="text-xs text-gray-500 mt-1">សូមរង់ចាំបន្តិច</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div
            className="overflow-auto"
            style={{
              maxHeight: "calc(100vh - 320px)",
              maxWidth: "100%",
              scrollbarWidth: "thin",
              scrollbarColor: "#3b82f6 #f3f4f6",
            }}
          >
            <table ref={tableRef} className="w-full border-collapse">
            <thead className="sticky top-0 z-20 shadow-md">
              <tr className="bg-pink-50">
                {columnHeaders.map((header, index) => (
                  <th
                    key={header.key}
                    style={{
                      width: `${header.width}px`,
                      minWidth: `${header.width}px`,
                      fontFamily: "Koulen, sans-serif",
                    }}
                    className={`
                      relative border border-gray-300 p-3 text-sm font-semibold text-gray-700
                      ${
                        header.sticky && header.key === "no"
                          ? "sticky left-0 z-10 bg-pink-50"
                          : ""
                      }
                      ${
                        header.sticky && header.key === "actions"
                          ? "sticky right-0 z-10 bg-pink-50"
                          : ""
                      }
                    `}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {header.required && (
                        <span className="text-red-500 text-sm font-black">
                          *
                        </span>
                      )}
                      <span>{header.label}</span>
                    </div>

                    {/* ✅ Resize Handle */}
                    {!header.sticky && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group"
                        onMouseDown={(e) => handleMouseDown(index, e)}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={16} className="text-blue-600" />
                        </div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <StudentGridRow
                  key={row.id || `new-${index}`}
                  rowIndex={index}
                  data={row}
                  grade={grade}
                  onChange={handleCellChange}
                  onDelete={handleDeleteRow}
                  isExisting={!!row.id}
                  columnHeaders={columnHeaders}
                  inputRefs={inputRefs}
                  totalRows={rows.length}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
