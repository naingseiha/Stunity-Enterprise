export const APPLY_CONFIRMATION = "GENERATE_STUDENT_LAUNCH_CODES";

function readValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value.trim();
}

export function parseLaunchArgs(argv, env = process.env) {
  const options = {
    apply: false,
    confirmation: "",
    schoolId: String(env.SCHOOL_ID || "").trim(),
    academicYearId: String(env.ACADEMIC_YEAR_ID || "").trim(),
    expiresInDays: 30,
    sampleLimit: 20,
    output: "",
    json: false,
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
    else if (arg === "--expires-in-days") options.expiresInDays = Number.parseInt(readValue(argv, index++, arg), 10);
    else if (arg.startsWith("--expires-in-days=")) options.expiresInDays = Number.parseInt(arg.slice(18), 10);
    else if (arg === "--sample-limit") options.sampleLimit = Number.parseInt(readValue(argv, index++, arg), 10);
    else if (arg.startsWith("--sample-limit=")) options.sampleLimit = Number.parseInt(arg.slice(15), 10);
    else if (arg === "--output") options.output = readValue(argv, index++, arg);
    else if (arg.startsWith("--output=")) options.output = arg.slice(9).trim();
    else if (arg === "--confirm") options.confirmation = readValue(argv, index++, arg);
    else if (arg.startsWith("--confirm=")) options.confirmation = arg.slice(10).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.expiresInDays) || options.expiresInDays < 7 || options.expiresInDays > 365) {
    throw new Error("--expires-in-days must be an integer between 7 and 365");
  }
  if (!Number.isInteger(options.sampleLimit) || options.sampleLimit < 0 || options.sampleLimit > 100) {
    throw new Error("--sample-limit must be an integer between 0 and 100");
  }
  return options;
}

export function validateLaunchScope(options) {
  return options.schoolId ? [] : ["SCHOOL_ID or --school-id is required"];
}

export function validateApplyAuthorization(options, env = process.env, path = null) {
  if (!options.apply) return [];
  const errors = [];
  if (env.ALLOW_CLAIM_CODE_LAUNCH !== "1") errors.push("ALLOW_CLAIM_CODE_LAUNCH=1 is required with --apply");
  if (options.confirmation !== APPLY_CONFIRMATION) errors.push(`--confirm=${APPLY_CONFIRMATION} is required with --apply`);
  if (!options.output) errors.push("--output=<absolute-new-csv-path> is required with --apply");
  else if (path && !path.isAbsolute(options.output)) errors.push("--output must be an absolute path");
  return errors;
}

export function classifyLaunchReadiness(report) {
  const blockers = [...(report.blockers || [])];
  const warnings = [...(report.warnings || [])];
  if ((report.currentYearStudentCount || 0) === 0) blockers.push("The selected academic year has no active canonical students");
  if ((report.duplicateActiveCodeStudentCount || 0) > 0) {
    blockers.push(`${report.duplicateActiveCodeStudentCount} student(s) have multiple active unclaimed Claim Codes`);
  }
  if ((report.protectedPendingStudentCount || 0) > 0) {
    warnings.push(`${report.protectedPendingStudentCount} student(s) with pending school links are protected from rotation`);
  }
  return { ok: blockers.length === 0, blockers, warnings };
}

export function plannedCredentialCount(report) {
  return (report.expiredCodeStudentCount || 0) + (report.missingCodeStudentCount || 0);
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
