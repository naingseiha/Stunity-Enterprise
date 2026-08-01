CREATE TYPE "TranscriptDocumentStatus" AS ENUM ('DRAFT', 'OFFICIAL', 'REVOKED');

CREATE TABLE "student_transcript_documents" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "status" "TranscriptDocumentStatus" NOT NULL DEFAULT 'OFFICIAL',
  "documentNumber" TEXT NOT NULL,
  "verificationCode" TEXT NOT NULL,
  "snapshotChecksum" TEXT NOT NULL,
  "snapshotData" JSONB,
  "formulaVersion" TEXT NOT NULL DEFAULT 'KHM_MOEYS_TRANSCRIPT_V1',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revocationReason" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_transcript_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_transcript_documents_verificationCode_key"
  ON "student_transcript_documents"("verificationCode");

CREATE UNIQUE INDEX "student_transcript_documents_schoolId_documentNumber_key"
  ON "student_transcript_documents"("schoolId", "documentNumber");

CREATE INDEX "student_transcript_documents_schoolId_studentId_academicYearId_status_idx"
  ON "student_transcript_documents"("schoolId", "studentId", "academicYearId", "status");

CREATE INDEX "student_transcript_documents_studentId_issuedAt_idx"
  ON "student_transcript_documents"("studentId", "issuedAt");

CREATE INDEX "student_transcript_documents_verificationCode_idx"
  ON "student_transcript_documents"("verificationCode");

CREATE UNIQUE INDEX "student_transcript_documents_one_official_per_year_idx"
  ON "student_transcript_documents"("schoolId", "studentId", "academicYearId")
  WHERE "status" = 'OFFICIAL';

ALTER TABLE "student_transcript_documents"
  ADD CONSTRAINT "student_transcript_documents_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_transcript_documents"
  ADD CONSTRAINT "student_transcript_documents_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_transcript_documents"
  ADD CONSTRAINT "student_transcript_documents_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_transcript_documents"
  ADD CONSTRAINT "student_transcript_documents_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
