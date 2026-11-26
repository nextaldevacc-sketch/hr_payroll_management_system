import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import storageService from '../lib/storage.js';
import auditService from '../services/auditService.js';

/**
 * Common temporary batch directory matching bulkDocumentService.js
 */
export const TMP_BATCH_DIR = process.env.TMP_BATCH_DIR || path.resolve(process.cwd(), 'storage', 'tmp-batches');

/**
 * Comprehensive list of scalar storage reference columns in schema.prisma
 */
export const STORAGE_COLUMN_DEFINITIONS = [
  { model: 'companies', column: 'logo_url' },
  { model: 'employee_documents', column: 'file_url' },
  { model: 'biometric_imports', column: 'file_url' },
  { model: 'leave_requests', column: 'attachment_url' },
  { model: 'pay_runs', column: 'sif_file_url' },
  { model: 'payslips', column: 'pdf_url' },
];

/**
 * Recursively extracts file references from settings_versions JSON snapshots
 */
export function extractSnapshotFileReferences(obj, set) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractSnapshotFileReferences(item, set);
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.trim()) {
      const cleanVal = val.trim();
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.endsWith('_url') ||
        lowerKey.endsWith('_path') ||
        lowerKey.includes('file') ||
        lowerKey.includes('pdf') ||
        lowerKey.includes('attachment') ||
        lowerKey.includes('logo') ||
        /\.(pdf|png|jpe?g|enc|csv|sif|txt|xlsx?)$/i.test(cleanVal)
      ) {
        set.add(path.basename(cleanVal));
      }
    } else if (val && typeof val === 'object') {
      extractSnapshotFileReferences(val, set);
    }
  }
}

/**
 * Collects all referenced filenames across every storage column in the database
 */
export async function collectAllReferencedFiles(prismaClient = prisma) {
  const referencedFiles = new Set();
  const db = prismaClient.$base ? prismaClient.$base() : prismaClient;

  // 1. Query all scalar storage columns across all registered tables
  for (const def of STORAGE_COLUMN_DEFINITIONS) {
    if (!db[def.model] || typeof db[def.model].findMany !== 'function') continue;
    const records = await db[def.model].findMany({
      where: { [def.column]: { not: null } },
      select: { [def.column]: true },
    });
    for (const r of records) {
      const val = r[def.column];
      if (typeof val === 'string' && val.trim()) {
        referencedFiles.add(path.basename(val.trim()));
      }
    }
  }

  // 2. Query all settings_versions snapshots
  if (db.settings_versions && typeof db.settings_versions.findMany === 'function') {
    const versions = await db.settings_versions.findMany({
      select: { snapshot: true },
    });
    for (const v of versions) {
      if (v.snapshot) {
        extractSnapshotFileReferences(v.snapshot, referencedFiles);
      }
    }
  }

  return referencedFiles;
}

/**
 * Storage Cleanup Job (Part 18: Safe by Default)
 *
 * Modes:
 *   - 'off': Skips cleanup completely.
 *   - 'dry-run' (default): Identifies and logs what would be deleted without unlinking anything.
 *   - 'delete': Permanently unlinks unreferenced files >24h and removes batch folders >2h.
 *
 * Safety Valves:
 *   1. DB Reference Query Failure: Aborts immediately, 0 deletions.
 *   2. Zero-References Sanity Guard: If files exist on disk but DB returns 0 references, aborts immediately.
 *   3. 50-File Safety Cap: If >50 unreferenced files older than 24h are found, logs warning and stops.
 *   4. Strict Age Threshold: Files <24h and batches <2h are ALWAYS preserved.
 *   5. Audit Logging: Writes a summary audit line for every executed run.
 */
