# Platform Admin User Guide

> **Role Code**: `PLATFORM_ADMIN`  
> **Target Audience**: System Operators, Multi-Tenant Hosting Administrators, Managed Service Providers  
> **Default Demo Login**: `platform@nextal.ae` / `Nextal@2026!`

---

## 1. Overview & Responsibilities
The **Platform Admin** (Super Admin) is the highest-level operational role in the Nextal HR & Payroll platform. This role operates across tenants to oversee tenant provisioning, system health, global configurations, security settings, and aggregate system metrics.

### Key Capabilities:
- Provision, suspend, and configure client company tenants.
- Assign and oversee Company Administrators.
- Monitor global audit logs across all tenant instances.
- Inspect platform system health, database connection pools, and worker queues.
- Manage global system feature flags and compliance rule definitions.

---

## 2. Navigation & Interface
When logged in as a Platform Admin, the navigation sidebar provides global administrative views:

1. **Dashboard (`/`)**: Aggregate metrics across all companies (active companies, total employee count, system load, recent cross-tenant activities).
2. **Companies (`/companies`)**: Company registry directory.
3. **Users & Security (`/users`)**: Platform-level user management and administrative credential recovery.
4. **Audit Logs (`/audit`)**: Cross-company immutable audit trail.
5. **System Settings (`/settings`)**: Global policy defaults and compliance rules.

---

## 3. Step-by-Step Workflows

### 3.1 Provisioning a New Company Tenant
1. Navigate to **Companies** (`/companies`) from the sidebar.
2. Click **Create Company** in the top action header.
3. In the creation modal, enter the legal entity information:
   - **Legal Name**: Official registered name (e.g., `Gulf Technologies LLC`).
   - **Trade License Number**: Commercial license ID issued by DED / Free Zone Authority.
   - **MOHRE Establishment ID**: 13-digit Employer MOL Code.
   - **Country & Emirate**: Country (`ARE`) and Emirate (e.g., `Dubai`, `Abu Dhabi`).
   - **Primary Currency**: `AED` (statutory currency).
4. Click **Save Company**. The system generates a dedicated tenant UUID and provisions the standard organization schema.
5. Click **Provision Administrator** to invite the first Company Admin email.

### 3.2 Managing Company Subscriptions & Status
- **Active**: Standard operating status; all employees and managers can authenticate.
- **Suspended**: Temporarily locks access for all company users (e.g., pending billing or legal review). Authentication returns `403 Tenant Suspended`.
- **Archived**: Read-only historical access for legal retention compliance.

### 3.3 Inspecting Global Audit Trails
1. Navigate to **Audit Logs** (`/audit`).
2. Filter logs by:
   - **Date Range**: Select start and end timestamps.
   - **Company**: Filter to a specific tenant or view cross-tenant operations.
   - **Action**: Filter by `LOGIN`, `PAYRUN_LOCKED`, `SALARY_MODIFIED`, `EMPLOYEE_DELETED`.
3. Click any row to expand the detailed JSON diff showing previous and current values, client IP, and user-agent.

---

## 4. Best Practices & Security
- **MFA Enforcement**: Always enable Multi-Factor Authentication on Platform Admin accounts.
- **Principle of Least Privilege**: Platform Admins should not perform daily HR operations (like running payroll or approving leave). Delegate these tasks to the respective company's `COMPANY_ADMIN`, `HR_MANAGER`, or `PAYROLL_OFFICER`.
- **Credential Rotation**: Rotate the Platform Admin password every 90 days.
