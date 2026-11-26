import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function parsePrismaSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf8');
  const models = new Map();
  const modelRegex = /model\s+([a-zA-Z0-9_]+)\s+{([^}]+)}/g;

  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = new Set();

    const lines = body.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const fieldName = parts[0];
        // Exclude relation fields (types starting with lowercase/uppercase other models)
        // In schema.prisma, Prisma scalar types are: String, Int, BigInt, Float, Decimal, Boolean, DateTime, Json, Bytes
        const fieldType = parts[1].replace('?', '').replace('[]', '');
        const isScalar = [
          'String',
          'Int',
          'BigInt',
          'Float',
          'Decimal',
          'Boolean',
          'DateTime',
          'Json',
          'Bytes',
        ].includes(fieldType);

        if (isScalar) {
          fields.add(fieldName);
        }
      }
    }
    models.set(modelName, fields);
  }
  return models;
}

function resolveRepoPath(relPath) {
  let p = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(p)) return p;
  if (relPath.startsWith('backend/')) {
    p = path.resolve(process.cwd(), relPath.replace(/^backend\//, ''));
    if (fs.existsSync(p)) return p;
  }
  return p;
}

test('Prisma Schema Guard: static analysis of service create/update data keys', () => {
  const schemaPath = resolveRepoPath('backend/prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
  const models = parsePrismaSchema(schemaPath);

  assert.ok(models.has('employee_documents'), 'employee_documents model must exist');
  const docFields = models.get('employee_documents');
  assert.ok(docFields.has('uploaded_by'), 'employee_documents must have uploaded_by');
  assert.ok(!docFields.has('uploader_id'), 'employee_documents must NOT have uploader_id');

  // Verify critical models
  const criticalServices = [
    'backend/src/services/bulkDocumentService.js',
    'backend/src/services/employeeService.js',
    'backend/src/lib/mailer.js',
    'backend/src/services/authService.js',
    'backend/src/services/complianceService.js',
  ];

  const violations = [];

  for (const relPath of criticalServices) {
    const fullPath = resolveRepoPath(relPath);
    if (!fs.existsSync(fullPath)) continue;
    const code = fs.readFileSync(fullPath, 'utf8');

    // Check employee_documents create / update
    const empDocCreateRegex = /prisma(?:\.\$base\(\))?\.employee_documents\.(?:create|update)\s*\(\s*\{[\s\S]*?data:\s*\{([^}]+)\}/g;
    let m;
    while ((m = empDocCreateRegex.exec(code)) !== null) {
      const dataBlock = m[1];
      const keyLines = dataBlock.split(/\r?\n/);
      for (const rawKeyLine of keyLines) {
        const trimmed = rawKeyLine.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const keyMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (keyMatch) {
          const key = keyMatch[1];
          if (!docFields.has(key)) {
            violations.push(`${relPath}: Unknown key '${key}' on employee_documents`);
          }
        }
      }
    }
  }

  assert.deepEqual(violations, [], `Found Prisma schema key mismatches:\n${violations.join('\n')}`);
});

test('Prisma Schema Guard: all storage file/URL columns are registered in STORAGE_COLUMN_DEFINITIONS', async () => {
  const schemaPath = resolveRepoPath('backend/prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
  const models = parsePrismaSchema(schemaPath);

  const { STORAGE_COLUMN_DEFINITIONS } = await import('../src/jobs/storageCleanupJob.js');
  assert.ok(Array.isArray(STORAGE_COLUMN_DEFINITIONS));

  const registeredPairs = new Set(
    STORAGE_COLUMN_DEFINITIONS.map((d) => `${d.model}.${d.column}`)
  );

  const missingFromJob = [];

  for (const [modelName, fields] of models.entries()) {
    for (const field of fields) {
      // Look for storage file columns: ending in _url or _path (excluding non-file fields like file_hash)
      if (
        (field.endsWith('_url') || field.endsWith('_path') || field === 'file_url') &&
        field !== 'file_hash'
      ) {
        const pair = `${modelName}.${field}`;
        if (!registeredPairs.has(pair)) {
          missingFromJob.push(pair);
        }
      }
    }
  }

  assert.deepEqual(
    missingFromJob,
    [],
    `Found storage URL/path fields in schema.prisma not registered in STORAGE_COLUMN_DEFINITIONS:\n${missingFromJob.join('\n')}`
  );
});
