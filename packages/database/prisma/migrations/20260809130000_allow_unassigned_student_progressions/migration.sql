-- Two-stage promotion deliberately creates a progression for the target year
-- before a concrete A/B/C class is assigned. Keep all tenant/year guards, but
-- allow the optional target class to remain NULL during that placement stage.
CREATE OR REPLACE FUNCTION "enforce_student_progression_tenant"()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM "students" student_record
        JOIN "academic_years" source_year ON source_year."id" = NEW."fromAcademicYearId"
        JOIN "academic_years" target_year ON target_year."id" = NEW."toAcademicYearId"
        JOIN "classes" source_class ON source_class."id" = NEW."fromClassId"
        LEFT JOIN "classes" target_class ON target_class."id" = NEW."toClassId"
        WHERE student_record."id" = NEW."studentId"
          AND source_year."schoolId" = student_record."schoolId"
          AND target_year."schoolId" = student_record."schoolId"
          AND source_class."schoolId" = student_record."schoolId"
          AND source_class."academicYearId" = NEW."fromAcademicYearId"
          AND (
              NEW."toClassId" IS NULL
              OR (
                  target_class."schoolId" = student_record."schoolId"
                  AND target_class."academicYearId" = NEW."toAcademicYearId"
              )
          )
    ) THEN
        RAISE EXCEPTION 'Student progression must remain within one school and its academic years';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
