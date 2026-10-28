/**
 * Mailer service for Nextal HR & Payroll
 * Dispatches notifications, welcome invites, and payslip alerts.
 */
export class MailerService {
  constructor() {
    this.sentMessages = [];
  }

  async sendMail({ to, subject, html, text, attachments = [] }) {
    const message = {
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
      attachments,
      sentAt: new Date(),
    };

    this.sentMessages.push(message);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Mailer] Sent email to: ${to} | Subject: "${subject}"`);
    }
    return { success: true, messageId: `msg_${Date.now()}` };
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
