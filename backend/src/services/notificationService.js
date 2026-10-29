import prisma from '../lib/prisma.js';

export class NotificationService {
  constructor(client = prisma) {
    this.prisma = client;
  }

  async createNotification({
    companyId,
    userId,
    title,
    titleAr = null,
    body,
    bodyAr = null,
    type,
    link = null,
  }) {
    if (!companyId || !userId) return null;
    return await this.prisma.$base().notifications.create({
      data: {
        company_id: companyId,
        user_id: userId,
        title,
        title_ar: titleAr,
        body,
        body_ar: bodyAr,
        type,
        link,
        is_read: false,
      },
    });
  }

  async getNotifications(companyId, userId, { unreadOnly = false, limit = 50 } = {}) {
    const where = {
      company_id: companyId,
      user_id: userId,
      ...(unreadOnly ? { is_read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.$base().notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      this.prisma.$base().notifications.count({
        where: { company_id: companyId, user_id: userId, is_read: false },
      }),
    ]);

    return {
      unread_count: unreadCount,
      notifications,
    };
  }

  async markAsRead(companyId, userId, notificationId) {
    const notification = await this.prisma.$base().notifications.findFirst({
      where: { id: notificationId, company_id: companyId, user_id: userId },
    });
    if (!notification) {
      const err = new Error('Notification not found');
      err.status = 404;
      throw err;
    }

    return await this.prisma.$base().notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  }

  async markAllAsRead(companyId, userId) {
    return await this.prisma.$base().notifications.updateMany({
      where: { company_id: companyId, user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }

  async notifyApprovalWaiting(companyId, approverUserId, requestType, requesterName, link = '/leave') {
    return await this.createNotification({
      companyId,
      userId: approverUserId,
      title: `Approval Required: ${requestType}`,
      titleAr: `مطلوب موافقة: ${requestType}`,
      body: `${requesterName} submitted a ${requestType.toLowerCase()} request requiring your action.`,
      bodyAr: `قدم ${requesterName} طلب ${requestType.toLowerCase()} يتطلب موافقتك.`,
      type: 'APPROVAL_WAITING',
      link,
    });
  }

  async notifyRequestStatus(companyId, employeeUserId, requestType, status, approverName = 'Approver', reason = '') {
    const isApproved = status === 'Approved';
    return await this.createNotification({
      companyId,
      userId: employeeUserId,
      title: `Request ${status}: ${requestType}`,
      titleAr: `تمت ${isApproved ? 'الموافقة على' : 'رفض'} الطلب: ${requestType}`,
      body: `Your ${requestType.toLowerCase()} request was ${status.toLowerCase()} by ${approverName}.${reason ? ` Reason: ${reason}` : ''}`,
      bodyAr: `طلب الـ ${requestType.toLowerCase()} الخاص بك تم ${isApproved ? 'قبوله' : 'رفضه'} بواسطة ${approverName}.${reason ? ` السبب: ${reason}` : ''}`,
      type: 'REQUEST_STATUS',
      link: '/me/requests',
    });
  }

  async notifyPayslipReleased(companyId, employeeUserId, monthStr, netPay) {
    return await this.createNotification({
      companyId,
      userId: employeeUserId,
      title: `Payslip Released: ${monthStr}`,
      titleAr: `تم إصدار قسيمة الراتب: ${monthStr}`,
      body: `Your payslip for ${monthStr} has been released. Net pay: AED ${netPay}.`,
      bodyAr: `تم إصدار قسيمة راتبك لشهر ${monthStr}. صافي الراتب: ${netPay} درهم.`,
      type: 'PAYSLIP_RELEASED',
      link: '/me/payslips',
    });
  }

  async notifyDocumentExpiring(companyId, employeeUserId, docType, daysLeft) {
    return await this.createNotification({
      companyId,
      userId: employeeUserId,
      title: `Document Expiring: ${docType}`,
      titleAr: `مستند قارب على الانتهاء: ${docType}`,
      body: `Your ${docType} will expire in ${daysLeft} days. Please upload a renewed document.`,
      bodyAr: `سينتهي مستند ${docType} الخاص بك خلال ${daysLeft} يوماً. يرجى رفع المستند الجديد.`,
      type: 'DOCUMENT_EXPIRING',
      link: '/me/documents',
    });
  }

  async checkAndNotifyExpiringDocuments(companyId) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const docs = await this.prisma.$base().employee_documents.findMany({
      where: {
        company_id: companyId,
        expiry_date: { lte: in30Days },
      },
      include: {
        employee: { include: { user: true } },
      },
    });

    for (const doc of docs) {
      if (doc.employee?.user?.id) {
        const daysLeft = Math.ceil((new Date(doc.expiry_date) - now) / (1000 * 60 * 60 * 24));
        const existing = await this.prisma.$base().notifications.findFirst({
          where: {
            company_id: companyId,
            user_id: doc.employee.user.id,
            type: 'DOCUMENT_EXPIRING',
            created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          await this.notifyDocumentExpiring(
            companyId,
            doc.employee.user.id,
            doc.doc_type,
            daysLeft <= 0 ? 0 : daysLeft
          );
        }
      }
    }
  }
}

export default new NotificationService();
