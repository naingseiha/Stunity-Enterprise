const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface AttendanceGridData {
  classId: string;
  className: string;
  month: string;
  year: number;
  monthNumber: number;
  daysInMonth: number;
  days: number[];
  students: Array<{
    studentId: string;
    studentName: string;
    gender: string;
    attendance: {
      [key: string]: {
        // ⭐ Key format: "day_M" or "day_A"
        id: string | null;
        status: string | null;
        displayValue: string;
        isSaved: boolean;
        session: "MORNING" | "AFTERNOON";
      };
    };
    totalAbsent: number;
    totalPermission: number;
  }>;
}

export interface BulkSaveAttendanceItem {
  studentId: string;
  day: number;
  session?: "M" | "A";
  value: string;
}

export const attendanceApi = {
  async getAttendanceGrid(
    classId: string,
    month: string,
    year: number
  ): Promise<AttendanceGridData> {
    const response = await fetch(
      `${API_BASE_URL}/attendance/grid/${classId}?month=${encodeURIComponent(
        month
      )}&year=${year}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch attendance grid");
    }

    const data = await response.json();
    return data.data;
  },

  async bulkSaveAttendance(
    classId: string,
    month: string,
    year: number,
    monthNumber: number,
    attendance: BulkSaveAttendanceItem[]
  ): Promise<{ savedCount: number; errorCount: number }> {
    // ✅ OPTIMIZATION: Use keepalive for faster requests
    const response = await fetch(`${API_BASE_URL}/attendance/bulk-save`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classId, month, year, monthNumber, attendance }),
      keepalive: true,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save attendance");
    }

    const data = await response.json();
    return data.data;
  },

  async getMonthlySummary(
    classId: string,
    month: string,
    year: number
  ): Promise<{ [studentId: string]: { absent: number; permission: number } }> {
    const url = `${API_BASE_URL}/attendance/summary/${classId}?month=${encodeURIComponent(
      month
    )}&year=${year}`;

    const response = await fetch(url, { headers: getAuthHeaders() });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch attendance summary");
    }

    const data = await response.json();
    return data.data;
  },
};
