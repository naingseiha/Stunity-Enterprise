'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import {
  attendanceAPI,
  AttendanceStatus,
  getStatusInfo,
} from '@/lib/api/attendance';
import { getAcademicYears, AcademicYear } from '@/lib/api/academic-years';
import { getClasses, Class } from '@/lib/api/classes';
import {
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Percent,
  User,
} from 'lucide-react';

interface MonthlyStudentData {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  attendance: {
    [date: string]: {
      morning?: { id: string; status: string; remarks: string | null };
      afternoon?: { id: string; status: string; remarks: string | null };
    };
  };
  totals: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    permission: number;
  };
}

interface MonthlyData {
  classId: string;
  month: number;
  year: number;
  students: MonthlyStudentData[];
}

export default function AttendanceReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Selectors
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Month/Year navigation
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize
  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Load academic years
  useEffect(() => {
    if (school?.id) {
      loadAcademicYears();
    }
  }, [school?.id]);

  // Load classes when academic year changes
  useEffect(() => {
    if (selectedAcademicYear) {
      loadClasses();
    }
  }, [selectedAcademicYear]);

  // Load attendance when class or month changes
  useEffect(() => {
    if (selectedClass && selectedMonth && selectedYear) {
      loadMonthlyAttendance();
    }
  }, [selectedClass, selectedMonth, selectedYear]);

  const loadAcademicYears = async () => {
    try {
      const token = TokenManager.getAccessToken();
      const years = await getAcademicYears(school.id, token || '');
      setAcademicYears(years);
      const currentYear = years.find((y: AcademicYear) => y.isCurrent);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.id);
      } else if (years.length > 0) {
        setSelectedAcademicYear(years[0].id);
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await getClasses({ academicYearId: selectedAcademicYear });
      setClasses(response.data.classes || []);
      if (response.data.classes?.length > 0) {
        setSelectedClass(response.data.classes[0].id);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadMonthlyAttendance = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:3008/attendance/class/${selectedClass}/month/${selectedMonth}/year/${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${TokenManager.getAccessToken()}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setMonthlyData(result.data);
      } else {
        setError(result.message || 'Failed to load attendance data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!monthlyData?.students?.length) {
      return { totalStudents: 0, avgAttendance: 0, totalPresent: 0, totalAbsent: 0, totalLate: 0 };
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalSessions = 0;

    monthlyData.students.forEach((student) => {
      totalPresent += student.totals.present;
      totalAbsent += student.totals.absent;
      totalLate += student.totals.late;
      totalSessions += student.totals.present + student.totals.absent + student.totals.late + 
                       student.totals.excused + student.totals.permission;
    });

    const avgAttendance = totalSessions > 0 
      ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) 
      : 0;

    return {
      totalStudents: monthlyData.students.length,
      avgAttendance,
      totalPresent,
      totalAbsent,
      totalLate,
    };
  }, [monthlyData]);

  // Get days in month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
  const selectedClassData = classes.find(c => c.id === selectedClass);

  // Get status cell color
  const getStatusCellClass = (status: string | undefined) => {
    if (!status) return 'bg-gray-50';
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-700';
      case 'ABSENT': return 'bg-red-100 text-red-700';
      case 'LATE': return 'bg-orange-100 text-orange-700';
      case 'EXCUSED': return 'bg-blue-100 text-blue-700';
      case 'PERMISSION': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-50';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return '-';
    switch (status) {
      case 'PRESENT': return 'P';
      case 'ABSENT': return 'A';
      case 'LATE': return 'L';
      case 'EXCUSED': return 'E';
      case 'PERMISSION': return 'S';
      default: return '-';
    }
  };

  // Loading skeleton
  if (!isClient || !user || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
          <div className="p-6"><div className="h-8 bg-gray-200 rounded-lg animate-pulse w-32" /></div>
        </div>
        <div className="lg:ml-64 min-h-screen">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 h-40" />
          <div className="p-8">
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 h-24 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Attendance Reports</h1>
                <p className="text-white/80 mt-1">Monthly attendance summary and statistics</p>
              </div>
            </div>
            <button
              onClick={loadMonthlyAttendance}
              disabled={loading || !selectedClass}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Filters */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    disabled={!selectedAcademicYear || classes.length === 0}
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Navigation */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 px-4 py-2 bg-gray-50 rounded-lg text-center font-medium">
                      {monthName} {selectedYear}
                    </div>
                    <button
                      onClick={goToNextMonth}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedContent>

          <BlurLoader isLoading={loading}>
            {error ? (
              <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">{error}</p>
                <button onClick={loadMonthlyAttendance} className="mt-4 text-teal-600 hover:underline">
                  Try again
                </button>
              </div>
            ) : !selectedClass ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a class to view attendance reports</p>
              </div>
            ) : (
              <>
                {/* Statistics Cards */}
                <AnimatedContent animation="slide-up" delay={100}>
                  <div className="grid md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Students</p>
                          <p className="text-xl font-bold text-gray-900">{statistics.totalStudents}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Percent className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Avg Rate</p>
                          <p className="text-xl font-bold text-teal-600">{statistics.avgAttendance}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Present</p>
                          <p className="text-xl font-bold text-green-600">{statistics.totalPresent}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Absent</p>
                          <p className="text-xl font-bold text-red-600">{statistics.totalAbsent}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Late</p>
                          <p className="text-xl font-bold text-orange-600">{statistics.totalLate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedContent>

                {/* Monthly Grid */}
                <AnimatedContent animation="slide-up" delay={200}>
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                      <h2 className="font-semibold text-gray-900">
                        {selectedClassData?.name} - {monthName} {selectedYear}
                      </h2>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">P = Present</span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">A = Absent</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">L = Late</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">E = Excused</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">S = Permission</span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-700 min-w-[200px]">
                              Student
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                              <th key={day} className="px-1 py-3 text-center font-medium text-gray-700 min-w-[32px]">
                                {day}
                              </th>
                            ))}
                            <th className="px-3 py-3 text-center font-medium text-gray-700 bg-teal-50 min-w-[60px]">
                              Total
                            </th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700 bg-teal-50 min-w-[60px]">
                              Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {monthlyData?.students?.map((student, idx) => {
                            const totalSessions = student.totals.present + student.totals.absent + 
                                                  student.totals.late + student.totals.excused + 
                                                  student.totals.permission;
                            const attendanceRate = totalSessions > 0 
                              ? Math.round(((student.totals.present + student.totals.late) / totalSessions) * 100)
                              : 0;

                            return (
                              <tr key={student.studentId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <td className="sticky left-0 bg-inherit px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    {student.photo ? (
                                      <img src={student.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 truncate">
                                        {student.firstName} {student.lastName}
                                      </p>
                                      <p className="text-xs text-gray-500">{student.studentNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                  const day = i + 1;
                                  const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const dayAttendance = student.attendance[dateKey];
                                  const morningStatus = dayAttendance?.morning?.status;
                                  const afternoonStatus = dayAttendance?.afternoon?.status;
                                  
                                  return (
                                    <td key={day} className="px-0.5 py-1">
                                      <div className="flex flex-col gap-0.5">
                                        <div className={`text-center text-xs py-0.5 rounded ${getStatusCellClass(morningStatus)}`}>
                                          {getStatusLabel(morningStatus)}
                                        </div>
                                        <div className={`text-center text-xs py-0.5 rounded ${getStatusCellClass(afternoonStatus)}`}>
                                          {getStatusLabel(afternoonStatus)}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-center bg-teal-50">
                                  <div className="text-xs space-y-0.5">
                                    <div className="text-green-600">{student.totals.present}P</div>
                                    <div className="text-red-600">{student.totals.absent}A</div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center bg-teal-50">
                                  <span className={`font-bold ${
                                    attendanceRate >= 80 ? 'text-green-600' : 
                                    attendanceRate >= 60 ? 'text-orange-600' : 'text-red-600'
                                  }`}>
                                    {attendanceRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {(!monthlyData?.students || monthlyData.students.length === 0) && (
                      <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No attendance data for this month</p>
                      </div>
                    )}
                  </div>
                </AnimatedContent>
              </>
            )}
          </BlurLoader>
        </div>
      </div>
    </div>
  );
}
