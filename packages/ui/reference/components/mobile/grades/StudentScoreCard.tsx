"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

interface StudentScoreCardProps {
  student: {
    studentId: string;
    khmerName: string;
    gender: string;
    score: number | null;
    maxScore: number;
  };
  index: number;
  hasUnsavedChanges: boolean;
  hasDiscrepancy: boolean;
  isIncomplete: boolean;
  onScoreChange: (studentId: string, value: string, maxScore: number) => void;
}

/**
 * Memoized StudentScoreCard component with local input state
 * Maintains focus by keeping input value locally while typing
 */
export const StudentScoreCard = memo(function StudentScoreCard({
  student,
  index,
  hasUnsavedChanges,
  hasDiscrepancy,
  isIncomplete,
  onScoreChange,
}: StudentScoreCardProps) {
  // Local state for input value to prevent parent re-renders from affecting input
  const [localValue, setLocalValue] = useState(
    student.score !== null ? student.score.toString() : ""
  );
  const [isInvalid, setIsInvalid] = useState(false);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop value when not typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(student.score !== null ? student.score.toString() : "");
      setIsInvalid(false);
    }
  }, [student.score]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    isTypingRef.current = true;

    // Clear any pending clear timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }

    // Validate score
    const score = value === "" ? null : parseFloat(value);

    // Check if score exceeds max score
    if (score !== null && !isNaN(score) && score > student.maxScore) {
      // Invalid: exceeds max score - show error and clear after brief delay
      setLocalValue(value);
      setIsInvalid(true);

      // Clear the input after 800ms to let user see the error
      clearTimeoutRef.current = setTimeout(() => {
        setLocalValue("");
        setIsInvalid(false);
        isTypingRef.current = false;
        // Reset parent state to null
        onScoreChange(student.studentId, "", student.maxScore);
      }, 800);
      return;
    }

    // Valid input - update local state and notify parent
    setLocalValue(value);
    setIsInvalid(false);

    if (score === null || (score >= 0 && score <= student.maxScore && !isNaN(score))) {
      onScoreChange(student.studentId, value, student.maxScore);
    }
  };

  const handleBlur = () => {
    isTypingRef.current = false;
    // No auto-save - user must click Save All button
  };

  const displayScore = parseFloat(localValue);
  const isZero = displayScore === 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 p-4 hover:shadow-md transition-all ${
        hasDiscrepancy
          ? "border-orange-300 bg-orange-50 animate-pulse"
          : isIncomplete
          ? "border-yellow-300 bg-yellow-50 animate-pulse"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Student Number Badge */}
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
          <span className="font-koulen text-base text-purple-700">
            {index + 1}
          </span>
        </div>

        {/* Student Info */}
        <div className="flex-1 min-w-0">
          <p className="font-battambang text-sm font-semibold text-gray-900 truncate mb-0.5">
            {student.khmerName}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-battambang font-medium ${
                student.gender === "MALE"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-pink-100 text-pink-700"
              }`}
            >
              {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
            </span>
          </div>
        </div>

        {/* Score Input */}
        <div className="flex-shrink-0 w-20 relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className={`w-full h-12 px-2 text-center font-battambang border-2 rounded-xl text-base font-bold focus:ring-2 transition-all ${
              isInvalid
                ? "bg-red-100 border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500 animate-shake"
                : isZero
                ? "bg-red-50 border-red-300 text-red-700 focus:ring-purple-500 focus:border-purple-400"
                : hasUnsavedChanges && student.score !== null
                ? "bg-orange-50 border-orange-300 text-orange-700 focus:ring-purple-500 focus:border-purple-400"
                : "bg-purple-50 border-purple-200 focus:ring-purple-500 focus:border-purple-400 focus:bg-white"
            }`}
            placeholder="0"
            style={{ fontSize: "16px" }}
          />
          {/* Max score label */}
          <div className="absolute -bottom-4 left-0 right-0 text-center">
            <span className="text-[9px] font-battambang text-gray-400">
              /{student.maxScore}
            </span>
          </div>
          {/* Invalid score indicator - RED CROSS */}
          {isInvalid && (
            <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 shadow-lg animate-pulse">
              <XCircle className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          )}
          {/* Absent indicator badge */}
          {!isInvalid && isZero && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-tight shadow-md">
              A
            </div>
          )}
          {/* Unsaved changes indicator */}
          {!isInvalid && hasUnsavedChanges && student.score !== null && !isZero && (
            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full leading-tight shadow-md">
              •
            </div>
          )}
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0 w-8 flex items-center justify-center">
          {isInvalid ? (
            <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
              <XCircle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
            </div>
          ) : hasUnsavedChanges && student.score !== null ? (
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
            </div>
          ) : student.score !== null ? (
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimization
  // Only re-render if these specific props change
  return (
    prevProps.student.studentId === nextProps.student.studentId &&
    prevProps.student.score === nextProps.student.score &&
    prevProps.hasUnsavedChanges === nextProps.hasUnsavedChanges &&
    prevProps.hasDiscrepancy === nextProps.hasDiscrepancy &&
    prevProps.isIncomplete === nextProps.isIncomplete
  );
});
