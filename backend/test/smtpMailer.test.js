import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SMTPServer } from 'smtp-server';
import fs from 'fs';
import path from 'path';
import { MailerService } from '../src/lib/mailer.js';

test('Real SMTP Transport, Delivery Logging & Production Security (E1 & E2)', async (t) => {
  let server;
  let serverPort;
  let receivedMails = [];

  // Start in-process ephemeral SMTP test server
  await new Promise((resolve, reject) => {
    server = new SMTPServer({
      disabledCommands: ['STARTTLS'],
      authOptional: true,
      onData(stream, session, callback) {
        let raw = '';
        stream.on('data', (chunk) => (raw += chunk.toString('utf8')));
        stream.on('end', () => {
          receivedMails.push({ session, raw });
          callback(null);
        });
      },
    });

    server.listen(0, '127.0.0.1', () => {
      serverPort = server.server.address().port;
      resolve();
    });
    server.on('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function decodeMime(raw) {
    return raw.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  }

  const mailer = new MailerService();
  mailer.configureTestTransport({
    host: '127.0.0.1',
    port: serverPort,
    from: 'Nextal HR Notifications <noreply@nextal.ae>',
  });

  await t.test('delivers branded invite email to SMTP server with single-use link and zero salary data', async () => {
    receivedMails = [];
    const inviteUrl = 'https://payroll.nextal.ae/accept-invite?token=test_invite_token_12345';
    const tmpl = mailer.renderInviteTemplate({
      recipientName: 'Fatima Al-Nuaimi',
      companyName: 'Gulf Tech Logistics LLC',
      inviteUrl,
      language: 'en',
    });

    const res = await mailer.sendMail({
      to: 'fatima@gulftech.ae',
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });

    assert.equal(res.success, true);
    assert.ok(res.messageId);

    // Wait for SMTP server stream completion
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedMails.length, 1);
    const emailRaw = decodeMime(receivedMails[0].raw);
    assert.ok(emailRaw.includes('fatima@gulftech.ae'));
    assert.ok(emailRaw.includes('Gulf Tech Logistics LLC'));
    assert.ok(emailRaw.includes(inviteUrl));
    // Verify no salary figures
    assert.ok(!emailRaw.includes('AED') && !emailRaw.includes('Salary') && !emailRaw.includes('Basic:'));
  });

  await t.test('delivers branded payslip notification with ZERO salary amounts in HTML or text', async () => {
    receivedMails = [];
    const tmpl = mailer.renderPayslipReadyTemplate({
      employeeName: 'Zaid Al-Harbi',
      month: '10',
      year: '2026',
      portalUrl: 'https://payroll.nextal.ae/me/payslips',
      language: 'en',
    });

    const res = await mailer.sendMail({
      to: 'zaid@gulftech.ae',
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });

    assert.equal(res.success, true);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedMails.length, 1);
    const raw = receivedMails[0].raw;

    assert.ok(raw.includes('zaid@gulftech.ae'));
    assert.ok(raw.includes('10/2026'));
    // Strict compliance check: No monetary figures or salary values
    assert.ok(!raw.includes('AED'));
    assert.ok(!raw.includes('د.إ'));
    assert.ok(!raw.includes('Gross'));
    assert.ok(!raw.includes('Net'));
  });

  await t.test('delivers branded Arabic password reset with 60-minute expiry warning', async () => {
    receivedMails = [];
    const resetUrl = 'https://payroll.nextal.ae/reset-password?token=secure_reset_token_67890';
    const tmpl = mailer.renderResetPasswordTemplate({
      recipientName: 'عمر الهاشمي',
      resetUrl,
      language: 'ar',
    });

    const res = await mailer.sendMail({
      to: 'omar@gulftech.ae',
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });

    assert.equal(res.success, true);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(receivedMails.length, 1);
    const raw = decodeMime(receivedMails[0].raw);
    assert.ok(raw.includes('omar@gulftech.ae'));
    assert.ok(raw.includes(resetUrl));
    assert.ok(raw.includes('60'));
  });

  await t.test('logs "failed" with error message and NEVER logs body when SMTP delivery fails', async () => {
    // Configure mailer with unreachable SMTP port
    const brokenMailer = new MailerService();
    brokenMailer.configureTestTransport({
      host: '127.0.0.1',
      port: 1, // Port 1 is closed/unreachable
      from: 'noreply@nextal.ae',
    });

    const loggedErrors = [];
    const originalConsoleError = console.error;
    console.error = (...args) => loggedErrors.push(args.join(' '));

    const sensitiveBodySecret = 'TOP_SECRET_RESET_TOKEN_NEVER_LOG_ME_XYZ123';
    try {
      await brokenMailer.sendMail({
        to: 'failure_test@company.ae',
        subject: 'Failed Message',
        html: `<p>${sensitiveBodySecret}</p>`,
      });
      assert.fail('Expected delivery error to be thrown');
    } catch (err) {
      assert.equal(err.code, 'EMAIL_DELIVERY_FAILED');
    } finally {
      console.error = originalConsoleError;
    }

    assert.ok(loggedErrors.some((log) => log.includes('[Mailer] Failed email to: failure_test@company.ae')));
    // Assert sensitive body text is NEVER leaked to console logs
    assert.ok(!loggedErrors.some((log) => log.includes(sensitiveBodySecret)));
  });

  await t.test('E2: In production mode, NO files are written to storage/email-dev', async () => {
    const prodMailer = new MailerService();
    prodMailer.isProd = true; // Force production mode
    prodMailer.mailMode = 'disabled'; // Simulate production disabled mail

    const devStorage = path.resolve(process.cwd(), 'storage', 'email-dev');
    const filesBefore = fs.existsSync(devStorage) ? fs.readdirSync(devStorage) : [];

    await prodMailer.sendMail({
      to: 'prod_test@company.ae',
      subject: 'Production Probe',
      html: '<p>Secret token: 9999999</p>',
    });

    const filesAfter = fs.existsSync(devStorage) ? fs.readdirSync(devStorage) : [];
    assert.equal(
      filesAfter.length,
      filesBefore.length,
      'Production mailer must NEVER write JSON email files to storage/email-dev'
    );
  });
});
