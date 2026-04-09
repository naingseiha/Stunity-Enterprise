import { z } from 'zod';

const optionalString = z.union([z.string(), z.null()]).optional();
const optionalBoolean = z.union([z.boolean(), z.null()]).optional();
const optionalStringArray = z.union([z.array(z.string()), z.null()]).optional();

const socialLinksSchema = z
  .object({
    github: optionalString,
    linkedin: optionalString,
    facebook: optionalString,
    portfolio: optionalString,
  })
  .passthrough();

export const profileUpdateSchema = z
  .object({
    firstName: optionalString,
    lastName: optionalString,
    englishFirstName: optionalString,
    englishLastName: optionalString,
    bio: optionalString,
    headline: optionalString,
    professionalTitle: optionalString,
    location: optionalString,
    languages: optionalStringArray,
    interests: optionalStringArray,
    careerGoals: optionalString,
    socialLinks: z.union([socialLinksSchema, z.null()]).optional(),
    profileVisibility: optionalString,
    isOpenToOpportunities: optionalBoolean,
    profilePictureUrl: optionalString,
    coverPhotoUrl: optionalString,
    customFields: z.union([z.record(z.string(), z.unknown()), z.null()]).optional(),
  })
  .passthrough();

export const getProfileValidationMessage = (error: z.ZodError): string =>
  error.issues[0]?.message || 'Invalid profile payload';
