/**
 * Nextal HR & Payroll — Unified Document Types & Validation Rules
 *
 * Single source of truth for:
 * - Document type codes
 * - English & Arabic labels
 * - Expiry and document number requirements
 * - Security classification (sensitive identity vs bank details vs general)
 */

export const DOCUMENT_TYPE_CONFIG = {
  PASSPORT: {
    code: 'PASSPORT',
    labelEn: 'Passport',
    labelAr: 'جواز السفر',
    requiresExpiry: true,
    requiresNumber: true,
    isSensitive: true,
    isBankDetails: false,
    maxValidityYears: 10,
  },
  EMIRATES_ID: {
    code: 'EMIRATES_ID',
    labelEn: 'Emirates ID',
    labelAr: 'بطاقة الهوية الإماراتية',
    requiresExpiry: true,
    requiresNumber: true,
    isSensitive: true,
    isBankDetails: false,
    maxValidityYears: 10,
  },
  LABOUR_CARD: {
    code: 'LABOUR_CARD',
    labelEn: 'Labour Card / Work Permit (MOHRE)',
    labelAr: 'بطاقة العمل / تصريح العمل (وزارة الموارد البشرية)',
    requiresExpiry: true,
    requiresNumber: true,
    isSensitive: false,
    isBankDetails: false,
    maxValidityYears: 3,
  },
  RESIDENCE_VISA: {
    code: 'RESIDENCE_VISA',
    labelEn: 'Residence Visa',
    labelAr: 'تأشيرة الإقامة',
    requiresExpiry: true,
    requiresNumber: true,
    isSensitive: true,
    isBankDetails: false,
    maxValidityYears: 10,
  },
  WORK_PERMIT: {
    code: 'WORK_PERMIT',
    labelEn: 'Work Permit / Entry Permit',
    labelAr: 'إذن الدخول / تصريح العمل',
    requiresExpiry: true,
    requiresNumber: true,
    isSensitive: true,
    isBankDetails: false,
    maxValidityYears: 2,
  },
  PHOTO: {
    code: 'PHOTO',
    labelEn: 'Personal Photo',
    labelAr: 'الصورة الشخصية',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
  },
  BANK_DETAILS: {
    code: 'BANK_DETAILS',
    labelEn: 'Bank Details (Bank Letter / IBAN Proof / Cheque)',
    labelAr: 'البيانات المصرفية (شهادة آيبان / شيك ملغى)',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: true,
    isBankDetails: true,
  },
  HEALTH_INSURANCE: {
    code: 'HEALTH_INSURANCE',
    labelEn: 'Health Insurance Card / Policy',
    labelAr: 'بطاقة / وثيقة التأمين الصحي',
    requiresExpiry: true,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
    maxValidityYears: 2,
  },
  OFFER_LETTER: {
    code: 'OFFER_LETTER',
    labelEn: 'Job Offer Letter',
    labelAr: 'عرض العمل',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
  },
  CONTRACT: {
    code: 'CONTRACT',
    labelEn: 'Employment Contract (MOHRE / Internal)',
    labelAr: 'عقد العمل المعتمد',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
  },
  EDUCATION_CERTIFICATE: {
    code: 'EDUCATION_CERTIFICATE',
    labelEn: 'Educational / Degree Certificate',
    labelAr: 'المؤهل العلمي / الشهادة الدراسية',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
  },
  OTHER: {
    code: 'OTHER',
    labelEn: 'Other Document',
    labelAr: 'مستندات أخرى',
    requiresExpiry: false,
    requiresNumber: false,
    isSensitive: false,
    isBankDetails: false,
  },
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_CONFIG);

export const DOCUMENT_TYPES_LIST = Object.values(DOCUMENT_TYPE_CONFIG);

/**
 * Normalizes legacy or alternate document type representations to standard code
 * E.g. 'VISA' -> 'RESIDENCE_VISA', 'eid' -> 'EMIRATES_ID'
 */
export function normalizeDocumentType(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toUpperCase().replace(/[\s-]+/g, '_');

  // Direct match
  if (DOCUMENT_TYPE_CONFIG[clean]) {
    return clean;
  }

  // Common aliases
  if (clean === 'VISA' || clean === 'RESIDENCY' || clean === 'RESIDENCE' || clean === 'ENTRY_VISA') {
    return 'RESIDENCE_VISA';
  }
  if (clean === 'EID' || clean === 'NATIONAL_ID' || clean === 'EMIRATESID') {
    return 'EMIRATES_ID';
  }
  if (clean === 'LABOUR' || clean === 'LABOR_CARD' || clean === 'MOHRE_CARD') {
    return 'LABOUR_CARD';
  }
  if (clean === 'IBAN' || clean === 'BANK' || clean === 'BANK_LETTER' || clean === 'BANK_PROOF') {
    return 'BANK_DETAILS';
  }
  if (clean === 'INSURANCE' || clean === 'MEDICAL_INSURANCE' || clean === 'INSURANCE_CARD' || clean === 'HEALTH_CARD') {
    return 'HEALTH_INSURANCE';
  }
  if (clean === 'DEGREE' || clean === 'DIPLOMA') {
    return 'EDUCATION_CERTIFICATE';
  }

  return null;
}

export function isValidDocumentType(type) {
  const normalized = normalizeDocumentType(type);
  return Boolean(normalized && DOCUMENT_TYPE_CONFIG[normalized]);
}

export function getDocumentTypeConfig(type) {
  const normalized = normalizeDocumentType(type);
  return normalized ? DOCUMENT_TYPE_CONFIG[normalized] : null;
}

export function getDocumentTypeLabel(type, lang = 'en') {
  const config = getDocumentTypeConfig(type);
  if (!config) return type || '';
  return lang === 'ar' ? config.labelAr : config.labelEn;
}
