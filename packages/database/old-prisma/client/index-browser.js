
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  classId: 'classId',
  date: 'date',
  status: 'status',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  session: 'session'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  classId: 'classId',
  name: 'name',
  grade: 'grade',
  section: 'section',
  academicYear: 'academicYear',
  capacity: 'capacity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  track: 'track',
  homeroomTeacherId: 'homeroomTeacherId'
};

exports.Prisma.GradeScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  subjectId: 'subjectId',
  classId: 'classId',
  score: 'score',
  maxScore: 'maxScore',
  month: 'month',
  monthNumber: 'monthNumber',
  year: 'year',
  percentage: 'percentage',
  weightedScore: 'weightedScore',
  remarks: 'remarks',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GradeConfirmationScalarFieldEnum = {
  id: 'id',
  classId: 'classId',
  subjectId: 'subjectId',
  month: 'month',
  year: 'year',
  isConfirmed: 'isConfirmed',
  confirmedBy: 'confirmedBy',
  confirmedAt: 'confirmedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentMonthlySummaryScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  classId: 'classId',
  month: 'month',
  monthNumber: 'monthNumber',
  year: 'year',
  totalScore: 'totalScore',
  totalMaxScore: 'totalMaxScore',
  totalWeightedScore: 'totalWeightedScore',
  totalCoefficient: 'totalCoefficient',
  average: 'average',
  classRank: 'classRank',
  gradeLevel: 'gradeLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  firstName: 'firstName',
  lastName: 'lastName',
  khmerName: 'khmerName',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  englishName: 'englishName',
  email: 'email',
  placeOfBirth: 'placeOfBirth',
  currentAddress: 'currentAddress',
  phoneNumber: 'phoneNumber',
  classId: 'classId',
  fatherName: 'fatherName',
  motherName: 'motherName',
  parentPhone: 'parentPhone',
  parentOccupation: 'parentOccupation',
  previousGrade: 'previousGrade',
  remarks: 'remarks',
  photoUrl: 'photoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  grade12ExamCenter: 'grade12ExamCenter',
  grade12ExamDesk: 'grade12ExamDesk',
  grade12ExamRoom: 'grade12ExamRoom',
  grade12ExamSession: 'grade12ExamSession',
  grade12PassStatus: 'grade12PassStatus',
  grade12Track: 'grade12Track',
  grade9ExamCenter: 'grade9ExamCenter',
  grade9ExamDesk: 'grade9ExamDesk',
  grade9ExamRoom: 'grade9ExamRoom',
  grade9ExamSession: 'grade9ExamSession',
  grade9PassStatus: 'grade9PassStatus',
  previousSchool: 'previousSchool',
  repeatingGrade: 'repeatingGrade',
  transferredFrom: 'transferredFrom',
  accountDeactivatedAt: 'accountDeactivatedAt',
  deactivationReason: 'deactivationReason',
  isAccountActive: 'isAccountActive',
  studentRole: 'studentRole'
};

