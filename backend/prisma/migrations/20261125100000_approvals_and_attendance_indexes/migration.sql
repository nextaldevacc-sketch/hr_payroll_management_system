-- CreateIndex
CREATE INDEX IF NOT EXISTS "approval_requests_company_id_status_idx" ON "approval_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attendance_days_company_id_work_date_idx" ON "attendance_days"("company_id", "work_date");
