import { subjectsApi } from "@/lib/api/subjects";
import {
  generateSubjectsForGrade,
  getAvailableGrades,
} from "@/data/defaultSubjects";

export interface SeedResult {
  success: boolean;
  created: number;
  failed: number;
  errors: string[];
}

/**
 * Seed default subjects for all grades
 */
export async function seedDefaultSubjects(): Promise<SeedResult> {
  console.log("🌱 Starting to seed default subjects...");

  const result: SeedResult = {
    success: true,
    created: 0,
    failed: 0,
    errors: [],
  };

  try {
    const grades = getAvailableGrades();
    console.log(`📚 Found ${grades.length} grades:`, grades);

    for (const grade of grades) {
      const gradeNum = parseInt(grade);

      // Grades 7-10: No track
      if (gradeNum >= 7 && gradeNum <= 10) {
        const subjects = generateSubjectsForGrade(grade);
        console.log(`\n📖 Grade ${grade}: ${subjects.length} subjects`);

        for (const subject of subjects) {
          try {
            await subjectsApi.create(subject as any);
            result.created++;
            console.log(`  ✅ ${subject.nameKh} (${subject.code})`);
          } catch (error: any) {
            result.failed++;
            const errorMsg = `Failed to create ${subject.nameKh}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(`  ❌ ${errorMsg}`);
          }
        }
      }

      // Grades 11-12: With tracks (science/social)
      if (gradeNum >= 11 && gradeNum <= 12) {
        // Science track
        const scienceSubjects = generateSubjectsForGrade(grade, "science");
        console.log(
          `\n🔬 Grade ${grade} (Science): ${scienceSubjects.length} subjects`
        );

        for (const subject of scienceSubjects) {
          try {
            await subjectsApi.create(subject as any);
            result.created++;
            console.log(`  ✅ ${subject.nameKh} (${subject.code})`);
          } catch (error: any) {
            result.failed++;
            const errorMsg = `Failed to create ${subject.nameKh}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(`  ❌ ${errorMsg}`);
          }
        }

        // Social track
        const socialSubjects = generateSubjectsForGrade(grade, "social");
        console.log(
          `\n🌍 Grade ${grade} (Social): ${socialSubjects.length} subjects`
        );

        for (const subject of socialSubjects) {
          try {
            await subjectsApi.create(subject as any);
            result.created++;
            console.log(`  ✅ ${subject.nameKh} (${subject.code})`);
          } catch (error: any) {
            result.failed++;
            const errorMsg = `Failed to create ${subject.nameKh}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(`  ❌ ${errorMsg}`);
          }
        }
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Seeding completed!`);
    console.log(`   Created: ${result.created}`);
    console.log(`   Failed: ${result.failed}`);
    console.log("=".repeat(50));

    if (result.failed > 0) {
      result.success = false;
    }

    return result;
  } catch (error: any) {
    console.error("❌ Critical error during seeding:", error);
    result.success = false;
    result.errors.push(`Critical error: ${error.message}`);
    return result;
  }
}

/**
 * Clear all subjects (use with caution!)
 */
export async function clearAllSubjects(): Promise<{
  success: boolean;
  deleted: number;
}> {
  console.log("🗑️ Clearing all subjects...");

  try {
    const subjects = await subjectsApi.getAll();
    let deleted = 0;

    for (const subject of subjects) {
      try {
        await subjectsApi.delete(subject.id);
        deleted++;
        console.log(`  ✅ Deleted: ${subject.nameKh}`);
      } catch (error: any) {
        console.error(
          `  ❌ Failed to delete ${subject.nameKh}:`,
          error.message
        );
      }
    }

    console.log(`✅ Cleared ${deleted} subjects`);
    return { success: true, deleted };
  } catch (error) {
    console.error("❌ Error clearing subjects:", error);
    return { success: false, deleted: 0 };
  }
}
