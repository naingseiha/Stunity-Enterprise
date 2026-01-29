"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  BookOpen,
  Calendar,
  Users,
  Shield,
  FileText,
  Save,
  X,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import MobileLayout from "@/components/layout/MobileLayout";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { gradeApi, type GradeGridData } from "@/lib/api/grades";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";
import ScoreReportTemplate from "./ScoreReportTemplate";
import { StudentScoreCard } from "./StudentScoreCard";

interface Subject {
  id: string;
  nameKh: string;
  nameEn: string;
  code: string;
  maxScore: number;
  coefficient: number;
  isEditable?: boolean;
}

interface StudentGrade {
  studentId: string;
  khmerName: string;
  firstName: string;
  lastName: string;
  gender: string;
  rollNumber?: number;
  score: number | null;
  maxScore: number;
}

const MONTHS = [
  { value: "មករា", label: "មករា", number: 1 },
  { value: "កុម្ភៈ", label: "កុម្ភៈ", number: 2 },
  { value: "មីនា", label: "មីនា", number: 3 },
  { value: "មេសា", label: "មេសា", number: 4 },
  { value: "ឧសភា", label: "ឧសភា", number: 5 },
  { value: "មិថុនា", label: "មិថុនា", number: 6 },
  { value: "កក្កដា", label: "កក្កដា", number: 7 },
  { value: "សីហា", label: "សីហា", number: 8 },
  { value: "កញ្ញា", label: "កញ្ញា", number: 9 },
  { value: "តុលា", label: "តុលា", number: 10 },
  { value: "វិច្ឆិកា", label: "វិច្ឆិកា", number: 11 },
  { value: "ធ្នូ", label: "ធ្នូ", number: 12 },
];

// Get current Khmer month
const getCurrentKhmerMonth = () => {
  const monthNumber = new Date().getMonth() + 1; // 1-12
  const month = MONTHS.find((m) => m.number === monthNumber);
  return month?.value || "មករា";
};

interface MobileGradeEntryProps {
  classId?: string;
  month?: string;
  year?: number;
}

