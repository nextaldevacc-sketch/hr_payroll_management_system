-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "require_privileged_mfa" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_temp_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_temp_secret_expires" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_recovery_codes" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_last_used_step" BIGINT;

