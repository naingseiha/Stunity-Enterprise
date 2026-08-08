-- Preflight every existing relationship before enabling tenant guards. Abort
-- the entire migration rather than guessing ownership or silently deleting
-- historical enrollment data.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "student_classes" enrollment
        JOIN "classes" class_record ON class_record."id" = enrollment."classId"
        WHERE enrollment."status" = 'ACTIVE' AND enrollment."endedAt" IS NULL
        GROUP BY enrollment."studentId", class_record."academicYearId"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate active enrollments must be resolved before enabling tenant integrity';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "student_classes" enrollment
        JOIN "students" student_record ON student_record."id" = enrollment."studentId"
        JOIN "classes" class_record ON class_record."id" = enrollment."classId"
        WHERE student_record."schoolId" <> class_record."schoolId"
    ) THEN
        RAISE EXCEPTION 'Cross-school enrollments must be resolved before enabling tenant integrity';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "classes" class_record
        JOIN "academic_years" year_record ON year_record."id" = class_record."academicYearId"
        WHERE class_record."schoolId" <> year_record."schoolId"
    ) THEN
        RAISE EXCEPTION 'Class academic-year ownership mismatches must be resolved before enabling tenant integrity';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "students" student_record
        JOIN "classes" class_record ON class_record."id" = student_record."classId"
        WHERE student_record."schoolId" <> class_record."schoolId"
    ) THEN
        RAISE EXCEPTION 'Student current-class ownership mismatches must be resolved before enabling tenant integrity';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "student_progressions" progression
        JOIN "students" student_record ON student_record."id" = progression."studentId"
        JOIN "academic_years" source_year ON source_year."id" = progression."fromAcademicYearId"
        JOIN "academic_years" target_year ON target_year."id" = progression."toAcademicYearId"
        JOIN "classes" source_class ON source_class."id" = progression."fromClassId"
        JOIN "classes" target_class ON target_class."id" = progression."toClassId"
        WHERE student_record."schoolId" <> source_year."schoolId"
           OR student_record."schoolId" <> target_year."schoolId"
           OR student_record."schoolId" <> source_class."schoolId"
           OR student_record."schoolId" <> target_class."schoolId"
           OR source_class."academicYearId" <> progression."fromAcademicYearId"
           OR target_class."academicYearId" <> progression."toAcademicYearId"
    ) THEN
        RAISE EXCEPTION 'Student progression ownership mismatches must be resolved before enabling tenant integrity';
    END IF;
END $$;

-- The effective-dated enrollment migration targeted this object as a
-- constraint, although it was created as a unique index. Closed historical
-- periods may coexist; only one open active enrollment per year is allowed.
DROP INDEX IF EXISTS "student_classes_studentId_classId_academicYearId_key";

UPDATE "student_classes" enrollment
SET "academicYearId" = class_record."academicYearId"
FROM "classes" class_record
WHERE enrollment."classId" = class_record."id"
  AND enrollment."academicYearId" IS DISTINCT FROM class_record."academicYearId";

CREATE UNIQUE INDEX IF NOT EXISTS "student_classes_one_active_enrollment_per_year_idx"
ON "student_classes"("studentId", "academicYearId")
WHERE "status" = 'ACTIVE' AND "endedAt" IS NULL AND "academicYearId" IS NOT NULL;

CREATE OR REPLACE FUNCTION "enforce_class_academic_year_tenant"()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "academic_years"
        WHERE "id" = NEW."academicYearId" AND "schoolId" = NEW."schoolId"
    ) THEN
        RAISE EXCEPTION 'Class and academic year must belong to the same school';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "classes_academic_year_tenant_guard" ON "classes";
CREATE TRIGGER "classes_academic_year_tenant_guard"
BEFORE INSERT OR UPDATE OF "schoolId", "academicYearId" ON "classes"
FOR EACH ROW EXECUTE FUNCTION "enforce_class_academic_year_tenant"();

CREATE OR REPLACE FUNCTION "enforce_student_current_class_tenant"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."classId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "classes"
        WHERE "id" = NEW."classId" AND "schoolId" = NEW."schoolId"
    ) THEN
        RAISE EXCEPTION 'Student and current class must belong to the same school';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "students_current_class_tenant_guard" ON "students";
CREATE TRIGGER "students_current_class_tenant_guard"
BEFORE INSERT OR UPDATE OF "schoolId", "classId" ON "students"
FOR EACH ROW EXECUTE FUNCTION "enforce_student_current_class_tenant"();

CREATE OR REPLACE FUNCTION "enforce_student_class_tenant"()
RETURNS TRIGGER AS $$
DECLARE
    student_school_id TEXT;
    class_school_id TEXT;
    class_year_id TEXT;
BEGIN
    SELECT "schoolId" INTO student_school_id FROM "students" WHERE "id" = NEW."studentId";
    SELECT "schoolId", "academicYearId" INTO class_school_id, class_year_id FROM "classes" WHERE "id" = NEW."classId";

    IF student_school_id IS NULL OR class_school_id IS NULL OR student_school_id <> class_school_id THEN
        RAISE EXCEPTION 'Student enrollment must reference a student and class from the same school';
    END IF;
    IF NEW."academicYearId" IS NULL THEN
        NEW."academicYearId" := class_year_id;
    ELSIF NEW."academicYearId" <> class_year_id THEN
        RAISE EXCEPTION 'Student enrollment academic year must match its class academic year';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "student_classes_tenant_guard" ON "student_classes";
CREATE TRIGGER "student_classes_tenant_guard"
BEFORE INSERT OR UPDATE OF "studentId", "classId", "academicYearId" ON "student_classes"
FOR EACH ROW EXECUTE FUNCTION "enforce_student_class_tenant"();

CREATE OR REPLACE FUNCTION "enforce_student_progression_tenant"()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "students" student_record
        JOIN "academic_years" source_year ON source_year."id" = NEW."fromAcademicYearId"
        JOIN "academic_years" target_year ON target_year."id" = NEW."toAcademicYearId"
        JOIN "classes" source_class ON source_class."id" = NEW."fromClassId"
        JOIN "classes" target_class ON target_class."id" = NEW."toClassId"
        WHERE student_record."id" = NEW."studentId"
          AND source_year."schoolId" = student_record."schoolId"
          AND target_year."schoolId" = student_record."schoolId"
          AND source_class."schoolId" = student_record."schoolId"
          AND target_class."schoolId" = student_record."schoolId"
          AND source_class."academicYearId" = NEW."fromAcademicYearId"
          AND target_class."academicYearId" = NEW."toAcademicYearId"
    ) THEN
        RAISE EXCEPTION 'Student progression must remain within one school and its academic years';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "student_progressions_tenant_guard" ON "student_progressions";
CREATE TRIGGER "student_progressions_tenant_guard"
BEFORE INSERT OR UPDATE OF "studentId", "fromAcademicYearId", "toAcademicYearId", "fromClassId", "toClassId"
ON "student_progressions"
FOR EACH ROW EXECUTE FUNCTION "enforce_student_progression_tenant"();
