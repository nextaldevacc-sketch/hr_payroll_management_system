-- AlterTable
ALTER TABLE "accrual_plans" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "approval_flow_steps" ADD COLUMN IF NOT EXISTS "condition_field" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "condition_operator" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "condition_value" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "is_conditional" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "attendance_policies" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "biometric_imports" ADD COLUMN IF NOT EXISTS "file_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "absence_divisor" VARCHAR(20) NOT NULL DEFAULT 'DIV_30',
ADD COLUMN IF NOT EXISTS "adpf_employee_rate" DECIMAL(5,2) NOT NULL DEFAULT 11.00,
ADD COLUMN IF NOT EXISTS "adpf_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS "adpf_gov_share_rate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS "adpf_max_salary" DECIMAL(14,2) NOT NULL DEFAULT 70000.00,
ADD COLUMN IF NOT EXISTS "adpf_min_salary" DECIMAL(14,2) NOT NULL DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS "document_digest_recipients" TEXT[],
ADD COLUMN IF NOT EXISTS "document_type_settings" JSONB,
ADD COLUMN IF NOT EXISTS "gpssa_employee_rate" DECIMAL(5,2) NOT NULL DEFAULT 11.00,
ADD COLUMN IF NOT EXISTS "gpssa_employee_rate_legacy" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS "gpssa_employee_rate_new" DECIMAL(5,2) NOT NULL DEFAULT 11.00,
ADD COLUMN IF NOT EXISTS "gpssa_employer_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS "gpssa_gov_share_rate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS "gpssa_max_salary" DECIMAL(14,2) NOT NULL DEFAULT 70000.00,
ADD COLUMN IF NOT EXISTS "gpssa_min_salary" DECIMAL(14,2) NOT NULL DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS "night_window_end" VARCHAR(8) NOT NULL DEFAULT '04:00:00',
ADD COLUMN IF NOT EXISTS "night_window_start" VARCHAR(8) NOT NULL DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS "ot_multiplier_holiday" DECIMAL(5,4) NOT NULL DEFAULT 1.5000,
ADD COLUMN IF NOT EXISTS "ot_multiplier_night" DECIMAL(5,4) NOT NULL DEFAULT 1.5000,
ADD COLUMN IF NOT EXISTS "ot_multiplier_normal" DECIMAL(5,4) NOT NULL DEFAULT 1.2500,
ADD COLUMN IF NOT EXISTS "ot_multiplier_rest" DECIMAL(5,4) NOT NULL DEFAULT 1.5000,
ADD COLUMN IF NOT EXISTS "pension_scheme_default" VARCHAR(20) NOT NULL DEFAULT 'GPSSA',
ADD COLUMN IF NOT EXISTS "variance_threshold_aed" DECIMAL(14,2) NOT NULL DEFAULT 500.00;

-- AlterTable
ALTER TABLE "company_visas" ADD COLUMN IF NOT EXISTS "pension_fund" VARCHAR(20) NOT NULL DEFAULT 'GPSSA';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pension_registration_date" DATE,
ADD COLUMN IF NOT EXISTS "pension_scheme" VARCHAR(20) DEFAULT 'GPSSA';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "job_code" VARCHAR(30);

-- AlterTable
ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "salary_rules" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "is_pensionable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "salary_structures" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "version" SMALLINT NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "settings_versions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "version_no" SMALLINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "settings_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "auth_tokens_user_id_idx" ON "auth_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "auth_tokens_token_hash_idx" ON "auth_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "settings_versions_company_id_idx" ON "settings_versions"("company_id");
CREATE INDEX IF NOT EXISTS "settings_versions_entity_type_entity_id_idx" ON "settings_versions"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "settings_versions_effective_from_idx" ON "settings_versions"("effective_from");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'auth_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_versions_company_id_fkey'
    ) THEN
        ALTER TABLE "settings_versions" ADD CONSTRAINT "settings_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

