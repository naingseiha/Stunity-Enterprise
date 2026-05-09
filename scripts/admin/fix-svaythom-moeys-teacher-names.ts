/**
 * Repairs Svaythom MOEYS teacher records whose official native name fields
 * were populated with Latin/English names while Khmer names remain in
 * customFields.regional.khmerName or customFields.khmerName.
 *
 * Dry run:
 *   npx tsx scripts/admin/fix-svaythom-moeys-teacher-names.ts
 *
 * Apply:
 *   npx tsx scripts/admin/fix-svaythom-moeys-teacher-names.ts --write
 *
 * Override target school with SCHOOL_NAME="Svaythom High School".
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

const WRITE = process.argv.includes('--write');
const SCHOOL_NAME = (process.env.SCHOOL_NAME || 'Svaythom High School').trim();

const KHMER_RE = /[\u1780-\u17ff]/;
const LATIN_RE = /[A-Za-z]/;

function hasKhmer(value?: string | null) {
  return KHMER_RE.test(value || '');
}

function hasLatin(value?: string | null) {
  return LATIN_RE.test(value || '');
}

function normalizeText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function readCustomFields(customFields: unknown): Record<string, unknown> {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return {};
  }

  return customFields as Record<string, unknown>;
}

function readRegional(customFields: unknown): Record<string, unknown> {
  const fields = readCustomFields(customFields);
  const regional = fields.regional;
  if (!regional || typeof regional !== 'object' || Array.isArray(regional)) {
    return {};
  }

  return regional as Record<string, unknown>;
}

function readKhmerName(customFields: unknown) {
  const fields = readCustomFields(customFields);
  const regional = readRegional(customFields);
  return normalizeText(
    typeof regional.khmerName === 'string'
      ? regional.khmerName
      : typeof fields.khmerName === 'string'
        ? fields.khmerName
        : null
  );
}

function splitKhmerName(fullName: string) {
  const parts = normalizeText(fullName).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lastName: fullName, firstName: fullName };
  }

  return {
    lastName: parts[0]!,
    firstName: parts.slice(1).join(' '),
  };
}

async function main() {
  const school = await prisma.school.findFirst({
    where: {
      name: {
        equals: SCHOOL_NAME,
        mode: 'insensitive',
      },
      countryCode: 'KH',
      educationModel: 'KHM_MOEYS',
    },
    select: {
      id: true,
      name: true,
      countryCode: true,
      educationModel: true,
    },
  });

  if (!school) {
    throw new Error(`No Cambodia MOEYS school found for "${SCHOOL_NAME}"`);
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      schoolId: school.id,
    },
    select: {
      id: true,
      teacherId: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      englishFirstName: true,
      englishLastName: true,
      customFields: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          englishFirstName: true,
          englishLastName: true,
        },
      },
      homeroomClass: {
        select: {
          name: true,
        },
      },
      teacherClasses: {
        select: {
          class: {
            select: {
              name: true,
            },
          },
        },
        take: 3,
      },
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
    ],
  });

  const candidates = teachers
    .map((teacher) => {
      const khmerName = readKhmerName(teacher.customFields);
      const currentFirstName = normalizeText(teacher.firstName);
      const currentLastName = normalizeText(teacher.lastName);
      const currentOfficialName = `${currentLastName} ${currentFirstName}`.trim();
      const hasLatinOfficialName = hasLatin(currentFirstName) || hasLatin(currentLastName);

      if (!khmerName || !hasKhmer(khmerName) || !hasLatinOfficialName) {
        return null;
      }

      const nextNativeName = splitKhmerName(khmerName);
      const nextEnglishFirstName = normalizeText(teacher.englishFirstName) || currentFirstName || null;
      const nextEnglishLastName = normalizeText(teacher.englishLastName) || currentLastName || null;
      const classNames = [
        teacher.homeroomClass?.name,
        ...teacher.teacherClasses.map((entry) => entry.class.name),
      ].filter(Boolean);

      return {
        id: teacher.id,
        teacherNumber: teacher.teacherId || teacher.employeeId || teacher.id,
        classLabel: Array.from(new Set(classNames)).join(', ') || 'No class assignment',
        beforeNative: currentOfficialName,
        beforeEnglish: [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' '),
        khmerName,
        nextFirstName: nextNativeName.firstName,
        nextLastName: nextNativeName.lastName,
        nextEnglishFirstName,
        nextEnglishLastName,
        customFields: teacher.customFields,
        user: teacher.user,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      teacherNumber: string;
      classLabel: string;
      beforeNative: string;
      beforeEnglish: string;
      khmerName: string;
      nextFirstName: string;
      nextLastName: string;
      nextEnglishFirstName: string | null;
      nextEnglishLastName: string | null;
      customFields: unknown;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        englishFirstName: string | null;
        englishLastName: string | null;
      } | null;
    }>;

  console.log(`School: ${school.name} (${school.educationModel}, ${school.countryCode})`);
  console.log(`Teachers scanned: ${teachers.length}`);
  console.log(`Candidates found: ${candidates.length}`);
  console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);

  for (const candidate of candidates) {
    const englishDisplay = [
      candidate.nextEnglishLastName,
      candidate.nextEnglishFirstName,
    ].filter(Boolean).join(' ');

    console.log(
      [
        `- ${candidate.teacherNumber}`,
        candidate.classLabel,
        `official "${candidate.beforeNative}" -> "${candidate.nextLastName} ${candidate.nextFirstName}"`,
        `english "${candidate.beforeEnglish || '(blank)'}" -> "${englishDisplay}"`,
        candidate.user ? `linked user ${candidate.user.id}` : 'no linked user',
      ].join(' | ')
    );

    if (!WRITE) continue;

    const existingCustomFields = readCustomFields(candidate.customFields);
    const regional = readRegional(existingCustomFields);

    await prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: candidate.id },
        data: {
          firstName: candidate.nextFirstName,
          lastName: candidate.nextLastName,
          englishFirstName: candidate.nextEnglishFirstName,
          englishLastName: candidate.nextEnglishLastName,
          customFields: {
            ...existingCustomFields,
            khmerName: candidate.khmerName,
            regional: {
              ...regional,
              khmerName: candidate.khmerName,
              englishName: [
                candidate.nextEnglishFirstName,
                candidate.nextEnglishLastName,
              ].filter(Boolean).join(' ') || null,
            },
          },
        },
      });

      if (candidate.user) {
        await tx.user.update({
          where: { id: candidate.user.id },
          data: {
            firstName: candidate.nextFirstName,
            lastName: candidate.nextLastName,
            englishFirstName: candidate.nextEnglishFirstName,
            englishLastName: candidate.nextEnglishLastName,
          },
        });
      }
    });
  }

  if (WRITE) {
    console.log(`Updated ${candidates.length} teacher records.`);
  } else {
    console.log('No records were changed. Re-run with --write to apply.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
