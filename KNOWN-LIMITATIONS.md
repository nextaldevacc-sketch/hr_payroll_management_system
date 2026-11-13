# Known Limitations & Architecture Notes

> **Version**: 1.0.0-rc5  
> **Platform**: Nextal HR & Payroll Management System (UAE Enterprise Edition)

---

## 1. Platform Admin Deferred to Phase 2 (Disabled)
- **Status**: Platform Administrator UI and API routes are explicitly deferred to **Phase 2** per product release roadmap.
- **Enforcement**: Controlled by configuration flags `FEATURE_PLATFORM_ADMIN=false` (backend) and `NEXT_PUBLIC_FEATURE_PLATFORM_ADMIN=false` (frontend).
- **Behavior**: Direct visits to `/platform/*` return HTTP 404. Attempted logins as `platform@nextal.ae` receive `403 FORBIDDEN` with the message *"Not available in this release"*.
- **Company Provisioning**: New client companies are provisioned cleanly via the CLI tool:
  ```bash
  npm run setup:company -- \
    --name "Company Name" \
    --name-ar "اسم الشركة" \
    --trade-license "TL-12345" \
    --admin-name "Admin User" \
    --admin-email "admin@company.ae"
  ```
  This creates the tenant organization, provisions statutory defaults (UAE labor rules, leave types, approval chains), and generates a secure one-time temporary password for the client Company Administrator.

---

## 2. Clean Install Architecture & Demo Data Separation
- **Production Clean Install**: Production installations seed strictly system metadata (the 8 canonical roles with Section 5.3 permissions). Zero companies, zero users, and zero employees are seeded.
- **Demo Seed Lock**: Demo datasets (Gulf Tech Logistics LLC, 45 multicultural employees, and historical pay runs) are locked behind `SEED_MODE=demo` and guarded against execution on production databases. Demo data is used exclusively by automated test runners targeting `DATABASE_URL_TEST` (`nextal_hr_test`).

---

## 3. Visa-to-Visa Employee Transfer Blocked
- **Status**: Inter-visa employee transfers (e.g., transferring an employee between MOHRE Dubai Mainland Visa 01 and DIFC Freezone Visa 02) are **intentionally blocked** in this release.
- **Reason**: UAE labor and regulatory rules differ substantially between onshore (MOHRE / Federal Decree-Law No. 33 of 2021 / GPSSA) and freezone jurisdictions (DIFC Employment Law No. 2 of 2019 / DEWS savings scheme). Cross-jurisdiction transfer involves statutory end-of-service settlement or contract conversion procedures that await final client policy specification.
- **Enforcement**: Branch changes in Workflow V8 fail closed if the target branch belongs to a different company visa (`TARGET_BRANCH_VISA_MISMATCH`). The employee remains assigned to their originating visa until client policy confirmation.

---

## 4. Scheduled Job Trigger Endpoints (Company Admin Only)
- **Status**: Background scheduled jobs run automatically via `node-cron` in production:
  - `01:00 Daily`: Document Expiry Job (scans for upcoming 90/60/30 milestone reminders and updates expired status).
  - `01:30 Daily`: Deactivation & Archival Job (archives separated employees whose last working date has passed and generates cancellation tasks).
  - `01:30 Daily`: Branch Change Job (applies approved branch changes reaching their effective date).
  - `02:00 1st of Month`: Monthly Statutory Leave Accrual Job.
- **Testing & Stand-in Triggers**: Dedicated API endpoints (`POST /api/v1/jobs/:name/run`) are provided strictly for testing and administrative audit verification. Access is restricted strictly to `COMPANY_ADMIN` (`requireRole('COMPANY_ADMIN')`). All other roles receive HTTP 403. Job trigger endpoints stand in for the cron schedules in test automation workflows.

---

## 5. Biometric Hardware Integration
- **Punch File Ingestion & REST Webhook**: The platform natively ingests raw punch events via standard CSV/Excel bulk upload and REST endpoints (`POST /api/v1/attendance/import`).
- **Direct Socket Protocols (TCP 4370 / Proprietary SDKs)**: Hardware biometric terminals (e.g., legacy ZKTeco, Suprema, Anviz) requiring direct proprietary low-level TCP/IP push or local network polling must use a local network gateway service or the vendor's cloud sync to post standard JSON punches to the Nextal punch API. Direct raw hardware socket listening is intentionally decoupled from the web application container for cloud security.

---

