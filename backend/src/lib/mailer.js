import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import prisma from './prisma.js';
import { INVITE_TOKEN_TTL_HOURS } from '@nextal/shared';

/**
 * Nextal HR & Payroll — Production Mailer & Persisted Outbox Service
 *
 * Implements:
 * - Real SMTP transport using nodemailer (E1)
 * - Safe production guard: dev file transport strictly disabled in NODE_ENV=production (E2)
 * - Persisted email_outbox table tracking delivery, attempts, backoff, and errors (E1)
 * - Delivery logging: logs "sent" ONLY after SMTP acceptance; logs "failed" with error, never body (E1)
 * - Branded bilingual (EN / AR) templates with zero sensitive salary data (E1, SEC-4)
 */

export class MailerService {
  constructor() {
    this.prisma = prisma;
    this.sentMessages = [];
    this.devStorageDir = path.resolve(process.cwd(), 'storage', 'email-dev');
    this.initTransport();
  }

  initTransport() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    this.mailFrom = process.env.MAIL_FROM || 'Nextal HR <noreply@nextaltechnologies.com>';
    // Safe default: 'disabled' in production unless explicitly MAIL_MODE=smtp
    this.mailMode = process.env.MAIL_MODE || (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST ? 'disabled' : (process.env.SMTP_HOST ? 'smtp' : 'disabled'));
    this.isProd = process.env.NODE_ENV === 'production';

