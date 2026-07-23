import { z } from 'zod';

const optionalString = z.union([z.string(), z.null()]).optional();
const optionalStringArray = z.array(z.string()).optional();

export const teacherPayloadSchema = z
  .object({
    firstName: optionalString,
    lastName: optionalString,
    khmerName: optionalString,
    englishName: optionalString,
    englishFirstName: optionalString,
    englishLastName: optionalString,
    email: optionalString,
    phone: optionalString,
    employeeId: optionalString,
    gender: optionalString,
    dateOfBirth: optionalString,
    position: optionalString,
    hireDate: optionalString,
    address: optionalString,
    role: optionalString,
    degree: optionalString,
    emergencyContact: optionalString,
    emergencyPhone: optionalString,
    idCard: optionalString,
    major1: optionalString,
    major2: optionalString,
    nationality: optionalString,
    passport: optionalString,
    salaryRange: optionalString,
    workingLevel: optionalString,
    homeroomClassId: optionalString,
    subjectIds: optionalStringArray,
    classIds: optionalStringArray,
  })
  .passthrough();

export const getTeacherValidationMessage = (error: z.ZodError): string =>
  error.issues[0]?.message || 'Invalid teacher payload';
