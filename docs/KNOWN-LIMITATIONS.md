# Nextal HR & Payroll — System Boundaries & Known Limitations

> **Release Version**: v1.0.0-rc8  
> **Last Updated**: 19 November 2026 (Asia/Dubai UTC+4)

This document provides a transparent overview of intentional design boundaries, regulatory scopes, and technical limitations of Nextal HR & Payroll.

---

## 1. Regulatory & Statutory Scope

### 1.1 Jurisdiction
- The system is built strictly according to **UAE Federal Decree-Law No. 33 of 2021** (Regulation of Labour Relations) and its Executive Regulations (**Cabinet Resolution No. 1 of 2022**).
- Free zone variations: Supports standard mainland MOHRE establishments and DIFC/ADGM entities with standard employment contracts. Special non-mainland gratuity schemes (e.g. DIFC Employee Workplace Savings / DEWS trust plans) require external integration or contribution as an employer top-up allowance.

### 1.2 Currency
- All internal calculations, payslips, gratuity accruals, allowances, deductions, and WPS files are denominated strictly in **AED (United Arab Emirates Dirham)**.
- Multi-currency salary disbursement is not supported; contracts denominated in foreign currencies must be converted to AED fixed contracts per MOHRE wage guidelines.

### 1.3 Wages Protection System (WPS)
- File generation strictly formats according to UAE Central Bank / MOHRE WPS standards (Salary Information File `.SIF` with `SCR` header and `EDR` detail records).
- Direct automated file transfer over bank SFTP / host-to-host banking APIs is planned for Enterprise tier; in v1.0.0, `.SIF` files are downloaded by authorized Payroll Officers for corporate banking portal upload.

---

## 2. Pension & Social Security Limitations

- **UAE Nationals Only**: In accordance with UAE Federal Decree-Law No. 57 of 2023, pension contributions (GPSSA and ADPF) apply exclusively to confirmed UAE Nationals.
- **Expat End-of-Service**: Expatriate staff are covered by End-of-Service Gratuity (Article 51) and cannot be enrolled into GPSSA or ADPF schemas.
- **GCC Nationals**: Statutory pension withholding for GCC nationals under bilateral treaties requires manual adjustment rules in v1.0.0.

---

## 3. Data Processing & Batch Limits

### 3.1 Bulk Employee Import
- **File Size**: Maximum upload size of 5 MB per file.
- **Batch Record Limit**: Up to 500 employee records per single CSV/XLSX import batch to ensure sub-5-second atomic database transactions and prevent HTTP connection timeouts.
- **Transaction Semantics**: All-or-nothing atomic execution; if any row contains validation errors or invalid IBAN/Emirates ID data, the entire batch is rejected without partial writes.

### 3.2 Payroll Batch Calculations
- Pay run calculations process up to 1,000 employees per visa in a single pass.
- Historical locked pay runs are read-only and permanently sealed via PostgreSQL trigger `trg_prevent_locked_pay_run_modifications`.

---

## 4. Security & Cryptographic Boundaries

### 4.1 Document Storage
- Document files (Emirates ID copies, passport scans, contracts) are encrypted at rest using **AES-256-GCM** with an external 256-bit encryption key (`DOCUMENT_ENCRYPTION_KEY`).
- File magic bytes are strictly inspected on upload; renaming executable or binary files to `.pdf` or `.jpg` is hard-rejected.

### 4.2 Audit Log Immutability
- The `audit_logs` table is strictly append-only.
- A database-level trigger (`trg_prevent_audit_log_tampering`) forbids any `UPDATE` or `DELETE` command, even by the database superuser, ensuring tamper-evident legal records under UAE PDPL Decree-Law No. 45 of 2021.

### 4.3 Two-Factor Authentication (MFA)
- Privileged roles (`COMPANY_ADMIN`, `HR_MANAGER`) require **TOTP (RFC 6238)** authenticator apps.
- E-mail OTP is intentionally omitted from privileged role MFA paths to protect against SIM-swap, email forwarding, and credential-stuffing vulnerabilities.

---

## 5. Mobile & Viewport Boundaries

- Responsive design is guaranteed and tested down to **390px viewport width** (iPhone 12/13/14/15/16 baseline) across all Self-Service screens in both English and Arabic RTL.
- Extreme mini viewports (< 360px) and legacy browser engines without CSS Flexbox/Grid support are not supported.
