import fs from 'fs';
import path from 'path';

/**
 * Mailer service for Nextal HR & Payroll
 * Dispatches notifications, welcome invites, document expiry reminders, and payslip alerts.
 * In dev and test environments, uses a local file transport writing to storage/email-dev/
 */
export class MailerService {
  constructor() {
    this.sentMessages = [];
    this.devStorageDir = path.resolve(process.cwd(), 'storage', 'email-dev');
  }

  async sendMail({ to, subject, html, text, attachments = [] }) {
    const timestamp = new Date();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const message = {
      id: messageId,
      to,
      subject,
      html: html || text,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      attachments,
      sentAt: timestamp,
    };

    this.sentMessages.push(message);

    // Write to dev storage folder
    try {
      if (!fs.existsSync(this.devStorageDir)) {
        fs.mkdirSync(this.devStorageDir, { recursive: true });
      }
      const safeRecipient = String(to).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const filename = `${timestamp.toISOString().replace(/[:.]/g, '-')}_${safeRecipient}_${messageId}.json`;
      fs.writeFileSync(path.join(this.devStorageDir, filename), JSON.stringify(message, null, 2), 'utf8');
    } catch (err) {
      // Local dev logging error non-blocking
      console.warn('[Mailer] Could not write dev email file:', err.message);
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Mailer] Sent email to: ${to} | Subject: "${subject}"`);
    }
    return { success: true, messageId };
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

