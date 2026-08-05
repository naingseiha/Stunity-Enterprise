-- Restored locally to match production migration history.
-- Already applied on DB (2026-08-04). Uses IF NOT EXISTS so re-runs are data-safe no-ops.

DO $$ BEGIN
  CREATE TYPE "FeeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'TERM', 'ANNUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'WAIVED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "fee_structures" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "frequency" "FeeFrequency" NOT NULL DEFAULT 'ONE_TIME',
  "academicYearId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "student_invoices" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "feeStructureId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "dueDate" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fee_payments" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'CASH',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reference" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fee_structures_schoolId_isActive_idx" ON "fee_structures"("schoolId", "isActive");
CREATE INDEX IF NOT EXISTS "fee_structures_academicYearId_idx" ON "fee_structures"("academicYearId");
CREATE INDEX IF NOT EXISTS "student_invoices_schoolId_status_idx" ON "student_invoices"("schoolId", "status");
CREATE INDEX IF NOT EXISTS "student_invoices_studentId_idx" ON "student_invoices"("studentId");
CREATE INDEX IF NOT EXISTS "student_invoices_feeStructureId_idx" ON "student_invoices"("feeStructureId");
CREATE INDEX IF NOT EXISTS "student_invoices_dueDate_idx" ON "student_invoices"("dueDate");
CREATE INDEX IF NOT EXISTS "fee_payments_invoiceId_idx" ON "fee_payments"("invoiceId");
CREATE INDEX IF NOT EXISTS "fee_payments_paidAt_idx" ON "fee_payments"("paidAt");

DO $$ BEGIN
  ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_invoices" ADD CONSTRAINT "student_invoices_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_invoices" ADD CONSTRAINT "student_invoices_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_invoices" ADD CONSTRAINT "student_invoices_feeStructureId_fkey"
    FOREIGN KEY ("feeStructureId") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "student_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
