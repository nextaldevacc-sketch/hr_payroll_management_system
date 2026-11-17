-- CreateTable
CREATE TABLE IF NOT EXISTS "approval_rejections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "approval_request_id" UUID,
    "request_type" VARCHAR(50) NOT NULL,
    "record_id" UUID NOT NULL,
    "record_title" VARCHAR(255),
    "requester_id" UUID,
    "rejected_by_id" UUID NOT NULL,
    "step_no" SMALLINT NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "rejection_type" VARCHAR(20) NOT NULL DEFAULT 'REJECT',
    "rejection_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "approval_rejections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "approval_rejections_reason_check" CHECK (length(trim("reason")) >= 10)
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "approval_rejections_company_id_idx" ON "approval_rejections"("company_id");
CREATE INDEX IF NOT EXISTS "approval_rejections_request_type_record_id_idx" ON "approval_rejections"("request_type", "record_id");
CREATE INDEX IF NOT EXISTS "approval_rejections_rejection_date_idx" ON "approval_rejections"("rejection_date");
CREATE INDEX IF NOT EXISTS "approval_rejections_rejected_by_id_idx" ON "approval_rejections"("rejected_by_id");

-- ForeignKeys
DO $$ BEGIN
    ALTER TABLE "approval_rejections" ADD CONSTRAINT "approval_rejections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "approval_rejections" ADD CONSTRAINT "approval_rejections_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "approval_rejections" ADD CONSTRAINT "approval_rejections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "approval_rejections" ADD CONSTRAINT "approval_rejections_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Immutability Trigger: prevent UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_approval_rejections_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'approval_rejections is an append-only audit table: UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_approval_rejections_update_delete ON "approval_rejections";
CREATE TRIGGER trg_prevent_approval_rejections_update_delete
BEFORE UPDATE OR DELETE ON "approval_rejections"
FOR EACH ROW
EXECUTE FUNCTION prevent_approval_rejections_modification();
