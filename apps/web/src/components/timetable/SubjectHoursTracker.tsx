'use client';

import React, { useMemo } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SubjectGradeHours, TimetableEntry } from './types';

interface SubjectHoursTrackerProps {
  subjectHours: SubjectGradeHours[];
  entries: TimetableEntry[];
  grade: number;
  compact?: boolean;
}

export default function SubjectHoursTracker({
  subjectHours,
  entries,
  grade,
  compact = false,
}: SubjectHoursTrackerProps) {
  // Calculate hours assigned per subject
  const subjectStats = useMemo(() => {
    const stats: Array<{
      subjectId: string;
      subjectName: string;
      required: number;
      assigned: number;
      isComplete: boolean;
      isOver: boolean;
    }> = [];

    // Filter subject hours for this grade
    const gradeSubjects = subjectHours.filter((sh) => sh.grade === grade);

    gradeSubjects.forEach((sh) => {
      const assigned = entries.filter((e) => e.subjectId === sh.subjectId).length;
      stats.push({
        subjectId: sh.subjectId,
        subjectName: sh.subjectName,
        required: sh.hoursPerWeek,
        assigned,
        isComplete: assigned >= sh.hoursPerWeek,
        isOver: assigned > sh.hoursPerWeek,
      });
    });

    // Sort: incomplete first, then by name
    return stats.sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      return a.subjectName.localeCompare(b.subjectName);
    });
  }, [subjectHours, entries, grade]);

  const totalRequired = subjectStats.reduce((sum, s) => sum + s.required, 0);
  const totalAssigned = subjectStats.reduce((sum, s) => sum + s.assigned, 0);
  const completeCount = subjectStats.filter((s) => s.isComplete).length;

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Subject Hours</span>
          <span className="text-xs text-gray-500">
            {completeCount}/{subjectStats.length} complete
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              totalAssigned >= totalRequired ? 'bg-green-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min((totalAssigned / totalRequired) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {totalAssigned}/{totalRequired} periods assigned
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Subject Hours (Grade {grade})
          </h4>
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            completeCount === subjectStats.length 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {completeCount}/{subjectStats.length} complete
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {subjectStats.map((stat) => (
          <div
            key={stat.subjectId}
            className={`p-3 rounded-lg border-2 transition-colors ${
              stat.isOver 
                ? 'border-red-200 bg-red-50' 
                : stat.isComplete 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">{stat.subjectName}</span>
              <div className="flex items-center gap-1">
                {stat.isOver ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : stat.isComplete ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : null}
                <span className={`text-sm font-semibold ${
                  stat.isOver ? 'text-red-600' : stat.isComplete ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {stat.assigned}/{stat.required}
                </span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stat.isOver ? 'bg-red-500' : stat.isComplete ? 'bg-green-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min((stat.assigned / stat.required) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}

        {subjectStats.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No subject hours configured for Grade {grade}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Periods</span>
          <span className="font-semibold text-gray-800">
            {totalAssigned} / {totalRequired}
          </span>
        </div>
      </div>
    </div>
  );
}
