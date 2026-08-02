export type EnrollmentPeriod = {
  startedAt: Date;
  endedAt: Date | null;
};

/** Enrollment boundaries are [startedAt, endedAt): start inclusive, end exclusive. */
export function enrollmentOverlapsPeriod(
  enrollment: EnrollmentPeriod,
  periodStart: Date,
  periodEnd: Date
) {
  return enrollment.startedAt <= periodEnd &&
    (enrollment.endedAt === null || enrollment.endedAt > periodStart);
}

export function assertTransferDateIsValid(
  effectiveAt: Date,
  academicYear: { startDate: Date; endDate: Date },
  sourceEnrollment?: { startedAt: Date } | null
) {
  if (Number.isNaN(effectiveAt.getTime())) {
    throw new Error('VALIDATION: effectiveDate must be a valid date');
  }
  if (effectiveAt < academicYear.startDate || effectiveAt > academicYear.endDate) {
    throw new Error('VALIDATION: Transfer date must fall within the target academic year');
  }
  if (sourceEnrollment && effectiveAt < sourceEnrollment.startedAt) {
    throw new Error('VALIDATION: Transfer date cannot be before the current enrollment start date');
  }
}