## 6. UAE Wages Protection System (WPS) Delivery Channel
- **Compliant SIF Generation**: The engine produces 100% compliant `.SIF` (Salary Information Files) with exact Central Bank / MOHRE header (`SCR`) and employee record (`EDR`) layouts, validated for mod-97 IBAN checksums and mathematical debit/credit equality.
- **Banking Submission**: The generated `.SIF` file is downloaded by Finance / Payroll Officers for direct portal upload to the employer's corporate banking channel (e.g., Emirates NBD smartBUSINESS, FAB Corporate, ADCB ProCash, Al Ansari Exchange). Direct host-to-host automated bank transmission (SFTP / AS2 VPN tunnels) is an enterprise add-on that requires individual bilateral agreements and certificate exchanges with each respective bank.

---

## 7. Multi-Currency Operations
- **Statutory Currency (AED)**: All statutory calculations (Article 51 Gratuity, MOHRE WPS SIF, GPSSA / ADPF pensions, UAE Labour Law deductions) operate strictly in United Arab Emirates Dirhams (`AED`).
- **Foreign Contracts**: Where contracts reference foreign currencies (e.g. USD expatriate packages), fixed conversion to AED is recorded at the contract level for official payroll processing and bank disbursement.

---

## 8. Direct ERP Ledger Synchronization
- **General Ledger Journal Export**: The platform produces detailed, double-entry balanced General Ledger CSV exports grouped by cost centre (`CC-OPS`, `CC-ENG`, `CC-SALES`, `CC-LOG`, `CC-HR`, `CC-FIN`) ready for one-click import into standard ERP accounting systems.
- **Native Direct ERP Connectors**: Direct real-time bidirectional REST/SOAP sync to SAP S/4HANA, Oracle NetSuite, or Microsoft Dynamics 365 requires mapping to each enterprise's custom chart of accounts via the Nextal Accounting API.

---

## 9. Multi-Factor Authentication (MFA / TOTP RFC 6238)
- **Status**: Deferred to post-v1.0.0-rc5 release (NOT DONE in this release per Part 7B B4).
- **Reason**: To prevent shipping an untested or partially implemented authentication loop that could lock out production administrators or enterprise users.
- **Current Security Controls**: Strict brute-force protection (5 failed logins triggers 15-minute temporary lock), session token versioning with instant revocation, forced temporary password change, and HttpOnly/Secure/SameSite cookie guards.
- **Remaining Implementation Roadmap**:
  1. Enrolment wizard with QR code generation (`speakeasy` / `qrcode`) and emergency recovery codes.
  2. TOTP verification middleware for privileged roles (`COMPANY_ADMIN`, `HR_MANAGER`, `PAYROLL_OFFICER`, `GM`, `FINANCE`).
  3. Dual-admin MFA reset authorization workflow with notification dispatch.
  4. Full bilingual UI (Arabic & English) and end-to-end Playwright tests.

---

## 10. Password Hashing Algorithm (Bcrypt Cost >= 12)
- **Status**: Implemented with `bcrypt` salt rounds >= 12 and transparent login rehash. Migration to `argon2` is deferred (NOT DONE per Part 7B B3).
- **Reason**: The `argon2` npm package requires native C++ compilation toolchains (Visual Studio C++ / node-gyp) that are incompatible with the current Windows development environment and monorepo package resolution.
- **Current Security Controls**: Cryptographic cost factor is strictly set to 12 (`BCRYPT_ROUNDS=12`), providing ~350ms computation time to mitigate offline brute-force attacks. An automatic rehash interceptor transparently upgrades legacy 10-round hashes upon successful user authentication.

---

## 11. Sensitive Field Protection & At-Rest Encryption
- **Status**: UI masking (last 4 digits) with audited reveal action is active. Application-level column envelope encryption is deferred (NOT DONE per Part 7B B5).
- **Current Security Controls**:
  - Emirates ID, passport numbers, and bank account IBANs are masked by default across all UI views (`•••• 1234`).
  - An audited "Reveal" action logs access events to the immutable `audit_logs` table (`REVEAL_SENSITIVE_FIELD`).
  - Physical file uploads (passports, Emirates IDs, labor cards) are 100% encrypted at rest on disk using AES-256-GCM with authenticated `NEXTAL_ENC_V1` headers.
  - Salary and compensation data remain strictly access-controlled at the API layer (limited strictly to the 4 statutory salary roles; HR Officer and view-only roles receive zero salary data).

---

## 12. Data Retention Policy & Automated Purge
- **Status**: Per-company configurable data retention setting (default 7 years) is active in Settings. Automated background deletion job is deferred (NOT DONE per Part 7B B6).
- **Compliance Plan**: In accordance with UAE Federal Decree-Law No. 33 of 2021 Article 54 and UAE PDPL (Federal Decree-Law No. 45 of 2021), ex-employee master records, statutory contracts, and immutable audit logs must be preserved for statutory inspection periods. Automated purging will be introduced in a future update following client data-destruction authorization workflows.
