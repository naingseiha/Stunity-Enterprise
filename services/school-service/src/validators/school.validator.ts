/**
 * Zod validation schemas for school registration and related endpoints.
 */

import { z } from 'zod';

const SCHOOL_TYPE = ['PRIMARY_SCHOOL', 'MIDDLE_SCHOOL', 'HIGH_SCHOOL', 'COMPLETE_SCHOOL', 'INTERNATIONAL'] as const;

export const registerSchoolSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters').max(200).trim(),
  email: z.string().email('Valid email is required').max(255),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  adminFirstName: z.string().min(1, 'Admin first name is required').max(100).trim(),
  adminLastName: z.string().min(1, 'Admin last name is required').max(100).trim(),
  adminEmail: z.string().email('Valid admin email is required').max(255),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  adminPhone: z.string().max(30).optional(),
  schoolType: z.enum(SCHOOL_TYPE).default('HIGH_SCHOOL'),
  trialMonths: z.union([z.literal(1), z.literal(3)]).default(3),
});

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;
