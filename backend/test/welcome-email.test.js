import test from 'node:test';
import assert from 'node:assert/strict';
import { mailer } from '../src/lib/mailer.js';
import { INVITE_TOKEN_TTL_HOURS } from '@nextal/shared';
import nodemailer from 'nodemailer';

test('Mailer with Mock Transport: delivers email and records outbox', async () => {
  mailer.transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  mailer.hasRealSmtp = true;
  mailer.mailMode = 'smtp';

  try {
    const res = await mailer.sendMail({
      to: 'onboarding@aljalil.ae',
      subject: 'Welcome to Al Jalil!',
      html: '<h1>Welcome</h1><p>Next steps for onboarding.</p>',
      text: 'Welcome to Al Jalil!',
    });

    assert.equal(res.success, true);
    assert.ok(res.messageId);

    const sent = mailer.getRecentSent(1)[0];
    assert.equal(sent.to, 'onboarding@aljalil.ae');
    assert.equal(sent.subject, 'Welcome to Al Jalil!');
  } finally {
    mailer.mailMode = 'disabled';
    mailer.initTransport();
  }
});

test('Welcome Email: bilingual template and security rules', () => {
  const tpl = mailer.renderWelcomeTemplate({
    employeeName: 'Zayed Al Mansoori',
    companyName: 'Al Jalil Private Limited Company',
    loginUrl: 'https://payroll.nextaltechnologies.com/login',
    workEmail: 'zayed@aljalil.ae',
    credentialsMode: 'link',
    setPasswordUrl: 'https://payroll.nextaltechnologies.com/set-password?token=abc123xyz',
  });

  // Bilingual checks
  assert.match(tpl.subject, /Welcome to Nextal HR/);
  assert.match(tpl.subject, /مرحباً بك/);
  assert.match(tpl.html, /Al Jalil Private Limited Company/);
  assert.match(tpl.html, /https:\/\/payroll\.nextaltechnologies\.com\/login/);
  assert.match(tpl.html, /zayed@aljalil\.ae/);
  assert.match(tpl.html, /What to do next/);
  assert.match(tpl.html, /الخطوات التالية/);
  assert.match(tpl.html, /My Documents/);
  assert.match(tpl.html, /وثائقي الرسمية/);

  // Security check: zero tracking pixels
  assert.doesNotMatch(tpl.html, /<img\s+[^>]*src=/i);
  assert.doesNotMatch(tpl.html, /tracking/i);
  assert.doesNotMatch(tpl.html, /pixel/i);

  // Plaintext check
  assert.match(tpl.text, /zayed@aljalil\.ae/);
  assert.match(tpl.text, /https:\/\/payroll\.nextaltechnologies\.com\/login/);

  // Expiry check matches INVITE_TOKEN_TTL_HOURS
  assert.match(tpl.html, new RegExp(`Valid for ${INVITE_TOKEN_TTL_HOURS} Hours`));
  assert.match(tpl.html, new RegExp(`صالح لمدة ${INVITE_TOKEN_TTL_HOURS} ساعة`));
  assert.match(tpl.text, new RegExp(`Expires in ${INVITE_TOKEN_TTL_HOURS} hours`));
  assert.match(tpl.text, new RegExp(`صالح لمدة ${INVITE_TOKEN_TTL_HOURS} ساعة`));
});

test('Welcome Email: temporary password mode redacts password from outbox metadata', () => {
  const tpl = mailer.renderWelcomeTemplate({
    employeeName: 'Fatima Al Nuaimi',
    companyName: 'Al Jalil Private Limited Company',
    loginUrl: 'https://payroll.nextaltechnologies.com/login',
    workEmail: 'fatima@aljalil.ae',
    credentialsMode: 'temp_password',
    tempPassword: 'SecretTempPassword!123',
  });

  assert.match(tpl.html, /SecretTempPassword!123/);
  assert.match(tpl.html, /Temporary Password/);
  assert.match(tpl.html, /كلمة المرور المؤقتة/);

  // Redacted template for persistent outbox
  const redactedTpl = mailer.renderWelcomeTemplate({
    employeeName: 'Fatima Al Nuaimi',
    companyName: 'Al Jalil Private Limited Company',
    loginUrl: 'https://payroll.nextaltechnologies.com/login',
    workEmail: 'fatima@aljalil.ae',
    credentialsMode: 'temp_password',
    tempPassword: '[REDACTED_TEMPORARY_PASSWORD]',
  });

  assert.doesNotMatch(redactedTpl.html, /SecretTempPassword!123/);
  assert.match(redactedTpl.html, /\[REDACTED_TEMPORARY_PASSWORD\]/);
});

test('Mailer: MAIL_MODE=disabled succeeds in safe simulation mode', async () => {
  const prevMode = mailer.mailMode;
  mailer.mailMode = 'disabled';

  const res = await mailer.sendMail({
    to: 'test-sim@aljalil.ae',
    subject: 'Simulated Email Test',
    html: '<p>Test simulated content</p>',
    text: 'Test simulated content',
  });

  assert.equal(res.success, true);
  assert.ok(res.messageId);

  mailer.mailMode = prevMode;
});
