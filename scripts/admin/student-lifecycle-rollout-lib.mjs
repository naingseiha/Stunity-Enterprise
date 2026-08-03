export const APPLY_CONFIRMATION = "BACKFILL_STUDENT_CLASSES";

function readValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value.trim();
}

export function parseRolloutArgs(argv, env = process.env) {
  const options = {
    apply: false,
    confirmation: "",
    schoolId: String(env.SCHOOL_ID || "").trim(),
    academicYearId: String(env.ACADEMIC_YEAR_ID || "").trim(),
    json: false,
    sampleLimit: 20,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--school-id") options.schoolId = readValue(argv, index++, arg);
    else if (arg.startsWith("--school-id=")) options.schoolId = arg.slice(12).trim();
    else if (arg === "--academic-year-id") options.academicYearId = readValue(argv, index++, arg);
    else if (arg.startsWith("--academic-year-id=")) options.academicYearId = arg.slice(19).trim();
    else if (arg === "--confirm") options.confirmation = readValue(argv, index++, arg);
    else if (arg.startsWith("--confirm=")) options.confirmation = arg.slice(10).trim();
    else if (arg === "--sample-limit") {
      options.sampleLimit = Number.parseInt(readValue(argv, index++, arg), 10);
    } else if (arg.startsWith("--sample-limit=")) {
      options.sampleLimit = Number.parseInt(arg.slice(15), 10);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.sampleLimit) || options.sampleLimit < 0 || options.sampleLimit > 100) {
    throw new Error("--sample-limit must be an integer between 0 and 100");
  }

  return options;
}

export function validateRolloutScope(options) {
  const errors = [];
  if (!options.schoolId) errors.push("SCHOOL_ID or --school-id is required");
  return errors;
}

export function validateApplyAuthorization(options, env = process.env) {
  if (!options.apply) return [];

  const errors = [];
  if (options.confirmation !== APPLY_CONFIRMATION) {
    errors.push(`--confirm=${APPLY_CONFIRMATION} is required with --apply`);
  }
  if (env.ALLOW_STUDENT_LIFECYCLE_BACKFILL !== "1") {
    errors.push("ALLOW_STUDENT_LIFECYCLE_BACKFILL=1 is required with --apply");
  }
  return errors;
}

export function classifyRolloutReadiness(report) {
  const blockers = [...(report.blockers || [])];
  const warnings = [...(report.warnings || [])];

  if (report.conflictingEnrollmentCount > 0) {
    blockers.push(
      `${report.conflictingEnrollmentCount} legacy class assignment(s) conflict with existing StudentClass rows`,
    );
  }
  if (report.unrecognizedEnrollmentStatusCount > 0) {
    blockers.push(
      `${report.unrecognizedEnrollmentStatusCount} student(s) have only unrecognized enrollment statuses`,
    );
  }
  if (report.duplicateEffectiveEnrollmentCount > 0) {
    warnings.push(
      `${report.duplicateEffectiveEnrollmentCount} student-year group(s) have multiple effective enrollment rows`,
    );
  }
  if (report.outsideAcademicYearCount > 0) {
    warnings.push(
      `${report.outsideAcademicYearCount} active SIS record(s) are outside the selected academic-year census`,
    );
  }
  const unusableClaimCodes =
    (report.flaggedActiveUnclaimedClaimCodeCount || 0) -
    (report.usableUnclaimedClaimCodeCount || 0);
  if (unusableClaimCodes > 0) {
    warnings.push(
      `${unusableClaimCodes} claim code(s) are flagged active/unclaimed but are not currently usable`,
    );
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  };
}

export function buildDeterministicBackfillId(studentId, classId, academicYearId) {
  return `student_class_backfill:${studentId}:${classId}:${academicYearId}`;
}
