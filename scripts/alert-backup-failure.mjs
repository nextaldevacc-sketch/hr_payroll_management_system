#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import mailer from '../backend/src/lib/mailer.js';

/**
 * Dispatches critical failure email notification when a backup job fails (E4 requirement)
 */
async function main() {
  const recipient = process.argv[2] || process.env.OPS_ALERT_EMAIL || 'admin@nextal.ae';
  const reason = process.argv[3] || 'Unknown backup execution failure';
  const timestamp = new Date().toISOString();

  console.log(`[Backup Alert] Dispatching failure notification to ${recipient}...`);

  try {
    await mailer.sendMail({
      to: recipient,
      subject: '[CRITICAL ALERT] Nextal Production Database Backup Failed',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e11d48; border-radius: 8px;">
          <h2 style="color: #e11d48; margin-top: 0;">CRITICAL: Automated Backup Failure</h2>
          <p>The automated production backup job failed to complete successfully.</p>
          <ul>
            <li><strong>Timestamp:</strong> ${timestamp}</li>
            <li><strong>Reported Error:</strong> ${reason}</li>
            <li><strong>Host:</strong> ${process.env.DOMAIN || 'Production VPS'}</li>
          </ul>
          <p style="color: #64748b; font-size: 12px;">Please inspect server logs and run <code>scripts/verify-backup.mjs</code> immediately.</p>
        </div>
      `,
      text: `CRITICAL: Automated Backup Failure\nTimestamp: ${timestamp}\nError: ${reason}\nHost: ${process.env.DOMAIN || 'Production VPS'}`,
      metadata: { type: 'backup_failure_alert', timestamp, reason },
    });
    console.log('[Backup Alert] Failure notification successfully sent.');
  } catch (err) {
    console.error('[Backup Alert] Could not deliver alert email:', err.message);
  }
}

main();
