'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
} from '@dnd-kit/core';
import { 
  DAYS, 
  DayOfWeek, 
  ShiftType,
  Teacher, 
  Subject, 
  TimetableEntry, 
  ClassInfo,
  ClassShiftSchedule,
  SubjectGradeHours,
  ConflictInfo,
  getTeacherDisplayName,
} from './types';
import TeacherSidebar from './TeacherSidebar';
import ClassTimetableGrid from './ClassTimetableGrid';
import SubjectHoursTracker from './SubjectHoursTracker';
import AssignEntryModal from './AssignEntryModal';
import TeacherCard from './TeacherCard';
import { User, Loader2, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface TimetableEditorProps {
  classInfo: ClassInfo;
  entries: TimetableEntry[];
  teachers: Teacher[];
  subjects: Subject[];
  subjectHours: SubjectGradeHours[];
  conflicts: ConflictInfo[];
  onCreateEntry: (data: {
    classId: string;
    subjectId: string;
    teacherId?: string;
    periodNumber: number;
    dayOfWeek: DayOfWeek;
    room?: string;
  }) => Promise<void>;
  onUpdateEntry: (entryId: string, data: {
    subjectId?: string;
    teacherId?: string;
    room?: string;
  }) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onMoveEntry: (entryId: string, newDay: DayOfWeek, newPeriod: number) => Promise<void>;
  onRefresh: () => void;
  getTeacherAvailability: (day: DayOfWeek, period: number) => Promise<{
    busyTeachers: Set<string>;
    teacherBusyInfo: Record<string, string>;
  }>;
  academicYearId: string;
  isLoading?: boolean;
}

export default function TimetableEditor({
  classInfo,
  entries,
  teachers,
  subjects,
  subjectHours,
  conflicts,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onMoveEntry,
  onRefresh,
  getTeacherAvailability,
  academicYearId,
  isLoading = false,
}: TimetableEditorProps) {
  // State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    day: DayOfWeek;
    period: number;
    shiftType: ShiftType;
    existingEntry?: TimetableEntry | null;
  } | null>(null);
  const [busyTeachers, setBusyTeachers] = useState<Set<string>>(new Set());
  const [teacherBusyInfo, setTeacherBusyInfo] = useState<Record<string, string>>({});
  const [highlightedSlots, setHighlightedSlots] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag state
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get shift type for a day
  const getShiftForDay = useCallback((day: DayOfWeek): ShiftType => {
    const schedule = classInfo.shiftSchedule.find((s) => s.dayOfWeek === day);
    const defaultShift = classInfo.gradeLevel === 'SECONDARY' ? 'AFTERNOON' : 'MORNING';
    return schedule?.shiftType || defaultShift;
  }, [classInfo]);

  // Clear messages after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Handle cell click - open modal
  const handleCellClick = useCallback(async (day: DayOfWeek, period: number) => {
    const existingEntry = entries.find(
      (e) => e.dayOfWeek === day && e.periodNumber === period
    );
    const shiftType = getShiftForDay(day);

    // Get teacher availability for this slot
    try {
      const availability = await getTeacherAvailability(day, period);
      setBusyTeachers(availability.busyTeachers);
      setTeacherBusyInfo(availability.teacherBusyInfo);
    } catch (err) {
      console.error('Error getting availability:', err);
    }

    setModalData({
      day,
      period,
      shiftType,
      existingEntry: existingEntry || null,
    });
    setShowModal(true);
  }, [entries, getShiftForDay, getTeacherAvailability]);

  // Handle modal save
  const handleModalSave = useCallback(async (data: {
    subjectId: string;
    teacherId: string;
    room?: string;
  }) => {
    if (!modalData) return;

    setSaving(true);
    try {
      if (modalData.existingEntry) {
        await onUpdateEntry(modalData.existingEntry.id, data);
        setSuccessMessage('Entry updated successfully');
      } else {
        await onCreateEntry({
          classId: classInfo.id,
          subjectId: data.subjectId,
          teacherId: data.teacherId || undefined,
          periodNumber: modalData.period,
          dayOfWeek: modalData.day,
          room: data.room,
        });
        setSuccessMessage('Entry created successfully');
      }
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save entry');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [modalData, classInfo.id, onCreateEntry, onUpdateEntry, onRefresh]);

  // Handle modal delete
  const handleModalDelete = useCallback(async () => {
    if (!modalData?.existingEntry) return;

    setSaving(true);
    try {
      await onDeleteEntry(modalData.existingEntry.id);
      setSuccessMessage('Entry deleted');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete entry');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [modalData, onDeleteEntry, onRefresh]);

  // Handle entry delete from grid
  const handleEntryDelete = useCallback(async (entryId: string) => {
    if (!confirm('Delete this entry?')) return;

    try {
      await onDeleteEntry(entryId);
      setSuccessMessage('Entry deleted');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete');
    }
  }, [onDeleteEntry, onRefresh]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'TEACHER') {
      setActiveTeacher(data.teacher);
      // Highlight available slots for this teacher
      const availableSlots = new Set<string>();
      DAYS.forEach((day) => {
        for (let period = 1; period <= 5; period++) {
          const hasEntry = entries.some(
            (e) => e.dayOfWeek === day && e.periodNumber === period
          );
          if (!hasEntry) {
            availableSlots.add(`${day}-${period}`);
          }
        }
      });
      setHighlightedSlots(availableSlots);
    } else if (data?.type === 'ENTRY') {
      setActiveEntry(data.entry);
    }
  }, [entries]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setDragOverSlot(over.id as string);
    } else {
      setDragOverSlot(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTeacher(null);
    setActiveEntry(null);
    setHighlightedSlots(new Set());
    setDragOverSlot(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!overData) return;

    const { day, period, classId } = overData as { day: DayOfWeek; period: number; classId: string };

    // Check if slot already has an entry
    const existingEntry = entries.find(
      (e) => e.dayOfWeek === day && e.periodNumber === period
    );

    try {
      setSaving(true);

      if (activeData?.type === 'TEACHER' && !existingEntry) {
        // Dragged teacher to empty slot - open modal with teacher pre-selected
        const availability = await getTeacherAvailability(day, period);
        setBusyTeachers(availability.busyTeachers);
        setTeacherBusyInfo(availability.teacherBusyInfo);

        // Check if teacher is busy
        if (availability.busyTeachers.has(activeData.teacherId)) {
          setErrorMessage(`${getTeacherDisplayName(activeData.teacher)} is busy at this time`);
          return;
        }

        setModalData({
          day,
          period,
          shiftType: getShiftForDay(day),
          existingEntry: null,
        });
        setShowModal(true);
        // Pre-fill teacher in modal (handled by parent)
      } else if (activeData?.type === 'ENTRY') {
        // Dragged entry to new slot
        const entryId = activeData.entry.id;
        const fromDay = activeData.fromSlot.day;
        const fromPeriod = activeData.fromSlot.period;

        if (fromDay === day && fromPeriod === period) {
          // Dropped in same spot - do nothing
          return;
        }

        if (existingEntry) {
          // Swap entries - TODO: implement swap
          setErrorMessage('Swapping entries is not yet supported. Please delete the existing entry first.');
          return;
        }

        await onMoveEntry(entryId, day, period);
        setSuccessMessage('Entry moved successfully');
        onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete action');
    } finally {
      setSaving(false);
    }
  }, [entries, getShiftForDay, getTeacherAvailability, onMoveEntry, onRefresh]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        {/* Teacher Sidebar */}
        <TeacherSidebar
          teachers={teachers}
          subjects={subjects}
          selectedGradeLevel={classInfo.gradeLevel}
          selectedGrade={classInfo.grade}
          selectedSubjectId={selectedSubjectFilter}
          onSubjectFilter={setSelectedSubjectFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          {successMessage && (
            <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}

          {/* Timetable Grid */}
          <div className="flex-1 overflow-auto p-6">
            <div className="flex gap-6">
              {/* Grid */}
              <div className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <ClassTimetableGrid
                    classId={classInfo.id}
                    className={classInfo.name}
                    grade={classInfo.grade}
                    entries={entries}
                    shiftSchedule={classInfo.shiftSchedule}
                    conflicts={conflicts}
                    onCellClick={handleCellClick}
                    onEntryDelete={handleEntryDelete}
                    highlightedSlots={highlightedSlots}
                    academicYearId={academicYearId}
                  />
                )}
              </div>

              {/* Subject Hours Tracker */}
              <div className="w-72 flex-shrink-0">
                <SubjectHoursTracker
                  subjectHours={subjectHours}
                  entries={entries}
                  grade={classInfo.grade}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      {modalData && (
        <AssignEntryModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setModalData(null);
          }}
          onSave={handleModalSave}
          onDelete={modalData.existingEntry ? handleModalDelete : undefined}
          day={modalData.day}
          period={modalData.period}
          shiftType={modalData.shiftType}
          classId={classInfo.id}
          className={classInfo.name}
          grade={classInfo.grade}
          existingEntry={modalData.existingEntry}
          teachers={teachers}
          subjects={subjects}
          busyTeachers={busyTeachers}
          teacherBusyInfo={teacherBusyInfo}
        />
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTeacher && (
          <div className="opacity-90">
            <TeacherCard teacher={activeTeacher} isCompact showDragHandle={false} />
          </div>
        )}
        {activeEntry && (
          <div className="p-3 bg-white rounded-lg shadow-lg border-2 border-indigo-500 min-w-[120px]">
            <p className="font-semibold text-sm text-gray-800">{activeEntry.subjectName}</p>
            <p className="text-xs text-gray-500">{activeEntry.teacherName}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
