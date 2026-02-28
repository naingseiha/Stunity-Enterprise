-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "schools_registrationStatus_idx" ON "schools"("registrationStatus");
