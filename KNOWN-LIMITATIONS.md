# Known Limitations & Architecture Notes

> **Version**: 1.0.0-rc3  
> **Platform**: Nextal HR & Payroll Management System (UAE Enterprise Edition)

---

## 1. Platform Admin Deferred to Phase 2 (Disabled)
- **Status**: Platform Administrator UI and API routes are explicitly deferred to **Phase 2** per product release roadmap.
- **Enforcement**: Controlled by configuration flags `FEATURE_PLATFORM_ADMIN=false` (backend) and `NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN=false` (frontend).
- **Behavior**: Direct visits to `/platform/*` return HTTP 404. Attempted logins as `platform@nextal.ae` receive `403 FORBIDDEN` with the message *"Not available in this release"*.
- **Company Provisioning**: New client companies are provisioned cleanly via the CLI tool:
  ```bash
  node scripts/create-company.js --name "Company Name" --nameAr "اسم الشركة" --tradeLicense "TL-12345" --adminEmail "admin@company.ae"
  ```
  This creates the tenant organization, provisions statutory defaults (UAE labor rules, leave types, approval chains), and generates an invite link for the client Company Administrator.

---

## 2. Visa-to-Visa Employee Transfer Blocked
- **Status**: Inter-visa employee transfers (e.g., transferring an employee between MOHRE Dubai Mainland Visa 01 and DIFC Freezone Visa 02) are **intentionally blocked** in this release.
- **Reason**: UAE labor and regulatory rules differ substantially between onshore (MOHRE / Federal Decree-Law No. 33 of 2021 / GPSSA) and freezone jurisdictions (DIFC Employment Law No. 2 of 2019 / DEWS savings scheme). Cross-jurisdiction transfer involves statutory end-of-service settlement or contract conversion procedures that await final client policy specification.
- **Enforcement**: Branch changes in Workflow V8 fail closed if the target branch belongs to a different company visa (`TARGET_BRANCH_VISA_MISMATCH`). The employee remains assigned to their originating visa until client policy confirmation.

---

## 3. Scheduled Job Trigger Endpoints (Company Admin Only)
- **Status**: Background scheduled jobs run automatically via `node-cron` in production:
  - `01:00 Daily`: Document Expiry Job (scans for upcoming 90/60/30 milestone reminders and updates expired status).
  - `01:30 Daily`: Deactivation & Archival Job (archives separated employees whose last working date has passed and generates cancellation tasks).
  - `01:30 Daily`: Branch Change Job (applies approved branch changes reaching their effective date).
  - `02:00 1st of Month`: Monthly Statutory Leave Accrual Job.
- **Testing & Stand-in Triggers**: Dedicated API endpoints (`POST /api/v1/jobs/:name/run`) are provided strictly for testing and administrative audit verification. Access is restricted strictly to `COMPANY_ADMIN` (`requireRole('COMPANY_ADMIN')`). All other roles receive HTTP 403. Job trigger endpoints stand in for the cron schedules in test automation workflows.

---

## 4. Biometric Hardware Integration
- **Punch File Ingestion & REST Webhook**: The platform natively ingests raw punch events via standard CSV/Excel bulk upload and REST webhook endpoints (`POST /api/v1/attendance/punch-import`).
- **Direct Socket Protocols (TCP 4370 / Proprietary SDKs)**: Hardware biometric terminals (e.g., legacy ZKTeco, Suprema, Anviz) requiring direct proprietary low-level TCP/IP push or local network polling must use a local network gateway service or the vendor's cloud sync to post standard JSON punches to the Nextal punch API. Direct raw hardware socket listening is intentionally decoupled from the web application container for cloud security.

---

## 5. UAE Wages Protection System (WPS) Delivery Channel
- **Compliant SIF Generation**: The engine produces 100% compliant `.SIF` (Salary Information Files) with exact Central Bank / MOHRE header (`SCR`) and employee record (`EDR`) layouts, validated for mod-97 IBAN checksums and mathematical debit/credit equality.
- **Banking Submission**: The generated `.SIF` file is downloaded by Finance / Payroll Officers for direct portal upload to the employer's corporate banking channel (e.g., Emirates NBD smartBUSINESS, FAB Corporate, ADCB ProCash, Al Ansari Exchange). Direct host-to-host automated bank transmission (SFTP / AS2 VPN tunnels) is an enterprise add-on that requires individual bilateral agreements and certificate exchanges with each respective bank.

---

## 6. Multi-Currency Operations
- **Statutory Currency (AED)**: All statutory calculations (Article 51 Gratuity, MOHRE WPS SIF, GPSSA / ADPF pensions, UAE Labour Law deductions) operate strictly in United Arab Emirates Dirhams (`AED`).
- **Foreign Contracts**: Where contracts reference foreign currencies (e.g. USD expatriate packages), fixed conversion to AED is recorded at the contract level for official payroll processing and bank disbursement.

---

## 7. Direct ERP Ledger Synchronization
- **General Ledger Journal Export**: The platform produces detailed, double-entry balanced General Ledger CSV exports grouped by cost centre (`CC-OPS`, `CC-ENG`, `CC-SALES`, `CC-LOG`, `CC-HR`, `CC-FIN`) ready for one-click import into standard ERP accounting systems.
- **Native Direct ERP Connectors**: Direct real-time bidirectional REST/SOAP sync to SAP S/4HANA, Oracle NetSuite, or Microsoft Dynamics 365 requires mapping to each enterprise's custom chart of accounts via the Nextal Accounting API.
