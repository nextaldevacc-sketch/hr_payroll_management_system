-- AlterTable
UPDATE "user_roles" SET "scope_type" = 'Company' WHERE "scope_type" IS NULL;
ALTER TABLE "user_roles" ALTER COLUMN "scope_type" SET DEFAULT 'Company';
ALTER TABLE "user_roles" ALTER COLUMN "scope_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "payload" JSONB;

