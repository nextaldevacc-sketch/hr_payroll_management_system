# Nextal HR & Payroll Platform — Production Deployment Guide
## UAE Sovereign Cloud Architecture (AWS `me-central-1` / Azure `UAE North`)

**Compliance Benchmark**: UAE Federal Decree-Law No. 33 of 2021, UAE Data Protection Law (Federal Decree-Law No. 45 of 2021), MOHRE WPS Technical Standard  
**Data Residency**: All primary databases, audit ledgers, and document storage strictly contained within UAE sovereign territory.

---

## 1. Cloud Architecture Overview

```
                      Internet / Corporate WAN
                                 │
                 ┌───────────────▼───────────────┐
                 │    AWS CloudFront / WAF       │
                 │   (UAE Edge / Geo-Fenced)     │
                 └───────────────┬───────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             │       Application Load Balancer       │
             │       (HTTPS / TLS 1.3 Strict)        │
             └───────────┬───────────────┬───────────┘
                         │               │
            ┌────────────▼─────┐   ┌─────▼────────────┐
            │   Web Service    │   │   REST API       │
            │ (Next.js 14 App) │   │ (Node.js Express)│
            │  ECS / Container │   │  ECS / Container │
            └────────────┬─────┘   └─────┬────────────┘
                         │               │
                         └───────┬───────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │       AWS RDS PostgreSQL 16   │
                 │   (Multi-AZ, me-central-1)    │
                 │   Encrypted KMS (AES-256)     │
                 └───────────────┬───────────────┘
                                 │
            ┌────────────────────┴────────────────────┐
            │                                         │
┌───────────▼───────────┐                 ┌───────────▼───────────┐
│  Automated Backups    │                 │   S3 Document Store   │
│  (Daily, 30d retain)  │                 │   (UAE me-central-1)  │
└───────────────────────┘                 └───────────────────────┘
```

---

## 2. Infrastructure Setup: AWS `me-central-1` (UAE)

### 2.1 Managed PostgreSQL Database (RDS)
1. **Engine**: PostgreSQL 16.3+
2. **Instance Class**: `db.m6g.xlarge` (Production) / `db.t4g.medium` (Staging)
3. **Storage**: 200 GB gp3 with automatic storage scaling up to 1,000 GB
4. **Encryption**: AWS KMS Customer Managed Key (CMK) in `me-central-1`
5. **Multi-AZ**: Enabled across availability zones `me-central-1a` and `me-central-1b`
6. **Automated Backups**: 30-day retention with Point-In-Time-Recovery (PITR)

### 2.2 Container Orchestration (AWS ECS / Fargate)
- **VPC Subnets**: Private isolated subnets for API and Web containers.
- **Task Definitions**:
  - `nextal-api`: 2 vCPU, 4096 MB RAM, Auto-scaling min 2, max 10.
  - `nextal-web`: 2 vCPU, 2048 MB RAM, Auto-scaling min 2, max 8.
- **Environment Secrets**: Stored in AWS Secrets Manager or AWS Systems Manager Parameter Store.

### 2.3 Object Storage (Amazon S3)
- **Bucket**: `nextal-uae-documents-prod` created in region `me-central-1`.
- **Default Encryption**: AWS-KMS (SSE-KMS).
- **Public Access**: Block All Public Access enabled. Presigned URLs used for document viewing with 15-minute expirations.

---

## 3. Alternative Infrastructure Setup: Azure `UAE North` (Dubai)

1. **Database**: Azure Database for PostgreSQL — Flexible Server (Region: `UAE North`, High Availability with Zone Redundancy).
2. **Containers**: Azure Container Apps (ACA) or Azure Kubernetes Service (AKS).
3. **Storage**: Azure Blob Storage (Region: `UAE North`, GRS/ZRS, Private Endpoints).
4. **Key Vault**: Azure Key Vault in `UAE North` for JWT secrets and DB credentials.

---

## 4. Production Environment Configuration

Populate `.env` on the host/container from `.env.production.example`:

```bash
# Core Environment
NODE_ENV=production
PORT=5000

# High-Entropy Database URL (TLS required)
DATABASE_URL="postgresql://nextal_admin:SECURE_PASSWORD@nextal-postgres-prod.c.me-central-1.rds.amazonaws.com:5432/nextal_hr_production?schema=public&sslmode=require"

# Cryptographic Token Signing Secret (min 32 chars)
JWT_SECRET="c8f2a632e8c201729b47e2311497a43105df5e59b20726d34e9081e721516e88"

# Public Access Points
FRONTEND_PUBLIC_URL="https://app.nextal.ae"
NEXT_PUBLIC_API_URL="https://api.nextal.ae"

# Backup Retention
BACKUP_RETENTION_DAYS=30
```

---

## 5. Deployment Step-by-Step

### Step 1: Database Migration
Before directing live traffic, run Prisma migrations against the production database:
```bash
cd backend
npx prisma migrate deploy
```

### Step 2: Container Image Build & Push
```bash
# Build API
docker build -f backend/Dockerfile -t 123456789012.dkr.ecr.me-central-1.amazonaws.com/nextal-api:v1.0.0-rc1 .
docker push 123456789012.dkr.ecr.me-central-1.amazonaws.com/nextal-api:v1.0.0-rc1

# Build Web Frontend
docker build -f frontend/Dockerfile -t 123456789012.dkr.ecr.me-central-1.amazonaws.com/nextal-web:v1.0.0-rc1 .
docker push 123456789012.dkr.ecr.me-central-1.amazonaws.com/nextal-web:v1.0.0-rc1
```

### Step 3: Rolling Deployment
Trigger ECS service update with zero downtime (`minimumHealthyPercent: 100`, `maximumPercent: 200`).

### Step 4: Health Verification
```bash
curl -f https://api.nextal.ae/api/v1/health
```
Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "company_isolation": "enforced",
  "version": "1.0.0-rc1"
}
```

---

## 6. Disaster Recovery & Runbooks

### 6.1 Daily Automated Backup
Scheduled via Linux cron on the backup bastion at 02:00 UAE Time (UTC+4):
```bash
0 2 * * * /opt/nextal/scripts/backup-db.sh >> /var/log/nextal-backup.log 2>&1
```

### 6.2 Full Disaster Recovery Restoration Procedure
In the event of database failure or corrupted state:
```bash
# 1. Stop web and api traffic on the load balancer
# 2. Execute restore script against target RDS
./scripts/restore-db.sh /backups/nextal_backup_LATEST.sql.gz
# 3. Verify data integrity
npm test --workspace=backend
# 4. Re-enable traffic on load balancer
```

**RTO (Recovery Time Objective)**: < 15 minutes  
**RPO (Recovery Point Objective)**: < 1 hour (with WAL archiving) / < 24 hours (with daily snapshot)

