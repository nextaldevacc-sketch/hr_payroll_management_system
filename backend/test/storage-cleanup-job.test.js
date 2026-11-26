import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  runStorageCleanupJob,
  collectAllReferencedFiles,
  extractSnapshotFileReferences,
  STORAGE_COLUMN_DEFINITIONS,
} from '../src/jobs/storageCleanupJob.js';

describe('Part 18: Storage Cleanup Safety Valves & Mode Controls', () => {
  let testStorageDir;
  let testBatchDir;

  beforeEach(() => {
    const testRoot = path.join(os.tmpdir(), `nextal-storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testStorageDir = path.join(testRoot, 'documents');
    testBatchDir = path.join(testRoot, 'tmp-batches');
    fs.mkdirSync(testStorageDir, { recursive: true });
    fs.mkdirSync(testBatchDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(path.dirname(testStorageDir), { recursive: true, force: true });
    }
  });

  function createMockDb({
    companies = [{ id: 'comp-1', logo_url: 'logo_referenced.png' }],
    employee_documents = [{ file_url: 'emp_doc_referenced.pdf' }],
    biometric_imports = [{ file_url: 'biometric_referenced.csv' }],
    leave_requests = [{ attachment_url: 'leave_attachment_referenced.pdf' }],
    pay_runs = [{ sif_file_url: 'sif_referenced.sif' }],
    payslips = [{ pdf_url: 'payslip_referenced.pdf' }],
    settings_versions = [
      { snapshot: { file_url: 'snap_v1.pdf', nested: { pdf_url: 'nested_snap.pdf' } } },
    ],
  } = {}) {
    return {
      companies: {
        findMany: async () => companies,
        findFirst: async () => companies[0] || null,
      },
      employee_documents: {
        findMany: async () => employee_documents,
      },
      biometric_imports: {
        findMany: async () => biometric_imports,
      },
      leave_requests: {
        findMany: async () => leave_requests,
      },
      pay_runs: {
        findMany: async () => pay_runs,
      },
      payslips: {
        findMany: async () => payslips,
      },
      settings_versions: {
        findMany: async () => settings_versions,
      },
      audit_logs: {
        create: async () => ({ id: 'mock-audit-id' }),
      },
    };
  }

  test('1. dry-run mode logs what WOULD be deleted, never deletes any files or batches', async () => {
    const oldFile = path.join(testStorageDir, 'old_unreferenced.pdf');
    fs.writeFileSync(oldFile, 'old content');
    const time25hAgo = new Date(Date.now() - 25 * 3600 * 1000);
    fs.utimesSync(oldFile, time25hAgo, time25hAgo);

    const oldBatch = path.join(testBatchDir, 'old_batch_folder');
    fs.mkdirSync(oldBatch, { recursive: true });
    const time3hAgo = new Date(Date.now() - 3 * 3600 * 1000);
    fs.utimesSync(oldBatch, time3hAgo, time3hAgo);

    const mockDb = createMockDb();

    // Default mode is dry-run
    const stats = await runStorageCleanupJob({
      mode: 'dry-run',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
      prismaClient: mockDb,
    });

    assert.equal(stats.mode, 'dry-run');
    assert.equal(stats.dryRun, true);
    assert.equal(stats.unreferencedFiles, 1);
    assert.equal(stats.deletedFiles, 0, 'dry-run must delete 0 files');
    assert.equal(stats.deletedBatches, 0, 'dry-run must delete 0 batches');
    assert.ok(fs.existsSync(oldFile), 'Old unreferenced file must still exist after dry-run');
    assert.ok(fs.existsSync(oldBatch), 'Old batch folder must still exist after dry-run');
  });

  test('2. delete mode removes old unreferenced files and stale batches, preserves recent items', async () => {
    const oldUnref = path.join(testStorageDir, 'old_unreferenced.pdf');
    fs.writeFileSync(oldUnref, 'old unref');
    const time25hAgo = new Date(Date.now() - 25 * 3600 * 1000);
    fs.utimesSync(oldUnref, time25hAgo, time25hAgo);

    const recentUnref = path.join(testStorageDir, 'recent_unreferenced.pdf');
    fs.writeFileSync(recentUnref, 'recent unref');
    const time1hAgo = new Date(Date.now() - 1 * 3600 * 1000);
    fs.utimesSync(recentUnref, time1hAgo, time1hAgo);

    const oldBatch = path.join(testBatchDir, 'old_batch');
    fs.mkdirSync(oldBatch, { recursive: true });
    const time3hAgo = new Date(Date.now() - 3 * 3600 * 1000);
    fs.utimesSync(oldBatch, time3hAgo, time3hAgo);

    const recentBatch = path.join(testBatchDir, 'recent_batch');
    fs.mkdirSync(recentBatch, { recursive: true });
    const time30mAgo = new Date(Date.now() - 30 * 60 * 1000);
    fs.utimesSync(recentBatch, time30mAgo, time30mAgo);

    const mockDb = createMockDb();

    const stats = await runStorageCleanupJob({
      mode: 'delete',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
      prismaClient: mockDb,
    });

    assert.equal(stats.mode, 'delete');
    assert.equal(stats.deletedFiles, 1);
    assert.equal(stats.retainedRecentFiles, 1);
    assert.equal(stats.deletedBatches, 1);
    assert.equal(stats.retainedRecentBatches, 1);

    assert.ok(!fs.existsSync(oldUnref), 'Old unreferenced file must be deleted in delete mode');
    assert.ok(fs.existsSync(recentUnref), 'Recent unreferenced file must be retained');
    assert.ok(!fs.existsSync(oldBatch), 'Stale batch folder must be deleted in delete mode');
    assert.ok(fs.existsSync(recentBatch), 'Recent batch folder must be retained');
  });

  test('3. referenced-by-other-table files survive (companies, biometrics, leave, pay_runs, payslips, settings_versions)', async () => {
    const filesToTest = [
      'logo_referenced.png',
      'emp_doc_referenced.pdf',
      'biometric_referenced.csv',
      'leave_attachment_referenced.pdf',
      'sif_referenced.sif',
      'payslip_referenced.pdf',
      'snap_v1.pdf',
      'nested_snap.pdf',
    ];

    const time48hAgo = new Date(Date.now() - 48 * 3600 * 1000);
    for (const f of filesToTest) {
      const p = path.join(testStorageDir, f);
      fs.writeFileSync(p, `content for ${f}`);
      fs.utimesSync(p, time48hAgo, time48hAgo);
    }

    const mockDb = createMockDb();

    const stats = await runStorageCleanupJob({
      mode: 'delete',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
      prismaClient: mockDb,
    });

    assert.equal(stats.deletedFiles, 0, 'Zero referenced files may be deleted');
    assert.equal(stats.unreferencedFiles, 0, 'All files must be recognized as referenced');

    for (const f of filesToTest) {
      const p = path.join(testStorageDir, f);
      assert.ok(fs.existsSync(p), `Referenced file ${f} must survive cleanup`);
    }
  });

  test('4. database query failure aborts cleanup without deleting any files', async () => {
    const oldFile = path.join(testStorageDir, 'old_file.pdf');
    fs.writeFileSync(oldFile, 'content');
    const time30hAgo = new Date(Date.now() - 30 * 3600 * 1000);
    fs.utimesSync(oldFile, time30hAgo, time30hAgo);

    const failingDb = {
      companies: {
        findMany: async () => {
          throw new Error('Database connection lost');
        },
      },
    };

    await assert.rejects(
      async () => {
        await runStorageCleanupJob({
          mode: 'delete',
          storageDir: testStorageDir,
          tmpBatchDir: testBatchDir,
          prismaClient: failingDb,
        });
      },
      /Database connection lost/
    );

    assert.ok(fs.existsSync(oldFile), 'File must NOT be deleted when database query fails');
  });

  test('5. safety valve: 50-file cap stops cleanup without deleting if more are found', async () => {
    const time30hAgo = new Date(Date.now() - 30 * 3600 * 1000);
    const createdFiles = [];

    // Create 55 old unreferenced files (> 50 cap)
    for (let i = 1; i <= 55; i++) {
      const p = path.join(testStorageDir, `unref_old_${i}.pdf`);
      fs.writeFileSync(p, `unref file ${i}`);
      fs.utimesSync(p, time30hAgo, time30hAgo);
      createdFiles.push(p);
    }

    const mockDb = createMockDb();

    const stats = await runStorageCleanupJob({
      mode: 'delete',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
      prismaClient: mockDb,
      maxDeletions: 50,
    });

    assert.equal(stats.stoppedBySafetyCap, true, 'Safety valve must trigger when candidates > 50');
    assert.equal(stats.deletedFiles, 0, 'Zero files must be deleted when cap is exceeded');

    for (const p of createdFiles) {
      assert.ok(fs.existsSync(p), 'All files must remain intact when safety cap stops the run');
    }
  });

  test('6. safety valve: zero-references guard aborts if DB returns 0 references while files exist on disk', async () => {
    const diskFile = path.join(testStorageDir, 'document_on_disk.pdf');
    fs.writeFileSync(diskFile, 'disk file');

    const emptyDb = {
      companies: { findMany: async () => [] },
      employee_documents: { findMany: async () => [] },
      biometric_imports: { findMany: async () => [] },
      leave_requests: { findMany: async () => [] },
      pay_runs: { findMany: async () => [] },
      payslips: { findMany: async () => [] },
      settings_versions: { findMany: async () => [] },
    };

    const stats = await runStorageCleanupJob({
      mode: 'delete',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
      prismaClient: emptyDb,
    });

    assert.equal(stats.aborted, true);
    assert.equal(stats.abortReason, 'zero_references_guard');
    assert.equal(stats.deletedFiles, 0);
    assert.ok(fs.existsSync(diskFile), 'Disk file must NOT be deleted when DB returns 0 references');
  });

  test('7. mode "off" completely skips cleanup job', async () => {
    const stats = await runStorageCleanupJob({
      mode: 'off',
      storageDir: testStorageDir,
      tmpBatchDir: testBatchDir,
    });

    assert.equal(stats.skipped, true);
    assert.equal(stats.reason, 'mode_off');
  });
});
