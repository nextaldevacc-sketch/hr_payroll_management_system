# SMTP & Email Delivery Setup Guide

This guide covers setting up free or included SMTP email delivery for Nextal HR & Payroll, including automated welcome emails, password reset requests, document expiry notices, and payslip release notifications.

---

## 1. Environment Configuration

In `.env.production` on the production server (or `.env` in local development):

```env
# Mail Mode: disabled | smtp
MAIL_MODE=smtp

# SMTP Credentials (works with Brevo, Hostinger mailbox, Gmail app password)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_brevo_account_login@domain.com
SMTP_PASS=your_brevo_smtp_master_key
MAIL_FROM="Al Jalil HR <noreply@nextaltechnologies.com>"

# Credential delivery mode for new active employees: link (recommended) | temp_password
WELCOME_CREDENTIALS_MODE=link

# Invitation & Welcome Set-Password Token Lifetime (Unified Constant: 72 Hours)
# INVITE_TOKEN_TTL_HOURS = 72 (exported from @nextal/shared, exactly matches email body text)

# Hourly outgoing rate limit protection (default: 100)
EMAIL_RATE_LIMIT_PER_HOUR=100
```

> [!NOTE]
> If `MAIL_MODE=disabled`, all email dispatch actions succeed in simulation mode: outgoing messages are stored in the persistent PostgreSQL `email_outbox` table with status `sent` and `last_error: "MAIL_MODE=disabled (simulated send)"`. No network connections are made and zero errors are thrown.

---

## 2. Option A: Brevo (Recommended Free Tier — 300 Emails/Day)

Brevo provides 300 free emails per day with reliable delivery to corporate inboxes.

### Step 1: Sign up and Generate SMTP Key
1. Register a free account at [brevo.com](https://www.brevo.com).
2. Go to **Settings** > **SMTP & API** > **SMTP** tab.
3. Click **Generate a new SMTP key**, name it `Nextal-HR-Production`, and copy the password.
4. Note your SMTP Host: `smtp-relay.brevo.com`, Port: `587`.

### Step 2: Configure Hostinger DNS (SPF, DKIM, DMARC)
In your Hostinger DNS Zone Management for `nextaltechnologies.com`:

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| **TXT** | `@` | `v=spf1 include:spf.sendinblue.com ~all` | 3600 |
| **TXT** | `mail._domainkey` | `k=rsa; p=<Brevo_DKIM_Public_Key_Copied_From_Brevo_Dashboard>` | 3600 |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; sp=none;` | 3600 |

### Step 3: Verify Senders & Domains in Brevo
1. Go to **Senders, Domains & Dedicated IPs** in Brevo.
2. Add your domain `nextaltechnologies.com` and verify the DNS records.
3. Add sender email `noreply@nextaltechnologies.com` and verify it.

---

## 3. Option B: Hostinger Custom Mailbox (Included with Hosting)

If you already own email hosting on Hostinger:

1. Create a mailbox in aaPanel / Hostinger (e.g. `noreply@nextaltechnologies.com`).
2. Use the Hostinger SMTP settings:
   ```env
   MAIL_MODE=smtp
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=noreply@nextaltechnologies.com
   SMTP_PASS=YourStrongMailboxPassword
   MAIL_FROM="Al Jalil HR <noreply@nextaltechnologies.com>"
   ```

---

## 4. Option C: Google Workspace / Gmail App Password

1. Enable 2-Step Verification on the Google account.
2. Navigate to **Google Account** > **Security** > **2-Step Verification** > **App passwords**.
3. Generate an App Password for `Mail`.
4. Configure:
   ```env
   MAIL_MODE=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-address@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx
   MAIL_FROM="Al Jalil HR <your-address@gmail.com>"
   ```

---

## 5. Testing & Verification

### In the Nextal HR Admin Interface:
1. Log in as **Company Admin** (`admin@aljalil.ae`).
2. Open **Settings** > **Email & Outbox**.
3. Enter your test email address and click **Send Test Email**.
4. Confirm delivery in your inbox and inspect the persistent outbox table in the UI drawer.

### Via API / Command Line:
```bash
# Query outbox status
curl -s -X GET https://payroll.nextaltechnologies.com/api/v1/settings/outbox-status \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Trigger test email
curl -s -X POST https://payroll.nextaltechnologies.com/api/v1/settings/test-email \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "admin@aljalil.ae"}'
```

### Welcome Email Resend:
```bash
curl -s -X POST https://payroll.nextaltechnologies.com/api/v1/employees/<EMPLOYEE_ID>/resend-welcome \
  -H "Authorization: Bearer <HR_MANAGER_OR_ADMIN_TOKEN>"
```
