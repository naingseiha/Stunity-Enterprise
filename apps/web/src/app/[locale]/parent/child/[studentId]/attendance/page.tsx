'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
} from 'lucide-react';

const ATTENDANCE_SERVICE_URL = process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008';
const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'SICK';
  session: 'MORNING' | 'AFTERNOON';
  remarks?: string;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  khmerName: string;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ChildAttendancePage({ 
  params: { locale, studentId } 
}: { 
  params: { locale: string; studentId: string } 
}) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/parent/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    // Verify access
    const children = userData.user?.children || [];
    if (!children.some((c: any) => c.id === studentId)) {
      setError('You do not have access to this student');
      setLoading(false);
      return;
    }

    fetchData(token);
  }, [locale, router, studentId, currentMonth, currentYear]);

  const fetchData = async (token: string) => {
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const studentData = await studentRes.json();
      if (studentData.success || studentData.data) {
        setStudent(studentData.data || studentData);
      }

      // Fetch attendance for the month
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      
      const attendanceRes = await fetch(
        `${ATTENDANCE_SERVICE_URL}/attendance/student/${studentId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const attendanceData = await attendanceRes.json();
      if (attendanceData.success || attendanceData.data) {
        setAttendance(attendanceData.data || attendanceData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (attendance.length === 0) return null;
    
    const present = attendance.filter(a => a.status === 'PRESENT').length;
    const absent = attendance.filter(a => a.status === 'ABSENT').length;
    const late = attendance.filter(a => a.status === 'LATE').length;
    const excused = attendance.filter(a => a.status === 'EXCUSED' || a.status === 'SICK').length;
    const total = attendance.length;
    
    return {
      present,
      absent,
      late,
      excused,
      total,
      rate: total > 0 ? ((present + late + excused) / total * 100).toFixed(1) : '0',
    };
  };

  const stats = calculateStats();

  // Get days in month
  const getDaysInMonth = () => {
    const date = new Date(currentYear, currentMonth, 1);
    const days = [];
    const firstDayOfWeek = date.getDay();
    
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    while (date.getMonth() === currentMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  };

  // Get attendance for a specific date
  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendance.filter(a => a.date.startsWith(dateStr));
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { icon: CheckCircle, color: 'text-green-500 bg-green-100', label: 'P' };
      case 'ABSENT':
        return { icon: XCircle, color: 'text-red-500 bg-red-100', label: 'A' };
      case 'LATE':
        return { icon: Clock, color: 'text-yellow-500 bg-yellow-100', label: 'L' };
      case 'EXCUSED':
        return { icon: MinusCircle, color: 'text-blue-500 bg-blue-100', label: 'E' };
      case 'SICK':
        return { icon: MinusCircle, color: 'text-purple-500 bg-purple-100', label: 'S' };
      default:
        return { icon: MinusCircle, color: 'text-gray-400 bg-gray-100', label: '-' };
    }
  };

  // Navigate months
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const days = getDaysInMonth();

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/${locale}/parent/child/${studentId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href={`/${locale}/parent/child/${studentId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {student?.khmerName || 'Student'}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-blue-600" />
            Attendance
          </h1>
          <p className="text-gray-600 mt-1">
            {student?.khmerName} • {student?.class?.name || 'No class'}
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 font-medium text-gray-900 min-w-[150px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            <p className="text-xs text-gray-500">Late</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
            <p className="text-xs text-gray-500">Excused/Sick</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Days</p>
          </div>
          <div className={`rounded-xl p-4 shadow-sm border text-center ${
            Number(stats.rate) >= 90 ? 'bg-green-50 border-green-200' : 
            Number(stats.rate) >= 75 ? 'bg-yellow-50 border-yellow-200' : 
            'bg-red-50 border-red-200'
          }`}>
            <p className={`text-2xl font-bold ${
              Number(stats.rate) >= 90 ? 'text-green-600' : 
              Number(stats.rate) >= 75 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>{stats.rate}%</p>
            <p className="text-xs text-gray-500">Attendance Rate</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading attendance...</p>
          </div>
        ) : (
          <>
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="p-3 min-h-[80px] bg-gray-50" />;
                }

                const dayAttendance = getAttendanceForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 min-h-[80px] border-b border-r border-gray-100 ${
                      isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {day.getDate()}
                    </div>
                    
                    {dayAttendance.length > 0 ? (
                      <div className="space-y-1">
                        {dayAttendance.map((a, i) => {
                          const statusDisplay = getStatusDisplay(a.status);
                          return (
                            <div
                              key={i}
                              className={`text-xs px-1.5 py-0.5 rounded ${statusDisplay.color} flex items-center gap-1`}
                              title={`${a.session}: ${a.status}${a.remarks ? ` - ${a.remarks}` : ''}`}
                            >
                              <span className="font-medium">{statusDisplay.label}</span>
                              <span className="text-[10px] opacity-75">
                                {a.session === 'MORNING' ? 'AM' : 'PM'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : !isWeekend && (
                      <div className="text-xs text-gray-400">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h4>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" /> Present (P)
          </span>
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
            <XCircle className="w-4 h-4" /> Absent (A)
          </span>
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            <Clock className="w-4 h-4" /> Late (L)
          </span>
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            <MinusCircle className="w-4 h-4" /> Excused (E)
          </span>
          <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            <MinusCircle className="w-4 h-4" /> Sick (S)
          </span>
        </div>
      </div>
    </div>
  );
}
