import prisma from '../lib/prisma.js';
import { calculateDocumentStatus } from '@nextal/shared';

/**
 * Nightly Document Expiry Job
 * Scans all active employee documents and records warnings for expiring / expired documents.
 */
export async function runNightlyExpiryJob(targetDate = new Date()) {
  const documents = await prisma.$base().employee_documents.findMany({
    include: {
      employee: {
        select: { id: true, name: true, employee_code: true, company_id: true, status: true },
      },
    },
  });

  const alerts = [];
  for (const doc of documents) {
    if (doc.employee?.status !== 'Active') continue;
    const status = calculateDocumentStatus(doc, 90, targetDate);
    if (status === 'Expired' || status === 'Expiring Soon') {
      alerts.push({
        employee_id: doc.employee_id,
        company_id: doc.company_id,
        doc_type: doc.doc_type,
        status,
        expiry_date: doc.expiry_date,
      });
    }
  }

  return {
    scanned: documents.length,
    alertsFound: alerts.length,
    alerts,
    timestamp: new Date(),
  };
}

export default {
  runNightlyExpiryJob,
};
