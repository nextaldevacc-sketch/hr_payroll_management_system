import fs from 'node:fs';
import path from 'node:path';
import prisma from '../lib/prisma.js';
import storageService from '../lib/storage.js';

/**
 * Storage Cleanup Job
 * Safely removes:
 * 1. Files in storage/documents not referenced by employee_documents.file_url or
 *    settings_versions snapshots that are older than 24 hours.
 * 2. Temporary batch folders in storage/tmp-batches older than 2 hours.
 *
 * Invariant: Never touches files or directories newer than the age threshold.
 * Logs dry-run information before performing deletions.
 */
export async function runStorageCleanupJob({
  dryRun = false,
  now = new Date(),
  docAgeThresholdMs = 24 * 60 * 60 * 1000, // 24 hours
  batchAgeThresholdMs = 2 * 60 * 60 * 1000, // 2 hours
} = {}) {
  const currentTimeMs = (now instanceof Date ? now : new Date(now)).getTime();
  const storageDir = storageService.storageDir || path.resolve(process.cwd(), 'storage/documents');
  const tmpBatchDir = path.resolve(process.cwd(), 'storage/tmp-batches');

  const stats = {
    scannedFiles: 0,
    unreferencedFiles: 0,
    deletedFiles: 0,
    retainedRecentFiles: 0,
    scannedBatches: 0,
    deletedBatches: 0,
    retainedRecentBatches: 0,
    dryRun,
  };

  // 1. Gather all referenced file_url from employee_documents and settings_versions snapshots
  const referencedFiles = new Set();

  const activeDocs = await prisma.$base().employee_documents.findMany({
    where: { file_url: { not: null } },
    select: { file_url: true },
  });
  for (const d of activeDocs) {
    if (d.file_url) referencedFiles.add(path.basename(d.file_url));
  }

  const versionDocs = await prisma.$base().settings_versions.findMany({
    where: { entity_type: 'employee_document' },
    select: { snapshot: true },
  });
  for (const v of versionDocs) {
    const snap = v.snapshot;
    if (snap && typeof snap === 'object' && snap.file_url) {
      referencedFiles.add(path.basename(snap.file_url));
    }
  }

  // 2. Scan storage/documents directory
  if (fs.existsSync(storageDir)) {
    const files = await fs.promises.readdir(storageDir);
    for (const file of files) {
      if (file.startsWith('.')) continue; // ignore hidden files like .gitkeep
      const filePath = path.join(storageDir, file);
      try {
        const fileStat = await fs.promises.stat(filePath);
        if (!fileStat.isFile()) continue;
        stats.scannedFiles++;

        const ageMs = currentTimeMs - fileStat.mtimeMs;
        const isReferenced = referencedFiles.has(file);

        if (!isReferenced) {
          stats.unreferencedFiles++;
          // Strict age threshold: ONLY delete if older than 24h
          if (ageMs >= docAgeThresholdMs) {
            console.log(
              `[StorageCleanup] ${dryRun ? '[DRY-RUN] Would delete' : 'Deleting'} unreferenced file (${(ageMs / 3600000).toFixed(1)}h old): ${file}`
            );
            if (!dryRun) {
              await fs.promises.unlink(filePath).catch((err) => {
                console.warn(`[StorageCleanup] Failed to unlink ${file}:`, err.message);
              });
              stats.deletedFiles++;
            }
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
  }

  // 3. Scan storage/tmp-batches directory
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
        // Strict age threshold: ONLY delete if older than 2h
        if (ageMs >= batchAgeThresholdMs) {
          console.log(
            `[StorageCleanup] ${dryRun ? '[DRY-RUN] Would delete' : 'Deleting'} stale batch folder (${(ageMs / 3600000).toFixed(1)}h old): ${entry}`
          );
          if (!dryRun) {
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

  console.log(
    `[StorageCleanup] Finished: ${stats.deletedFiles}/${stats.unreferencedFiles} unreferenced files deleted, ${stats.retainedRecentFiles} recent files preserved; ${stats.deletedBatches}/${stats.scannedBatches} stale batches deleted.`
  );
  return stats;
}

export default runStorageCleanupJob;
