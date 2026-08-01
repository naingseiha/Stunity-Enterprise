-- Improve student directory search and filtered pagination paths.
CREATE INDEX "students_school_active_student_id_idx" ON "students"("schoolId", "isAccountActive", "studentId");
CREATE INDEX "students_school_active_email_idx" ON "students"("schoolId", "isAccountActive", "email");
CREATE INDEX "students_school_active_phone_idx" ON "students"("schoolId", "isAccountActive", "phoneNumber");
CREATE INDEX "students_school_active_english_name_idx" ON "students"("schoolId", "isAccountActive", "englishFirstName", "englishLastName");
CREATE INDEX "students_school_active_created_at_idx" ON "students"("schoolId", "isAccountActive", "createdAt");
