'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, User, BookOpen, MapPin, AlertTriangle, Check } from 'lucide-react';
import { 
  DayOfWeek, 
  ShiftType, 
  DAY_LABELS, 
  PERIOD_TIMES, 
  Teacher, 
  Subject, 
  TimetableEntry,
  getTeacherDisplayName,
  getSubjectColors 
} from './types';

interface AssignEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    subjectId: string;
    teacherId: string;
    room?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  day: DayOfWeek;
  period: number;
  shiftType: ShiftType;
  classId: string;
  className: string;
  grade: number;
  existingEntry?: TimetableEntry | null;
  teachers: Teacher[];
  subjects: Subject[];
  busyTeachers: Set<string>; // Teacher IDs that are busy at this slot
  teacherBusyInfo: Record<string, string>; // teacherId -> "Class 10A - Math"
}

export default function AssignEntryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  day,
  period,
  shiftType,
  classId,
  className,
  grade,
  existingEntry,
  teachers,
  subjects,
  busyTeachers,
  teacherBusyInfo,
}: AssignEntryModalProps) {
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing entry
  useEffect(() => {
    if (existingEntry) {
      setSubjectId(existingEntry.subjectId || '');
      setTeacherId(existingEntry.teacherId || '');
      setRoom(existingEntry.room || '');
    } else {
      setSubjectId('');
      setTeacherId('');
      setRoom('');
    }
    setError(null);
  }, [existingEntry, isOpen]);

  // Filter subjects for this grade
  const gradeSubjects = useMemo(() => {
    return subjects.filter((s) => {
      // If subject has grade info, filter by it
      // Otherwise show all subjects
      return true; // Will be filtered by actual grade data
    });
  }, [subjects, grade]);

  // Filter teachers who can teach the selected subject
  const availableTeachers = useMemo(() => {
    return teachers.map((teacher) => {
      const canTeachSubject = !subjectId || teacher.subjects.some(
        (s) => s.subjectId === subjectId && s.grades.includes(grade)
      );
      const isBusy = busyTeachers.has(teacher.id);
      const busyWith = teacherBusyInfo[teacher.id];

      return {
        ...teacher,
        canTeachSubject,
        isBusy,
        busyWith,
        isAvailable: canTeachSubject && !isBusy,
      };
    }).sort((a, b) => {
      // Sort: available first, then can teach subject, then by name
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (a.canTeachSubject !== b.canTeachSubject) return a.canTeachSubject ? -1 : 1;
      return getTeacherDisplayName(a).localeCompare(getTeacherDisplayName(b));
    });
  }, [teachers, subjectId, grade, busyTeachers, teacherBusyInfo]);

  const periodTime = PERIOD_TIMES[shiftType][period - 1];

  const handleSave = async () => {
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({ subjectId, teacherId, room: room || undefined });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      setDeleting(true);
      await onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {existingEntry ? 'Edit Entry' : 'Add Entry'}
              </h3>
              <p className="text-sm text-white/80">
                {className} • {DAY_LABELS[day].en} • Period {period}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slot Info */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              shiftType === 'MORNING' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {shiftType === 'MORNING' ? '🌅 Morning' : '🌙 Afternoon'}
            </span>
            <span className="text-gray-600">
              {periodTime?.start} - {periodTime?.end}
            </span>
          </div>
          <span className="text-gray-500">Grade {grade}</span>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                // Reset teacher if they can't teach the new subject
                const teacher = teachers.find(t => t.id === teacherId);
                if (teacher && e.target.value) {
                  const canTeach = teacher.subjects.some(
                    s => s.subjectId === e.target.value && s.grades.includes(grade)
                  );
                  if (!canTeach) setTeacherId('');
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a subject...</option>
              {gradeSubjects.map((subject) => {
                const colors = getSubjectColors(subject.category);
                return (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Teacher Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Teacher
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a teacher (optional)...</option>
              {availableTeachers.map((teacher) => (
                <option 
                  key={teacher.id} 
                  value={teacher.id}
                  disabled={teacher.isBusy}
                  className={teacher.isBusy ? 'text-gray-400' : ''}
                >
                  {getTeacherDisplayName(teacher)}
                  {teacher.isBusy && ` (Busy: ${teacher.busyWith})`}
                  {!teacher.canTeachSubject && subjectId && ' (Cannot teach this subject)'}
                  {teacher.isAvailable && ' ✓'}
                </option>
              ))}
            </select>
            {subjectId && (
              <p className="mt-1 text-xs text-gray-500">
                {availableTeachers.filter(t => t.isAvailable).length} teachers available for this subject
              </p>
            )}
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Room (optional)
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g., Room 101, Lab A"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          {existingEntry && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Delete
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting || !subjectId}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {existingEntry ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
