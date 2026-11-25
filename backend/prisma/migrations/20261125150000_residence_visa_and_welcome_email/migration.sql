-- Data migration: normalize legacy VISA to RESIDENCE_VISA
UPDATE "employee_documents" SET "doc_type" = 'RESIDENCE_VISA' WHERE "doc_type" = 'VISA';

-- Add welcome_email_sent_at to employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" TIMESTAMPTZ;
