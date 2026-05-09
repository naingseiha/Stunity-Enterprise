/**
 * Repairs Svaythom MOEYS student records whose official native name fields
 * were populated with Latin/English names while Khmer names remain in
 * customFields.regional.khmerName.
 *
 * Dry run:
 *   npx tsx scripts/admin/fix-svaythom-moeys-student-names.ts
 *
 * Apply:
 *   npx tsx scripts/admin/fix-svaythom-moeys-student-names.ts --write
 *
 * Defaults to grades 10, 11, and 12. Override with GRADES=10,11,12 or
 * SCHOOL_NAME="Svaythom High School".
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

const WRITE = process.argv.includes('--write');
const SCHOOL_NAME = (process.env.SCHOOL_NAME || 'Svaythom High School').trim();
const GRADES = (process.env.GRADES || '10,11,12')
  .split(',')
  .map((grade) => grade.trim())
  .filter(Boolean);

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

function readRegional(customFields: unknown): Record<string, unknown> {
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return {};
  }

  const regional = (customFields as { regional?: unknown }).regional;
  if (!regional || typeof regional !== 'object' || Array.isArray(regional)) {
    return {};
  }

  return regional as Record<string, unknown>;
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

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      isAccountActive: true,
      studentClasses: {
        some: {
          status: 'ACTIVE',
          class: {
            grade: { in: GRADES },
          },
        },
      },
    },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      englishFirstName: true,
      englishLastName: true,
      customFields: true,
      studentClasses: {
        where: {
          status: 'ACTIVE',
          class: {
            grade: { in: GRADES },
          },
        },
        select: {
          class: {
            select: {
              name: true,
              grade: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' },
    ],
  });

  const candidates = students
    .map((student) => {
      const regional = readRegional(student.customFields);
      const khmerName = normalizeText(
        typeof regional.khmerName === 'string' ? regional.khmerName : null
      );
      const currentFirstName = normalizeText(student.firstName);
      const currentLastName = normalizeText(student.lastName);
      const currentOfficialName = `${currentLastName} ${currentFirstName}`.trim();
      const hasLatinOfficialName = hasLatin(currentFirstName) || hasLatin(currentLastName);

      if (!khmerName || !hasKhmer(khmerName) || !hasLatinOfficialName) {
        return null;
      }

      const nextNativeName = splitKhmerName(khmerName);
      const nextEnglishFirstName = normalizeText(student.englishFirstName) || currentFirstName || null;
      const nextEnglishLastName = normalizeText(student.englishLastName) || currentLastName || null;
      const activeClass = student.studentClasses[0]?.class;

      return {
        id: student.id,
        studentId: student.studentId || student.id,
        className: activeClass?.name || 'No class',
        grade: activeClass?.grade || 'unknown',
        beforeNative: currentOfficialName,
        beforeEnglish: [student.englishLastName, student.englishFirstName].filter(Boolean).join(' '),
        khmerName,
        nextFirstName: nextNativeName.firstName,
        nextLastName: nextNativeName.lastName,
        nextEnglishFirstName,
        nextEnglishLastName,
        customFields: student.customFields,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      studentId: string;
      className: string;
      grade: string;
      beforeNative: string;
      beforeEnglish: string;
      khmerName: string;
      nextFirstName: string;
      nextLastName: string;
      nextEnglishFirstName: string | null;
      nextEnglishLastName: string | null;
      customFields: unknown;
    }>;

  console.log(`School: ${school.name} (${school.educationModel}, ${school.countryCode})`);
  console.log(`Grades scanned: ${GRADES.join(', ')}`);
  console.log(`Students scanned: ${students.length}`);
  console.log(`Candidates found: ${candidates.length}`);
  console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);

  for (const candidate of candidates) {
    console.log(
      [
        `- ${candidate.studentId}`,
        candidate.className,
        `official "${candidate.beforeNative}" -> "${candidate.nextLastName} ${candidate.nextFirstName}"`,
        `english "${candidate.beforeEnglish || '(blank)'}" -> "${[
          candidate.nextEnglishLastName,
          candidate.nextEnglishFirstName,
        ].filter(Boolean).join(' ')}"`,
      ].join(' | ')
    );

    if (!WRITE) continue;

    const existingCustomFields =
      candidate.customFields && typeof candidate.customFields === 'object' && !Array.isArray(candidate.customFields)
        ? candidate.customFields as Record<string, unknown>
        : {};
    const regional = readRegional(existingCustomFields);

    await prisma.student.update({
      where: { id: candidate.id },
      data: {
        firstName: candidate.nextFirstName,
        lastName: candidate.nextLastName,
        englishFirstName: candidate.nextEnglishFirstName,
        englishLastName: candidate.nextEnglishLastName,
        customFields: {
          ...existingCustomFields,
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
  }

  if (WRITE) {
    console.log(`Updated ${candidates.length} student records.`);
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
