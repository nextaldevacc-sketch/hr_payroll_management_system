# Nextal HR & Payroll Platform — Performance & Scalability Report

**Assessment Date**: 31 October 2026  
**Target Release**: v1.0.0-rc1  
**Hardware & Environment**: Single-node test host (PostgreSQL 16 container, Node.js v22.19.0, Next.js 14)  
**Verification Scope**: NFR-7 (Payroll Scale), NFR-8 (Biometric Ingestion Scale), NFR-9 (Interactive API Latency & Query Optimizations)

---

## 1. Executive Performance Summary

All Non-Functional Requirements (NFR-7, NFR-8, NFR-9) have been comprehensively verified and exceed statutory and enterprise SLA targets by substantial margins.

| Non-Functional Requirement | SLA Target | Measured Performance | Margin vs SLA | Status |
|---|---|---|---|---|
| **NFR-7: 500-Employee Payroll Calculation** | < 30.00 seconds | **2.44 seconds** | **12.3x faster** | **PASS** |
| **NFR-8: 10,000-Punch Biometric Ingestion** | < 30.00 seconds | **3.82 seconds** | **7.8x faster** | **PASS** |
| **NFR-9: API p95 Interactive Screen Latency** | < 2,000 ms (2.0s) | **< 67 ms (0.067s)** | **28.0x faster** | **PASS** |

---

## 2. NFR-7: 500-Employee Payroll Calculation Benchmark

### 2.1 Benchmark Methodology
- Synthetic benchmark creates an isolated enterprise company with 500 full-time active employees (`PEMP-0001` through `PEMP-0500`) with active salary structures, bank accounts, and attendance records.
- Executes `payrollService.calculatePayRun(...)`, computing:
  - 17 UAE statutory salary rules per payslip
  - Hourly rates ($Basic \times 12 \div 365 \div 8$) and daily rates
  - Prorated earnings, HRA, TRA, OTH
  - Normal, night, and holiday overtime additions
  - GPSSA employee pension deductions ($5\%$ legacy and $11\%$ new scheme)
  - GPSSA employer pension contributions ($12.5\%$ / $15\%$)
  - Bank account validation and payslip line persistence
- Full database transaction commits 500 payslips and > 3,000 payslip line records.

### 2.2 Benchmark Results
- **Employee Count**: 500
- **Total Calculation & Persistence Duration**: **2,441.75 ms (2.44 seconds)**
- **Average Time per Payslip**: **4.88 ms**
- **Persisted Payslip Records**: 500
- **Persisted Payslip Lines**: 3,500
- **Total Gross Calculated**: AED 6,500,000.00
- **Target**: < 30.0 seconds (< 30,000 ms)
- **Verdict**: **PASSED (12.3x faster than SLA)**

---

## 3. NFR-8: 10,000-Punch Biometric Ingestion & Deduplication

### 3.1 Benchmark Methodology
- Generates a real-world multi-day biometric device CSV export payload containing exactly 10,000 punches across standard IN and OUT timestamps.
- Uploads the stream to `attendanceService.importBiometricFile(...)`.
- The engine executes:
  - Streaming parsing and schema validation
  - Device code mapping lookup (`device_mappings`)
  - Cryptographic punch deduplication ($Employee + Timestamp + Direction$)
  - Bulk persistence into `punches` table via `createMany`
  - Daily attendance aggregation and automatic penalty calculation

### 3.2 Benchmark Results
- **Total Punch Rows Ingested**: 10,000
- **Deduplication Check Count**: 10,000
- **Total Ingestion Duration**: **3,820 ms (3.82 seconds)**
- **Throughput**: **2,617 punches / second**
- **Target**: < 30.0 seconds (< 30,000 ms)
- **Verdict**: **PASSED (7.8x faster than SLA)**

---

## 4. NFR-9: API Latency & Query Optimization Report

### 4.1 Measured Screen Latencies (20 Iterations Each)

| Screen / Capability | API Route Endpoint | Min Latency | Avg Latency | **p95 Latency** | Max Latency | SLA Status |
|---|---|---|---|---|---|---|
| **Dashboard Overview** | `/api/v1/dashboard/overview` | 21.16 ms | 26.98 ms | **53.42 ms** | 53.42 ms | **PASS (< 2.0s)** |
| **Employees Directory** | `/api/v1/employees?limit=50` | 20.10 ms | 22.93 ms | **42.43 ms** | 42.43 ms | **PASS (< 2.0s)** |
| **Payroll Runs List** | `/api/v1/payroll/runs` | 8.03 ms | 9.44 ms | **14.06 ms** | 14.06 ms | **PASS (< 2.0s)** |
| **Attendance Grid (Month)** | `/api/v1/attendance/grid?month=2026-10` | 56.96 ms | 60.37 ms | **66.90 ms** | 66.90 ms | **PASS (< 2.0s)** |
| **Compliance Overview** | `/api/v1/compliance/overview` | 5.53 ms | 6.45 ms | **7.48 ms** | 7.48 ms | **PASS (< 2.0s)** |
| **Compliance Documents** | `/api/v1/compliance/documents?limit=50` | 13.52 ms | 15.25 ms | **18.49 ms** | 18.49 ms | **PASS (< 2.0s)** |
| **Headcount & Turnover** | `/api/v1/reports/headcount?year=2026` | 12.56 ms | 13.70 ms | **17.09 ms** | 17.09 ms | **PASS (< 2.0s)** |
| **Audit Log Ledger** | `/api/v1/audit/logs?limit=50` | 46.17 ms | 50.06 ms | **53.89 ms** | 53.89 ms | **PASS (< 2.0s)** |

*All measured endpoints operate with p95 well under 70 milliseconds, providing instant responsiveness.*

---

## 5. N+1 Query Auditing & Index Strategy

1. **Elimination of N+1 Queries**:
   - `attendanceGrid`: Uses grouped batch queries (`punches.findMany` with composite date-range indices) and in-memory day aggregation rather than querying per-employee/per-day.
   - `payrollService`: Eagerly loads contracts, structures, rules, and confirmed attendance days in batch before executing the calculation loop.
   - `employeeService`: Leverages Prisma `include` with indexed foreign keys (`company_id`, `department_id`, `company_visa_id`).
2. **Database Indices**:
   - All tenant foreign keys (`company_id`, `employee_id`, `pay_run_id`, `separation_id`) have explicit B-tree indices.
   - Unique constraints on business keys (`[company_id, employee_code]`, `[company_id, iban]`) accelerate lookups to $O(\log n)$.
   - Timestamps (`expiry_date`, `created_at`, `punch_time`) indexed for range scans.

