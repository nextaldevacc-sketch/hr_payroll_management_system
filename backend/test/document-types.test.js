import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPES_LIST,
  normalizeDocumentType,
  isValidDocumentType,
  getDocumentTypeConfig,
  getDocumentTypeLabel,
} from '@nextal/shared';
import { serializeDocument } from '../src/serializers/index.js';

test('shared documentTypes: normalization and validation', () => {
  assert.equal(normalizeDocumentType('VISA'), 'RESIDENCE_VISA');
  assert.equal(normalizeDocumentType('residence_visa'), 'RESIDENCE_VISA');
  assert.equal(normalizeDocumentType('emirates-id'), 'EMIRATES_ID');
  assert.equal(normalizeDocumentType('bank_details'), 'BANK_DETAILS');
  assert.equal(normalizeDocumentType('UNKNOWN_TYPE'), null);

  assert.equal(isValidDocumentType('PASSPORT'), true);
  assert.equal(isValidDocumentType('EMIRATES_ID'), true);
  assert.equal(isValidDocumentType('RESIDENCE_VISA'), true);
  assert.equal(isValidDocumentType('VISA'), true); // alias
  assert.equal(isValidDocumentType('BANK_DETAILS'), true);
  assert.equal(isValidDocumentType('WORK_PERMIT'), true);
  assert.equal(isValidDocumentType('PHOTO'), true);
  assert.equal(isValidDocumentType('HEALTH_INSURANCE'), true);
  assert.equal(isValidDocumentType('INVALID_XYZ'), false);
});

test('shared documentTypes: config flags', () => {
  const passportConfig = getDocumentTypeConfig('PASSPORT');
  assert.equal(passportConfig.requiresExpiry, true);
  assert.equal(passportConfig.requiresNumber, true);

  const bankConfig = getDocumentTypeConfig('BANK_DETAILS');
  assert.equal(bankConfig.requiresExpiry, false);
  assert.equal(bankConfig.isBankDetails, true);
  assert.equal(bankConfig.isSensitive, true);

  const photoConfig = getDocumentTypeConfig('PHOTO');
  assert.equal(photoConfig.requiresExpiry, false);
  assert.equal(photoConfig.requiresNumber, false);
});

test('shared documentTypes: bilingual labels', () => {
  assert.equal(getDocumentTypeLabel('PASSPORT', 'en'), 'Passport');
  assert.equal(getDocumentTypeLabel('PASSPORT', 'ar'), 'جواز السفر');
  assert.match(getDocumentTypeLabel('BANK_DETAILS', 'en'), /Bank Details/);
  assert.match(getDocumentTypeLabel('BANK_DETAILS', 'ar'), /البيانات المصرفية/);
});

test('serializeDocument: masks BANK_DETAILS IBAN and numbers', () => {
  const doc = {
    id: 'doc-123',
    doc_type: 'BANK_DETAILS',
    doc_number: 'AE070331234567890123456',
    expiry_date: null,
    issue_date: '2026-01-01',
    status: 'Valid',
    verification_status: 'Verified',
  };

  const serialized = serializeDocument(doc, { roles: ['EMPLOYEE'] });
  assert.equal(serialized.doc_number, 'AE** **** **** 3456');
});