export async function runStorageCleanupJob({
  mode = process.env.STORAGE_CLEANUP_MODE || 'dry-run',
  dryRun = undefined,
  now = new Date(),
  docAgeThresholdMs = 24 * 60 * 60 * 1000, // 24 hours
  batchAgeThresholdMs = 2 * 60 * 60 * 1000, // 2 hours
  maxDeletions = 50,
  prismaClient = prisma,
  storageDir = storageService.storageDir || path.resolve(process.cwd(), 'storage/documents'),
  tmpBatchDir = TMP_BATCH_DIR,
} = {}) {
  const normalizedMode = String(mode).toLowerCase().trim();

  // Mode 'off': completely disabled
  if (normalizedMode === 'off') {
    console.log("[StorageCleanup] STORAGE_CLEANUP_MODE is 'off'. Job skipped.");
    return { skipped: true, reason: 'mode_off', mode: 'off' };
  }

  // Determine effective dryRun:
  // Default to true (dry-run) unless mode === 'delete' OR explicit dryRun === false
  const isDryRun = dryRun !== undefined ? Boolean(dryRun) : normalizedMode !== 'delete';
  const effectiveMode = isDryRun ? 'dry-run' : 'delete';

  const currentTimeMs = (now instanceof Date ? now : new Date(now)).getTime();

  const stats = {
    mode: effectiveMode,
    scannedFiles: 0,
    unreferencedFiles: 0,
    deletedFiles: 0,
    retainedRecentFiles: 0,
    scannedBatches: 0,
    deletedBatches: 0,
    retainedRecentBatches: 0,
    dryRun: isDryRun,
    stoppedBySafetyCap: false,
    aborted: false,
    abortReason: null,
  };

  // 1. Check disk files
  let diskFiles = [];
  if (fs.existsSync(storageDir)) {
    diskFiles = (await fs.promises.readdir(storageDir)).filter((f) => !f.startsWith('.'));
  }

  // 2. Safety Valve 1 & 2: Collect referenced files from all tables
  let referencedFiles;
  try {
    referencedFiles = await collectAllReferencedFiles(prismaClient);
  } catch (queryErr) {
    console.error('[StorageCleanup] SAFETY VALVE TRIGGERED: Database reference query failed:', queryErr.message);
    stats.aborted = true;
    stats.abortReason = `query_failed: ${queryErr.message}`;
    throw queryErr;
  }

  // Zero-documents check: if files exist on disk, DB references MUST NOT be zero
  if (diskFiles.length > 0 && referencedFiles.size === 0) {
    console.error(
      `[StorageCleanup] SAFETY VALVE TRIGGERED: 0 referenced documents returned from database while ${diskFiles.length} files exist on disk. Aborting cleanup to prevent data loss.`
    );
    stats.aborted = true;
    stats.abortReason = 'zero_references_guard';
    return stats;
  }

  // 3. Scan storage/documents directory and identify candidates
  const unreferencedCandidates = [];
  for (const file of diskFiles) {
    const filePath = path.join(storageDir, file);
    try {
      const fileStat = await fs.promises.stat(filePath);
      if (!fileStat.isFile()) continue;
      stats.scannedFiles++;

      const ageMs = currentTimeMs - fileStat.mtimeMs;
      const isReferenced = referencedFiles.has(file);

      if (!isReferenced) {
        stats.unreferencedFiles++;
        if (ageMs >= docAgeThresholdMs) {
          unreferencedCandidates.push({ file, filePath, ageMs });
        } else {
          stats.retainedRecentFiles++;
          console.log(
            `[StorageCleanup] Retaining recent unreferenced file (< 24h old: ${(ageMs / 3600000).toFixed(1)}h): ${file}`
          );
        }
      }
    } catch (statErr) {
      console.warn(`[StorageCleanup] Stat error for ${file}:`, statErr.message);
    }
  }

  // Safety Valve 3: 50-file cap
  // "never delete more than 50 files in one run (log and stop if more are found)"
  if (unreferencedCandidates.length > maxDeletions) {
    console.warn(
      `[StorageCleanup] SAFETY VALVE TRIGGERED: Found ${unreferencedCandidates.length} unreferenced files older than 24h, exceeding the safety cap of ${maxDeletions} files per run. Stopping cleanup without deleting.`
    );
    stats.stoppedBySafetyCap = true;
    stats.candidateCount = unreferencedCandidates.length;
    return stats;
  }

  // Process eligible files
  for (const item of unreferencedCandidates) {
    console.log(
      `[StorageCleanup] ${isDryRun ? '[DRY-RUN] Would delete' : 'Deleting'} unreferenced file (${(item.ageMs / 3600000).toFixed(1)}h old): ${item.file}`
    );
    if (!isDryRun) {
      try {
        await fs.promises.unlink(item.filePath);
        stats.deletedFiles++;
      } catch (unlinkErr) {
        console.warn(`[StorageCleanup] Failed to unlink ${item.file}:`, unlinkErr.message);
      }
    }
  }

  // 4. Scan tmp-batches directory
  if (fs.existsSync(tmpBatchDir)) {
    const batchEntries = await fs.promises.readdir(tmpBatchDir);
    for (const entry of batchEntries) {
      if (entry.startsWith('.')) continue;
      const entryPath = path.join(tmpBatchDir, entry);
      try {
        const entryStat = await fs.promises.stat(entryPath);
        if (!entryStat.isDirectory()) continue;
        stats.scannedBatches++;

        const ageMs = currentTimeMs - entryStat.mtimeMs;
        if (ageMs >= batchAgeThresholdMs) {
          console.log(
            `[StorageCleanup] ${isDryRun ? '[DRY-RUN] Would delete' : 'Deleting'} stale batch folder (${(ageMs / 3600000).toFixed(1)}h old): ${entry}`
          );
          if (!isDryRun) {
            await fs.promises.rm(entryPath, { recursive: true, force: true }).catch((err) => {
              console.warn(`[StorageCleanup] Failed to delete batch folder ${entry}:`, err.message);
            });
            stats.deletedBatches++;
          }
        } else {
          stats.retainedRecentBatches++;
          console.log(
            `[StorageCleanup] Retaining recent batch folder (< 2h old: ${(ageMs / 60000).toFixed(1)}m): ${entry}`
          );
        }
      } catch (batchStatErr) {
        console.warn(`[StorageCleanup] Stat error for batch ${entry}:`, batchStatErr.message);
      }
    }
  }

  // 5. Safety Valve 5: Write summary line to audit log
  try {
    const db = prismaClient.$base ? prismaClient.$base() : prismaClient;
    if (db.companies && typeof db.companies.findFirst === 'function') {
      const primaryCompany = await db.companies.findFirst({
        select: { id: true },
        orderBy: { created_at: 'asc' },
      });
      if (primaryCompany) {
        await auditService.log({
          companyId: primaryCompany.id,
          userId: null,
          action: 'STORAGE_CLEANUP',
          tableName: 'storage',
          recordId: crypto.randomUUID(),
          newValues: {
            mode: stats.mode,
            scannedFiles: stats.scannedFiles,
            unreferencedFiles: stats.unreferencedFiles,
            deletedFiles: stats.deletedFiles,
            retainedRecentFiles: stats.retainedRecentFiles,
            deletedBatches: stats.deletedBatches,
            retainedRecentBatches: stats.retainedRecentBatches,
            stoppedBySafetyCap: stats.stoppedBySafetyCap,
            timestamp: new Date().toISOString(),
          },
        }).catch((err) => console.warn('[StorageCleanup] Audit log warning:', err.message));
      }
    }
  } catch (auditErr) {
    console.warn('[StorageCleanup] Audit logging warning:', auditErr.message);
  }

  console.log(
    `[StorageCleanup] Finished (mode: ${stats.mode}): ${stats.deletedFiles}/${stats.unreferencedFiles} unreferenced files deleted, ${stats.retainedRecentFiles} recent files preserved; ${stats.deletedBatches}/${stats.scannedBatches} stale batches deleted.`
  );
  return stats;
}

export default runStorageCleanupJob;
