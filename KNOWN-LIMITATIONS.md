# Known Limitations & Architecture Notes

> **Version**: 1.0.0-rc1  
> **Platform**: Nextal HR & Payroll Management System

---

## 1. Biometric Hardware Integration
- **Punch File Ingestion & REST Webhook**: The platform natively ingests raw punch events via standard CSV/Excel bulk upload and REST webhook endpoints (`POST /api/v1/attendance/punch-import`).
- **Direct Socket Protocols (TCP 4370 / Proprietary SDKs)**: Hardware biometric terminals (e.g., legacy ZKTeco, Suprema, Anviz) requiring direct proprietary low-level TCP/IP push or local network polling must use a local network gateway service or the vendor's cloud sync to post standard JSON punches to the Nextal punch API. Direct raw hardware socket listening is intentionally decoupled from the web application container for cloud security.

---

## 2. Document & Attachment Storage
- **Development & Staging**: By default, uploaded employee passports, visas, national IDs, and clearance proof documents are stored on local persistent disk (`backend/uploads/` or container volumes) with strict MIME validation, UUID file renaming, and path-traversal guards.
- **Production Enterprise**: In clustered or multi-instance cloud deployments (AWS ECS/EKS, Azure App Services), object storage (AWS S3 or Azure Blob Storage with UAE region compliance `me-central-1` / `uae-north`) should be mounted or wired via the storage abstraction layer to ensure high availability across instances.

---

## 3. UAE Wages Protection System (WPS) Delivery Channel
- **Compliant SIF Generation**: The engine produces 100% compliant `.SIF` (Salary Information Files) with exact Central Bank / MOHRE header (`SCR`) and employee record (`EDR`) layouts, validated for mod-97 IBAN checksums and mathematical debit/credit equality.
- **Banking Submission**: The generated `.SIF` file is downloaded by Finance / Payroll Officers for direct portal upload to the employer's corporate banking channel (e.g., Emirates NBD smartBUSINESS, FAB Corporate, ADCB ProCash, Al Ansari Exchange). Direct host-to-host automated bank transmission (SFTP / AS2 VPN tunnels) is an enterprise add-on that requires individual bilateral agreements and certificate exchanges with each respective bank.

---

## 4. Multi-Currency Operations
- **Statutory Currency (AED)**: All statutory calculations (Article 51 Gratuity, MOHRE WPS SIF, GPSSA / ADPF pensions, UAE Labour Law deductions) operate strictly in United Arab Emirates Dirhams (`AED`).
- **Foreign Contracts**: Where contracts reference foreign currencies (e.g. USD expatriate packages), fixed conversion to AED is recorded at the contract level for official payroll processing and bank disbursement.

---

## 5. Direct ERP Ledger Synchronization
- **General Ledger Journal Export**: The platform produces detailed, double-entry balanced General Ledger CSV exports grouped by cost centre (`CC-OPS`, `CC-ENG`, `CC-SALES`, `CC-LOG`, `CC-HR`, `CC-FIN`) ready for one-click import into standard ERP accounting systems.
- **Native Direct ERP Connectors**: Direct real-time bidirectional REST/SOAP sync to SAP S/4HANA, Oracle NetSuite, or Microsoft Dynamics 365 requires mapping to each enterprise's custom chart of accounts via the Nextal Accounting API.

---

## 6. Email & SMS Notification Delivery
- **Production SMTP / SendGrid / Twilio**: In development and test environments, outgoing notifications are logged to the audit and system logs. In production, verified SMTP credentials (e.g., SendGrid, AWS SES, or corporate Microsoft 365 SMTP relay) must be configured in `.env.production` to deliver employee payslip notifications and expiry alerts.
