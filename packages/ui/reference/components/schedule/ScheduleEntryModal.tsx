"use client";

import React, { useState, useEffect } from "react";
import {
  TimetableEntry,
  DayOfWeek,
  DAYS_KH,
  SESSION_NAMES,
} from "@/types/schedule";
import { Teacher, Subject } from "@/types";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { AlertCircle, Sun, Moon } from "lucide-react";

interface ScheduleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Partial<TimetableEntry>) => void;
  entry?: TimetableEntry;
  day: DayOfWeek;
  period: number;
  session: "morning" | "afternoon";
  classId: string;
  teachers: Teacher[];
  subjects: Subject[];
  conflictMessage?: string;
  allowSessionChange?: boolean; // Allow changing session in modal
}

export default function ScheduleEntryModal({
  isOpen,
  onClose,
  onSave,
  entry,
  day,
  period,
  session: initialSession,
  classId,
  teachers,
  subjects,
  conflictMessage,
  allowSessionChange = false,
}: ScheduleEntryModalProps) {
  const [subjectId, setSubjectId] = useState(entry?.subjectId || "");
  const [teacherId, setTeacherId] = useState(entry?.teacherId || "");
  const [session, setSession] = useState<"morning" | "afternoon">(
    entry?.session || initialSession
  );
  const [room, setRoom] = useState(entry?.room || "");
  const [notes, setNotes] = useState(entry?.notes || "");

  useEffect(() => {
    if (entry) {
      setSubjectId(entry.subjectId);
      setTeacherId(entry.teacherId);
      setSession(entry.session);
      setRoom(entry.room || "");
      setNotes(entry.notes || "");
    } else {
      setSubjectId("");
      setTeacherId("");
      setSession(initialSession);
      setRoom("");
      setNotes("");
    }
  }, [entry, initialSession, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !teacherId) {
      alert(
        "សូមជ្រើសរើសមុខវិជ្ជានិងគ្រូបង្រៀន / Please select subject and teacher"
      );
      return;
    }

    const entryData: Partial<TimetableEntry> = {
      id: entry?.id || `entry-${Date.now()}`,
      classId,
      subjectId,
      teacherId,
      timeSlotId: `${session}-${day}-${period}`,
      day,
      period,
      session,
      room,
      notes,
    };

    onSave(entryData);
  };

  const subjectOptions = [
    { value: "", label: "ជ្រើសរើសមុខវិជ្ជា - Select Subject" },
    ...subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.nameEn})` })),
  ];

  const teacherOptions = [
    { value: "", label: "ជ្រើសរើសគ្រូបង្រៀន - Select Teacher" },
    ...teachers.map((t) => ({ value: t.id, label: t.name })),
  ];

  const sessionOptions = [
    {
      value: "morning",
      label: `${SESSION_NAMES.morning.icon} ${SESSION_NAMES.morning.kh} (${SESSION_NAMES.morning.time})`,
    },
    {
      value: "afternoon",
      label: `${SESSION_NAMES.afternoon.icon} ${SESSION_NAMES.afternoon.kh} (${SESSION_NAMES.afternoon.time})`,
    },
  ];

  const sessionInfo = SESSION_NAMES[session];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        entry ? "កែប្រែកាលវិភាគ Edit Schedule" : "បន្ថែមកាលវិភាគ Add Schedule"
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Time Info */}
        <div
          className={`bg-gradient-to-r ${sessionInfo.color} p-4 rounded-xl text-white`}
        >
          <div className="flex items-center gap-3 mb-3">
            {session === "morning" ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
            <div>
              <h3 className="font-bold text-lg">
                {sessionInfo.icon} {sessionInfo.kh}
              </h3>
              <p className="text-sm text-white/90">{sessionInfo.time}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">ថ្ងៃ Day:</span>
              <span className="ml-2 font-bold">{DAYS_KH[day]}</span>
            </div>
            <div>
              <span className="font-semibold">ម៉ោង Period:</span>
              <span className="ml-2 font-bold">{period}</span>
            </div>
          </div>
        </div>

        {conflictMessage && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{conflictMessage}</div>
          </div>
        )}

        {/* Session Selector (if allowed) */}
        {allowSessionChange && !entry && (
          <Select
            label="វេន Session"
            value={session}
            onChange={(e) =>
              setSession(e.target.value as "morning" | "afternoon")
            }
            options={sessionOptions}
          />
        )}

        <Select
          label="មុខវិជ្ជា Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjectOptions}
          required
        />

        <Select
          label="គ្រូបង្រៀន Teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          options={teacherOptions}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            បន្ទប់ Room (Optional)
          </label>
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Room number..."
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            កំណត់សម្គាល់ Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {entry ? "រក្សាទុក Save" : "បន្ថែម Add"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            បោះបង់ Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
