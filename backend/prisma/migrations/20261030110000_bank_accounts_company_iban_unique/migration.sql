-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_company_id_iban_key" ON "bank_accounts"("company_id", "iban");

