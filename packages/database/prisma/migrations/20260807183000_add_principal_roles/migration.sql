-- Add school leadership roles. IF NOT EXISTS keeps this migration safe for
-- databases where the enum values were introduced during an earlier rollout.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PRINCIPAL';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VICE_PRINCIPAL';