    if (this.mailMode === 'smtp' && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: this.isProd,
        },
      });
      this.hasRealSmtp = true;
    } else {
      this.transporter = null;
      this.hasRealSmtp = false;
    }
  }

  /**
   * Re-initializes transport with custom options (useful for test suites with ephemeral SMTP servers)
   */
  configureTestTransport({ host, port, user, pass, secure = false, from }) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      tls: { rejectUnauthorized: false },
    });
    this.hasRealSmtp = true;
    this.mailMode = 'smtp';
    if (from) this.mailFrom = from;
  }

  /**
   * Dispatches email and records into persistent outbox table
   */
  async sendMail({ to, subject, html, text, attachments = [], companyId = null, metadata = null }) {
    const timestamp = new Date();
    const cleanText = text || (html ? html.replace(/<[^>]+>/g, '').trim() : '');
    const cleanHtml = html || cleanText;

    // 1. Create persisted outbox entry in database
    let outboxRecord = null;
    const persistedHtml = metadata?.persistedBodyHtml || cleanHtml;
    const persistedText = metadata?.persistedBodyText || cleanText;
    try {
      if (prisma && prisma.email_outbox) {
        outboxRecord = await prisma.email_outbox.create({
          data: {
            company_id: companyId,
            recipient: String(to),
            subject,
            body_html: persistedHtml,
            body_text: persistedText,
            status: 'queued',
            attempts: 0,
            metadata: metadata || undefined,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[Mailer] Could not create outbox record:', dbErr.message);
    }

    const memoryMessage = {
      id: outboxRecord?.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      to,
      subject,
      html: cleanHtml,
      text: cleanText,
      attachments,
      sentAt: timestamp,
      companyId,
    };
    this.sentMessages.push(memoryMessage);

    // 2. Mode: Explicitly Disabled (Production without SMTP)
    if (this.mailMode === 'disabled') {
      if (outboxRecord) {
        await prisma.email_outbox.update({
          where: { id: outboxRecord.id },
          data: {
            status: 'sent',
            sent_at: timestamp,
            last_error: 'MAIL_MODE=disabled (simulated send)',
            attempts: 1,
          },
        }).catch(() => {});
      }
      if (!this.isProd && process.env.NODE_ENV !== 'test') {
        console.log(`[Mailer] Simulated email to: ${to} (MAIL_MODE=disabled)`);
      }
      return { success: true, messageId: outboxRecord?.id || 'simulated', outboxId: outboxRecord?.id };
    }

    // 3. Mode: Real SMTP Transport
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.mailFrom,
          to,
          subject,
          html: cleanHtml,
          text: cleanText,
          attachments,
        });

        // E1 Requirement: Log "sent" ONLY after SMTP server accepted message
        console.log(`[Mailer] Sent email to: ${to} | Message ID: ${info.messageId}`);

        if (outboxRecord) {
          await prisma.email_outbox.update({
            where: { id: outboxRecord.id },
            data: {
              status: 'sent',
              sent_at: new Date(),
              attempts: 1,
              last_error: null,
            },
          }).catch(() => {});
        }

        return { success: true, messageId: info.messageId, outboxId: outboxRecord?.id };
      } catch (smtpErr) {
        // E1 Requirement: Log "failed" with the error, NEVER the body
        console.error(`[Mailer] Failed email to: ${to} | Error: ${smtpErr.message}`);

        if (outboxRecord) {
          await prisma.email_outbox.update({
            where: { id: outboxRecord.id },
            data: {
              status: 'failed',
              attempts: 1,
              last_error: smtpErr.message,
            },
          }).catch(() => {});
        }

        const deliveryError = new Error(`Email delivery failed: ${smtpErr.message}`);
        deliveryError.code = 'EMAIL_DELIVERY_FAILED';
        deliveryError.outboxId = outboxRecord?.id;
        throw deliveryError;
      }
    }

    // 4. Mode: Development / Test Fallback (Non-production only)
    if (!this.isProd) {
      // E2 Requirement: In production, no file may ever be written to storage/email-dev
      if (process.env.NODE_ENV !== 'test') {
        try {
          if (!fs.existsSync(this.devStorageDir)) {
            fs.mkdirSync(this.devStorageDir, { recursive: true });
          }
          const safeRecipient = String(to).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
          const filename = `${timestamp.toISOString().replace(/[:.]/g, '-')}_${safeRecipient}_${memoryMessage.id}.json`;
          fs.writeFileSync(path.join(this.devStorageDir, filename), JSON.stringify(memoryMessage, null, 2), 'utf8');
        } catch (fileErr) {
          console.warn('[Mailer] Could not write dev email file:', fileErr.message);
        }
        console.log(`[Mailer] Sent email to: ${to} | Subject: "${subject}" (dev file written)`);
      }

      if (outboxRecord) {
        await prisma.email_outbox.update({
          where: { id: outboxRecord.id },
          data: {
            status: 'sent',
            sent_at: timestamp,
            attempts: 1,
          },
        }).catch(() => {});
      }

      return { success: true, messageId: memoryMessage.id, outboxId: outboxRecord?.id };
    }

    // If production reached here without SMTP and without MAIL_MODE=disabled:
    const err = new Error('Production email failed: No SMTP transport configured and MAIL_MODE is not disabled');
    console.error(`[Mailer] Failed email to: ${to} | Error: ${err.message}`);
    if (outboxRecord) {
      await prisma.email_outbox.update({
        where: { id: outboxRecord.id },
        data: { status: 'failed', last_error: err.message, attempts: 1 },
      }).catch(() => {});
    }
    throw err;
  }

  /**
   * Process queued and retryable failed outbox items with exponential backoff (E1)
   * Protected with PostgreSQL advisory lock (98234127) for multi-instance safety
   * Enforces max emails per hour rate limit (default 100/hr)
   */
  async processOutboxBatch(batchSize = 25) {
    const db = this.prisma || prisma;
    if (!db?.email_outbox) return { processed: 0, sent: 0, failed: 0, pendingMigrations: true };

    let lockAcquired = false;
    try {
      if (typeof db.$queryRawUnsafe === 'function') {
        const lockRes = await db.$queryRawUnsafe(`SELECT pg_try_advisory_lock(98234127) as acquired`).catch(() => [{ acquired: true }]);
        if (lockRes && lockRes[0] && lockRes[0].acquired === false) {
          return { processed: 0, sent: 0, failed: 0, locked: true };
        }
        lockAcquired = true;
      }

      // Rate limit check: max emails per hour (default 100)
      const maxPerHour = parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR, 10) || 100;
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      let sentLastHour = 0;
      try {
        sentLastHour = await db.email_outbox.count({
          where: {
            status: 'sent',
            sent_at: { gte: oneHourAgo },
          },
        });
      } catch (cntErr) {
        console.warn('[Mailer:Outbox] Could not count hourly sends:', cntErr.message);
      }

      if (sentLastHour >= maxPerHour) {
        console.warn(`[Mailer:Outbox] Hourly rate limit reached (${sentLastHour}/${maxPerHour}). Deferring batch.`);
        return { processed: 0, sent: 0, failed: 0, rateLimited: true, sentLastHour, maxPerHour };
      }

      const availableQuota = Math.max(1, maxPerHour - sentLastHour);
      const effectiveBatchSize = Math.min(batchSize, availableQuota);

      let candidates = [];
      try {
        candidates = await db.email_outbox.findMany({
          where: {
            OR: [
              { status: 'queued' },
              { status: 'failed', attempts: { lt: 3 } },
            ],
          },
          take: effectiveBatchSize,
          orderBy: { created_at: 'asc' },
        });
        if (this._missingOutboxTableWarned) {
          console.log('[email_outbox] Database table "email_outbox" is now online. Resuming normal outbox processing.');
          this._missingOutboxTableWarned = false;
        }
      } catch (err) {
        const isMissingTable =
          err?.code === 'P2021' ||
          err?.message?.includes('does not exist') ||
          err?.message?.includes('42P01') ||
          err?.message?.includes('email_outbox');

        if (isMissingTable) {
          if (!this._missingOutboxTableWarned) {
            console.warn('[email_outbox] Table "email_outbox" does not exist yet (migrations pending). Tolerating missing table, will retry next tick.');
            this._missingOutboxTableWarned = true;
          }
          return { processed: 0, sent: 0, failed: 0, pendingMigrations: true };
        }
        throw err;
      }

      const now = new Date();
      let sentCount = 0;
      let failedCount = 0;

      for (const item of candidates) {
        // Backoff check: attempt 1 wait 1 min, attempt 2 wait 5 min
        if (item.attempts === 1) {
          const minWait = 60 * 1000;
          if (now - new Date(item.updated_at) < minWait) continue;
        } else if (item.attempts === 2) {
          const minWait = 5 * 60 * 1000;
          if (now - new Date(item.updated_at) < minWait) continue;
        }

        try {
          if (this.transporter) {
            const info = await this.transporter.sendMail({
              from: this.mailFrom,
              to: item.recipient,
              subject: item.subject,
              html: item.body_html,
              text: item.body_text || '',
            });
            console.log(`[Mailer:Outbox] Sent email to: ${item.recipient} | Message ID: ${info.messageId}`);
            await db.email_outbox.update({
              where: { id: item.id },
              data: {
                status: 'sent',
                sent_at: new Date(),
                attempts: item.attempts + 1,
                last_error: null,
              },
            });
            sentCount++;
          } else if (this.mailMode === 'disabled' || !this.isProd) {
            await db.email_outbox.update({
              where: { id: item.id },
              data: {
                status: 'sent',
                sent_at: new Date(),
                attempts: item.attempts + 1,
                last_error: 'MAIL_MODE=disabled (simulated send)',
              },
            });
            sentCount++;
          }
        } catch (sendErr) {
          console.error(`[Mailer:Outbox] Failed email to: ${item.recipient} | Error: ${sendErr.message}`);
          await db.email_outbox.update({
            where: { id: item.id },
            data: {
              status: 'failed',
              attempts: item.attempts + 1,
              last_error: sendErr.message,
            },
          });
          failedCount++;
        }
      }

      return { processed: candidates.length, sent: sentCount, failed: failedCount };
    } finally {
      if (lockAcquired && typeof db.$queryRawUnsafe === 'function') {
        await db.$queryRawUnsafe(`SELECT pg_advisory_unlock(98234127)`).catch(() => {});
      }
    }
  }

  // ============================================================================
  // Branded Bilingual Email Templates (English & Arabic)
  // Guaranteed: ZERO SALARY FIGURES IN ANY EMAIL BODY
  // ============================================================================

  renderInviteTemplate({ recipientName = 'User', companyName = 'Nextal HR', inviteUrl, language = 'en' }) {
    if (language === 'ar') {
      return {
        subject: `[${companyName}] دعوة للانضمام إلى منصة إدارة الموارد البشرية`,
        html: `
          <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
              <h2 style="color: #0f172a; margin: 0;">منصة ${companyName}</h2>
              <span style="font-size: 12px; color: #64748b;">نظام إدارة الموارد البشرية والرواتب المعتمد في الإمارات</span>
            </div>
            <p style="color: #334155; font-size: 14px;">مرحباً ${recipientName}،</p>
            <p style="color: #334155; font-size: 14px;">تمت دعوتك للوصول إلى بوابة الموظفين في ${companyName}. يرجى النقر على الزر أدناه لتفعيل حسابك وتعيين كلمة المرور الخاصة بك:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${inviteUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">تفعيل الحساب وتعيين كلمة المرور</a>
            </div>
            <p style="color: #64748b; font-size: 12px;">ملاحظة أمنية: هذا الرابط صالح للاستخدام مرة واحدة فقط وينتهي بعد ${INVITE_TOKEN_TTL_HOURS} ساعة.</p>
            <p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">إذا لم تكن تتوقع هذه الدعوة، يرجى التواصل مع إدارة الموارد البشرية وتجاهل هذه الرسالة.</p>
          </div>
        `,
        text: `مرحباً ${recipientName}،\n\nتمت دعوتك للوصول إلى بوابة ${companyName}.\nيرجى زيارة الرابط أدناه لتفعيل حسابك:\n${inviteUrl}\n\nهذا الرابط صالح لمدة ${INVITE_TOKEN_TTL_HOURS} ساعة للاستخدام مرة واحدة.`,
      };
    }

    return {
      subject: `[${companyName}] You're invited to Nextal HR & Payroll`,
      html: `
        <div dir="ltr" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
            <h2 style="color: #0f172a; margin: 0;">${companyName}</h2>
            <span style="font-size: 12px; color: #64748b;">UAE Enterprise HR & Payroll Platform</span>
          </div>
          <p style="color: #334155; font-size: 14px;">Hello ${recipientName},</p>
          <p style="color: #334155; font-size: 14px;">You have been invited to join the employee portal for ${companyName}. Click the button below to activate your account and set your permanent password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Activate Account & Set Password</a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Security Notice: This link is single-use and expires in 72 hours.</p>
          <p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you were not expecting this invitation, please contact your HR administrator and disregard this email.</p>
        </div>
      `,
      text: `Hello ${recipientName},\n\nYou have been invited to join ${companyName}.\nPlease activate your account by visiting the link below:\n${inviteUrl}\n\nThis single-use link expires in 72 hours.`,
    };
  }

  renderResetPasswordTemplate({ recipientName = 'User', resetUrl, language = 'en' }) {
    if (language === 'ar') {
      return {
        subject: '[Nextal HR] طلب إعادة تعيين كلمة المرور',
        html: `
          <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
              <h2 style="color: #0f172a; margin: 0;">منصة Nextal HR</h2>
              <span style="font-size: 12px; color: #64748b;">أمان الحساب والمصادقة</span>
            </div>
            <p style="color: #334155; font-size: 14px;">مرحباً ${recipientName}،</p>
            <p style="color: #334155; font-size: 14px;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يمكنك النقر على الزر أدناه لاختيار كلمة مرور جديدة:</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">إعادة تعيين كلمة المرور</a>
            </div>
            <p style="color: #64748b; font-size: 12px;">تنبيه أمني: هذا الرابط صالح للاستخدام مرة واحدة فقط وينتهي تلقائياً خلال 60 دقيقة.</p>
            <p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">إذا لم تقم بطلب إعادة التعيين، يرجى تجاهل هذا البريد الإلكتروني. لن يتم تغيير كلمة المرور الخاصة بك.</p>
          </div>
        `,
        text: `مرحباً ${recipientName}،\n\nتلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في Nextal HR.\nلتعيين كلمة مرور جديدة، يرجى زيارة الرابط التالي:\n${resetUrl}\n\nينتهي هذا الرابط خلال 60 دقيقة.`,
      };
    }

    return {
      subject: '[Nextal HR] Password Reset Request',
      html: `
        <div dir="ltr" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 12px;">
            <h2 style="color: #0f172a; margin: 0;">Nextal HR</h2>
            <span style="font-size: 12px; color: #64748b;">Account Security & Access</span>
          </div>
          <p style="color: #334155; font-size: 14px;">Hello ${recipientName},</p>
          <p style="color: #334155; font-size: 14px;">We received a request to reset the password for your Nextal HR account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Your Password</a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Security Notice: This link is single-use and automatically expires in 60 minutes.</p>
          <p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you did not request this password reset, you can safely ignore this email. Your current password remains unchanged.</p>
        </div>
      `,
      text: `Hello ${recipientName},\n\nA password reset was requested for your Nextal HR account.\nVisit the link below to set a new password:\n${resetUrl}\n\nThis single-use link expires in 60 minutes.`,
    };
  }

  renderDocumentExpiryTemplate({ employeeName, documentType, expiryDate, daysRemaining, language = 'en' }) {
    const formattedDate = new Date(expiryDate).toLocaleDateString('en-GB');
    if (language === 'ar') {
      return {
        subject: `[تنبيه وثيقة] موعد انتهاء ${documentType} للموظف ${employeeName}`,
        html: `
          <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h3 style="color: #0f172a;">تنبيه صلاحية الوثائق والمستندات الرسمية</h3>
            <p style="color: #334155;">نود إشعاركم بأن الوثيقة التالية تقترب من موعد انتهائها:</p>
            <ul style="color: #334155; font-size: 14px; line-height: 1.8;">
              <li><strong>اسم الموظف:</strong> ${employeeName}</li>
              <li><strong>نوع الوثيقة:</strong> ${documentType}</li>
              <li><strong>تاريخ الانتهاء:</strong> ${formattedDate}</li>
              <li><strong>الأيام المتبقية:</strong> ${daysRemaining} يوم</li>
            </ul>
            <p style="color: #64748b; font-size: 12px;">يرجى تجديد الوثيقة لتفادي أي غرامات أو توقف في الإجراءات النظامية.</p>
          </div>
        `,
        text: `تنبيه صلاحية وثيقة:\nالموظف: ${employeeName}\nالوثيقة: ${documentType}\nتاريخ الانتهاء: ${formattedDate}\nالمتبقي: ${daysRemaining} يوم.`,
      };
    }

    return {
      subject: `[Document Alert] ${documentType} expiring for ${employeeName}`,
      html: `
        <div dir="ltr" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h3 style="color: #0f172a;">Statutory Document Expiry Notice</h3>
          <p style="color: #334155;">The following employee document is approaching its statutory expiry date:</p>
          <ul style="color: #334155; font-size: 14px; line-height: 1.8;">
            <li><strong>Employee:</strong> ${employeeName}</li>
            <li><strong>Document Type:</strong> ${documentType}</li>
            <li><strong>Expiry Date:</strong> ${formattedDate}</li>
            <li><strong>Days Remaining:</strong> ${daysRemaining} days</li>
          </ul>
          <p style="color: #64748b; font-size: 12px;">Please initiate the renewal process to avoid MOHRE compliance flags.</p>
        </div>
      `,
      text: `Document Expiry Notice:\nEmployee: ${employeeName}\nDocument: ${documentType}\nExpiry: ${formattedDate}\nRemaining: ${daysRemaining} days.`,
    };
  }

  renderPayslipReadyTemplate({ employeeName, month, year, portalUrl = 'https://payroll.nextal.ae/me/payslips', language = 'en' }) {
    // CRITICAL: NO SALARY OR COMPENSATION FIGURES ARE INCLUDED HERE
    if (language === 'ar') {
      return {
        subject: `[مسير الرواتب] كشف الراتب لشهر ${month}/${year} متاح الآن`,
        html: `
          <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h3 style="color: #0f172a;">إشعار كشف الراتب الشهري</h3>
            <p style="color: #334155;">مرحباً ${employeeName}،</p>
            <p style="color: #334155;">تم إصدار كشف الراتب الرسمي الخاص بك لشهر <strong>${month}/${year}</strong>. يمكنك الاطلاع عليه وتحميل نسخة PDF عبر تسجيل الدخول إلى البوابة الآمنة:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${portalUrl}" style="background: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">الاطلاع على كشف الراتب</a>
            </div>
            <p style="color: #64748b; font-size: 11px;">ملاحظة: حفاظاً على سرية بياناتك المالية، لا تتضمن رسائل البريد الإلكتروني أية مبالغ أو تفاصيل نقدية.</p>
          </div>
        `,
        text: `مرحباً ${employeeName}،\n\nتم إصدار كشف الراتب لشهر ${month}/${year}.\nيمكنك الاطلاع عليه عبر البوابة:\n${portalUrl}\n\nحفاظاً على الخصوصية، لا تتضمن الرسائل أي مبالغ مالية.`,
      };
    }

    return {
      subject: `[Nextal HR] Your payslip for ${month}/${year} is available`,
      html: `
        <div dir="ltr" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h3 style="color: #0f172a;">Monthly Payslip Release Notice</h3>
          <p style="color: #334155;">Hello ${employeeName},</p>
          <p style="color: #334155;">Your official payslip for <strong>${month}/${year}</strong> is now ready. You can securely review and download your bilingual PDF payslip through the employee portal:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" style="background: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">View Your Payslip</a>
          </div>
          <p style="color: #64748b; font-size: 11px;">Notice: To protect your compensation privacy, Nextal HR notifications never include salary amounts or financial figures in emails.</p>
        </div>
      `,
      text: `Hello ${employeeName},\n\nYour payslip for ${month}/${year} is now available in your employee portal:\n${portalUrl}\n\nFor security, emails never include compensation amounts.`,
    };
  }

  renderWelcomeTemplate({
    employeeName = 'Employee',
    companyName = 'Al Jalil Private Limited Company',
    loginUrl = 'https://payroll.nextaltechnologies.com/login',
    workEmail = '',
    credentialsMode = 'link',
    setPasswordUrl = null,
    tempPassword = null,
  }) {
    const subject = `[${companyName}] Welcome to Nextal HR / مرحباً بك في منصة الموارد البشرية`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #E5BDDF; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 20px;">${companyName}</h2>
          <span style="font-size: 12px; color: #64748b;">Enterprise HR & Payroll Portal / بوابة الموارد البشرية والرواتب</span>
        </div>

        <!-- English Section -->
        <div dir="ltr" style="margin-bottom: 32px;">
          <h3 style="color: #0f172a; font-size: 16px; margin-top: 0;">Welcome aboard, ${employeeName}!</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your profile has been officially verified and activated at <strong>${companyName}</strong>.
            You now have access to the employee self-service portal to view payslips, manage leaves, and update statutory documents.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Login Portal:</strong> <a href="${loginUrl}" style="color: #0284c7; text-decoration: underline;">${loginUrl}</a></p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Username (Work Email):</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${workEmail}</code></p>
            ${credentialsMode === 'temp_password' && tempPassword ? `
              <p style="margin: 0; font-size: 13px;"><strong>Temporary Password:</strong> <code style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">${tempPassword}</code></p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #b45309;">(You will be required to choose a new permanent password on your first sign in)</p>
            ` : setPasswordUrl ? `
              <div style="margin-top: 14px;">
                <a href="${setPasswordUrl}" style="background: #1D1D1D; color: #E5BDDF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Set Your Password (Valid for ${INVITE_TOKEN_TTL_HOURS} Hours)</a>
              </div>
            ` : ''}
          </div>

          <h4 style="color: #0f172a; font-size: 14px; margin: 16px 0 8px 0;">What to do next:</h4>
          <ol style="font-size: 13px; line-height: 1.8; color: #475569; padding-left: 20px; margin: 0;">
            <li>Sign in to the employee portal using your credentials.</li>
            <li>Enable Multi-Factor Authentication (MFA) in Account Settings if holding privileged duties.</li>
            <li>Navigate to <strong>My Documents</strong> and upload scanned copies of your Emirates ID, Passport, and Bank IBAN proof.</li>
            <li>For any assistance, please contact the HR & Administration department.</li>
          </ol>
        </div>

        <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0;" />

        <!-- Arabic Section -->
        <div dir="rtl" style="text-align: right;">
          <h3 style="color: #0f172a; font-size: 16px; margin-top: 0;">مرحباً بك في فريق العمل، ${employeeName}!</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            تم اعتماد وتفعيل ملفك الوظيفي بنجاح في <strong>${companyName}</strong>.
            يمكنك الآن الوصول إلى بوابة الخدمة الذاتية للموظف للاطلاع على كشوف الرواتب، وتقديم طلبات الإجازات، ومتابعة صلاحية وثائقك الرسمية.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>رابط البوابة:</strong> <a href="${loginUrl}" style="color: #0284c7; text-decoration: underline;">${loginUrl}</a></p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>اسم المستخدم (البريد المهني):</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${workEmail}</code></p>
            ${credentialsMode === 'temp_password' && tempPassword ? `
              <p style="margin: 0; font-size: 13px;"><strong>كلمة المرور المؤقتة:</strong> <code style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">${tempPassword}</code></p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #b45309;">(سيتعين عليك تعيين كلمة مرور جديدة عند أول تسجيل دخول)</p>
            ` : setPasswordUrl ? `
              <div style="margin-top: 14px;">
                <a href="${setPasswordUrl}" style="background: #1D1D1D; color: #E5BDDF; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">تعيين كلمة المرور (صالح لمدة ${INVITE_TOKEN_TTL_HOURS} ساعة)</a>
              </div>
            ` : ''}
          </div>

          <h4 style="color: #0f172a; font-size: 14px; margin: 16px 0 8px 0;">الخطوات التالية الموصى بها:</h4>
          <ol style="font-size: 13px; line-height: 1.8; color: #475569; padding-right: 20px; margin: 0;">
            <li>تسجيل الدخول إلى البوابة باستخدام بيانات الاعتماد الخاصة بك.</li>
            <li>تفعيل المصادقة الثنائية (MFA) من إعدادات الحساب للمزيد من الأمان.</li>
            <li>التوجه إلى قسم <strong>وثائقي الرسمية</strong> ورفع نسخ واضحة من الهوية الإماراتية وجواز السفر وإثبات الحساب البنكي (الآيبان).</li>
            <li>لأي استفسار، يرجى التواصل مباشرة مع إدارة الموارد البشرية والشؤون الإدارية.</li>
          </ol>
        </div>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          ${companyName} — Automated Notification System / نظام الإشعارات الآلي. Please do not reply directly to this email.
        </div>
      </div>
    `;

    const text = `
Welcome to ${companyName} / مرحباً بك في ${companyName}
===================================================

Dear ${employeeName},
Your employee account has been officially verified and activated.

Login URL: ${loginUrl}
Username (Work Email): ${workEmail}
${credentialsMode === 'temp_password' && tempPassword ? `Temporary Password: ${tempPassword}\n(You must change this upon first login)` : setPasswordUrl ? `Set Password Link (Expires in ${INVITE_TOKEN_TTL_HOURS} hours):\n${setPasswordUrl}` : ''}

What to do next:
1. Sign in to the employee portal.
2. Enable MFA in Account Settings if holding privileged roles.
3. Upload required identification documents under My Documents.
4. Contact HR for any questions.

---------------------------------------------------
عزيزي ${employeeName}،
تم اعتماد وتفعيل ملفك الوظيفي بنجاح.

رابط الدخول: ${loginUrl}
اسم المستخدم: ${workEmail}
${credentialsMode === 'temp_password' && tempPassword ? `كلمة المرور المؤقتة: ${tempPassword}\n(يجب تغييرها عند أول تسجيل دخول)` : setPasswordUrl ? `رابط تعيين كلمة المرور (صالح لمدة ${INVITE_TOKEN_TTL_HOURS} ساعة):\n${setPasswordUrl}` : ''}

الخطوات التالية:
1. تسجيل الدخول إلى البوابة.
2. تفعيل المصادقة الثنائية.
3. رفع الوثائق المطلوبة في قسم وثائقي.
4. التواصل مع الموارد البشرية عند الحاجة.
    `.trim();

    return { subject, html, text };
  }

  async getOutboxStatus(companyId = null) {
    const db = this.prisma || prisma;
    const where = companyId ? { company_id: companyId } : {};

    let queued = 0;
    let sent = 0;
    let failed = 0;
    let recent = [];

    if (db && db.email_outbox) {
      try {
        [queued, sent, failed, recent] = await Promise.all([
          db.email_outbox.count({ where: { ...where, status: 'queued' } }),
          db.email_outbox.count({ where: { ...where, status: 'sent' } }),
          db.email_outbox.count({ where: { ...where, status: 'failed' } }),
          db.email_outbox.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 10,
            select: {
              id: true,
              recipient: true,
              subject: true,
              status: true,
              attempts: true,
              last_error: true,
              created_at: true,
              sent_at: true,
            },
          }),
        ]);
      } catch (err) {
        console.warn('[Mailer] Could not query outbox status:', err.message);
      }
    }

    return {
      mail_mode: this.mailMode || 'disabled',
      has_real_smtp: this.hasRealSmtp,
      smtp_host: process.env.SMTP_HOST || null,
      smtp_port: parseInt(process.env.SMTP_PORT, 10) || 587,
      mail_from: this.mailFrom,
      rate_limit_per_hour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR, 10) || 100,
      counts: {
        queued,
        sent,
        failed,
        total: queued + sent + failed,
      },
      recent_outbox: recent,
    };
  }

  async sendTestEmail({ to, requestedBy = 'Admin', companyName = 'Al Jalil Private Limited Company', companyId = null }) {
    const subject = `[${companyName}] SMTP Configuration Test / اختبار إعدادات خادم البريد`;
    const timestamp = new Date().toISOString();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <h3 style="color: #0f172a; margin-top: 0;">SMTP Test Dispatch / اختبار الإرسال</h3>
        <p style="color: #334155; font-size: 14px;">This test message confirms that your SMTP mail settings on <strong>${companyName}</strong> are operational and correctly configured.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; color: #475569; margin: 16px 0;">
          <p style="margin: 0 0 4px 0;"><strong>Timestamp:</strong> ${timestamp}</p>
          <p style="margin: 0 0 4px 0;"><strong>Triggered by:</strong> ${requestedBy}</p>
          <p style="margin: 0;"><strong>Mail Mode:</strong> ${this.mailMode || 'disabled'}</p>
        </div>
        <p style="color: #64748b; font-size: 11px; margin-bottom: 0;">No further action is required.</p>
      </div>
    `;
    const text = `SMTP Test Dispatch for ${companyName}\nTimestamp: ${timestamp}\nTriggered by: ${requestedBy}\nMode: ${this.mailMode || 'disabled'}`;

    return await this.sendMail({
      to,
      subject,
      html,
      text,
      companyId,
      metadata: { type: 'TEST_EMAIL', requested_by: requestedBy },
    });
  }

  getRecentSent(count = 10) {
    return this.sentMessages.slice(-count);
  }

  clearHistory() {
    this.sentMessages = [];
  }
}

export const mailer = new MailerService();
export default mailer;
