export type AttendanceSummaryRange = 'day' | 'week' | 'month' | 'semester' | (string & {});

export type AttendanceAcademicYearScope = {
  id: string;
  startDate: string;
  endDate: string;
};

export function formatLocalDateEnCa(value: Date): string {
  return value.toLocaleDateString('en-CA');
}

/** Resolve a dashboard range inside the selected academic-year boundaries. */
export function getAttendanceSummaryDateRange(
  dateRange: AttendanceSummaryRange,
  now: Date = new Date(),
  academicYear?: Pick<AttendanceAcademicYearScope, 'startDate' | 'endDate'> | null,
): { startDate: string; endDate: string } {
  const yearStart = academicYear ? new Date(academicYear.startDate) : null;
  const yearEnd = academicYear ? new Date(academicYear.endDate) : null;
  const hasValidYearBounds = Boolean(
    yearStart &&
      yearEnd &&
      Number.isFinite(yearStart.getTime()) &&
      Number.isFinite(yearEnd.getTime()) &&
      yearStart <= yearEnd,
  );
  const anchor = new Date(now);
  if (hasValidYearBounds && yearStart && yearEnd) {
    if (anchor < yearStart) anchor.setTime(yearStart.getTime());
    if (anchor > yearEnd) anchor.setTime(yearEnd.getTime());
  }
  let start = new Date(anchor);
  let end = new Date(anchor);

  if (/^\d{4}-\d{2}$/.test(dateRange)) {
    const [year, month] = dateRange.split('-').map(Number);
    start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0);
    let endToUse = endOfMonth > anchor ? anchor : endOfMonth;
    if (hasValidYearBounds && yearStart && yearEnd) {
      if (start < yearStart) start = new Date(yearStart);
      if (endToUse > yearEnd) endToUse = new Date(yearEnd);
    }
    return {
      startDate: formatLocalDateEnCa(start),
      endDate: formatLocalDateEnCa(endToUse),
    };
  }

  if (dateRange === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'week') {
    const mondayBase = new Date(anchor);
    const day = mondayBase.getDay();
    const diff = mondayBase.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(mondayBase.setDate(diff));
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'semester') {
    start = new Date(anchor);
    start.setMonth(anchor.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  }

  if (hasValidYearBounds && yearStart && yearEnd) {
    if (start < yearStart) start = new Date(yearStart);
    if (end > yearEnd) end = new Date(yearEnd);
  }

  return {
    startDate: formatLocalDateEnCa(start),
    endDate: formatLocalDateEnCa(end),
  };
}
