# Platform Admin User Guide (Phase 2 - Deferred)

> **Role Code**: `PLATFORM_ADMIN`  
> **Status**: **Phase 2 (Deferred)** — Disabled in Release Candidate 4 (`FEATURE_PLATFORM_ADMIN=false`)  
> **Company Provisioning**: Performed via CLI: `npm run setup:company -- ...`

---

## 1. Release Architecture Notice
Per product release decisions, the multi-tenant Platform Administrator web interface and API routes are explicitly deferred to **Phase 2**:
- The API refuses `platform@nextal.ae` logins with HTTP 403 (*"Not available in this release"*).
- Direct browser visits to `/platform/*` return HTTP 404.
- In acceptance test tables, T1 and FR-PL1–3 are marked as `DEFERRED (Phase 2 – platform admin)`.
- Tenant isolation (T2) remains fully enforced and active.

---

## 2. CLI Provisioning Workflow (Current Release)
In Release Candidate 4, tenant onboarding and company provisioning are performed directly through the administrative CLI:

```bash
npm run setup:company -- \
  --name "New Enterprise LLC" \
  --name-ar "شركة المؤسسة الجديدة ذ.م.م" \
  --trade-license "TL-DXB-10020" \
  --admin-name "Corporate Admin" \
  --admin-email "admin@newenterprise.ae"
```

### What the CLI Provisions:
1. **Company Entity**: Legal name in English and Arabic, trade license, statutory defaults (cut-off day 25th, variance threshold 5%, absence divisor `÷30`).
2. **Default Sponsoring Visa & Branch**: Standard onshore MOHRE establishment configuration.
3. **Statutory Salary Rules & Structures**: Provisions all 17 Section 8.1 salary rules and approval settings.
4. **Company Administrator Bootstrap**: Creates the `COMPANY_ADMIN` user and prints a secure one-time temporary password directly to stdout (written nowhere else), requiring an immediate password change at `/change-password` on first login.

---

## 3. Phase 2 Roadmap Capabilities
Upon activation of `FEATURE_PLATFORM_ADMIN=true` in Phase 2:
- Aggregate cross-tenant system metrics.
- Web-based tenant provisioning wizard.
- Tenant status management (Active, Suspended, Archived).
- Platform-level audit monitoring.
