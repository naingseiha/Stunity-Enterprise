import { z } from 'zod';

const optionalString = z.union([z.string(), z.null()]).optional();
const optionalBoolean = z.union([z.boolean(), z.null()]).optional();

export const studentPayloadSchema = z
  .object({
    firstName: optionalString,
    lastName: optionalString,
    khmerName: optionalString,
    englishName: optionalString,
    englishFirstName: optionalString,
    englishLastName: optionalString,
    email: optionalString,
    dateOfBirth: optionalString,
    gender: optionalString,
    placeOfBirth: optionalString,
    currentAddress: optionalString,
    phoneNumber: optionalString,
    classId: optionalString,
    fatherName: optionalString,
    motherName: optionalString,
    parentPhone: optionalString,
    parentOccupation: optionalString,
    previousGrade: optionalString,
    previousSchool: optionalString,
    repeatingGrade: optionalString,
    transferredFrom: optionalString,
    grade9ExamSession: optionalString,
    grade9ExamCenter: optionalString,
    grade9ExamRoom: optionalString,
    grade9ExamDesk: optionalString,
    grade9PassStatus: optionalString,
    grade12ExamSession: optionalString,
    grade12ExamCenter: optionalString,
    grade12ExamRoom: optionalString,
    grade12ExamDesk: optionalString,
    grade12PassStatus: optionalString,
    grade12Track: optionalString,
    remarks: optionalString,
    photoUrl: optionalString,
    isAccountActive: optionalBoolean,
  })
  .passthrough();

export const getStudentValidationMessage = (error: z.ZodError): string =>
  error.issues[0]?.message || 'Invalid student payload';
