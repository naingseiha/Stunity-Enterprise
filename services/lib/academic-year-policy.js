/**
 * Enterprise safety rule for attendance/grade mutations. Historical and
 * planning years remain queryable, but operational records can be changed only
 * in the school's single ACTIVE + current year.
 */
function getAcademicYearWriteBlock(academicYear, recordDate) {
  if (academicYear.status !== 'ACTIVE' || !academicYear.isCurrent) {
    return {
      code: 'ACADEMIC_YEAR_READ_ONLY',
      message: `Academic year ${academicYear.name || academicYear.id} is read-only. Historical and planning years can be viewed or exported but not changed.`,
    };
  }

  if (recordDate && !Number.isNaN(recordDate.getTime())) {
    const value = Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate());
    const start = Date.UTC(
      academicYear.startDate.getUTCFullYear(),
      academicYear.startDate.getUTCMonth(),
      academicYear.startDate.getUTCDate(),
    );
    const end = Date.UTC(
      academicYear.endDate.getUTCFullYear(),
      academicYear.endDate.getUTCMonth(),
      academicYear.endDate.getUTCDate(),
    );
    if (value < start || value > end) {
      return {
        code: 'ACADEMIC_YEAR_DATE_OUT_OF_RANGE',
        message: `The record date is outside academic year ${academicYear.name || academicYear.id}.`,
      };
    }
  }

  return null;
}

module.exports = { getAcademicYearWriteBlock };