export default function MobileGradeEntry({
  classId: propClassId,
  month: propMonth,
  year: propYear,
}: MobileGradeEntryProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { classes, isLoadingClasses, refreshClasses } = useData();
  const { currentUser, isLoading: authLoading, isVerifyingWithServer } = useAuth();
  const searchParams = useSearchParams();

  // ✅ Read classId from URL params or props
  const urlClassId = searchParams?.get("classId");
  const initialClassId = urlClassId || propClassId || "";

  const [selectedClass, setSelectedClass] = useState(initialClassId);
  const [selectedMonth, setSelectedMonth] = useState(
    propMonth || getCurrentKhmerMonth(),
  ); // ✅ Auto-select current month
  const [selectedYear, setSelectedYear] = useState(
    propYear || getCurrentAcademicYear(),
  );
  const [selectedSubject, setSelectedSubject] = useState("");

  const [gridData, setGridData] = useState<GradeGridData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ✅ Manual save state (no auto-save)
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ✅ Unsaved changes warning
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);
  const [verificationDiscrepancies, setVerificationDiscrepancies] = useState<
    Set<string>
  >(new Set());
  const [incompleteScores, setIncompleteScores] = useState<Set<string>>(
    new Set(),
  );
  const [incompleteCount, setIncompleteCount] = useState(0);

  // ✅ NEW: Confirmation state
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState<Date | null>(null);
  const [confirmations, setConfirmations] = useState<
    Map<
      string,
      {
        id: string;
        confirmedBy: string;
        confirmedAt: Date;
      }
    >
  >(new Map());

  // ✅ NEW: Export state
  const [isExporting, setIsExporting] = useState(false);
  const exportReportRef = useRef<HTMLDivElement>(null);

  // ✅ Load classes if empty - ensure this runs on mount and when auth is ready
  // Add a forced refresh on component mount to handle PWA first-load issues
  const mountedRef = useRef(false);
  const classLoadAttempts = useRef(0);
  const MAX_LOAD_ATTEMPTS = 3;
  
  useEffect(() => {
    if (!authLoading && !isVerifyingWithServer && currentUser && classLoadAttempts.current < MAX_LOAD_ATTEMPTS) {
      if (!mountedRef.current) {
        // Force refresh on first mount
        console.log("📚 MobileGradeEntry: First mount, forcing class refresh...");
        mountedRef.current = true;
        classLoadAttempts.current++;
        refreshClasses();
      } else if (classes.length === 0 && !isLoadingClasses) {
        // Retry if classes are still empty (with exponential backoff)
        console.log(`📚 MobileGradeEntry: Classes empty after mount, retrying (attempt ${classLoadAttempts.current + 1})...`);
        classLoadAttempts.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, classLoadAttempts.current - 1), 5000);
        setTimeout(() => {
          if (classes.length === 0 && !isLoadingClasses) {
            refreshClasses();
          }
        }, retryDelay);
      }
    }
  }, [authLoading, isVerifyingWithServer, currentUser, classes.length, isLoadingClasses, refreshClasses]);

  // ✅ Auto-load data when class is pre-selected from URL/props
  useEffect(() => {
    if (
      initialClassId &&
      classes.length > 0 &&
      !dataLoaded &&
      !loading &&
      currentUser
    ) {
      handleLoadData();
    }
  }, [initialClassId, classes.length, currentUser]);

  const availableClasses = useMemo(() => {
    console.log("🔄 MobileGradeEntry: Recalculating availableClasses", {
      currentUser: currentUser?.role,
      classesLength: classes.length,
      isLoadingClasses,
      authLoading,
      isVerifyingWithServer
    });
    
    // Wait for auth and classes to finish loading
    // IMPORTANT: Also wait for server verification to complete to ensure full user data
    if (authLoading || isLoadingClasses || isVerifyingWithServer) {
      console.log("⏳ Still loading auth, classes, or verifying with server...");
      return [];
    }
    
    if (!currentUser) {
      console.log("❌ No current user");
      return [];
    }

    if (currentUser.role === "ADMIN") {
      console.log("👨‍💼 Admin user - showing all classes:", classes.length);
      return classes;
    }

    if (currentUser.role === "TEACHER") {
      const classIdsSet = new Set<string>();

      if (currentUser.teacher?.teacherClasses) {
        currentUser.teacher.teacherClasses.forEach((tc: any) => {
          const classId = tc.classId || tc.class?.id;
          if (classId) classIdsSet.add(classId);
        });
      }

      if (currentUser.teacher?.homeroomClassId) {
        classIdsSet.add(currentUser.teacher.homeroomClassId);
      }

      const teacherClassIds = Array.from(classIdsSet);
      const filtered = classes.filter((c) => teacherClassIds.includes(c.id));
      console.log("👨‍🏫 Teacher available classes:", filtered.length, "out of", classes.length);
      return filtered;
    }

    return [];
  }, [currentUser, classes, isLoadingClasses, authLoading, isVerifyingWithServer]);

  const teacherEditableSubjects = useMemo(() => {
    if (!currentUser) return new Set<string>();
    if (currentUser.role === "ADMIN") return new Set<string>();

    if (currentUser.role === "TEACHER") {
      const subjectTeachers = currentUser.teacher?.subjectTeachers || [];
      const subjectCodes = subjectTeachers
        .map((st: any) => {
          const code = st.subject?.code;
          return code ? code.split("-")[0] : null;
        })
        .filter((code: string | null): code is string => code !== null);

      return new Set(subjectCodes);
    }

    return new Set<string>();
  }, [currentUser]);

  const teacherHomeroomClassId = useMemo(() => {
    if (currentUser?.role === "TEACHER") {
      return currentUser.teacher?.homeroomClassId || null;
    }
    return null;
  }, [currentUser]);

  // ✅ Calculate current subject early for export functions
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubject);
  }, [subjects, selectedSubject]);

  const handleLoadData = async () => {
    if (!selectedClass || !currentUser) {
      alert("សូមជ្រើសរើសថ្នាក់សិន • Please select a class first");
      return;
    }

    // ✅ Check for unsaved changes before loading new data
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        // Load data after user confirms
        setHasUnsavedChanges(false);
        handleLoadData();
      });
      setShowUnsavedWarning(true);
      return;
    }

    setLoading(true);
    setError(null);
    setGridData(null);
    setSubjects([]);
    setStudents([]);
    setSelectedSubject("");
    setDataLoaded(false);
    setHasUnsavedChanges(false); // Reset unsaved changes
    // ✅ Reset confirmation when loading new data
    setIsConfirmed(false);
    setConfirmedAt(null);

    try {
      const data = await gradeApi.getGradesGrid(
        selectedClass,
        selectedMonth,
        selectedYear,
      );

      if (currentUser.role === "ADMIN") {
        data.subjects = data.subjects.map((subject) => ({
          ...subject,
          isEditable: true,
        }));
      } else if (currentUser.role === "TEACHER") {
        // ✅ UPDATED: INSTRUCTOR can only edit subjects they teach (same as regular teacher)
        // No special privileges for homeroom class anymore
        data.subjects = data.subjects.map((subject) => {
          const baseCode = subject.code?.split("-")[0];
          const isEditable = baseCode
            ? teacherEditableSubjects.has(baseCode)
            : false;

          return {
            ...subject,
            isEditable,
          };
        });
      }

      const editableSubjects = data.subjects.filter((s) => s.isEditable);

      if (editableSubjects.length === 0) {
        setError(
          "អ្នកមិនមានសិទ្ធិបញ្ចូលពិន្ទុសម្រាប់ថ្នាក់នេះទេ • You don't have permission to enter grades for this class",
        );
        setLoading(false);
        return;
      }

      setGridData(data);
      setSubjects(editableSubjects);
      setDataLoaded(true);

      if (editableSubjects.length === 1) {
        setSelectedSubject(editableSubjects[0].id);
      }

      // ✅ Fetch confirmations after loading grid data
      try {
        const confirmationsData = await gradeApi.getConfirmations(
          selectedClass,
          selectedMonth,
          selectedYear,
        );

        // Convert array to Map for quick lookup
        const confirmationMap = new Map(
          confirmationsData.map((conf) => [
            conf.subjectId,
            {
              id: conf.id,
              confirmedBy: conf.confirmedBy,
              confirmedAt: conf.confirmedAt,
            },
          ]),
        );

        setConfirmations(confirmationMap);
      } catch (error: any) {
        console.error("Error loading confirmations:", error);
        setConfirmations(new Map());
      }
    } catch (err: any) {
      console.error("Error loading grades:", err);
      setError(err.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load students when gridData or selectedSubject changes
  useEffect(() => {
    if (!gridData || !selectedSubject) {
      setStudents([]);
      return;
    }

    const subject = subjects.find((s) => s.id === selectedSubject);
    if (!subject) return;

    const studentGrades: StudentGrade[] = gridData.students.map((student) => {
      const gradeData = student.grades[selectedSubject];
      return {
        studentId: student.studentId,
        khmerName: student.studentName,
        firstName: "",
        lastName: "",
        gender: student.gender,
        rollNumber: undefined,
        score:
          gradeData?.score !== undefined && gradeData?.score !== null
            ? gradeData.score
            : null,
        maxScore: subject.maxScore,
      };
    });

    setStudents(studentGrades);
  }, [gridData, selectedSubject, subjects]);

  // ✅ Separate effect for confirmation status (doesn't affect students state)
  useEffect(() => {
    if (!selectedSubject) return;

    const confirmation = confirmations.get(selectedSubject);
    if (confirmation) {
      setIsConfirmed(true);
      setConfirmedAt(new Date(confirmation.confirmedAt));
    } else {
      setIsConfirmed(false);
      setConfirmedAt(null);
    }
  }, [selectedSubject, confirmations]);

  // ✅ Manual Save All function
  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedChanges) {
      // No changes to save
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      return;
    }

    if (!selectedClass || !selectedSubject) {
      alert("សូមជ្រើសរើសថ្នាក់ និងមុខវិជ្ជាសិន");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      // ✅ Only save students that have scores (not null/blank)
      // If score is null, we skip it (don't create/update)
      const gradesToSave = students
        .filter((student) => student.score !== null)
        .map((student) => ({
          studentId: student.studentId,
          subjectId: selectedSubject,
          score: student.score!,
        }));

      // If no scores to save, just mark as saved
      if (gradesToSave.length === 0) {
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }

      await gradeApi.bulkSaveGrades(
        selectedClass,
        selectedMonth,
        selectedYear,
        gradesToSave,
      );

      // Success!
      setHasUnsavedChanges(false);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

      // Execute pending action if exists (navigation after save)
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`មានបញ្ហាក្នុងការរក្សាទុក: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    hasUnsavedChanges,
    selectedClass,
    selectedSubject,
    selectedMonth,
    selectedYear,
    students,
    pendingAction,
  ]);

  // ✅ Handle score change - MANUAL SAVE ONLY
  const handleScoreChange = useCallback(
    (studentId: string, value: string, maxScore: number) => {
      // Parse and validate the score
      let score: number | null = null;

      if (value !== "") {
        const parsed = parseFloat(value);
        // Ensure valid number (not NaN) and within range
        if (!isNaN(parsed) && parsed >= 0 && parsed <= maxScore) {
          score = parsed;
        } else if (!isNaN(parsed) && parsed > maxScore) {
          // Invalid: exceeds max score, don't update
          return;
        } else {
          // Invalid input (NaN), don't update
          return;
        }
      }

      // Update local state immediately
      setStudents((prev) =>
        prev.map((student) =>
          student.studentId === studentId ? { ...student, score } : student,
        ),
      );

      // ✅ Mark as unsaved (NO AUTO-SAVE)
      setHasUnsavedChanges(true);

      // ✅ Reset confirmation when scores change
      setIsConfirmed(false);
      setConfirmedAt(null);
      // ✅ Remove from confirmations Map since scores changed
      if (selectedSubject) {
        setConfirmations((prev) => {
          const updated = new Map(prev);
          updated.delete(selectedSubject);
          return updated;
        });
      }
    },
    [selectedSubject],
  );

  // ✅ No auto-save on blur - user must click Save All button

  // ✅ Verify scores - reload from database and compare
  const handleVerifyScores = useCallback(async () => {
    if (!selectedClass || !selectedSubject || !gridData) {
      return;
    }

    // Check for unsaved changes first
    if (hasUnsavedChanges) {
      alert("សូមរក្សាទុកការផ្លាស់ប្តូរសិន • Please save changes first");
      return;
    }

    setIsVerifying(true);
    setVerificationDiscrepancies(new Set());
    setIncompleteScores(new Set());
    setIncompleteCount(0);

    try {
      // Reload fresh data from database
      const freshData = await gradeApi.getGradesGrid(
        selectedClass,
        selectedMonth,
        selectedYear,
      );

      const discrepancies = new Set<string>();
      const incomplete = new Set<string>();
      let incompleteCounter = 0;

      // Compare fresh data with current state
      students.forEach((currentStudent) => {
        const freshStudent = freshData.students.find(
          (s) => s.studentId === currentStudent.studentId,
        );

        if (freshStudent) {
          const freshGrade = freshStudent.grades[selectedSubject];
          const freshScore =
            freshGrade?.score !== undefined && freshGrade?.score !== null
              ? freshGrade.score
              : null;

          // Check if there's a discrepancy
          if (freshScore !== currentStudent.score) {
            discrepancies.add(currentStudent.studentId);
          }

          // ✅ NEW: Check for blank/incomplete scores (null, but not 0)
          if (freshScore === null) {
            incomplete.add(currentStudent.studentId);
            incompleteCounter++;
          }
        }
      });

      // Update students with fresh database values
      const subject = subjects.find((s) => s.id === selectedSubject);
      if (subject) {
        const verifiedStudents: StudentGrade[] = freshData.students.map(
          (student) => {
            const gradeData = student.grades[selectedSubject];
            return {
              studentId: student.studentId,
              khmerName: student.studentName,
              firstName: "",
              lastName: "",
              gender: student.gender,
              rollNumber: undefined,
              score:
                gradeData?.score !== undefined && gradeData?.score !== null
                  ? gradeData.score
                  : null,
              maxScore: subject.maxScore,
            };
          },
        );

        setStudents(verifiedStudents);
        setVerificationDiscrepancies(discrepancies);
        setIncompleteScores(incomplete);
        setIncompleteCount(incompleteCounter);
        setVerifiedAt(new Date());

        // Clear indicators after 5 seconds
        setTimeout(() => {
          setVerificationDiscrepancies(new Set());
          setIncompleteScores(new Set());
        }, 5000);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      alert(`មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  }, [
    selectedClass,
    selectedSubject,
    selectedMonth,
    selectedYear,
    gridData,
    students,
    subjects,
    hasUnsavedChanges,
  ]);

  // ✅ Handle confirmation
  const handleConfirmScores = useCallback(async () => {
    // Check if there are any unsaved changes
    if (hasUnsavedChanges || saving) {
      alert("សូមរក្សាទុកការផ្លាស់ប្តូរសិន • Please save changes first");
      return;
    }

    // Check if all students have scores
    const emptyScores = students.filter((s) => s.score === null);
    if (emptyScores.length > 0) {
      const proceed = confirm(
        `មានសិស្ស ${emptyScores.length} នាក់ មិនទាន់បញ្ចូលពិន្ទុ។ តើអ្នកចង់បន្តយ៉ាងណា?\n\nThere are ${emptyScores.length} students without scores. Do you want to continue anyway?`,
      );
      if (!proceed) {
        return;
      }
    }

    // ✅ Call confirmation API
    try {
      if (!currentUser?.id) {
        alert("មិនអាចបញ្ជាក់បាន • Cannot confirm: User not found");
        return;
      }

      if (!selectedClass || !selectedSubject) {
        alert("មិនអាចបញ្ជាក់បាន • Cannot confirm: Missing class or subject");
        return;
      }

      // Show loading state
      setIsVerifying(true);

      const confirmationResult = await gradeApi.confirmGrades(
        selectedClass,
        selectedSubject,
        selectedMonth,
        selectedYear,
        currentUser.id,
      );

      // ✅ Update confirmations Map
      setConfirmations((prev) => {
        const updated = new Map(prev);
        updated.set(selectedSubject, {
          id: confirmationResult.id,
          confirmedBy: confirmationResult.confirmedBy,
          confirmedAt: confirmationResult.confirmedAt,
        });
        return updated;
      });

      // Mark as confirmed
      setIsConfirmed(true);
      setConfirmedAt(new Date(confirmationResult.confirmedAt));
      setShowReviewModal(false);
      setIsVerifying(false);

      // Show success message
      setTimeout(() => {
        alert("ពិន្ទុត្រូវបានបញ្ជាក់ ✓\nScores confirmed successfully!");
      }, 300);
    } catch (error: any) {
      setIsVerifying(false);
      console.error("Confirmation error:", error);
      alert(
        `មានបញ្ហាក្នុងការបញ្ជាក់ពិន្ទុ • Error confirming scores:\n${error.message}`,
      );
    }
  }, [
    students,
    hasUnsavedChanges,
    saving,
    currentUser,
    selectedClass,
    selectedSubject,
    selectedMonth,
    selectedYear,
  ]);

  // ✅ NEW: Export as PDF (Optimized with multi-page support)
  const exportAsPDF = useCallback(async () => {
    if (!exportReportRef.current || !currentSubject || !gridData) return;

    setIsExporting(true);
    try {
      // Wait for fonts and images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use lower scale and JPEG for smaller file size
      const canvas = await html2canvas(exportReportRef.current, {
        scale: 1.2, // Reduced from 2 to 1.2 for smaller file size
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });

      // Use JPEG with quality setting for much smaller file size
      const imgData = canvas.toDataURL("image/jpeg", 0.85); // JPEG at 85% quality

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Calculate how many pages we need
      const imgWidth = pdfWidth;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
      let heightLeft = imgHeight;
      let position = 0;
      let page = 1;

      // Add first page
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if content is too long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        page++;
      }

      const fileName = `${gridData.className}_${currentSubject.code}_${selectedMonth}_${selectedYear}.pdf`;

      // Get PDF as blob
      const pdfBlob = pdf.output("blob");
      const fileSizeKB = (pdfBlob.size / 1024).toFixed(0);
      console.log(`PDF generated: ${fileSizeKB}KB, ${page} page(s)`);

      // Try Web Share API first
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([pdfBlob], fileName, {
            type: "application/pdf",
          });
          const shareData = {
            title: `${gridData.className} - ${currentSubject.nameKh}`,
            text: `ពិន្ទុ ${currentSubject.nameKh} - ${selectedMonth} ${selectedYear}`,
            files: [file],
          };

          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setIsExporting(false);
            return;
          }
        } catch (error: any) {
          // User cancelled or error - fall through to download
          if (error.name !== "AbortError") {
            console.log("Share failed, falling back to download");
          }
        }
      }

      // Fallback: Download PDF
      pdf.save(fileName);
      alert(
        `✓ PDF រក្សាទុករួច (${fileSizeKB}KB, ${page} ទំព័រ)\nPDF saved successfully (${fileSizeKB}KB, ${page} page(s))!`,
      );
      setIsExporting(false);
    } catch (error: any) {
      console.error("PDF export error:", error);
      alert(`មានបញ្ហា: ${error.message}`);
      setIsExporting(false);
    }
  }, [currentSubject, gridData, selectedMonth, selectedYear]);

  // ✅ Auto-hide verification banner after 5 seconds
  useEffect(() => {
    if (verifiedAt) {
      const timer = setTimeout(() => {
        setVerifiedAt(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [verifiedAt]);

  // ✅ Auto-hide confirmation success after 5 seconds
  useEffect(() => {
    if (confirmedAt) {
      const timer = setTimeout(() => {
        setConfirmedAt(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [confirmedAt]);

  // ✅ Navigation handlers with unsaved changes warning
  const handleMonthChange = (newMonth: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedMonth(newMonth);
        setStudents([]);
        setDataLoaded(false);
        setHasUnsavedChanges(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedMonth(newMonth);
      setStudents([]);
      setDataLoaded(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedYear(newYear);
        setStudents([]);
        setDataLoaded(false);
        setHasUnsavedChanges(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedYear(newYear);
      setStudents([]);
      setDataLoaded(false);
    }
  };

  const handleClassChange = (newClassId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedClass(newClassId);
        setSelectedSubject("");
        setStudents([]);
        setDataLoaded(false);
        setHasUnsavedChanges(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedClass(newClassId);
      setSelectedSubject("");
      setStudents([]);
      setDataLoaded(false);
    }
  };

  const handleSubjectChange = (newSubjectId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedSubject(newSubjectId);
        setHasUnsavedChanges(false);
      });
      setShowUnsavedWarning(true);
    } else {
      setSelectedSubject(newSubjectId);
    }
  };

  // ✅ Warning dialog handlers
  const handleSaveAndContinue = async () => {
    try {
      setSaving(true);
      await handleSaveAll();
      setShowUnsavedWarning(false);
    } catch (error) {
      console.error("Error during save and continue:", error);
      setShowUnsavedWarning(false);
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelChange = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
  };

  // ✅ Block navigation when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    // Add event listener for browser back/forward/refresh
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Note: Tab bar navigation is now handled via onNavigate callback in MobileLayout

  if (authLoading) {
    return (
      <MobileLayout title="Grade Entry">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  // ✅ Handle navigation from tab bar
  const handleNavigate = useCallback(
    (href: string) => {
      // If has unsaved changes and trying to navigate away
      if (hasUnsavedChanges && href !== pathname) {
        setPendingAction(() => () => {
          // Navigate after user confirms
          router.push(href);
        });
        setShowUnsavedWarning(true);
        return false; // Prevent navigation
      }
      return true; // Allow navigation
    },
    [hasUnsavedChanges, pathname, router],
  );

  return (
    <MobileLayout
      title="Grade Entry • បញ្ចូលពិន្ទុ"
      onNavigate={handleNavigate}
    >
      {/* Clean Modern Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-koulen text-xl text-gray-900 leading-tight">
              បញ្ចូលពិន្ទុ
            </h1>
            <p className="font-battambang text-xs text-gray-500">
              Grade Entry System
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Modern Filter Cards */}
        <div className="space-y-3">
          {/* Class Selection Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <label className="font-battambang text-sm font-semibold text-gray-700 flex-1">
                ថ្នាក់ • Class
              </label>
              {/* Refresh button if no classes */}
              {availableClasses.length === 0 && !isLoadingClasses && !authLoading && !isVerifyingWithServer && (
                <button
                  onClick={() => refreshClasses()}
                  className="text-xs px-3 py-1 bg-purple-500 text-white rounded-lg font-battambang hover:bg-purple-600 active:scale-95 transition-all"
                >
                  ផ្ទុកឡើងវិញ
                </button>
              )}
            </div>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={isLoadingClasses || authLoading || isVerifyingWithServer}
              className="w-full h-12 px-4 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 transition-all"
              style={{ fontSize: "16px" }}
            >
              <option value="">
                {(isLoadingClasses || authLoading || isVerifyingWithServer)
                  ? "កំពុងផ្ទុក..." 
                  : availableClasses.length === 0
                    ? "មិនមានថ្នាក់ • No classes"
                    : "-- ជ្រើសរើសថ្នាក់ --"}
              </option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            {/* Debug info for development */}
            {availableClasses.length === 0 && !isLoadingClasses && !authLoading && !isVerifyingWithServer && (
              <p className="mt-2 text-xs text-gray-500 font-battambang">
                Debug: classes={classes.length}, available={availableClasses.length}, loading={isLoadingClasses.toString()}, authLoading={authLoading.toString()}, verifying={isVerifyingWithServer.toString()}
              </p>
            )}
          </div>

          {/* Month & Year Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <label className="font-battambang text-sm font-semibold text-gray-700">
                ខែ និងឆ្នាំ • Month & Year
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                style={{ fontSize: "16px" }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear.toString()}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                style={{ fontSize: "16px" }}
              >
                {getAcademicYearOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Load Button */}
          <button
            onClick={handleLoadData}
            disabled={!selectedClass || loading}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-battambang font-semibold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                កំពុងផ្ទុក...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                ផ្ទុកទិន្នន័យ
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="font-battambang text-sm text-red-700 flex-1 pt-2">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Subject Selector - Modern Design */}
        {dataLoaded && subjects.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-md border border-purple-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <label className="font-battambang text-sm font-bold text-gray-800">
                  មុខវិជ្ជា • Subject
                </label>
                {subjects.length > 1 && (
                  <p className="font-battambang text-xs text-purple-600">
                    {subjects.length} មុខវិជ្ជា
                  </p>
                )}
              </div>
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full h-16 px-4 py-3 font-battambang bg-white border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all"
              style={{ fontSize: "16px", minHeight: "64px" }}
            >
              <option value="">-- ជ្រើសរើសមុខវិជ្ជា --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.nameKh} ({subject.maxScore} ពិន្ទុ)
                </option>
              ))}
            </select>
            {currentUser?.role === "TEACHER" &&
              teacherHomeroomClassId === selectedClass && (
                <div className="mt-3 bg-blue-100 border border-blue-200 rounded-xl p-3">
                  <p className="font-battambang text-xs text-blue-700 flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-200 rounded-lg flex items-center justify-center">
                      🏠
                    </div>
                    អ្នកគឺជា INSTRUCTOR -
                    អាចបញ្ចូលពិន្ទុតែមុខវិជ្ជាដែលអ្នកបង្រៀនប៉ុណ្ណោះ • You are
                    INSTRUCTOR - can only input scores for subjects you teach
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Students List - Show ALL students */}
        {selectedSubject && students.length > 0 && currentSubject && (
          <div className="space-y-4">
            {/* Modern Stats Banner */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700 rounded-3xl"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>

              <div className="relative p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h1 className="font-koulen text-lg text-white leading-tight">
                          {currentSubject.nameKh}
                        </h1>
                        <p className="font-battambang text-xs text-purple-100">
                          {currentSubject.nameEn}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-1.5">
                        <p className="font-battambang text-xs text-purple-100">
                          សិស្សសរុប
                        </p>
                        <p className="font-koulen text-lg text-white">
                          {students.length}
                        </p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-3 py-1.5">
                        <p className="font-battambang text-xs text-purple-100">
                          ពិន្ទុអតិបរមា
                        </p>
                        <p className="font-koulen text-lg text-white">
                          {currentSubject.maxScore}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* Save All Button */}
                    <button
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges || saving}
                      className={`px-5 py-3 rounded-xl font-battambang font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.95] transition-all whitespace-nowrap ${
                        hasUnsavedChanges
                          ? "bg-white text-purple-600 hover:bg-purple-50"
                          : "bg-white/20 backdrop-blur-sm border border-white/30 text-white cursor-not-allowed"
                      }`}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>កំពុងរក្សា...</span>
                        </>
                      ) : hasUnsavedChanges ? (
                        <>
                          <Save className="w-4 h-4" />
                          <span>រក្សាទុក</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>រក្សារួច</span>
                        </>
                      )}
                    </button>

                    {/* Confirm Button - Only show when saved and not confirmed */}
                    {!hasUnsavedChanges &&
                      !isConfirmed &&
                      students.some((s) => s.score !== null) && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          disabled={saving}
                          className="px-4 py-2 rounded-xl font-battambang font-semibold text-xs flex items-center justify-center gap-1.5 bg-orange-500/90 hover:bg-orange-600 text-white shadow-md active:scale-[0.95] transition-all whitespace-nowrap"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>បញ្ជាក់</span>
                        </button>
                      )}

                    {/* Confirmed Badge */}
                    {isConfirmed && (
                      <div className="px-3 py-1.5 rounded-lg bg-green-500/90 text-white flex items-center justify-center gap-1.5 text-xs font-battambang font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>បានបញ្ជាក់</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ NEW: Warning Banner for Unconfirmed Scores */}
            {!isConfirmed && students.some((s) => s.score !== null) && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl shadow-xl p-4 border-2 border-orange-400">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-battambang text-sm font-bold mb-1">
                      ⚠️ ពិន្ទុមិនទាន់បានបញ្ជាក់
                    </p>
                    <p className="font-battambang text-xs text-orange-50 mb-3">
                      សូមពិនិត្យពិន្ទុម្តងទៀត ហើយបញ្ជាក់ថាពិន្ទុត្រឹមត្រូវ •
                      Please review and confirm all scores are correct
                    </p>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="w-full bg-white text-orange-600 font-battambang font-bold text-sm py-3 px-4 rounded-xl hover:bg-orange-50 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      ពិនិត្យ និងបញ្ជាក់ពិន្ទុ • Review & Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ NEW: Confirmation Success Banner */}
            {isConfirmed && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-xl p-4 border-2 border-green-400">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-battambang text-sm font-bold mb-0.5">
                      ✓ ពិន្ទុត្រូវបានបញ្ជាក់រួចរាល់
                    </p>
                    <p className="font-battambang text-xs text-green-50">
                      គ្រប់ពិន្ទុត្រឹមត្រូវ • All scores confirmed
                      {confirmedAt && (
                        <span className="ml-2">
                          @{" "}
                          {confirmedAt.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ NEW: Export Score Report Button */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border-2 border-red-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-sm font-bold text-gray-900 mb-1">
                    នាំចេញរបាយការណ៍ជា PDF
                  </p>
                  <p className="font-battambang text-xs text-gray-600 mb-3">
                    ផ្ញើ PDF ទៅសិស្សដើម្បីពិនិត្យពិន្ទុមុនពេលបញ្ជាក់ • Share PDF
                    with students to verify before confirming
                  </p>
                  <button
                    onClick={exportAsPDF}
                    disabled={
                      students.filter((s) => s.score !== null).length === 0 ||
                      isExporting
                    }
                    className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-battambang font-bold text-sm py-3 px-4 rounded-xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        កំពុងនាំចេញ...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        នាំចេញជា PDF • Export as PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modern Student Cards */}
            <div className="space-y-2.5">
              {students.map((student, index) => {
                const hasDiscrepancy = verificationDiscrepancies.has(
                  student.studentId,
                );
                const isIncomplete = incompleteScores.has(student.studentId);

                return (
                  <StudentScoreCard
                    key={student.studentId}
                    student={student}
                    index={index}
                    hasUnsavedChanges={hasUnsavedChanges}
                    hasDiscrepancy={hasDiscrepancy}
                    isIncomplete={isIncomplete}
                    onScoreChange={handleScoreChange}
                  />
                );
              })}
            </div>

            {/* Modern Info Footer */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-xs text-blue-800 font-semibold mb-0.5">
                    ពិន្ទុរក្សាទុកដោយស្វ័យប្រវត្តិ
                  </p>
                  <p className="font-battambang text-[10px] text-blue-600">
                    Scores automatically save after typing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Empty State */}
        {!dataLoaded && !loading && (
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-3xl shadow-sm border border-gray-200 p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full opacity-30 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100 rounded-full opacity-30 blur-2xl"></div>

            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <p className="font-battambang text-sm text-gray-700 mb-2 font-semibold">
                សូមជ្រើសរើសថ្នាក់ ខែ និងឆ្នាំ
              </p>
              <p className="font-battambang text-xs text-gray-500">
                ហើយចុច "ផ្ទុកទិន្នន័យ" ដើម្បីចាប់ផ្តើម
              </p>
              <p className="font-battambang text-[10px] text-gray-400 mt-1">
                Select class, month & year, then click "Load Data"
              </p>
            </div>
          </div>
        )}

        {/* ✅ Save Success Banner */}
        {saveSuccess && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-sm font-bold mb-0.5">
                    រក្សាទុកបានជោគជ័យ ✓
                  </p>
                  <p className="font-battambang text-xs text-green-50">
                    ពិន្ទុទាំងអស់ត្រូវបានរក្សាទុក • All scores saved
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Verification Success Banner - All complete and correct */}
        {verifiedAt &&
          verificationDiscrepancies.size === 0 &&
          incompleteCount === 0 && (
            <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl shadow-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-battambang text-sm font-bold mb-0.5">
                      ពិន្ទុត្រូវបានផ្ទៀងផ្ទាត់ ✓
                    </p>
                    <p className="font-battambang text-xs text-green-50">
                      គ្រប់ពិន្ទុត្រឹមត្រូវនៅក្នុងមូលដ្ឋានទិន្នន័យ • All scores
                      verified in database
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* ✅ NEW: Discrepancy Warning Banner */}
        {verificationDiscrepancies.size > 0 && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-sm font-bold mb-0.5">
                    រកឃើញភាពខុសគ្នា {verificationDiscrepancies.size} ពិន្ទុ
                  </p>
                  <p className="font-battambang text-xs text-orange-50">
                    ពិន្ទុបានធ្វើបច្ចុប្បន្នភាពដោយស្វ័យប្រវត្តិ • Scores updated
                    automatically
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Incomplete Scores Warning Banner */}
        {incompleteCount > 0 && verificationDiscrepancies.size === 0 && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-sm font-bold mb-0.5">
                    មានសិស្ស {incompleteCount} នាក់ មិនទាន់បញ្ចូលពិន្ទុ
                  </p>
                  <p className="font-battambang text-xs text-yellow-50">
                    សូមបញ្ចូលពិន្ទុឱ្យគ្រប់សិស្ស • Please fill all student
                    scores
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Combined Warning - Both incomplete and discrepancies */}
        {incompleteCount > 0 && verificationDiscrepancies.size > 0 && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-500 space-y-2">
            {/* Discrepancy Warning */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl shadow-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-xs font-bold">
                    រកឃើញភាពខុសគ្នា {verificationDiscrepancies.size} ពិន្ទុ
                  </p>
                  <p className="font-battambang text-[10px] text-orange-50">
                    ពិន្ទុបានធ្វើបច្ចុប្បន្នភាព
                  </p>
                </div>
              </div>
            </div>
            {/* Incomplete Warning */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl shadow-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-battambang text-xs font-bold">
                    មានសិស្ស {incompleteCount} នាក់ មិនទាន់បញ្ចូលពិន្ទុ
                  </p>
                  <p className="font-battambang text-[10px] text-yellow-50">
                    សូមបញ្ចូលពិន្ទុឱ្យគ្រប់សិស្ស
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Review & Confirm Modal */}
        {showReviewModal && currentSubject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4">
            <div className="bg-white w-full max-h-[85vh] sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 sm:rounded-t-3xl rounded-t-3xl flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-koulen text-xl text-white">
                        ពិនិត្យពិន្ទុ
                      </h4>
                      <p className="font-battambang text-xs text-purple-100">
                        Review & Confirm Scores
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-all"
                  >
                    <span className="text-white text-2xl leading-none">×</span>
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <p className="font-koulen text-2xl text-white">
                      {students.length}
                    </p>
                    <p className="font-battambang text-xs text-purple-100">
                      សិស្សសរុប
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <p className="font-koulen text-2xl text-white">
                      {students.filter((s) => s.score !== null).length}
                    </p>
                    <p className="font-battambang text-xs text-purple-100">
                      បានបញ្ចូល
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <p className="font-koulen text-2xl text-white">
                      {students.filter((s) => s.score === null).length}
                    </p>
                    <p className="font-battambang text-xs text-purple-100">
                      មិនទាន់
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Student List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="mb-2">
                  <p className="font-battambang text-sm font-bold text-gray-700 mb-1">
                    {currentSubject.nameKh} • Max: {currentSubject.maxScore}{" "}
                    ពិន្ទុ
                  </p>
                  <p className="font-battambang text-xs text-gray-500">
                    សូមពិនិត្យពិន្ទុនីមួយៗឱ្យបានត្រឹមត្រូវ
                  </p>
                </div>

                {students.map((student, index) => {
                  const isEmpty = student.score === null;
                  const isZero = student.score === 0;
                  const isLow =
                    student.score !== null &&
                    student.score > 0 &&
                    student.score < currentSubject.maxScore * 0.3;
                  const isPerfect = student.score === currentSubject.maxScore;

                  return (
                    <div
                      key={student.studentId}
                      className={`rounded-xl p-3 border-2 ${
                        isEmpty
                          ? "bg-yellow-50 border-yellow-300"
                          : isZero
                            ? "bg-red-50 border-red-300"
                            : isLow
                              ? "bg-orange-50 border-orange-200"
                              : isPerfect
                                ? "bg-green-50 border-green-300"
                                : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="font-koulen text-sm text-purple-700">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-battambang text-sm font-semibold text-gray-900 truncate">
                            {student.khmerName}
                          </p>
                          <p className="font-battambang text-xs text-gray-500">
                            {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isEmpty ? (
                            <div className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-lg">
                              <p className="font-battambang text-xs font-bold">
                                ទទេ
                              </p>
                            </div>
                          ) : (
                            <>
                              <p
                                className={`font-koulen text-2xl ${
                                  isZero
                                    ? "text-red-600"
                                    : isLow
                                      ? "text-orange-600"
                                      : isPerfect
                                        ? "text-green-600"
                                        : "text-gray-900"
                                }`}
                              >
                                {student.score}
                              </p>
                              <p className="font-battambang text-[10px] text-gray-500">
                                /{currentSubject.maxScore}
                              </p>
                            </>
                          )}
                        </div>
                        {isZero && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-[10px] font-bold">
                            A
                          </div>
                        )}
                        {isPerfect && (
                          <div className="text-green-500 text-xl">🌟</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warning if incomplete */}
              {students.filter((s) => s.score === null).length > 0 && (
                <div className="px-4 pb-2">
                  <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-3">
                    <p className="font-battambang text-xs text-yellow-800">
                      ⚠️ មានសិស្ស{" "}
                      {students.filter((s) => s.score === null).length}{" "}
                      នាក់មិនទាន់បញ្ចូលពិន្ទុ
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 pb-6 border-t border-gray-200 flex-shrink-0 space-y-4 bg-white">
                <button
                  onClick={handleConfirmScores}
                  disabled={saving || hasUnsavedChanges}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-battambang font-bold text-base py-4 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      រង់ចាំ...
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      សូមរក្សាទុកសិន • Save First
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      បញ្ជាក់ថាពិន្ទុត្រឹមត្រូវ
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-battambang font-semibold text-sm py-3 px-6 rounded-xl active:scale-[0.98] transition-all"
                >
                  ត្រឡប់ទៅកែសម្រួល
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Hidden Score Report Template for Export */}
        {currentSubject && gridData && (
          <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
            <ScoreReportTemplate
              exportRef={exportReportRef}
              className={gridData.className}
              subjectName={currentSubject.nameKh}
              subjectCode={currentSubject.code}
              maxScore={currentSubject.maxScore}
              month={selectedMonth}
              year={selectedYear}
              students={students.map((s) => ({
                studentId: s.studentId,
                khmerName: s.khmerName,
                gender: s.gender,
                score: s.score,
              }))}
              teacherName={
                currentUser?.role === "TEACHER"
                  ? `${currentUser?.teacher?.firstName || ""} ${
                      currentUser?.teacher?.lastName || ""
                    }`.trim() || "N/A"
                  : currentUser?.role === "ADMIN"
                    ? "Administrator"
                    : "N/A"
              }
            />
          </div>
        )}
      </div>

      {/* ✅ Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-7 h-7 text-orange-600" />
              </div>
              <div>
                <h1 className="font-koulen text-xl text-gray-900">
                  មានការផ្លាស់ប្តូរមិនទាន់រក្សាទុក
                </h1>
                <p className="text-sm text-gray-600 font-battambang">
                  Unsaved Changes
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 font-battambang leading-relaxed">
              អ្នកមានពិន្ទុដែលមិនទាន់រក្សាទុក។ តើអ្នកចង់រក្សាទុកវាឬបោះបង់?
              <br />
              <span className="text-gray-500">
                You have unsaved scores. Do you want to save or discard them?
              </span>
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-battambang font-bold py-3.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    កំពុងរក្សាទុក...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    រក្សាទុក & បន្ត • Save & Continue
                  </>
                )}
              </button>

              <button
                onClick={handleDiscardChanges}
                disabled={saving}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-battambang font-bold py-3.5 px-6 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                បោះបង់ការផ្លាស់ប្តូរ • Discard Changes
              </button>

              <button
                onClick={handleCancelChange}
                disabled={saving}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-battambang font-medium py-3 px-6 rounded-xl active:scale-[0.98] transition-all"
              >
                បោះបង់ • Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