exports.Prisma.ParentScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  firstName: 'firstName',
  lastName: 'lastName',
  khmerName: 'khmerName',
  englishName: 'englishName',
  gender: 'gender',
  email: 'email',
  phone: 'phone',
  address: 'address',
  relationship: 'relationship',
  occupation: 'occupation',
  emergencyPhone: 'emergencyPhone',
  isAccountActive: 'isAccountActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentParentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  parentId: 'parentId',
  isPrimary: 'isPrimary',
  relationship: 'relationship',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectTeacherScalarFieldEnum = {
  id: 'id',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  nameKh: 'nameKh',
  nameEn: 'nameEn',
  code: 'code',
  description: 'description',
  grade: 'grade',
  track: 'track',
  category: 'category',
  weeklyHours: 'weeklyHours',
  annualHours: 'annualHours',
  maxScore: 'maxScore',
  coefficient: 'coefficient',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeacherClassScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  classId: 'classId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  firstName: 'firstName',
  lastName: 'lastName',
  khmerName: 'khmerName',
  email: 'email',
  phone: 'phone',
  employeeId: 'employeeId',
  gender: 'gender',
  dateOfBirth: 'dateOfBirth',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  address: 'address',
  hireDate: 'hireDate',
  homeroomClassId: 'homeroomClassId',
  role: 'role',
  englishName: 'englishName',
  degree: 'degree',
  emergencyContact: 'emergencyContact',
  emergencyPhone: 'emergencyPhone',
  idCard: 'idCard',
  major1: 'major1',
  major2: 'major2',
  nationality: 'nationality',
  passport: 'passport',
  phoneNumber: 'phoneNumber',
  salaryRange: 'salaryRange',
  workingLevel: 'workingLevel'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  firstName: 'firstName',
  lastName: 'lastName',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  failedAttempts: 'failedAttempts',
  isActive: 'isActive',
  lastLogin: 'lastLogin',
  lockedUntil: 'lockedUntil',
  loginCount: 'loginCount',
  permissions: 'permissions',
  phone: 'phone',
  studentId: 'studentId',
  teacherId: 'teacherId',
  role: 'role',
  accountSuspendedAt: 'accountSuspendedAt',
  isDefaultPassword: 'isDefaultPassword',
  isSuperAdmin: 'isSuperAdmin',
  lastPasswordHashes: 'lastPasswordHashes',
  passwordChangedAt: 'passwordChangedAt',
  passwordExpiresAt: 'passwordExpiresAt',
  passwordResetExpiry: 'passwordResetExpiry',
  passwordResetToken: 'passwordResetToken',
  suspensionReason: 'suspensionReason',
  parentId: 'parentId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  adminId: 'adminId',
  teacherId: 'teacherId',
  action: 'action',
  reason: 'reason',
  details: 'details',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  PERMISSION: 'PERMISSION',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED'
};

exports.AttendanceSession = exports.$Enums.AttendanceSession = {
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON'
};

exports.Gender = exports.$Enums.Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
};

exports.StudentRole = exports.$Enums.StudentRole = {
  GENERAL: 'GENERAL',
  CLASS_LEADER: 'CLASS_LEADER',
  VICE_LEADER_1: 'VICE_LEADER_1',
  VICE_LEADER_2: 'VICE_LEADER_2'
};

exports.ParentRelationship = exports.$Enums.ParentRelationship = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  GUARDIAN: 'GUARDIAN',
  STEP_FATHER: 'STEP_FATHER',
  STEP_MOTHER: 'STEP_MOTHER',
  GRANDPARENT: 'GRANDPARENT',
  OTHER: 'OTHER'
};

exports.TeacherRole = exports.$Enums.TeacherRole = {
  TEACHER: 'TEACHER',
  INSTRUCTOR: 'INSTRUCTOR'
};

exports.DegreeLevel = exports.$Enums.DegreeLevel = {
  CERTIFICATE: 'CERTIFICATE',
  ASSOCIATE: 'ASSOCIATE',
  BACHELOR: 'BACHELOR',
  MASTER: 'MASTER',
  DOCTORATE: 'DOCTORATE',
  OTHER: 'OTHER'
};

exports.WorkingLevel = exports.$Enums.WorkingLevel = {
  FRAMEWORK_A: 'FRAMEWORK_A',
  FRAMEWORK_B: 'FRAMEWORK_B',
  FRAMEWORK_C: 'FRAMEWORK_C',
  CONTRACT: 'CONTRACT',
  PROBATION: 'PROBATION'
};

exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  STAFF: 'STAFF'
};

exports.Prisma.ModelName = {
  Attendance: 'Attendance',
  Class: 'Class',
  Grade: 'Grade',
  GradeConfirmation: 'GradeConfirmation',
  StudentMonthlySummary: 'StudentMonthlySummary',
  Student: 'Student',
  Parent: 'Parent',
  StudentParent: 'StudentParent',
  SubjectTeacher: 'SubjectTeacher',
  Subject: 'Subject',
  TeacherClass: 'TeacherClass',
  Teacher: 'Teacher',
  User: 'User',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
