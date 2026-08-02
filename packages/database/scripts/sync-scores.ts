import { PrismaClient as StunityPrismaClient } from '@prisma/client';
import { PrismaClient as OldPrismaClient } from '../old-prisma/client';

const stunityDb = new StunityPrismaClient({
  datasourceUrl: "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
});
const oldDb = new OldPrismaClient({
  datasourceUrl: "postgresql://neondb_owner:npg_5jxpTLtY4RvD@ep-damp-cloud-ah8x671v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { grade: '', month: 0, year: 0, dryRun: false };
  for (const arg of args) {
    if (arg.startsWith('--grade=')) options.grade = arg.split('=')[1];
    else if (arg.startsWith('--month=')) options.month = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--year=')) options.year = parseInt(arg.split('=')[1]);
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return options;
}

const MONTH_NAMES: Record<number, string> = {
  1: 'មករា', 2: 'កុម្ភៈ', 3: 'មីនា', 4: 'មេសា',
  5: 'ឧសភា', 6: 'មិថុនា', 7: 'កក្កដា', 8: 'សីហា',
  9: 'កញ្ញា', 10: 'តុលា', 11: 'វិច្ឆិកា', 12: 'ធ្នូ'
};

async function main() {
  const options = parseArgs();
  if (!options.grade || !options.month || !options.year) {
    console.error("Usage: npx tsx sync-scores.ts --grade=7 --month=11 --year=2025 [--dry-run]");
    return;
  }

  console.log(`--- Sync Scores: Grade ${options.grade}, Month ${options.month}/${options.year} ---`);
  console.log(`Mode: ${options.dryRun ? 'DRY-RUN (Verification Only)' : 'EXECUTION'}`);

  try {
    const school = await stunityDb.school.findFirst({
      where: { name: { contains: 'Svaythom' } }
    });
    if (!school) throw new Error("School not found!");

    // 1. Map Classes
    console.log("Fetching classes...");
    const oldClasses = await oldDb.class.findMany({ where: { grade: options.grade } });
    const newClasses = await stunityDb.class.findMany({ where: { schoolId: school.id, grade: options.grade } });
    console.log(`Found ${oldClasses.length} old classes, ${newClasses.length} new classes.`);
    
    const classMap = new Map(); // oldClassId -> newClassId
    const oldClassesMap = new Map(); // oldClassId -> Class
    for (const oc of oldClasses) {
      oldClassesMap.set(oc.id, oc);
      const nc = newClasses.find(c => c.name.trim().toLowerCase() === oc.name.trim().toLowerCase());
      if (nc) classMap.set(oc.id, nc.id);
      else console.warn(`[WARNING] Could not find mapping for class: ${oc.name}`);
    }

    // 2. Map Subjects
    console.log("Fetching subjects...");
    const oldSubjects = await oldDb.subject.findMany({ where: { grade: options.grade } });
    const newSubjects = await stunityDb.subject.findMany({ where: { grade: options.grade } });
    console.log(`Found ${oldSubjects.length} old subjects, ${newSubjects.length} new subjects.`);
    
    const subjectMap = new Map();
    oldSubjects.forEach(oldSubject => {
        // Strict mapping: ID -> Code -> Name + Track
        let newSubject = newSubjects.find(s => s.id === oldSubject.id);
        if (!newSubject) {
          newSubject = newSubjects.find(s => s.code === oldSubject.code && s.code !== null);
        }
        if (!newSubject) {
          newSubject = newSubjects.find(s => 
            (s.name === oldSubject.name || s.nameKh === oldSubject.nameKh) &&
            s.track === oldSubject.track
          );
        }
        
        if (newSubject) {
          subjectMap.set(oldSubject.id, newSubject.id);
        } else {
          console.warn(`Could not map subject: ${oldSubject.name} (${oldSubject.track || 'no track'})`);
        }
      });

    // 3. Map Students
    console.log("Fetching old students...");
    const allOldStudents = await oldDb.student.findMany();
    const oldClassIds = new Set(oldClasses.map(c => c.id));
    const oldStudents = allOldStudents.filter(s => s.classId && oldClassIds.has(s.classId));
    
    console.log("Fetching new students...");
    const newStudents = await stunityDb.student.findMany({ where: { schoolId: school.id } }); // get all in school
    console.log(`Found ${oldStudents.length} old students in Grade ${options.grade}, ${newStudents.length} total new students.`);

    const newStudentMapById = new Map(newStudents.map(s => [s.studentId, s]));
    const newStudentMapByName = new Map(newStudents.map(s => [`${s.firstName.trim().toLowerCase()} ${s.lastName.trim().toLowerCase()}`, s]));

    const studentMap = new Map(); // oldStudentId -> newStudentId
    let unmappedStudents = 0;
    for (const os of oldStudents) {
      let ns = null;
      if (os.studentId) ns = newStudentMapById.get(os.studentId);
      if (!ns) ns = newStudentMapByName.get(`${os.firstName.trim().toLowerCase()} ${os.lastName.trim().toLowerCase()}`);
      
      if (ns) {
        studentMap.set(os.id, ns.id);
      } else {
        console.warn(`[WARNING] Could not find mapping for student: ${os.firstName} ${os.lastName} (ID: ${os.studentId})`);
        unmappedStudents++;
      }
    }

    console.log(`\nMappings Summary:`);
    console.log(`- Classes: ${classMap.size}/${oldClasses.length}`);
    console.log(`- Subjects: ${subjectMap.size}/${oldSubjects.length}`);
    console.log(`- Students: ${studentMap.size}/${oldStudents.length} (Unmapped: ${unmappedStudents})`);

    // --- Execution/Fetching ---
    console.log(`\nFetching grades and summaries for Month ${options.month}/${options.year}...`);
    
    // Convert map to fast arrays/sets for querying
    const oldStudentIds = Array.from(studentMap.keys());
    const oldSubjectIds = Array.from(subjectMap.keys());

    const khmerMonth = MONTH_NAMES[options.month];
    
    // Fetch grades
    const oldGrades = await oldDb.grade.findMany({
      where: {
        OR: [
          { monthNumber: options.month },
          { month: khmerMonth }
        ],
        year: { in: [2025, 2026] },
        studentId: { in: oldStudentIds },
        subjectId: { in: oldSubjectIds }
      }
    });

    // Fetch summaries
    const oldSummaries = await oldDb.studentMonthlySummary.findMany({
      where: {
        OR: [
          { monthNumber: options.month },
          { month: khmerMonth }
        ],
        year: { in: [2025, 2026] },
        studentId: { in: oldStudentIds }
      }
    });

    console.log(`Found ${oldGrades.length} grades and ${oldSummaries.length} summaries to sync.`);

    if (options.dryRun) {
      console.log("\n[DRY RUN] Finished verification.");
      return;
    }

    // Start Transaction to ensure safety? Or bulk create.
    // First, let's clean up existing records for this month to avoid duplicates
    console.log(`Cleaning up existing data for Grade ${options.grade}, Month ${options.month}/${options.year} in New DB...`);
    const newStudentIds = Array.from(studentMap.values());
    const newSubjectIds = Array.from(subjectMap.values());
    
    await stunityDb.grade.deleteMany({
      where: {
        monthNumber: options.month,
        year: options.year,
        studentId: { in: newStudentIds },
        subjectId: { in: newSubjectIds }
      }
    });

    await stunityDb.studentMonthlySummary.deleteMany({
      where: {
        monthNumber: options.month,
        year: options.year,
        studentId: { in: newStudentIds }
      }
    });

    // Prepare bulk insert arrays
    console.log("Preparing data for insertion...");
    const gradesToInsert = oldGrades.map(g => ({
      studentId: studentMap.get(g.studentId),
      subjectId: subjectMap.get(g.subjectId),
      classId: classMap.get(g.classId),
      score: g.score,
      maxScore: g.maxScore,
      month: g.month,
      monthNumber: g.monthNumber || options.month,
      year: options.year,
      percentage: g.percentage
    }));

    const summariesToInsert = oldSummaries.map(s => ({
      studentId: studentMap.get(s.studentId),
      classId: classMap.get(s.classId),
      month: s.month,
      monthNumber: s.monthNumber || options.month,
      year: options.year,
      totalScore: s.totalScore,
      totalMaxScore: s.totalMaxScore,
      totalWeightedScore: s.totalWeightedScore,
      totalCoefficient: s.totalCoefficient,
      average: s.average,
      classRank: s.classRank,
      gradeLevel: s.gradeLevel,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    // Deduplicate grades
    const uniqueGradesMap = new Map<string, any>();
    for (const g of gradesToInsert) {
      const key = `${g.studentId}-${g.subjectId}-${g.month}-${g.year}`;
      uniqueGradesMap.set(key, g); // Will keep the last one if duplicates exist
    }
    const finalGradesToInsert = Array.from(uniqueGradesMap.values());

    // Deduplicate summaries
    const uniqueSummariesMap = new Map<string, any>();
    for (const s of summariesToInsert) {
      const key = `${s.studentId}-${s.month}-${s.year}`;
      uniqueSummariesMap.set(key, s); // Will keep the last one if duplicates exist
    }
    const finalSummariesToInsert = Array.from(uniqueSummariesMap.values());

    console.log("Inserting into Stunity DB...");
    // Insert Grades in batches if too large
    if (finalGradesToInsert.length > 0) {
      await stunityDb.grade.createMany({
        data: finalGradesToInsert,
        skipDuplicates: true
      });
    }

    if (finalSummariesToInsert.length > 0) {
      await stunityDb.studentMonthlySummary.createMany({
        data: finalSummariesToInsert,
        skipDuplicates: true
      });
    }

    console.log(`Successfully synced ${finalGradesToInsert.length} grades and ${finalSummariesToInsert.length} summaries!`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await stunityDb.$disconnect();
    await oldDb.$disconnect();
  }
}

main();
