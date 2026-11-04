import { z } from 'zod';
import prisma from '../lib/prisma.js';

const uuidSchema = z.string().uuid();

/**
 * Validates company_visa_id and checks that it belongs to caller's company.
 * Throws HTTP 400 with code INVALID_VISA on format error or foreign visa.
 * Returns valid UUID string or null if absent/'all'.
 */
export async function validateAndResolveVisa({ companyId, companyVisaId }) {
  if (!companyVisaId || companyVisaId === 'all') {
    return null;
  }
  const parsed = uuidSchema.safeParse(companyVisaId);
  if (!parsed.success) {
    const err = new Error('Invalid company_visa_id format');
    err.status = 400;
    err.code = 'INVALID_VISA';
    throw err;
  }
  const visa = await prisma.$base().company_visas.findFirst({
    where: { id: parsed.data, company_id: companyId },
    select: { id: true },
  });
  if (!visa) {
    const err = new Error('Company visa not found or does not belong to caller company');
    err.status = 400;
    err.code = 'INVALID_VISA';
    throw err;
  }
  return visa.id;
}

